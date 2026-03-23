"use server";

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { aiPopulateExercise } from "@/app/(app)/exercises/_actions";
import { getSession } from "@/lib/get-session";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedExercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
}

export interface ParsedWorkoutDay {
  name: string;
  exercises: ParsedExercise[];
}

export interface ParsedWorkout {
  name: string;
  description: string;
  days: ParsedWorkoutDay[];
}

export interface ExerciseMatch {
  parsedName: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
  matchedExercise: { id: string; name: string } | null;
  confidence: number;
  isNew: boolean;
}

export type ImportMode = "program" | "workouts" | "exercises";

export interface ImportInput {
  mode: ImportMode;
  /** The parsed workout data with user's match decisions */
  workoutName: string;
  description: string;
  days: Array<{
    name: string;
    exercises: Array<{
      parsedName: string;
      matchedExerciseId: string | null;
      isNew: boolean;
      sets: number;
      reps: string;
      weight: string;
      notes: string;
      included: boolean;
    }>;
  }>;
  /** For "workouts" mode — which program to add workouts to */
  programId?: string;
  /** For "exercises" mode — which workout to add exercises to */
  workoutId?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// Words that are generic filler — matching on these alone doesn't mean the exercises are the same
const FILLER_WORDS = new Set([
  "the", "a", "an", "with", "on", "to", "and", "or", "of",
]);

// Equipment/qualifier words — these distinguish exercises significantly
const EQUIPMENT_WORDS = new Set([
  "machine", "cable", "barbell", "dumbbell", "smith", "ez", "kettlebell",
  "band", "bodyweight", "plate", "loaded", "seated", "standing", "lying",
  "incline", "decline", "flat", "overhead", "reverse", "single", "leg", "arm",
]);

function exerciseMatchScore(parsedName: string, libraryName: string): number {
  const a = normalize(parsedName);
  const b = normalize(libraryName);

  // Exact match
  if (a === b) return 1.0;

  const wordsA = a.split(/\s+/).filter((w) => !FILLER_WORDS.has(w));
  const wordsB = b.split(/\s+/).filter((w) => !FILLER_WORDS.has(w));

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  // Count overlapping words, weighting equipment words higher
  let matchedWeight = 0;
  let totalWeight = 0;
  const wordsASet = new Set(wordsA);
  const wordsBSet = new Set(wordsB);

  // Score from perspective of parsed name (all its words should be found)
  for (const w of wordsA) {
    const weight = EQUIPMENT_WORDS.has(w) ? 2 : 1;
    totalWeight += weight;
    if (wordsBSet.has(w)) {
      matchedWeight += weight;
    }
  }
  // Also penalize if library name has important words NOT in parsed name
  for (const w of wordsB) {
    if (!wordsASet.has(w) && EQUIPMENT_WORDS.has(w)) {
      // Library has an equipment word the parsed name doesn't — penalty
      totalWeight += 1.5;
    }
  }

  const score = matchedWeight / totalWeight;

  // Require that the primary exercise word (longest non-equipment word) matches
  const primaryA = wordsA
    .filter((w) => !EQUIPMENT_WORDS.has(w))
    .sort((x, y) => y.length - x.length)[0];
  const primaryB = wordsB
    .filter((w) => !EQUIPMENT_WORDS.has(w))
    .sort((x, y) => y.length - x.length)[0];

  if (primaryA && primaryB && primaryA !== primaryB) {
    // Primary exercise words differ — this is likely a different exercise
    return score * 0.3;
  }

  return score;
}

// ─── Parse Workout Content ──────────────────────────────────────────────────

export async function parseWorkoutContent(input: {
  type: "url" | "image" | "text";
  content: string;
  mode: ImportMode;
}): Promise<ParsedWorkout> {
  await requireAuth();
  const openai = new OpenAI();

  const multiDay = input.mode !== "exercises";

  const systemPrompt = multiDay
    ? `You are a fitness expert that extracts workout information from text or images.
Extract the workout program name, a brief description, and the list of workout days.
If there's only one workout day, still return it as a single-element "days" array.
For each day, extract a name and its exercises.
For each exercise extract:
- "name": the standard exercise name (e.g. "Barbell Bench Press", not "bench")
- "sets": number of sets (default 3 if not specified)
- "reps": target reps or rep range as a string (e.g. "8-10", "12")
- "weight": suggested weight if mentioned, otherwise empty string
- "notes": any form cues or notes, otherwise empty string

Return JSON matching this structure:
{
  "name": "Program/Workout Name",
  "description": "Brief description",
  "days": [
    {
      "name": "Day 1 - Push",
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "8-10", "weight": "", "notes": "" }
      ]
    }
  ]
}`
    : `You are a fitness expert that extracts exercise information from text or images.
Extract a list of exercises with their set/rep schemes.
For each exercise extract:
- "name": the standard exercise name (e.g. "Barbell Bench Press", not "bench")
- "sets": number of sets (default 3 if not specified)
- "reps": target reps or rep range as a string (e.g. "8-10", "12")
- "weight": suggested weight if mentioned, otherwise empty string
- "notes": any form cues or notes, otherwise empty string

Return JSON matching this structure:
{
  "name": "Workout",
  "description": "",
  "days": [
    {
      "name": "Exercises",
      "exercises": [
        { "name": "Exercise Name", "sets": 3, "reps": "8-10", "weight": "", "notes": "" }
      ]
    }
  ]
}`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (input.type === "image") {
    const dataUrl = input.content.startsWith("data:")
      ? input.content
      : `data:image/jpeg;base64,${input.content}`;

    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: dataUrl },
        },
        {
          type: "text",
          text: "Extract the workout from this image.",
        },
      ],
    });
  } else if (input.type === "url") {
    const res = await fetch(input.content, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000);
    messages.push({
      role: "user",
      content: `Extract the workout from this web page content:\n\n${text}`,
    });
  } else {
    messages.push({
      role: "user",
      content: `Extract the workout from this text:\n\n${input.content}`,
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    response_format: { type: "json_object" },
    messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI.");

  const parsed = JSON.parse(content) as ParsedWorkout;

  if (!parsed.days || parsed.days.length === 0) {
    throw new Error("No workout content found.");
  }

  const totalExercises = parsed.days.reduce((sum, d) => sum + d.exercises.length, 0);
  if (totalExercises === 0) {
    throw new Error("No exercises found in the content.");
  }

  return parsed;
}

// ─── Match Exercises ────────────────────────────────────────────────────────

export async function matchExercises(
  parsedExercises: ParsedExercise[]
): Promise<ExerciseMatch[]> {
  const exercises = await db.exercise.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return parsedExercises.map((parsed) => {
    let bestMatch: { id: string; name: string } | null = null;
    let bestScore = 0;

    for (const ex of exercises) {
      const score = exerciseMatchScore(parsed.name, ex.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = ex;
      }
      if (score === 1.0) break; // exact match, stop looking
    }

    // Require high confidence — 0.75+ to auto-match
    // This prevents "Seated Leg Curl (Machine)" matching "Biceps Leg Concentration Curl"
    const isMatch = bestScore >= 0.75;

    return {
      parsedName: parsed.name,
      sets: parsed.sets,
      reps: parsed.reps,
      weight: parsed.weight,
      notes: parsed.notes,
      matchedExercise: isMatch ? bestMatch : null,
      confidence: isMatch ? bestScore : 0,
      isNew: !isMatch,
    };
  });
}

// ─── Import Workout ─────────────────────────────────────────────────────────

export async function importWorkout(
  input: ImportInput
): Promise<{
  success: true;
  newExerciseIds: string[];
  programId?: string;
  workoutIds: string[];
}> {
  await requireAuth();
  const muscleGroups = await db.muscleGroup.findMany();

  const newExerciseIds: string[] = [];

  // Resolve all exercise IDs (create new ones as needed)
  async function resolveExerciseId(ex: {
    parsedName: string;
    matchedExerciseId: string | null;
    isNew: boolean;
  }): Promise<string> {
    if (!ex.isNew && ex.matchedExerciseId) return ex.matchedExerciseId;

    try {
      const aiDetails = await aiPopulateExercise(ex.parsedName);
      const newExercise = await db.exercise.create({
        data: {
          name: aiDetails.name || ex.parsedName,
          description: aiDetails.description || undefined,
          primaryMuscleGroupId:
            aiDetails.muscleGroupId || muscleGroups[0]?.id || "",
          equipmentType:
            (aiDetails.equipmentType as
              | "BARBELL"
              | "DUMBBELL"
              | "MACHINE"
              | "CABLE"
              | "BODYWEIGHT"
              | "SMITH_MACHINE"
              | "EZ_BAR"
              | "KETTLEBELL"
              | "RESISTANCE_BAND"
              | "OTHER") || "OTHER",
        },
      });
      newExerciseIds.push(newExercise.id);
      return newExercise.id;
    } catch {
      const newExercise = await db.exercise.create({
        data: {
          name: ex.parsedName,
          primaryMuscleGroupId: muscleGroups[0]?.id || "",
          equipmentType: "OTHER",
        },
      });
      newExerciseIds.push(newExercise.id);
      return newExercise.id;
    }
  }

  const workoutIds: string[] = [];

  if (input.mode === "program") {
    // Create a new program with workouts
    const program = await db.program.create({
      data: {
        name: input.workoutName,
        description: input.description || null,
        type: "SIMPLE",
      },
    });

    for (let dayIdx = 0; dayIdx < input.days.length; dayIdx++) {
      const day = input.days[dayIdx];
      const included = day.exercises.filter((e) => e.included);
      if (included.length === 0) continue;

      const exerciseCreates = [];
      for (let exIdx = 0; exIdx < included.length; exIdx++) {
        const ex = included[exIdx];
        const exerciseId = await resolveExerciseId(ex);

        exerciseCreates.push({
          exerciseId,
          orderIndex: exIdx,
          warmUpSets: 1,
          workingSets: ex.sets || 3,
          targetReps: ex.reps || "",
          sets: {
            create: [
              // 1 warm-up set
              { setType: "WARM_UP" as const, targetReps: "10", restSeconds: 60, orderIndex: 0 },
              // Working sets
              ...Array.from({ length: ex.sets || 3 }, (_, i) => ({
                setType: "WORKING" as const,
                targetReps: ex.reps || "",
                restSeconds: 90,
                orderIndex: 1 + i,
              })),
            ],
          },
        });
      }

      const workout = await db.programWorkout.create({
        data: {
          programId: program.id,
          name: day.name,
          dayIndex: dayIdx,
          orderIndex: dayIdx,
          exercises: { create: exerciseCreates },
        },
      });
      workoutIds.push(workout.id);
    }

    revalidatePath("/programs");
    revalidatePath(`/programs/${program.id}`);
    revalidatePath("/exercises");

    return { success: true, newExerciseIds, programId: program.id, workoutIds };
  }

  if (input.mode === "workouts" && input.programId) {
    // Add workout(s) to an existing program
    const maxOrder = await db.programWorkout.aggregate({
      where: { programId: input.programId },
      _max: { orderIndex: true, dayIndex: true },
    });
    let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;
    let nextDay = (maxOrder._max.dayIndex ?? -1) + 1;

    for (let dayIdx = 0; dayIdx < input.days.length; dayIdx++) {
      const day = input.days[dayIdx];
      const included = day.exercises.filter((e) => e.included);
      if (included.length === 0) continue;

      const exerciseCreates = [];
      for (let exIdx = 0; exIdx < included.length; exIdx++) {
        const ex = included[exIdx];
        const exerciseId = await resolveExerciseId(ex);

        exerciseCreates.push({
          exerciseId,
          orderIndex: exIdx,
          warmUpSets: 1,
          workingSets: ex.sets || 3,
          targetReps: ex.reps || "",
          sets: {
            create: [
              { setType: "WARM_UP" as const, targetReps: "10", restSeconds: 60, orderIndex: 0 },
              ...Array.from({ length: ex.sets || 3 }, (_, i) => ({
                setType: "WORKING" as const,
                targetReps: ex.reps || "",
                restSeconds: 90,
                orderIndex: 1 + i,
              })),
            ],
          },
        });
      }

      const workout = await db.programWorkout.create({
        data: {
          programId: input.programId,
          name: day.name,
          dayIndex: nextDay + dayIdx,
          orderIndex: nextOrder + dayIdx,
          exercises: { create: exerciseCreates },
        },
      });
      workoutIds.push(workout.id);
    }

    revalidatePath(`/programs/${input.programId}`);
    revalidatePath("/exercises");

    return {
      success: true,
      newExerciseIds,
      programId: input.programId,
      workoutIds,
    };
  }

  if (input.mode === "exercises" && input.programId && input.workoutId) {
    // Add exercises to an existing workout
    const maxOrder = await db.programWorkoutExercise.aggregate({
      where: { programWorkoutId: input.workoutId },
      _max: { orderIndex: true },
    });
    let nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const allExercises = input.days.flatMap((d) => d.exercises).filter((e) => e.included);

    for (const ex of allExercises) {
      const exerciseId = await resolveExerciseId(ex);

      await db.programWorkoutExercise.create({
        data: {
          programWorkoutId: input.workoutId,
          exerciseId,
          orderIndex: nextOrder++,
          warmUpSets: 1,
          workingSets: ex.sets || 3,
          targetReps: ex.reps || "",
          sets: {
            create: [
              { setType: "WARM_UP" as const, targetReps: "10", restSeconds: 60, orderIndex: 0 },
              ...Array.from({ length: ex.sets || 3 }, (_, i) => ({
                setType: "WORKING" as const,
                targetReps: ex.reps || "",
                restSeconds: 90,
                orderIndex: 1 + i,
              })),
            ],
          },
        },
      });
    }

    workoutIds.push(input.workoutId);
    revalidatePath(`/programs/${input.programId}/workouts/${input.workoutId}`);
    revalidatePath(`/programs/${input.programId}`);
    revalidatePath("/exercises");

    return {
      success: true,
      newExerciseIds,
      programId: input.programId,
      workoutIds,
    };
  }

  throw new Error("Invalid import configuration.");
}
