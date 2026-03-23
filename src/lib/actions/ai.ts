"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getSession } from "@/lib/get-session";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GeneratedExercisePlan {
  exerciseId: string;
  exerciseName: string;
  warmUpSets: number;
  workingSets: number;
  targetReps: string;
  suggestedWeight: string;
  notes: string;
}

export interface GeneratedWorkout {
  name: string;
  description: string;
  exercises: GeneratedExercisePlan[];
}

export interface GeneratedExercise {
  name: string;
  description: string;
  muscleGroup: string;
  equipmentType: string;
}

export interface GenerateWorkoutResult {
  success: true;
  data: GeneratedWorkout;
}

export interface GenerateExercisesResult {
  success: true;
  data: GeneratedExercise[];
}

export interface AIError {
  success: false;
  error: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY_MISSING");
  }
  return new Anthropic({ apiKey });
}

// ─── Generate Workout ──────────────────────────────────────────────────────

export async function generateWorkout(
  prompt: string
): Promise<GenerateWorkoutResult | AIError> {
  try {
    await requireAuth();
    const client = getAnthropicClient();

    // Fetch all exercises from the database with their muscle groups
    const exercises = await db.exercise.findMany({
      include: {
        primaryMuscleGroup: true,
      },
      orderBy: { name: "asc" },
    });

    if (exercises.length === 0) {
      return {
        success: false,
        error:
          "No exercises found in the library. Please add some exercises first before generating a workout.",
      };
    }

    // Build the exercise library context
    const exerciseList = exercises
      .map(
        (e) =>
          `- ID: ${e.id} | Name: ${e.name} | Muscle Group: ${e.primaryMuscleGroup.name} | Equipment: ${e.equipmentType}`
      )
      .join("\n");

    const systemPrompt = `You are a knowledgeable personal trainer and workout programmer. You create well-structured workout plans using exercises from the user's exercise library.

IMPORTANT RULES:
1. You MUST only use exercises from the provided exercise library. Never invent exercises that are not in the list.
2. Each exercise you select must use the exact exercise ID from the library.
3. Suggest appropriate sets, reps, and weights based on the workout goal.
4. For warm-up sets, suggest 1-2 sets at lighter weights.
5. For working sets, suggest 3-5 sets depending on the exercise and goal.
6. Weight suggestions should be relative (e.g., "moderate", "heavy", "60% 1RM") since you don't know the user's strength levels.
7. Respond ONLY with valid JSON, no markdown, no code fences, no explanation.

The JSON must match this exact structure:
{
  "name": "Workout name",
  "description": "Brief description of the workout focus and goals",
  "exercises": [
    {
      "exerciseId": "the exact ID from the library",
      "exerciseName": "the exact name from the library",
      "warmUpSets": 1,
      "workingSets": 3,
      "targetReps": "8-10",
      "suggestedWeight": "moderate weight",
      "notes": "form cues or notes"
    }
  ]
}`;

    const userMessage = `Here is my exercise library:

${exerciseList}

Please generate a workout based on this request: ${prompt}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No text response received from AI." };
    }

    // Parse the JSON response
    let parsed: GeneratedWorkout;
    try {
      // Strip any potential markdown code fences
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return {
        success: false,
        error: "Failed to parse AI response. Please try again.",
      };
    }

    // Validate that the exercises reference real IDs from our library
    const validIds = new Set(exercises.map((e) => e.id));
    const validExercises = parsed.exercises.filter((e) =>
      validIds.has(e.exerciseId)
    );

    if (validExercises.length === 0) {
      return {
        success: false,
        error:
          "AI generated exercises that don't match the library. Please try again with a different prompt.",
      };
    }

    return {
      success: true,
      data: {
        ...parsed,
        exercises: validExercises,
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ANTHROPIC_API_KEY_MISSING"
    ) {
      return {
        success: false,
        error: "ANTHROPIC_API_KEY_MISSING",
      };
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate workout. Please try again.",
    };
  }
}

// ─── Save Generated Workout as Session ─────────────────────────────────────

export async function saveWorkoutAsSession(
  workout: GeneratedWorkout
): Promise<{ success: true; data: { id: string } } | AIError> {
  try {
    await requireAuth();
    const session = await db.workoutSession.create({
      data: {
        name: workout.name,
        notes: workout.description,
        status: "PLANNED",
        exercises: {
          create: workout.exercises.map((e, index) => ({
            exerciseId: e.exerciseId,
            orderIndex: index,
            sets: {
              create: [
                // Warm-up sets
                ...Array.from({ length: e.warmUpSets }, (_, i) => ({
                  setType: "WARM_UP" as const,
                  orderIndex: i,
                })),
                // Working sets
                ...Array.from({ length: e.workingSets }, (_, i) => ({
                  setType: "WORKING" as const,
                  orderIndex: e.warmUpSets + i,
                })),
              ],
            },
          })),
        },
      },
      select: { id: true },
    });

    return { success: true, data: { id: session.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save workout session.",
    };
  }
}

// ─── Save Generated Workout to Program ─────────────────────────────────────

export async function saveWorkoutToProgram(
  workout: GeneratedWorkout,
  programId: string
): Promise<{ success: true; data: { id: string } } | AIError> {
  try {
    await requireAuth();
    // Get the next order index for workouts in this program
    const maxOrder = await db.programWorkout.aggregate({
      where: { programId },
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const programWorkout = await db.programWorkout.create({
      data: {
        programId,
        name: workout.name,
        dayIndex: nextOrder,
        orderIndex: nextOrder,
        exercises: {
          create: workout.exercises.map((e, index) => ({
            exerciseId: e.exerciseId,
            orderIndex: index,
            warmUpSets: e.warmUpSets,
            workingSets: e.workingSets,
            targetReps: e.targetReps,
          })),
        },
      },
      select: { id: true },
    });

    return { success: true, data: { id: programWorkout.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save workout to program.",
    };
  }
}

// ─── Get Programs for Save Dialog ──────────────────────────────────────────

export async function getProgramsForSelect(): Promise<
  { success: true; data: Array<{ id: string; name: string }> } | AIError
> {
  try {
    const programs = await db.program.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { success: true, data: programs };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch programs.",
    };
  }
}

// ─── Generate Exercises ────────────────────────────────────────────────────

export async function generateExercises(
  prompt: string
): Promise<GenerateExercisesResult | AIError> {
  try {
    await requireAuth();
    const client = getAnthropicClient();

    // Fetch existing exercises so AI doesn't suggest duplicates
    const existingExercises = await db.exercise.findMany({
      select: { name: true },
    });
    const existingNames = existingExercises.map((e) => e.name);

    // Fetch muscle groups so AI uses valid ones
    const muscleGroups = await db.muscleGroup.findMany({
      orderBy: { displayOrder: "asc" },
    });
    const muscleGroupNames = muscleGroups.map((mg) => mg.name);

    const equipmentTypes = [
      "BARBELL",
      "DUMBBELL",
      "MACHINE",
      "CABLE",
      "BODYWEIGHT",
      "SMITH_MACHINE",
      "EZ_BAR",
      "KETTLEBELL",
      "RESISTANCE_BAND",
      "OTHER",
    ];

    const systemPrompt = `You are a knowledgeable fitness expert. You suggest exercises to add to a workout tracking app's exercise library.

IMPORTANT RULES:
1. Do NOT suggest exercises that already exist in the user's library.
2. The "muscleGroup" field MUST be one of these exact values: ${muscleGroupNames.join(", ")}
3. The "equipmentType" field MUST be one of these exact values: ${equipmentTypes.join(", ")}
4. Provide clear, concise descriptions with form cues.
5. Suggest real, well-known exercises - not made-up variations.
6. Respond ONLY with valid JSON, no markdown, no code fences, no explanation.

The JSON must be an array matching this structure:
[
  {
    "name": "Exercise Name",
    "description": "Brief description with form cues",
    "muscleGroup": "one of the valid muscle groups",
    "equipmentType": "one of the valid equipment types"
  }
]`;

    const userMessage = `Existing exercises in my library (do not suggest these):
${existingNames.length > 0 ? existingNames.join(", ") : "(empty library)"}

Available muscle groups: ${muscleGroupNames.join(", ")}

Please suggest exercises based on this request: ${prompt}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text content from the response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { success: false, error: "No text response received from AI." };
    }

    // Parse the JSON response
    let parsed: GeneratedExercise[];
    try {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return {
        success: false,
        error: "Failed to parse AI response. Please try again.",
      };
    }

    // Validate that exercises use valid muscle groups and equipment types
    const validMuscleGroups = new Set(muscleGroupNames);
    const validEquipment = new Set(equipmentTypes);
    const existingNameSet = new Set(
      existingNames.map((n) => n.toLowerCase())
    );

    const validExercises = parsed.filter(
      (e) =>
        validMuscleGroups.has(e.muscleGroup) &&
        validEquipment.has(e.equipmentType) &&
        !existingNameSet.has(e.name.toLowerCase())
    );

    if (validExercises.length === 0) {
      return {
        success: false,
        error:
          "AI suggestions didn't match valid muscle groups or equipment types. Please try again.",
      };
    }

    return { success: true, data: validExercises };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ANTHROPIC_API_KEY_MISSING"
    ) {
      return {
        success: false,
        error: "ANTHROPIC_API_KEY_MISSING",
      };
    }
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate exercises. Please try again.",
    };
  }
}

// ─── Save Generated Exercises ──────────────────────────────────────────────

export async function saveGeneratedExercises(
  exercises: GeneratedExercise[]
): Promise<
  { success: true; data: { count: number } } | AIError
> {
  try {
    await requireAuth();
    // Look up muscle group IDs
    const muscleGroups = await db.muscleGroup.findMany();
    const mgMap = new Map(muscleGroups.map((mg) => [mg.name, mg.id]));

    let created = 0;
    for (const exercise of exercises) {
      const muscleGroupId = mgMap.get(exercise.muscleGroup);
      if (!muscleGroupId) continue;

      try {
        await db.exercise.create({
          data: {
            name: exercise.name,
            description: exercise.description,
            primaryMuscleGroupId: muscleGroupId,
            equipmentType: exercise.equipmentType as "BARBELL" | "DUMBBELL" | "MACHINE" | "CABLE" | "BODYWEIGHT" | "SMITH_MACHINE" | "EZ_BAR" | "KETTLEBELL" | "RESISTANCE_BAND" | "OTHER",
          },
        });
        created++;
      } catch {
        // Skip duplicates or other creation errors
        continue;
      }
    }

    return { success: true, data: { count: created } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to save exercises.",
    };
  }
}
