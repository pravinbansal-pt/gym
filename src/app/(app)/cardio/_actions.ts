"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { computePace } from "@/lib/cardio-utils";
import { getSession } from "@/lib/get-session";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getCardioActivities(options?: {
  take?: number;
  skip?: number;
}) {
  return db.cardioActivity.findMany({
    orderBy: { activityDate: "desc" },
    take: options?.take ?? 50,
    skip: options?.skip ?? 0,
    include: {
      programWorkout: { select: { name: true } },
    },
  });
}

export async function getCardioActivity(id: string) {
  return db.cardioActivity.findUnique({
    where: { id },
    include: {
      programWorkout: { select: { name: true } },
      program: { select: { name: true } },
    },
  });
}

export async function createCardioActivity(formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const activityType = (formData.get("activityType") as string) || "Run";
  const distanceKm = parseFloat(formData.get("distanceKm") as string);
  const durationMinutes = parseFloat(formData.get("durationMinutes") as string);
  const elevationGain = formData.get("elevationGain")
    ? parseFloat(formData.get("elevationGain") as string)
    : null;
  const averageHeartrate = formData.get("averageHeartrate")
    ? parseFloat(formData.get("averageHeartrate") as string)
    : null;
  const dateStr = formData.get("activityDate") as string;

  const distanceMeters = distanceKm * 1000;
  const movingTimeSeconds = Math.round(durationMinutes * 60);

  await db.cardioActivity.create({
    data: {
      name,
      activityType,
      distanceMeters,
      movingTimeSeconds,
      elapsedTimeSeconds: movingTimeSeconds,
      averagePaceSecsPerKm: computePace(distanceMeters, movingTimeSeconds),
      elevationGainMeters: elevationGain,
      averageHeartrate,
      source: "manual",
      activityDate: dateStr ? new Date(dateStr) : new Date(),
    },
  });

  revalidatePath("/cardio");
  revalidatePath("/");
}

export async function deleteCardioActivity(id: string) {
  await requireAuth();
  await db.cardioActivity.delete({ where: { id } });
  revalidatePath("/cardio");
  revalidatePath("/");
}

export async function getCardioStats() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const [weekActivities, totalActivities, allTimeStats] = await Promise.all([
    db.cardioActivity.findMany({
      where: {
        activityDate: { gte: startOfWeek, lt: endOfWeek },
      },
    }),
    db.cardioActivity.count(),
    db.cardioActivity.aggregate({
      _sum: { distanceMeters: true },
    }),
  ]);

  const weekDistance = weekActivities.reduce(
    (sum, a) => sum + a.distanceMeters,
    0
  );
  const weekRuns = weekActivities.length;
  const weekAvgPace =
    weekActivities.length > 0
      ? weekActivities.reduce(
          (sum, a) => sum + (a.averagePaceSecsPerKm ?? 0),
          0
        ) / weekActivities.length
      : 0;
  const totalDistance = allTimeStats._sum.distanceMeters ?? 0;

  return {
    weekDistance,
    weekRuns,
    weekAvgPace,
    totalDistance,
    totalActivities,
  };
}
