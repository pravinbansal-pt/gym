"use server";

import { db } from "@/lib/db";
import type { WeightUnit, DistanceUnit } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { syncStravaActivities } from "@/lib/actions/strava";
import { getSession } from "@/lib/get-session";
import { validateUsername } from "@/lib/username-validation";

export async function getAppSettings() {
  return db.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", defaultWeightUnit: "KG", defaultDistanceUnit: "KM" },
  });
}

export async function updateWeightUnit(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const unit = formData.get("weightUnit") as WeightUnit;
  if (unit !== "KG" && unit !== "LBS") {
    throw new Error("Invalid weight unit");
  }

  await db.appSettings.upsert({
    where: { id: "default" },
    update: { defaultWeightUnit: unit },
    create: { id: "default", defaultWeightUnit: unit },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function updateDistanceUnit(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const unit = formData.get("distanceUnit") as DistanceUnit;
  if (unit !== "KM" && unit !== "MILES") {
    throw new Error("Invalid distance unit");
  }

  await db.appSettings.upsert({
    where: { id: "default" },
    update: { defaultDistanceUnit: unit },
    create: { id: "default", defaultDistanceUnit: unit },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/cardio");
}

export async function getStravaStatus() {
  const connection = await db.stravaConnection.findUnique({
    where: { id: "default" },
  });
  return connection
    ? { connected: true as const, athleteId: connection.stravaAthleteId }
    : { connected: false as const };
}

export async function syncStrava() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return syncStravaActivities();
}

export async function disconnectStrava() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const connection = await db.stravaConnection.findUnique({
    where: { id: "default" },
  });

  if (connection) {
    // Attempt to deauthorize on Strava's side
    try {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      });
    } catch {
      // Ignore deauth failures — we'll delete locally regardless
    }

    await db.stravaConnection.delete({ where: { id: "default" } });
  }

  revalidatePath("/settings");
}

export type UsernameChangeState = {
  error?: string
  success?: boolean
}

export async function changeUsername(
  _prev: UsernameChangeState,
  formData: FormData
): Promise<UsernameChangeState> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  const raw = formData.get("username")
  if (typeof raw !== "string") {
    return { error: "Username is required" }
  }

  const username = raw.trim()
  const validation = validateUsername(username)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const lower = username.toLowerCase()

  // Same as current — no-op
  if (lower === session.user.username) {
    return { error: "That's already your username" }
  }

  // Check if username is taken by another user
  const existingUser = await db.user.findUnique({
    where: { username: lower },
  })
  if (existingUser && existingUser.id !== session.user.id) {
    return { error: "This username is already taken" }
  }

  // Check if username was previously used by someone else (reserved)
  const previousOwner = await db.previousUsername.findFirst({
    where: {
      username: lower,
      userId: { not: session.user.id },
    },
  })
  if (previousOwner) {
    return { error: "This username is not available" }
  }

  // Save current username to history before changing
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  })
  if (currentUser?.username) {
    await db.previousUsername.create({
      data: {
        username: currentUser.username,
        userId: session.user.id,
      },
    })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { username: lower },
  })

  revalidatePath("/")
  revalidatePath("/settings")
  return { success: true }
}
