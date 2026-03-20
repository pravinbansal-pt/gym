"use server";

import { db } from "@/lib/db";
import { SessionStatus, SetType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CreateSessionInput {
  name?: string;
  programId?: string;
  programWorkoutId?: string;
  notes?: string;
}

interface UpdateSessionInput {
  name?: string;
  notes?: string;
}

interface SessionFilters {
  status?: SessionStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  skip?: number;
  take?: number;
}

interface AddSetInput {
  weight?: number;
  reps?: number;
  setType?: SetType;
}

interface UpdateSetInput {
  weight?: number;
  reps?: number;
  setType?: SetType;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createSession(
  data: CreateSessionInput
): Promise<ActionResult> {
  try {
    // If creating from a program workout, pre-populate the exercises
    let exercisesData: Array<{
      exerciseId: string;
      orderIndex: number;
    }> = [];

    if (data.programWorkoutId) {
      const programWorkout = await db.programWorkout.findUnique({
        where: { id: data.programWorkoutId },
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
            include: { exercise: true },
          },
        },
      });

      if (programWorkout) {
        exercisesData = programWorkout.exercises.map((pe) => ({
          exerciseId: pe.exerciseId,
          orderIndex: pe.orderIndex,
        }));
      }
    }

    const session = await db.workoutSession.create({
      data: {
        name: data.name,
        programId: data.programId,
        programWorkoutId: data.programWorkoutId,
        notes: data.notes,
        status: "PLANNED",
        exercises: exercisesData.length
          ? {
              create: exercisesData.map((e) => ({
                exerciseId: e.exerciseId,
                orderIndex: e.orderIndex,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              include: { primaryMuscleGroup: true },
            },
            sets: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    revalidatePath("/history");
    revalidatePath("/");
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create session",
    };
  }
}

export async function getSession(id: string): Promise<ActionResult> {
  try {
    const session = await db.workoutSession.findUnique({
      where: { id },
      include: {
        program: true,
        programWorkout: true,
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              include: {
                primaryMuscleGroup: true,
                secondaryMuscleGroups: true,
              },
            },
            sets: {
              orderBy: { orderIndex: "asc" },
            },
            notes: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch session",
    };
  }
}

export async function getSessions(
  filters?: SessionFilters
): Promise<ActionResult> {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const startedAt: Record<string, Date> = {};
      if (filters.dateFrom) {
        startedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        startedAt.lte = new Date(filters.dateTo);
      }
      where.createdAt = startedAt;
    }

    const [sessions, total] = await Promise.all([
      db.workoutSession.findMany({
        where,
        include: {
          program: { select: { id: true, name: true } },
          programWorkout: { select: { id: true, name: true } },
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
          _count: {
            select: { exercises: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: filters?.skip ?? 0,
        take: filters?.take ?? 20,
      }),
      db.workoutSession.count({ where }),
    ]);

    return { success: true, data: { sessions, total } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch sessions",
    };
  }
}

export async function startSession(id: string): Promise<ActionResult> {
  try {
    const session = await db.workoutSession.update({
      where: { id },
      data: {
        startedAt: new Date(),
        status: "IN_PROGRESS",
      },
    });

    revalidatePath("/history");
    revalidatePath(`/workouts/${id}/session`);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start session",
    };
  }
}

export async function endSession(id: string): Promise<ActionResult> {
  try {
    const session = await db.workoutSession.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: "COMPLETED",
      },
    });

    revalidatePath("/history");
    revalidatePath(`/workouts/${id}/session`);
    revalidatePath("/");
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to end session",
    };
  }
}

export async function addSetToExercise(
  sessionExerciseId: string,
  data: AddSetInput
): Promise<ActionResult> {
  try {
    // Get the max orderIndex for sets in this session exercise
    const maxOrder = await db.workoutSet.aggregate({
      where: { sessionExerciseId },
      _max: { orderIndex: true },
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const set = await db.workoutSet.create({
      data: {
        sessionExerciseId,
        weight: data.weight,
        reps: data.reps,
        setType: data.setType ?? "WORKING",
        orderIndex: nextOrder,
      },
    });

    // Revalidate the session page
    const sessionExercise = await db.workoutSessionExercise.findUnique({
      where: { id: sessionExerciseId },
      select: { workoutSessionId: true },
    });

    if (sessionExercise) {
      revalidatePath(`/workouts/${sessionExercise.workoutSessionId}/session`);
    }

    return { success: true, data: set };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add set",
    };
  }
}

export async function updateSet(
  setId: string,
  data: UpdateSetInput
): Promise<ActionResult> {
  try {
    const set = await db.workoutSet.update({
      where: { id: setId },
      data: {
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.reps !== undefined && { reps: data.reps }),
        ...(data.setType !== undefined && { setType: data.setType }),
      },
      include: {
        sessionExercise: {
          select: { workoutSessionId: true },
        },
      },
    });

    revalidatePath(
      `/workouts/${set.sessionExercise.workoutSessionId}/session`
    );
    return { success: true, data: set };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update set",
    };
  }
}

export async function deleteSet(setId: string): Promise<ActionResult> {
  try {
    const set = await db.workoutSet.delete({
      where: { id: setId },
      include: {
        sessionExercise: {
          select: { workoutSessionId: true },
        },
      },
    });

    revalidatePath(
      `/workouts/${set.sessionExercise.workoutSessionId}/session`
    );
    return { success: true, data: { id: setId } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete set",
    };
  }
}

export async function completeSet(setId: string): Promise<ActionResult> {
  try {
    const set = await db.workoutSet.update({
      where: { id: setId },
      data: {
        completedAt: new Date(),
      },
      include: {
        sessionExercise: {
          select: {
            workoutSessionId: true,
            exerciseId: true,
          },
        },
      },
    });

    // If this is a working set with weight and reps, check for PR
    if (set.setType === "WORKING" && set.weight && set.reps) {
      await checkAndUpdatePR(
        set.sessionExercise.exerciseId,
        set.weight,
        set.reps,
        set.sessionExercise.workoutSessionId
      );
    }

    revalidatePath(
      `/workouts/${set.sessionExercise.workoutSessionId}/session`
    );
    return { success: true, data: set };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to complete set",
    };
  }
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string
): Promise<ActionResult> {
  try {
    // Get the max orderIndex for exercises in this session
    const maxOrder = await db.workoutSessionExercise.aggregate({
      where: { workoutSessionId: sessionId },
      _max: { orderIndex: true },
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const sessionExercise = await db.workoutSessionExercise.create({
      data: {
        workoutSessionId: sessionId,
        exerciseId,
        orderIndex: nextOrder,
      },
      include: {
        exercise: {
          include: {
            primaryMuscleGroup: true,
          },
        },
        sets: true,
      },
    });

    revalidatePath(`/workouts/${sessionId}/session`);
    return { success: true, data: sessionExercise };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add exercise to session",
    };
  }
}

export async function getRecentSessions(
  limit: number = 5
): Promise<ActionResult> {
  try {
    const sessions = await db.workoutSession.findMany({
      where: { status: "COMPLETED" },
      include: {
        program: { select: { id: true, name: true } },
        programWorkout: { select: { id: true, name: true } },
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
        _count: {
          select: { exercises: true },
        },
      },
      orderBy: { endedAt: "desc" },
      take: limit,
    });

    return { success: true, data: sessions };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch recent sessions",
    };
  }
}

