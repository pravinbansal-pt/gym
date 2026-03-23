"use server"

import { db } from "@/lib/db"
import { getSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import {
  getGoogleTokens,
  createGoogleCalendar,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  deleteGoogleCalendar,
} from "@/lib/google-calendar"

// ─── UTC-safe date helpers ──────────────────────────────────────────
// All @db.Date values are stored as midnight UTC. We must avoid
// local-timezone date-fns functions that would shift dates.

async function requireUserId() {
  const session = await getSession()
  if (!session?.user?.id) throw new Error("Not authenticated")
  return session.user.id
}

/** Parse a YYYY-MM-DD string to a Date at midnight UTC. */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z")
}

/** Difference in days between two UTC midnight dates. */
function diffDays(a: Date, b: Date): number {
  const msA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const msB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((msA - msB) / 86_400_000)
}

/** Add days to a UTC date, staying at midnight UTC. */
function addDaysUTC(d: Date, days: number): Date {
  const result = new Date(d)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

/** Format a UTC date as YYYY-MM-DD (for Google Calendar). */
function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

/**
 * trainingDays is a rolling binary pattern, e.g. [1,1,1,1,1,1,0] = "6 on, 1 off".
 * Check if `date` is a training day based on its offset from the schedule start.
 */
function isTrainingDay(date: Date, scheduleStart: Date, pattern: number[]): boolean {
  const daysSinceStart = diffDays(date, scheduleStart)
  const idx = ((daysSinceStart % pattern.length) + pattern.length) % pattern.length
  return pattern[idx] === 1
}

/** Find the next date on or after `from` that is a training day. */
function nextTrainingDay(from: Date, scheduleStart: Date, pattern: number[]): Date {
  let d = from
  for (let i = 0; i < pattern.length; i++) {
    if (isTrainingDay(d, scheduleStart, pattern)) return d
    d = addDaysUTC(d, 1)
  }
  return d
}

/** Find the next training day strictly after `lastDate`. */
function nextTrainingDayAfter(lastDate: Date, scheduleStart: Date, pattern: number[]): Date {
  return nextTrainingDay(addDaysUTC(lastDate, 1), scheduleStart, pattern)
}

// ─── Create Schedule ────────────────────────────────────────────────

export async function createSchedule(
  programId: string,
  startDate: string, // YYYY-MM-DD
  trainingDays: number[], // rolling pattern: [1,1,1,1,1,1,0]
) {
  const userId = await requireUserId()

  if (!trainingDays.includes(1)) throw new Error("Pattern must include at least one training day")

  // Deactivate any existing active schedule
  await db.workoutSchedule.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  })

  // Get program workouts in order
  const programWorkouts = await db.programWorkout.findMany({
    where: { programId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, name: true, exercises: { select: { exercise: { select: { name: true } } }, orderBy: { orderIndex: "asc" }, take: 5 } },
  })

  if (programWorkouts.length === 0) throw new Error("Program has no workouts")

  const start = parseDate(startDate)

  // Create the schedule
  const schedule = await db.workoutSchedule.create({
    data: {
      userId,
      programId,
      startDate: start,
      trainingDays,
      isActive: true,
    },
  })

  // Count training days per cycle, generate enough cycles for ~8 weeks
  const trainDaysPerCycle = trainingDays.filter((d) => d === 1).length
  const totalSlots = Math.ceil((56 / trainingDays.length) * trainDaysPerCycle)
  const scheduledWorkouts: Array<{
    scheduleId: string
    programWorkoutId: string
    scheduledDate: Date
    originalDate: Date
  }> = []

  let currentDate = nextTrainingDay(start, start, trainingDays)

  for (let i = 0; i < totalSlots; i++) {
    const workout = programWorkouts[i % programWorkouts.length]
    scheduledWorkouts.push({
      scheduleId: schedule.id,
      programWorkoutId: workout.id,
      scheduledDate: currentDate,
      originalDate: currentDate,
    })
    currentDate = nextTrainingDayAfter(currentDate, start, trainingDays)
  }

  await db.scheduledWorkout.createMany({ data: scheduledWorkouts })

  // Google Calendar sync (fire-and-forget)
  syncNewSchedule(userId, schedule.id, programWorkouts, scheduledWorkouts).catch(() => {})

  revalidatePath("/calendar")
  return { scheduleId: schedule.id }
}

