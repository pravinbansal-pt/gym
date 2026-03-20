"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Create Session from Workout Template ──────────────────────────

export async function createSessionFromWorkout(programWorkoutId: string) {
  // Check if a session already exists for today for this workout
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existing = await db.workoutSession.findFirst({
    where: {
      programWorkoutId,
      createdAt: { gte: todayStart, lte: todayEnd },
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    select: { id: true },
  });

  if (existing) {
    return { sessionId: existing.id };
  }

  // Fetch the workout template with exercises
  const programWorkout = await db.programWorkout.findUniqueOrThrow({
    where: { id: programWorkoutId },
    include: {
      program: true,
      exercises: {
        include: { exercise: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  const program = programWorkout.program;

  // Create session with exercises and empty sets
  const session = await db.workoutSession.create({
    data: {
      name: programWorkout.name,
      programId: program.id,
      programWorkoutId: programWorkout.id,
      status: "PLANNED",
      exercises: {
        create: programWorkout.exercises.map((pwe: typeof programWorkout.exercises[number]) => {
          const warmUpSets = pwe.warmUpSets ?? program.defaultWarmUpSets;
          const workingSets = pwe.workingSets ?? program.defaultWorkingSets;
          const sets: Array<{ setType: "WARM_UP" | "WORKING"; orderIndex: number }> = [];

          for (let i = 0; i < warmUpSets; i++) {
            sets.push({
              setType: "WARM_UP" as const,
              orderIndex: i,
            });
          }
          for (let i = 0; i < workingSets; i++) {
            sets.push({
              setType: "WORKING" as const,
              orderIndex: warmUpSets + i,
            });
          }

          return {
            exerciseId: pwe.exerciseId,
            orderIndex: pwe.orderIndex,
            sets: { create: sets },
          };
        }),
      },
    },
    select: { id: true },
  });

  return { sessionId: session.id };
}

// ─── Fetch Full Session Data ────────────────────────────────────────

export async function getSessionData(sessionId: string) {
  const session = await db.workoutSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      program: true,
      programWorkout: {
        include: {
          exercises: {
            orderBy: { orderIndex: "asc" },
          },
        },
      },
      exercises: {
        include: {
          exercise: {
            include: {
              primaryMuscleGroup: true,
            },
          },
          sets: {
            orderBy: { orderIndex: "asc" },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  return session;
}

// ─── Get Previous Performance ───────────────────────────────────────

export async function getPreviousPerformance(exerciseId: string, currentSessionId: string) {
  // Find the last completed session that included this exercise
  const lastSessionExercise = await db.workoutSessionExercise.findFirst({
    where: {
      exerciseId,
      workoutSession: {
        status: "COMPLETED",
        id: { not: currentSessionId },
      },
    },
    include: {
      sets: {
        where: { completedAt: { not: null } },
        orderBy: { orderIndex: "asc" },
      },
      workoutSession: {
        select: { startedAt: true, endedAt: true },
      },
    },
    orderBy: {
      workoutSession: { startedAt: "desc" },
    },
  });

  return lastSessionExercise;
}

// ─── Get Pinned Notes for Exercise ──────────────────────────────────

export async function getPinnedNotes(exerciseId: string) {
  return db.exerciseNote.findMany({
    where: {
      exerciseId,
      isPinned: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

// ─── Save/Update a Set ──────────────────────────────────────────────

export async function updateSet(
  setId: string,
  data: {
    weight?: number | null;
    reps?: number | null;
    setType?: "WARM_UP" | "WORKING";
  }
) {
  const updated = await db.workoutSet.update({
    where: { id: setId },
    data,
  });
  return updated;
}

// ─── Complete a Set ─────────────────────────────────────────────────

export async function completeSet(setId: string, weight: number, reps: number) {
  const set = await db.workoutSet.update({
    where: { id: setId },
    data: {
      weight,
      reps,
      completedAt: new Date(),
    },
    include: {
      sessionExercise: {
        include: {
          exercise: true,
          workoutSession: true,
        },
      },
    },
  });

  // If this is a working set, check for PR
  let isNewPR = false;
  if (set.setType === "WORKING" && weight > 0 && reps > 0) {
    const estimated1RM = weight * (1 + reps / 30);

    const currentPR = await db.personalRecord.findFirst({
      where: { exerciseId: set.sessionExercise.exerciseId },
      orderBy: { estimated1RM: "desc" },
    });

    if (!currentPR || estimated1RM > currentPR.estimated1RM) {
      await db.personalRecord.create({
        data: {
          exerciseId: set.sessionExercise.exerciseId,
          weight,
          reps,
          estimated1RM,
          workoutSessionId: set.sessionExercise.workoutSessionId,
        },
      });
      isNewPR = true;
    }
  }

  return { set, isNewPR };
}

// ─── Uncomplete a Set ───────────────────────────────────────────────

export async function uncompleteSet(setId: string) {
  return db.workoutSet.update({
    where: { id: setId },
    data: { completedAt: null },
  });
}

// ─── Add a Set ──────────────────────────────────────────────────────

export async function addSet(sessionExerciseId: string) {
  const lastSet = await db.workoutSet.findFirst({
    where: { sessionExerciseId },
    orderBy: { orderIndex: "desc" },
  });

  const newSet = await db.workoutSet.create({
    data: {
      sessionExerciseId,
      setType: "WORKING",
      orderIndex: (lastSet?.orderIndex ?? -1) + 1,
    },
  });

  return newSet;
}

// ─── Remove a Set ───────────────────────────────────────────────────

export async function removeSet(setId: string) {
  await db.workoutSet.delete({ where: { id: setId } });
}

// ─── Start Session ──────────────────────────────────────────────────

export async function startSession(sessionId: string) {
  return db.workoutSession.update({
    where: { id: sessionId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
}

// ─── End Session ────────────────────────────────────────────────────

export async function endSession(sessionId: string) {
  const session = await db.workoutSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
    },
  });

  revalidatePath("/history");
  return session;
}

// ─── Save Exercise Note ─────────────────────────────────────────────

export async function saveExerciseNote(
  exerciseId: string,
  sessionExerciseId: string,
  content: string,
  isPinned: boolean = false
) {
  return db.exerciseNote.create({
    data: {
      exerciseId,
      sessionExerciseId,
      content,
      isPinned,
    },
  });
}

// ─── Toggle Note Pin ────────────────────────────────────────────────

export async function toggleNotePin(noteId: string) {
  const note = await db.exerciseNote.findUniqueOrThrow({ where: { id: noteId } });
  return db.exerciseNote.update({
    where: { id: noteId },
    data: { isPinned: !note.isPinned },
  });
}

// ─── Get All Completed Sessions for History ─────────────────────────

export async function getCompletedSessions() {
  const sessions = await db.workoutSession.findMany({
    where: { status: "COMPLETED" },
    include: {
      program: { select: { name: true } },
      exercises: {
        include: {
          exercise: {
            include: { primaryMuscleGroup: true },
          },
          sets: {
            where: { completedAt: { not: null } },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  return sessions;
}

// ─── Get Session Detail for History ─────────────────────────────────

export async function getSessionDetail(sessionId: string) {
  return db.workoutSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      program: { select: { name: true } },
      exercises: {
        include: {
          exercise: {
            include: { primaryMuscleGroup: true },
          },
          sets: {
            orderBy: { orderIndex: "asc" },
          },
          notes: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });
}

// ─── Update Session (for history edit) ──────────────────────────────

export async function updateSessionSets(
  sessionId: string,
  updates: Array<{
    setId: string;
    weight: number | null;
    reps: number | null;
  }>
) {
  await Promise.all(
    updates.map((u) =>
      db.workoutSet.update({
        where: { id: u.setId },
        data: { weight: u.weight, reps: u.reps },
      })
    )
  );

  revalidatePath(`/history/${sessionId}/edit`);
  revalidatePath("/history");
}

// ─── Add Set to Past Session ────────────────────────────────────────

export async function addSetToSession(
  sessionExerciseId: string,
  data: { weight: number | null; reps: number | null }
) {
  const lastSet = await db.workoutSet.findFirst({
    where: { sessionExerciseId },
    orderBy: { orderIndex: "desc" },
  });

  return db.workoutSet.create({
    data: {
      sessionExerciseId,
      setType: "WORKING",
      orderIndex: (lastSet?.orderIndex ?? -1) + 1,
      weight: data.weight,
      reps: data.reps,
      completedAt: new Date(),
    },
  });
}

// ─── Get Session Dates for Calendar ─────────────────────────────────

export async function getSessionDates() {
  const sessions = await db.workoutSession.findMany({
    where: {
      status: "COMPLETED",
      startedAt: { not: null },
    },
    select: { startedAt: true },
  });

  return sessions
    .filter((s: { startedAt: Date | null }) => s.startedAt !== null)
    .map((s: { startedAt: Date | null }) => s.startedAt!.toISOString().split("T")[0]);
}

// ─── Get Sessions for a Specific Date ───────────────────────────────

export async function getSessionsForDate(dateStr: string) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);

  return db.workoutSession.findMany({
    where: {
      status: "COMPLETED",
      startedAt: { gte: start, lte: end },
    },
    include: {
      program: { select: { name: true } },
      exercises: {
        include: {
          exercise: { include: { primaryMuscleGroup: true } },
          sets: {
            where: { completedAt: { not: null } },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}