export async function updateSession(
  id: string,
  data: UpdateSessionInput
): Promise<ActionResult> {
  try {
    const session = await db.workoutSession.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    revalidatePath("/history");
    revalidatePath(`/workouts/${id}/session`);
    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update session",
    };
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────

export async function calculate1RM(
  weight: number,
  reps: number
): Promise<ActionResult<number>> {
  try {
    if (weight <= 0 || reps <= 0) {
      return { success: false, error: "Weight and reps must be positive" };
    }

    // Epley formula: weight * (1 + reps / 30)
    const estimated1RM = weight * (1 + reps / 30);

    return { success: true, data: Math.round(estimated1RM * 100) / 100 };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to calculate 1RM",
    };
  }
}

export async function checkAndUpdatePR(
  exerciseId: string,
  weight: number,
  reps: number,
  sessionId: string
): Promise<ActionResult> {
  try {
    const estimated1RM = weight * (1 + reps / 30);

    // Get the current best PR for this exercise
    const currentBest = await db.personalRecord.findFirst({
      where: { exerciseId },
      orderBy: { estimated1RM: "desc" },
    });

    // If no existing PR or this beats the current best
    if (!currentBest || estimated1RM > currentBest.estimated1RM) {
      const pr = await db.personalRecord.create({
        data: {
          exerciseId,
          weight,
          reps,
          estimated1RM: Math.round(estimated1RM * 100) / 100,
          workoutSessionId: sessionId,
        },
      });

      revalidatePath(`/exercises/${exerciseId}`);
      revalidatePath("/history");
      return {
        success: true,
        data: { isNewPR: true, personalRecord: pr },
      };
    }

    return {
      success: true,
      data: { isNewPR: false, currentBest },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check/update personal record",
    };
  }
}
