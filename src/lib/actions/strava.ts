"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  fetchActivities,
  fetchActivityDetail,
  type StravaActivity,
} from "@/lib/strava";
import { computePace } from "@/lib/cardio-utils";

/** Prisma requires DbNull for nullable JSON fields, not plain null */
function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value != null ? (value as Prisma.InputJsonValue) : Prisma.DbNull;
}

const CARDIO_ACTIVITY_TYPES = new Set([
  "Run",
  "Walk",
  "Hike",
  "Ride",
  "VirtualRun",
  "VirtualRide",
  "TrailRun",
]);

function mapStravaActivity(activity: StravaActivity) {
  return {
    name: activity.name,
    activityType: activity.type,
    distanceMeters: activity.distance,
    movingTimeSeconds: activity.moving_time,
    elapsedTimeSeconds: activity.elapsed_time,
    averagePaceSecsPerKm: computePace(activity.distance, activity.moving_time),
    averageSpeedMps: activity.average_speed,
    maxSpeedMps: activity.max_speed,
    elevationGainMeters: activity.total_elevation_gain || null,
    averageHeartrate: activity.average_heartrate ?? null,
    maxHeartrate: activity.max_heartrate ?? null,
    averageCadence: activity.average_cadence ?? null,
    calories: activity.calories ?? null,
    splits: jsonOrNull(activity.splits_metric),
    laps: jsonOrNull(activity.laps),
    bestEfforts: jsonOrNull(activity.best_efforts),
    summaryPolyline: activity.map?.summary_polyline ?? null,
    source: "strava" as const,
    stravaActivityId: BigInt(activity.id),
    activityDate: new Date(activity.start_date),
  };
}

export async function syncStravaActivities(options?: {
  daysBack?: number;
}) {
  const daysBack = options?.daysBack ?? 90;
  const after = Math.floor(
    (Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000
  );

  let synced = 0;
  let skipped = 0;
  let page = 1;
  const perPage = 30;

  while (true) {
    const activities = await fetchActivities({
      after,
      page,
      per_page: perPage,
    });

    if (activities.length === 0) break;

    for (const activity of activities) {
      // Only sync cardio activities
      if (!CARDIO_ACTIVITY_TYPES.has(activity.type)) {
        skipped++;
        continue;
      }

      // Skip if already synced
      const existing = await db.cardioActivity.findUnique({
        where: { stravaActivityId: BigInt(activity.id) },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Fetch detailed data for splits, laps, best efforts
      let detailed: StravaActivity;
      try {
        detailed = await fetchActivityDetail(activity.id);
      } catch {
        // Fall back to summary data if detail fetch fails
        detailed = activity;
      }

      const data = mapStravaActivity(detailed);
      await db.cardioActivity.create({ data });
      synced++;
    }

    if (activities.length < perPage) break;
    page++;
  }

  // Auto-link synced activities to program cardio workouts
  if (synced > 0) {
    await autoMatchCardioToProgram();
  }

  return { synced, skipped };
}

/**
 * Walk through unlinked cardio activities and match them to the next
 * CARDIO workout in the active program cycle, in chronological order.
 *
 * How it works:
 * 1. Find the active program and its workout order
 * 2. Determine the last completed workout (strength or cardio)
 * 3. Find unlinked cardio activities sorted chronologically
 * 4. For each one, check if the "next" workout in the cycle is CARDIO
 * 5. If yes, link the activity and advance to the next workout
 */
async function autoMatchCardioToProgram() {
  const activeProgram = await db.program.findFirst({
    where: { isActive: true },
    include: {
      workouts: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!activeProgram || activeProgram.workouts.length === 0) return;

  const workouts = activeProgram.workouts;

  // Find the most recently completed workout (strength session or linked cardio)
  const [lastSession, lastLinkedCardio] = await Promise.all([
    db.workoutSession.findFirst({
      where: { programId: activeProgram.id, status: "COMPLETED" },
      select: { programWorkoutId: true, endedAt: true },
      orderBy: { endedAt: "desc" },
    }),
    db.cardioActivity.findFirst({
      where: {
        programId: activeProgram.id,
        programWorkoutId: { not: null },
      },
      select: { programWorkoutId: true, activityDate: true },
      orderBy: { activityDate: "desc" },
    }),
  ]);

  // Determine which workout index we're at in the cycle
  let lastCompletedIdx = -1;
  if (lastSession?.programWorkoutId || lastLinkedCardio?.programWorkoutId) {
    const sessionDate = lastSession?.endedAt ?? new Date(0);
    const cardioDate = lastLinkedCardio?.activityDate ?? new Date(0);

    const mostRecentId =
      cardioDate > sessionDate
        ? lastLinkedCardio!.programWorkoutId
        : lastSession!.programWorkoutId;

    lastCompletedIdx = workouts.findIndex((w) => w.id === mostRecentId);
  }

  // Get unlinked cardio activities, oldest first
  const unlinked = await db.cardioActivity.findMany({
    where: {
      programWorkoutId: null,
      programId: null,
    },
    orderBy: { activityDate: "asc" },
  });

  if (unlinked.length === 0) return;

  let currentIdx = lastCompletedIdx;

  for (const activity of unlinked) {
    // Walk through the cycle to find the next CARDIO workout
    let stepsChecked = 0;
    let matched = false;

    while (stepsChecked < workouts.length) {
      currentIdx = (currentIdx + 1) % workouts.length;
      stepsChecked++;
      const workout = workouts[currentIdx];

      if (workout.workoutType === "CARDIO") {
        // Link this activity to this workout
        await db.cardioActivity.update({
          where: { id: activity.id },
          data: {
            programWorkoutId: workout.id,
            programId: activeProgram.id,
          },
        });
        matched = true;
        break;
      }
    }

    // If no CARDIO workout found in the cycle, stop trying
    if (!matched) break;
  }
}
