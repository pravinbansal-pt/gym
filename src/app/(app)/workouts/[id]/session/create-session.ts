"use server";

import { db } from "@/lib/db";

export async function createSession(programWorkoutId: string) {
  // Check if a session already exists for today for this workout
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existing = await db.workoutSession.findFirst({
    where: {
      programWorkoutId,
      createdAt: { gte: todayStart, lte: todayEnd },
      status: { in: ["PLANNED", "IN_PROGRESS", "PAUSED"] },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
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

  return session.id;
}
