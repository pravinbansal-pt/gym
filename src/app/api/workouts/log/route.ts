import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SetType } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LogWorkoutPayload {
  name?: string;
  date?: string;
  notes?: string;
  exercises: Array<{
    name: string;
    sets: Array<{
      weight?: number;
      reps?: number;
      type?: "WARM_UP" | "WORKING";
    }>;
  }>;
}

// ─── Fuzzy Matching ─────────────────────────────────────────────────────────

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function fuzzyScore(query: string, candidate: string): number {
  const normQuery = normalizeString(query);
  const normCandidate = normalizeString(candidate);

  // Exact match
  if (normQuery === normCandidate) return 1;

  // Contains match
  if (normCandidate.includes(normQuery)) return 0.9;
  if (normQuery.includes(normCandidate)) return 0.8;

  // Word-level matching: check if all query words appear in candidate
  const queryWords = normQuery.split(" ");
  const candidateWords = normCandidate.split(" ");
  const matchedWords = queryWords.filter((qw) =>
    candidateWords.some(
      (cw) => cw.includes(qw) || qw.includes(cw)
    )
  );

  if (matchedWords.length === queryWords.length) return 0.85;
  if (matchedWords.length > 0) {
    const wordScore = matchedWords.length / queryWords.length;
    if (wordScore >= 0.5) return 0.6 + wordScore * 0.2;
  }

  // Levenshtein distance as fallback
  const maxLen = Math.max(normQuery.length, normCandidate.length);
  if (maxLen === 0) return 0;
  const distance = levenshteinDistance(normQuery, normCandidate);
  const similarity = 1 - distance / maxLen;

  return similarity;
}

async function findBestExerciseMatch(
  exerciseName: string
): Promise<{ id: string; name: string; score: number } | null> {
  const exercises = await db.exercise.findMany({
    select: { id: true, name: true },
  });

  let bestMatch: { id: string; name: string; score: number } | null = null;

  for (const exercise of exercises) {
    const score = fuzzyScore(exerciseName, exercise.name);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { id: exercise.id, name: exercise.name, score };
    }
  }

  // Require at least a 0.4 similarity score
  if (bestMatch && bestMatch.score < 0.4) {
    return null;
  }

  return bestMatch;
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LogWorkoutPayload;

    // Validate payload
    if (!body.exercises || !Array.isArray(body.exercises) || body.exercises.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one exercise is required" },
        { status: 400 }
      );
    }

    // Resolve exercise names to IDs via fuzzy matching
    const resolvedExercises: Array<{
      exerciseId: string;
      exerciseName: string;
      matchedName: string;
      matchScore: number;
      sets: Array<{
        weight?: number;
        reps?: number;
        type: SetType;
      }>;
    }> = [];

    const unmatchedExercises: string[] = [];

    for (const exercise of body.exercises) {
      const match = await findBestExerciseMatch(exercise.name);

      if (!match) {
        unmatchedExercises.push(exercise.name);
        continue;
      }

      resolvedExercises.push({
        exerciseId: match.id,
        exerciseName: exercise.name,
        matchedName: match.name,
        matchScore: match.score,
        sets: exercise.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          type: (s.type as SetType) ?? "WORKING",
        })),
      });
    }

    if (resolvedExercises.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No exercises could be matched",
          unmatchedExercises,
        },
        { status: 400 }
      );
    }

    // Determine the session date
    const sessionDate = body.date ? new Date(body.date) : new Date();

    // Create the session with all exercises and sets in a single transaction
    const session = await db.$transaction(async (tx) => {
      const newSession = await tx.workoutSession.create({
        data: {
          name: body.name ?? `Workout - ${sessionDate.toLocaleDateString()}`,
          status: "COMPLETED",
          startedAt: sessionDate,
          endedAt: sessionDate,
          notes: body.notes,
        },
      });

      // Create session exercises and their sets
      for (let i = 0; i < resolvedExercises.length; i++) {
        const re = resolvedExercises[i];
        const sessionExercise = await tx.workoutSessionExercise.create({
          data: {
            workoutSessionId: newSession.id,
            exerciseId: re.exerciseId,
            orderIndex: i,
          },
        });

        // Create sets for this exercise
        for (let j = 0; j < re.sets.length; j++) {
          const set = re.sets[j];
          await tx.workoutSet.create({
            data: {
              sessionExerciseId: sessionExercise.id,
              weight: set.weight,
              reps: set.reps,
              setType: set.type,
              orderIndex: j,
              completedAt: sessionDate,
            },
          });

          // Check for PR on working sets with weight and reps
          if (set.type === "WORKING" && set.weight && set.reps) {
            const estimated1RM = set.weight * (1 + set.reps / 30);
            const currentBest = await tx.personalRecord.findFirst({
              where: { exerciseId: re.exerciseId },
              orderBy: { estimated1RM: "desc" },
            });

            if (!currentBest || estimated1RM > currentBest.estimated1RM) {
              await tx.personalRecord.create({
                data: {
                  exerciseId: re.exerciseId,
                  weight: set.weight,
                  reps: set.reps,
                  estimated1RM: Math.round(estimated1RM * 100) / 100,
                  workoutSessionId: newSession.id,
                  achievedAt: sessionDate,
                },
              });
            }
          }
        }
      }

      return newSession;
    });

    // Fetch the complete session with all nested data
    const completeSession = await db.workoutSession.findUnique({
      where: { id: session.id },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              select: { id: true, name: true },
            },
            sets: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        session: completeSession,
        matchInfo: resolvedExercises.map((re) => ({
          input: re.exerciseName,
          matched: re.matchedName,
          score: Math.round(re.matchScore * 100) / 100,
        })),
        ...(unmatchedExercises.length > 0 && { unmatchedExercises }),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to log workout",
      },
      { status: 500 }
    );
  }
}
