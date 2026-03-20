"use server";

import { db } from "@/lib/db";
import { EquipmentType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface ExerciseFilters {
  muscleGroupId?: string;
  equipmentType?: EquipmentType;
  search?: string;
  skip?: number;
  take?: number;
}

interface CreateExerciseInput {
  name: string;
  description?: string;
  equipmentType?: EquipmentType;
  imageUrl?: string;
  primaryMuscleGroupId: string;
  secondaryMuscleGroupIds?: string[];
}

interface UpdateExerciseInput {
  name?: string;
  description?: string;
  equipmentType?: EquipmentType;
  imageUrl?: string;
  primaryMuscleGroupId?: string;
  secondaryMuscleGroupIds?: string[];
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function getExercises(
  filters?: ExerciseFilters
): Promise<ActionResult> {
  try {
    const where: Record<string, unknown> = {};

    if (filters?.muscleGroupId) {
      where.primaryMuscleGroupId = filters.muscleGroupId;
    }

    if (filters?.equipmentType) {
      where.equipmentType = filters.equipmentType;
    }

    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    const [exercises, total] = await Promise.all([
      db.exercise.findMany({
        where,
        include: {
          primaryMuscleGroup: true,
        },
        orderBy: { name: "asc" },
        skip: filters?.skip ?? 0,
        take: filters?.take ?? 50,
      }),
      db.exercise.count({ where }),
    ]);

    return { success: true, data: { exercises, total } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch exercises",
    };
  }
}

export async function getExercise(id: string): Promise<ActionResult> {
  try {
    const exercise = await db.exercise.findUnique({
      where: { id },
      include: {
        primaryMuscleGroup: true,
        secondaryMuscleGroups: true,
      },
    });

    if (!exercise) {
      return { success: false, error: "Exercise not found" };
    }

    return { success: true, data: exercise };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch exercise",
    };
  }
}

export async function createExercise(
  data: CreateExerciseInput
): Promise<ActionResult> {
  try {
    const exercise = await db.exercise.create({
      data: {
        name: data.name,
        description: data.description,
        equipmentType: data.equipmentType ?? "OTHER",
        imageUrl: data.imageUrl,
        primaryMuscleGroupId: data.primaryMuscleGroupId,
        secondaryMuscleGroups: data.secondaryMuscleGroupIds?.length
          ? { connect: data.secondaryMuscleGroupIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        primaryMuscleGroup: true,
        secondaryMuscleGroups: true,
      },
    });

    revalidatePath("/exercises");
    return { success: true, data: exercise };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create exercise",
    };
  }
}

export async function updateExercise(
  id: string,
  data: UpdateExerciseInput
): Promise<ActionResult> {
  try {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.equipmentType !== undefined) updateData.equipmentType = data.equipmentType;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.primaryMuscleGroupId !== undefined) {
      updateData.primaryMuscleGroupId = data.primaryMuscleGroupId;
    }

    if (data.secondaryMuscleGroupIds !== undefined) {
      updateData.secondaryMuscleGroups = {
        set: data.secondaryMuscleGroupIds.map((id) => ({ id })),
      };
    }

    const exercise = await db.exercise.update({
      where: { id },
      data: updateData,
      include: {
        primaryMuscleGroup: true,
        secondaryMuscleGroups: true,
      },
    });

    revalidatePath("/exercises");
    revalidatePath(`/exercises/${id}`);
    return { success: true, data: exercise };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update exercise",
    };
  }
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  try {
    await db.exercise.delete({ where: { id } });

    revalidatePath("/exercises");
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete exercise",
    };
  }
}

export async function getMuscleGroups(): Promise<ActionResult> {
  try {
    const muscleGroups = await db.muscleGroup.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return { success: true, data: muscleGroups };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch muscle groups",
    };
  }
}

export async function getExerciseHistory(
  exerciseId: string
): Promise<ActionResult> {
  try {
    const sessionExercises = await db.workoutSessionExercise.findMany({
      where: { exerciseId },
      include: {
        sets: {
          orderBy: { orderIndex: "asc" },
        },
        workoutSession: {
          select: {
            id: true,
            name: true,
            startedAt: true,
            endedAt: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        workoutSession: {
          createdAt: "desc",
        },
      },
    });

    // Group by session
    const grouped = sessionExercises.map((se) => ({
      session: se.workoutSession,
      sets: se.sets,
    }));

    return { success: true, data: grouped };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch exercise history",
    };
  }
}
