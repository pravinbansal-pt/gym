"use server";

import { db } from "@/lib/db";
import { EquipmentType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function getExercises(filters?: {
  search?: string;
  muscleGroup?: string;
  equipment?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.muscleGroup) {
    where.primaryMuscleGroupId = filters.muscleGroup;
  }
  if (filters?.equipment) {
    where.equipmentType = filters.equipment;
  }

  return db.exercise.findMany({
    where,
    include: {
      primaryMuscleGroup: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getExerciseById(id: string) {
  return db.exercise.findUnique({
    where: { id },
    include: {
      primaryMuscleGroup: true,
      secondaryMuscleGroups: true,
      personalRecords: {
        orderBy: { estimated1RM: "desc" },
        take: 1,
      },
      sessionExercises: {
        include: {
          workoutSession: true,
        },
        orderBy: {
          workoutSession: { startedAt: "desc" },
        },
        take: 1,
      },
      _count: {
        select: {
          sessionExercises: true,
        },
      },
    },
  });
}

export async function getMuscleGroups() {
  return db.muscleGroup.findMany({
    orderBy: { displayOrder: "asc" },
  });
}

export async function createExercise(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const primaryMuscleGroupId = formData.get("primaryMuscleGroupId") as string;
  const equipmentType = (formData.get("equipmentType") as EquipmentType) || "OTHER";

  if (!name || !primaryMuscleGroupId) {
    throw new Error("Name and primary muscle group are required");
  }

  const exercise = await db.exercise.create({
    data: {
      name,
      description,
      primaryMuscleGroupId,
      equipmentType,
    },
  });

  revalidatePath("/exercises");
  return exercise;
}

export async function updateExercise(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const primaryMuscleGroupId = formData.get("primaryMuscleGroupId") as string;
  const equipmentType = (formData.get("equipmentType") as EquipmentType) || "OTHER";

  if (!name || !primaryMuscleGroupId) {
    throw new Error("Name and primary muscle group are required");
  }

  await db.exercise.update({
    where: { id },
    data: {
      name,
      description: description ?? null,
      primaryMuscleGroupId,
      equipmentType,
    },
  });

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  redirect(`/exercises/${id}`);
}

export async function deleteExercise(id: string) {
  await db.exercise.delete({ where: { id } });

  revalidatePath("/exercises");
  redirect("/exercises");
}
