"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// ─── Program CRUD ───────────────────────────────────────────────────

export async function createProgram(formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const type = formData.get("type") as "SIMPLE" | "PERIODIZED";

  const program = await db.program.create({
    data: { name, description, type },
  });

  redirect(`/programs/${program.id}`);
}

export async function updateProgram(id: string, formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  await db.program.update({
    where: { id },
    data: { name, description },
  });

  revalidatePath(`/programs/${id}`);
}

export async function deleteProgram(id: string) {
  await requireAuth();
  await db.program.delete({ where: { id } });
  redirect("/programs");
}

export async function toggleProgramActive(id: string, isActive: boolean) {
  await requireAuth();
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

export async function updateProgramDefaults(
  id: string,
  data: {
    defaultRestSeconds: number;
    defaultWarmUpSets: number;
    defaultWorkingSets: number;
    defaultWarmUpPercent: number;
  }
) {
  await requireAuth();
  await db.program.update({
    where: { id },
    data: {
      defaultRestSeconds: data.defaultRestSeconds,
      defaultWarmUpSets: data.defaultWarmUpSets,
      defaultWorkingSets: data.defaultWorkingSets,
      defaultWarmUpPercent: data.defaultWarmUpPercent / 100,
    },
  });

  revalidatePath(`/programs/${id}`);
}

// ─── Phase CRUD ─────────────────────────────────────────────────────

export async function createPhase(programId: string, formData: FormData) {
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
  await db.programPhase.delete({ where: { id: phaseId } });
  revalidatePath(`/programs/${programId}`);
}

export async function reorderPhase(
  phaseId: string,
  programId: string,
  direction: "up" | "down"
) {
  await requireAuth();
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
  await requireAuth();
  const name = formData.get("name") as string;
  const phaseId = (formData.get("phaseId") as string) || null;
  const workoutType =
    (formData.get("workoutType") as "STRENGTH" | "CARDIO") || "STRENGTH";

  const maxOrder = await db.programWorkout.aggregate({
    where: { programId },
    _max: { orderIndex: true, dayIndex: true },
  });

  let targetDistanceMeters: number | undefined;
  let targetDurationSeconds: number | undefined;
  let targetPaceSecondsPerKm: number | undefined;
  let cardioNotes: string | undefined;

  if (workoutType === "CARDIO") {
    const distKm = formData.get("targetDistanceKm");
    const durMin = formData.get("targetDurationMinutes");
    const paceStr = formData.get("targetPaceMinPerKm");
    const notes = formData.get("cardioNotes");

    if (distKm) targetDistanceMeters = parseFloat(distKm as string) * 1000;
    if (durMin) targetDurationSeconds = Math.round(parseFloat(durMin as string) * 60);
    if (paceStr) targetPaceSecondsPerKm = parseFloat(paceStr as string) * 60;
    if (notes) cardioNotes = notes as string;
  }

  await db.programWorkout.create({
    data: {
      programId,
      phaseId: phaseId || null,
      name,
      dayIndex: (maxOrder._max.dayIndex ?? -1) + 1,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      workoutType,
      targetDistanceMeters,
      targetDurationSeconds,
      targetPaceSecondsPerKm,
      cardioNotes,
    },
  });

  revalidatePath(`/programs/${programId}`);
}

export async function updateWorkout(
  workoutId: string,
  programId: string,
  formData: FormData
) {
  await requireAuth();
  const name = formData.get("name") as string;
  const phaseId = (formData.get("phaseId") as string) || null;
  const workoutType =
    (formData.get("workoutType") as "STRENGTH" | "CARDIO") || undefined;

  const updatePayload: Parameters<typeof db.programWorkout.update>[0]["data"] = {
    name,
    phaseId: phaseId || null,
  };

  if (workoutType) {
    updatePayload.workoutType = workoutType;
  }

  if (workoutType === "CARDIO") {
    const distKm = formData.get("targetDistanceKm");
    const durMin = formData.get("targetDurationMinutes");
    const paceStr = formData.get("targetPaceMinPerKm");
    const notes = formData.get("cardioNotes");

    updatePayload.targetDistanceMeters = distKm
      ? parseFloat(distKm as string) * 1000
      : null;
    updatePayload.targetDurationSeconds = durMin
      ? Math.round(parseFloat(durMin as string) * 60)
      : null;
    updatePayload.targetPaceSecondsPerKm = paceStr
      ? parseFloat(paceStr as string) * 60
      : null;
    updatePayload.cardioNotes = (notes as string) || null;
  }

  await db.programWorkout.update({
    where: { id: workoutId },
    data: updatePayload,
  });

  revalidatePath(`/programs/${programId}`);
}

export async function deleteWorkout(workoutId: string, programId: string) {
  await requireAuth();
  await db.programWorkout.delete({ where: { id: workoutId } });
  revalidatePath(`/programs/${programId}`);
}

export async function reorderWorkout(
  workoutId: string,
  programId: string,
  direction: "up" | "down"
) {
  await requireAuth();
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
  exerciseId: string
) {
  await requireAuth();
  const program = await db.program.findUniqueOrThrow({
    where: { id: programId },
  });

  const maxOrder = await db.programWorkoutExercise.aggregate({
    where: { programWorkoutId: workoutId },
    _max: { orderIndex: true },
  });

  const warmUpCount = program.defaultWarmUpSets;
  const workingCount = program.defaultWorkingSets;
  const restSecs = program.defaultRestSeconds;
  const targetReps = "";

  // Build default sets: warm-ups then working sets
  const sets: Array<{
    setType: "WARM_UP" | "WORKING";
    targetReps: string;
    restSeconds: number;
    orderIndex: number;
  }> = [];

  for (let i = 0; i < warmUpCount; i++) {
    sets.push({
      setType: "WARM_UP",
      targetReps: "10",
      restSeconds: restSecs,
      orderIndex: i,
    });
  }
  for (let i = 0; i < workingCount; i++) {
    sets.push({
      setType: "WORKING",
      targetReps,
      restSeconds: restSecs,
      orderIndex: warmUpCount + i,
    });
  }

  await db.programWorkoutExercise.create({
    data: {
      programWorkoutId: workoutId,
      exerciseId,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      warmUpSets: warmUpCount,
      workingSets: workingCount,
      warmUpPercent: program.defaultWarmUpPercent,
      restSeconds: restSecs,
      sets: { create: sets },
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
  await requireAuth();
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

// ─── Program Workout Set Management ─────────────────────────────────

export async function updateProgramSet(
  setId: string,
  programId: string,
  workoutId: string,
  data: {
    setType?: "WARM_UP" | "WORKING";
    targetWeight?: number | null;
    targetReps?: string;
    restSeconds?: number;
  }
) {
  await requireAuth();
  await db.programWorkoutSet.update({
    where: { id: setId },
    data,
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function addSetToExercise(
  exerciseConfigId: string,
  programId: string,
  workoutId: string
) {
  await requireAuth();
  // Get the last set to copy values from
  const lastSet = await db.programWorkoutSet.findFirst({
    where: { programWorkoutExerciseId: exerciseConfigId },
    orderBy: { orderIndex: "desc" },
  });

  const maxOrder = await db.programWorkoutSet.aggregate({
    where: { programWorkoutExerciseId: exerciseConfigId },
    _max: { orderIndex: true },
  });

  await db.programWorkoutSet.create({
    data: {
      programWorkoutExerciseId: exerciseConfigId,
      setType: lastSet?.setType ?? "WORKING",
      targetWeight: lastSet?.targetWeight ?? null,
      targetReps: lastSet?.targetReps ?? "",
      restSeconds: lastSet?.restSeconds ?? 90,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function removeProgramSet(
  setId: string,
  programId: string,
  workoutId: string
) {
  await requireAuth();
  await db.programWorkoutSet.delete({
    where: { id: setId },
  });

  revalidatePath(`/programs/${programId}/workouts/${workoutId}`);
}

export async function removeExerciseFromWorkout(
  exerciseConfigId: string,
  programId: string,
  workoutId: string
) {
  await requireAuth();
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
  await requireAuth();
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
  programId: string,
  scheduledWorkoutId?: string,
) {
  await requireAuth();
  const workout = await db.programWorkout.findUnique({
    where: { id: workoutId },
    include: {
      exercises: {
        include: {
          exercise: true,
          sets: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: { orderIndex: "asc" },
      },
      program: true,
    },
  });

  if (!workout) throw new Error("Workout not found");

  const exerciseEntries = workout.exercises.map(
    (
      we: {
        exerciseId: string;
        warmUpSets: number | null;
        workingSets: number | null;
        sets: Array<{
          setType: "WARM_UP" | "WORKING";
          targetWeight: number | null;
          targetReps: string | null;
          orderIndex: number;
        }>;
      },
      idx: number
    ) => {
      // Use per-set data if available, otherwise fall back to counts
      const hasSets = we.sets.length > 0;

      const sessionSets = hasSets
        ? we.sets.map((s, i) => ({
            setType: s.setType,
            weight: s.targetWeight,
            reps: s.targetReps ? parseInt(s.targetReps, 10) || null : null,
            orderIndex: i,
          }))
        : [
            ...Array.from(
              { length: we.warmUpSets ?? workout.program.defaultWarmUpSets },
              (_, i) => ({
                setType: "WARM_UP" as const,
                weight: null,
                reps: null,
                orderIndex: i,
              })
            ),
            ...Array.from(
              { length: we.workingSets ?? workout.program.defaultWorkingSets },
              (_, i) => ({
                setType: "WORKING" as const,
                weight: null,
                reps: null,
                orderIndex:
                  (we.warmUpSets ?? workout.program.defaultWarmUpSets) + i,
              })
            ),
          ];

      return {
        exerciseId: we.exerciseId,
        orderIndex: idx,
        sets: { create: sessionSets },
      };
    }
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

  // Link to scheduled workout if provided
  if (scheduledWorkoutId) {
    await db.scheduledWorkout.update({
      where: { id: scheduledWorkoutId },
      data: { sessionId: session.id },
    }).catch(() => {});
  }

  redirect(`/workouts/${session.id}/session`);
}