async function syncNewSchedule(
  userId: string,
  scheduleId: string,
  programWorkouts: Array<{ id: string; name: string; exercises: Array<{ exercise: { name: string } }> }>,
  scheduledWorkouts: Array<{ scheduleId: string; programWorkoutId: string; scheduledDate: Date }>,
) {
  const tokens = await getGoogleTokens(userId)
  if (!tokens) return

  const calendarId = await createGoogleCalendar(tokens)
  if (!calendarId) return

  await db.workoutSchedule.update({
    where: { id: scheduleId },
    data: { googleCalendarId: calendarId },
  })

  const created = await db.scheduledWorkout.findMany({
    where: { scheduleId },
    orderBy: { scheduledDate: "asc" },
  })

  const workoutMap = new Map(programWorkouts.map((w) => [w.id, w]))

  for (const sw of created) {
    const pw = workoutMap.get(sw.programWorkoutId)
    if (!pw) continue

    const eventId = await createCalendarEvent(tokens, calendarId, {
      name: pw.name,
      exercises: pw.exercises.map((e) => e.exercise.name),
      date: formatDateUTC(sw.scheduledDate),
    })

    if (eventId) {
      await db.scheduledWorkout.update({
        where: { id: sw.id },
        data: { googleEventId: eventId },
      })
    }
  }
}

// ─── Skip Workout ───────────────────────────────────────────────────

export async function skipWorkout(scheduledWorkoutId: string) {
  const userId = await requireUserId()

  const scheduledWorkout = await db.scheduledWorkout.findUniqueOrThrow({
    where: { id: scheduledWorkoutId },
    include: { schedule: { select: { userId: true, trainingDays: true, startDate: true, id: true } } },
  })

  if (scheduledWorkout.schedule.userId !== userId) throw new Error("Not authorized")
  if (scheduledWorkout.status !== "SCHEDULED") throw new Error("Workout is not scheduled")

  const { trainingDays, startDate, id: scheduleId } = scheduledWorkout.schedule
  const skippedDate = scheduledWorkout.scheduledDate

  // Mark as skipped
  await db.scheduledWorkout.update({
    where: { id: scheduledWorkoutId },
    data: { status: "SKIPPED" },
  })

  // Push all subsequent SCHEDULED workouts forward
  const remaining = await db.scheduledWorkout.findMany({
    where: {
      scheduleId,
      status: "SCHEDULED",
      scheduledDate: { gte: skippedDate },
      id: { not: scheduledWorkoutId },
    },
    orderBy: { scheduledDate: "asc" },
  })

  if (remaining.length > 0) {
    let lastDate = skippedDate
    const updatedWorkouts: Array<{ id: string; newDate: Date; googleEventId: string | null }> = []
    const updates = remaining.map((sw) => {
      const newDate = nextTrainingDayAfter(lastDate, startDate, trainingDays)
      lastDate = newDate
      updatedWorkouts.push({ id: sw.id, newDate, googleEventId: sw.googleEventId })
      return db.scheduledWorkout.update({
        where: { id: sw.id },
        data: {
          scheduledDate: newDate,
          originalDate: sw.originalDate ?? sw.scheduledDate,
        },
      })
    })
    await db.$transaction(updates)

    syncPushedWorkouts(userId, scheduleId, updatedWorkouts).catch(() => {})
  }

  revalidatePath("/calendar")
}

// ─── Defer Workout (push forward, don't skip) ──────────────────────

