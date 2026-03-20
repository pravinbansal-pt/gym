"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CreateProgramWorkoutInput {
  name: string;
  dayIndex?: number;
  phaseId?: string;
}

interface UpdateProgramWorkoutInput {
  name?: string;
  dayIndex?: number;
  phaseId?: string | null;
  orderIndex?: number;
}

interface ExerciseConfig {
  orderIndex?: number;
  warmUpSets?: number | null;
  workingSets?: number | null;
  warmUpPercent?: number | null;
  targetReps?: string | null;
  restSeconds?: number | null;
}

interface UpdateWorkoutExerciseInput {
  orderIndex?: number;
  warmUpSets?: number | null;
  workingSets?: number | null;
  warmUpPercent?: number | null;
  targetReps?: string | null;
  restSeconds?: number | null;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function getProgramWorkouts(
  programId: string
): Promise<ActionResult> {
  try {
    const workouts = await db.programWorkout.findMany({
      where: { programId },
      include: {
        phase: true,
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              include: {
                primaryMuscleGroup: true,
              },
            },
          },
        },
        _count: {
          select: { exercises: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return { success: true, data: workouts };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch program workouts",
    };
  }
}

export async function getProgramWorkout(id: string): Promise<ActionResult> {
  try {
    const workout = await db.programWorkout.findUnique({
      where: { id },
      include: {
        program: true,
        phase: true,
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: {
              include: {
                primaryMuscleGroup: true,
                secondaryMuscleGroups: true,
              },
            },
          },
        },
      },
    });

    if (!workout) {
      return { success: false, error: "Workout not found" };
    }

    return { success: true, data: workout };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch program workout",
    };
  }
}

export async function createProgramWorkout(
  programId: string,
  data: CreateProgramWorkoutInput
): Promise<ActionResult> {
  try {
    // Get the max orderIndex for workouts in this program
    const maxOrder = await db.programWorkout.aggregate({
      where: { programId },
      _max: { orderIndex: true },
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const workout = await db.programWorkout.create({
      data: {
        programId,
        name: data.name,
        dayIndex: data.dayIndex ?? nextOrder,
        orderIndex: nextOrder,
        phaseId: data.phaseId,
      },
      include: {
        phase: true,
      },
    });

    revalidatePath(`/programs/${programId}`);
    return { success: true, data: workout };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create program workout",
    };
  }
}

export async function updateProgramWorkout(
  id: string,
  data: UpdateProgramWorkoutInput
): Promise<ActionResult> {
  try {
    const workout = await db.programWorkout.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.dayIndex !== undefined && { dayIndex: data.dayIndex }),
        ...(data.phaseId !== undefined && { phaseId: data.phaseId }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
      include: {
        phase: true,
      },
    });

    revalidatePath(`/programs/${workout.programId}`);
    return { success: true, data: workout };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update program workout",
    };
  }
}

export async function deleteProgramWorkout(id: string): Promise<ActionResult> {
  try {
    const workout = await db.programWorkout.delete({ where: { id } });

    revalidatePath(`/programs/${workout.programId}`);
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete program workout",
    };
  }
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  config?: ExerciseConfig
): Promise<ActionResult> {
  try {
    // Get the max orderIndex for exercises in this workout
    const maxOrder = await db.programWorkoutExercise.aggregate({
      where: { programWorkoutId: workoutId },
      _max: { orderIndex: true },
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const workoutExercise = await db.programWorkoutExercise.create({
      data: {
        programWorkoutId: workoutId,
        exerciseId,
        orderIndex: config?.orderIndex ?? nextOrder,
        warmUpSets: config?.warmUpSets,
        workingSets: config?.workingSets,
        warmUpPercent: config?.warmUpPercent,
        targetReps: config?.targetReps,
        restSeconds: config?.restSeconds,
      },
      include: {
        exercise: {
          include: {
            primaryMuscleGroup: true,
          },
        },
      },
    });

    // Get the workout to know the programId for revalidation
    const workout = await db.programWorkout.findUnique({
      where: { id: workoutId },
      select: { programId: true },
    });

    if (workout) {
      revalidatePath(`/programs/${workout.programId}`);
    }

    return { success: true, data: workoutExercise };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add exercise to workout",
    };
  }
}

export async function updateWorkoutExercise(
  id: string,
  data: UpdateWorkoutExerciseInput
): Promise<ActionResult> {
  try {
    const workoutExercise = await db.programWorkoutExercise.update({
      where: { id },
      data: {
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.warmUpSets !== undefined && { warmUpSets: data.warmUpSets }),
        ...(data.workingSets !== undefined && { workingSets: data.workingSets }),
        ...(data.warmUpPercent !== undefined && {
          warmUpPercent: data.warmUpPercent,
        }),
        ...(data.targetReps !== undefined && { targetReps: data.targetReps }),
        ...(data.restSeconds !== undefined && { restSeconds: data.restSeconds }),
      },
      include: {
        exercise: {
          include: {
            primaryMuscleGroup: true,
          },
        },
        programWorkout: {
          select: { programId: true },
        },
      },
    });

    revalidatePath(`/programs/${workoutExercise.programWorkout.programId}`);
    return { success: true, data: workoutExercise };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update workout exercise",
    };
  }
}

export async function removeExerciseFromWorkout(
  id: string
): Promise<ActionResult> {
  try {
    const workoutExercise = await db.programWorkoutExercise.delete({
      where: { id },
      include: {
        programWorkout: {
          select: { programId: true },
        },
      },
    });

    revalidatePath(`/programs/${workoutExercise.programWorkout.programId}`);
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove exercise from workout",
    };
  }
}

export async function reorderWorkoutExercises(
  workoutId: string,
  exerciseIds: string[]
): Promise<ActionResult> {
  try {
    await db.$transaction(
      exerciseIds.map((exerciseId, index) =>
        db.programWorkoutExercise.update({
          where: { id: exerciseId },
          data: { orderIndex: index },
        })
      )
    );

    // Get the workout for revalidation
    const workout = await db.programWorkout.findUnique({
      where: { id: workoutId },
      select: { programId: true },
    });

    if (workout) {
      revalidatePath(`/programs/${workout.programId}`);
    }

    return { success: true, data: { workoutId, exerciseIds } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reorder workout exercises",
    };
  }
}
