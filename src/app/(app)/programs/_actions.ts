"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Program CRUD ───────────────────────────────────────────────────

export async function createProgram(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const type = formData.get("type") as "SIMPLE" | "PERIODIZED";

  const program = await db.program.create({
    data: { name, description, type },
  });

  redirect(`/programs/${program.id}`);
}

export async function updateProgram(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  await db.program.update({
    where: { id },
    data: { name, description },
  });

  revalidatePath(`/programs/${id}`);
}

export async function deleteProgram(id: string) {
  await db.program.delete({ where: { id } });
  redirect("/programs");
}

export async function toggleProgramActive(id: string, isActive: boolean) {
  if (isActive) {
    // Deactivate all other programs first
    await db.program.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  await db.program.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath(`/programs/${id}`);
  revalidatePath("/programs");
}

export async function updateProgramDefaults(id: string, formData: FormData) {
  const defaultRestSeconds = parseInt(
    formData.get("defaultRestSeconds") as string,
    10
  );
  const defaultWarmUpSets = parseInt(
    formData.get("defaultWarmUpSets") as string,
    10
  );
  const defaultWorkingSets = parseInt(
    formData.get("defaultWorkingSets") as string,
    10
  );
  const defaultWarmUpPercent =
    parseFloat(formData.get("defaultWarmUpPercent") as string) / 100;

  await db.program.update({
    where: { id },
    data: {
      defaultRestSeconds,
      defaultWarmUpSets,
      defaultWorkingSets,
      defaultWarmUpPercent,
    },
  });

  revalidatePath(`/programs/${id}`);
}

// ─── Phase CRUD ─────────────────────────────────────────────────────

export async function createPhase(programId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const durationWeeks = parseInt(
    formData.get("durationWeeks") as string,
    10
  );

  const maxOrder = await db.programPhase.aggregate({
    where: { programId },
    _max: { orderIndex: true },
  });

  await db.programPhase.create({
    data: {
      programId,
      name,
      description,
      durationWeeks,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function updatePhase(
  phaseId: string,
  programId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const durationWeeks = parseInt(
    formData.get("durationWeeks") as string,
    10
  );

  await db.programPhase.update({
    where: { id: phaseId },
    data: { name, description, durationWeeks },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deletePhase(phaseId: string, programId: string) {
  await db.programPhase.delete({ where: { id: phaseId } });
  revalidatePath(`/programs/${programId}`);
}

export async function reorderPhase(
  phaseId: string,
  programId: string,
  direction: "up" | "down"
) {
  const phases = await db.programPhase.findMany({
    where: { programId },
    orderBy: { orderIndex: "asc" },
  });

  const idx = phases.findIndex(
    (p: { id: string }) => p.id === phaseId
  );
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= phases.length) return;

  const current = phases[idx]!;
  const swap = phases[swapIdx]!;

  await db.$transaction([
    db.programPhase.update({
      where: { id: current.id },
      data: { orderIndex: swap.orderIndex },
    }),
    db.programPhase.update({
      where: { id: swap.id },
      data: { orderIndex: current.orderIndex },
    }),
  ]);

  revalidatePath(`/programs/${programId}`);
}

// ─── Workout CRUD ───────────────────────────────────────────────────

export async function createWorkout(programId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const phaseId = (formData.get("phaseId") as string) || null;

  const maxOrder = await db.programWorkout.aggregate({
    where: { programId },
    _max: { orderIndex: true, dayIndex: true },
  });

  await db.programWorkout.create({
    data: {
      programId,
      phaseId: phaseId || null,
      name,
      dayIndex: (maxOrder._max.dayIndex ?? -1) + 1,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function updateWorkout(
  workoutId: string,
  programId: string,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const phaseId = (formData.get("phaseId") as string) || null;

  await db.programWorkout.update({
    where: { id: workoutId },
    data: { name, phaseId: phaseId || null },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deleteWorkout(workoutId: string, programId: string) {
  await db.programWorkout.delete({ where: { id: workoutId } });
  revalidatePath(`/programs/${programId}`);
}

export async function reorderWorkout(
  workoutId: string,
  programId: string,
  direction: "up" | "down"
) {
  const workouts = await db.programWorkout.findMany({
    where: { programId },
    orderBy: { orderIndex: "asc" },
  });

  const idx = workouts.findIndex(
    (w: { id: string }) => w.id === workoutId
  );
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= workouts.length) return;

  const current = workouts[idx]!;
  const swap = workouts[swapIdx]!;

  await db.$transaction([
    db.programWorkout.update({
      where: { id: current.id },
      data: { orderIndex: swap.orderIndex, dayIndex: swap.dayIndex },
    }),
    db.programWorkout.update({
      where: { id: swap.id },
      data: { orderIndex: current.orderIndex, dayIndex: current.dayIndex },
    }),
  ]);

  revalidatePath(`/programs/${programId}`);
}

// ─── Workout Exercises ──────────────────────────────────────────────

export async function addExerciseToWorkout(
  workoutId: string,
  programId: string,
  formData: FormData
) {
  const exerciseId = formData.get("exerciseId") as string;
  const warmUpSets = formData.get("warmUpSets")
    ? parseInt(formData.get("warmUpSets") as string, 10)
    : null;
  const workingSets = formData.get("workingSets")
    ? parseInt(formData.get("workingSets") as string, 10)
    : null;
  const warmUpPercent = formData.get("warmUpPercent")
    ? parseFloat(formData.get("warmUpPercent") as string) / 100
    : null;
  const targetReps = (formData.get("targetReps") as string) || null;
  const restSeconds = formData.get("restSeconds")
    ? parseInt(formData.get("restSeconds") as string, 10)
    : null;

  const maxOrder = await db.programWorkoutExercise.aggregate({
    where: { programWorkoutId: workoutId },
    _max: { orderIndex: true },
  });

  await db.programWorkoutExercise.create({
    data: {
      programWorkoutId: workoutId,
      exerciseId,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      warmUpSets,
      workingSets,
      warmUpPercent,
      targetReps,
      restSeconds,
    },
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function updateWorkoutExercise(
  exerciseConfigId: string,
  programId: string,
  workoutId: string,
  formData: FormData
) {
  const warmUpSets = formData.get("warmUpSets")
    ? parseInt(formData.get("warmUpSets") as string, 10)
    : null;
  const workingSets = formData.get("workingSets")
    ? parseInt(formData.get("workingSets") as string, 10)
    : null;
  const warmUpPercent = formData.get("warmUpPercent")
    ? parseFloat(formData.get("warmUpPercent") as string) / 100
    : null;
  const targetReps = (formData.get("targetReps") as string) || null;
  const restSeconds = formData.get("restSeconds")
    ? parseInt(formData.get("restSeconds") as string, 10)
    : null;

  await db.programWorkoutExercise.update({
    where: { id: exerciseConfigId },
    data: { warmUpSets, workingSets, warmUpPercent, targetReps, restSeconds },
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function removeExerciseFromWorkout(
  exerciseConfigId: string,
  programId: string,
  workoutId: string
) {
  await db.programWorkoutExercise.delete({
    where: { id: exerciseConfigId },
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function reorderWorkoutExercise(
  exerciseConfigId: string,
  programId: string,
  workoutId: string,
  direction: "up" | "down"
) {
  const exercises = await db.programWorkoutExercise.findMany({
    where: { programWorkoutId: workoutId },
    orderBy: { orderIndex: "asc" },
  });

  const idx = exercises.findIndex(
    (e: { id: string }) => e.id === exerciseConfigId
  );
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= exercises.length) return;

  const current = exercises[idx]!;
  const swap = exercises[swapIdx]!;

  await db.$transaction([
    db.programWorkoutExercise.update({
      where: { id: current.id },
      data: { orderIndex: swap.orderIndex },
    }),
    db.programWorkoutExercise.update({
      where: { id: swap.id },
      data: { orderIndex: current.orderIndex },
    }),
  ]);

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

// ─── Start Workout Session ──────────────────────────────────────────

export async function startWorkoutSession(
  workoutId: string,
  programId: string
) {
  const workout = await db.programWorkout.findUnique({
    where: { id: workoutId },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { orderIndex: "asc" },
      },
      program: true,
    },
  });

  if (!workout) throw new Error("Workout not found");

  const exerciseEntries = workout.exercises.map(
    (
      we: { exerciseId: string; warmUpSets: number | null; workingSets: number | null },
      idx: number
    ) => ({
      exerciseId: we.exerciseId,
      orderIndex: idx,
      sets: {
        create: [
          ...Array.from(
            {
              length:
                we.warmUpSets ?? workout.program.defaultWarmUpSets,
            },
            (_, i) => ({
              setType: "WARM_UP" as const,
              orderIndex: i,
            })
          ),
          ...Array.from(
            {
              length:
                we.workingSets ?? workout.program.defaultWorkingSets,
            },
            (_, i) => ({
              setType: "WORKING" as const,
              orderIndex:
                (we.warmUpSets ?? workout.program.defaultWarmUpSets) + i,
            })
          ),
        ],
      },
    })
  );

  const session = await db.workoutSession.create({
    data: {
      name: workout.name,
      programId,
      programWorkoutId: workoutId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      exercises: {
        create: exerciseEntries,
      },
    },
  });

  redirect(`/workouts/${session.id}/session`);
}