export async function deferWorkout(scheduledWorkoutId: string) {
  const userId = await requireUserId()

  const scheduledWorkout = await db.scheduledWorkout.findUniqueOrThrow({
    where: { id: scheduledWorkoutId },
    include: { schedule: { select: { userId: true, trainingDays: true, startDate: true, id: true } } },
  })

  if (scheduledWorkout.schedule.userId !== userId) throw new Error("Not authorized")
  if (scheduledWorkout.status !== "SCHEDULED") throw new Error("Workout is not scheduled")

  const { trainingDays, startDate, id: scheduleId } = scheduledWorkout.schedule
  const currentDate = scheduledWorkout.scheduledDate

  // Get this workout + all subsequent SCHEDULED workouts
  const toDefer = await db.scheduledWorkout.findMany({
    where: {
      scheduleId,
      status: "SCHEDULED",
      scheduledDate: { gte: currentDate },
    },
    orderBy: { scheduledDate: "asc" },
  })

  if (toDefer.length > 0) {
    // Each workout shifts to the next training day after its current date
    let lastDate = currentDate
    const updatedWorkouts: Array<{ id: string; newDate: Date; googleEventId: string | null }> = []
    const updates = toDefer.map((sw) => {
      const newDate = nextTrainingDayAfter(lastDate, startDate, trainingDays)
      lastDate = newDate
      updatedWorkouts.push({ id: sw.id, newDate, googleEventId: sw.googleEventId })
      return db.scheduledWorkout.update({
        where: { id: sw.id },
        data: {
          scheduledDate: newDate,
          originalDate: sw.originalDate ?? sw.scheduledDate,
        },
      })
    })
    await db.$transaction(updates)

    syncPushedWorkouts(userId, scheduleId, updatedWorkouts).catch(() => {})
  }

  revalidatePath("/calendar")
}

// ─── Google Calendar sync helper ────────────────────────────────────

async function syncPushedWorkouts(
  userId: string,
  scheduleId: string,
  updatedWorkouts: Array<{ id: string; newDate: Date; googleEventId: string | null }>,
) {
  const schedule = await db.workoutSchedule.findUnique({
    where: { id: scheduleId },
    select: { googleCalendarId: true },
  })
  if (!schedule?.googleCalendarId) return

  const tokens = await getGoogleTokens(userId)
  if (!tokens) return

  for (const sw of updatedWorkouts) {
    if (sw.googleEventId) {
      await updateCalendarEvent(
        tokens,
        schedule.googleCalendarId,
        sw.googleEventId,
        formatDateUTC(sw.newDate),
      )
    }
  }
}

// ─── Complete Scheduled Workout ─────────────────────────────────────

export async function completeScheduledWorkout(
  scheduledWorkoutId: string,
  sessionId: string,
) {
  const userId = await requireUserId()

  const sw = await db.scheduledWorkout.findUniqueOrThrow({
    where: { id: scheduledWorkoutId },
    include: { schedule: { select: { userId: true } } },
  })

  if (sw.schedule.userId !== userId) throw new Error("Not authorized")

  await db.scheduledWorkout.update({
    where: { id: scheduledWorkoutId },
    data: { status: "COMPLETED", sessionId },
  })

  revalidatePath("/calendar")
}

// ─── Query Actions ──────────────────────────────────────────────────

export async function getActiveSchedule() {
  const userId = await requireUserId()

  return db.workoutSchedule.findFirst({
    where: { userId, isActive: true },
    include: {
      program: { select: { id: true, name: true } },
    },
  })
}

export async function getScheduledWorkoutsForRange(startDate: string, endDate: string) {
  const userId = await requireUserId()

  return db.scheduledWorkout.findMany({
    where: {
      schedule: { userId, isActive: true },
      scheduledDate: {
        gte: parseDate(startDate),
        lte: parseDate(endDate),
      },
    },
    include: {
      programWorkout: {
        select: {
          id: true,
          name: true,
          exercises: {
            select: {
              exercise: { select: { name: true } },
            },
            orderBy: { orderIndex: "asc" },
            take: 5,
          },
        },
      },
      session: { select: { id: true, status: true } },
    },
    orderBy: { scheduledDate: "asc" },
  })
}

export async function getPrograms() {
  return db.program.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      workouts: { select: { id: true }, orderBy: { orderIndex: "asc" } },
    },
  })
}

// ─── Delete Schedule ────────────────────────────────────────────────

export async function deleteSchedule(scheduleId: string) {
  const userId = await requireUserId()

  const schedule = await db.workoutSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
    select: { userId: true, googleCalendarId: true },
  })

  if (schedule.userId !== userId) throw new Error("Not authorized")

  if (schedule.googleCalendarId) {
    getGoogleTokens(userId).then((tokens) => {
      if (tokens) deleteGoogleCalendar(tokens, schedule.googleCalendarId!)
    }).catch(() => {})
  }

  await db.workoutSchedule.delete({ where: { id: scheduleId } })

  revalidatePath("/calendar")
}
