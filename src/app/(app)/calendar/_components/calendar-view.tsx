"use client"

import { useState, useTransition } from "react"
import { format, isSameDay, isSameMonth, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, eachDayOfInterval } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, Trash2 } from "lucide-react"
import { DayDetailSheet } from "./day-detail-sheet"
import { ScheduleSetupDialog } from "./schedule-setup-dialog"
import { deleteSchedule } from "../_actions"
import { toast } from "sonner"

export type ScheduledWorkoutData = {
  id: string
  scheduledDate: Date
  originalDate: Date | null
  status: "SCHEDULED" | "COMPLETED" | "SKIPPED"
  googleEventId: string | null
  scheduleId: string
  programWorkout: {
    id: string
    name: string
    exercises: Array<{
      exercise: { name: string }
    }>
  }
  session: { id: string; status: string } | null
}

type ScheduleData = {
  id: string
  programId: string
  startDate: Date
  trainingDays: number[]
  program: { id: string; name: string }
  googleCalendarId: string | null
} | null

type ProgramOption = {
  id: string
  name: string
  workouts: { id: string }[]
}

interface CalendarViewProps {
  schedule: ScheduleData
  scheduledWorkouts: ScheduledWorkoutData[]
  programs: ProgramOption[]
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Convert a @db.Date value (UTC midnight) to a local Date for display/comparison. */
function dbDateToLocal(d: Date): Date {
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function CalendarView({ schedule, scheduledWorkouts, programs }: CalendarViewProps) {
  const [month, setMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  const selectedWorkout = selectedDay
    ? scheduledWorkouts.find((sw) => isSameDay(dbDateToLocal(new Date(sw.scheduledDate)), selectedDay))
    : null

  // Build a map of dates to workout data for rendering
  // Key uses local date string to match the calendar grid (which is local)
  const dateWorkoutMap = new Map<string, ScheduledWorkoutData>()
  for (const sw of scheduledWorkouts) {
    const key = format(dbDateToLocal(new Date(sw.scheduledDate)), "yyyy-MM-dd")
    dateWorkoutMap.set(key, sw)
  }

  // Build calendar grid: full weeks covering the month
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          {schedule && (
            <p className="mt-1 text-muted-foreground">
              {schedule.program.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {schedule && (
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting}
              onClick={() => {
                if (!confirm("Delete this schedule? This cannot be undone.")) return
                startDeleteTransition(async () => {
                  try {
                    await deleteSchedule(schedule.id)
                    toast.success("Schedule deleted")
                    setSelectedDay(null)
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to delete")
                  }
                })
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <ScheduleSetupDialog programs={programs} hasActiveSchedule={!!schedule} />
        </div>
      </div>

      {!schedule ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No schedule set up yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a schedule to map your program workouts to specific days.
          </p>
        </div>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {format(month, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRightIcon className="size-5" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/40" />
              Skipped
            </span>
          </div>

          {/* Calendar grid */}
          <div className="overflow-hidden rounded-lg border">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dateKey = format(day, "yyyy-MM-dd")
                const workout = dateWorkoutMap.get(dateKey)
                const inMonth = isSameMonth(day, month)
                const today = isToday(day)
                const selected = selectedDay ? isSameDay(day, selectedDay) : false

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "relative flex min-h-[4.5rem] flex-col border-b border-r p-1.5 text-left transition-colors hover:bg-muted/50 md:min-h-[5.5rem] md:p-2",
                      !inMonth && "bg-muted/20 text-muted-foreground/40",
                      selected && "ring-2 ring-primary ring-inset",
                      // Remove right border on last column
                      (i + 1) % 7 === 0 && "border-r-0",
                    )}
                  >
                    {/* Date number */}
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium md:size-7 md:text-sm",
                        today && "bg-primary text-primary-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Workout indicator */}
                    {workout && inMonth && (
                      <div
                        className={cn(
                          "mt-1 w-full truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight md:text-xs",
                          workout.status === "SCHEDULED" &&
                            "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                          workout.status === "COMPLETED" &&
                            "bg-green-500/15 text-green-600 dark:text-green-400",
                          workout.status === "SKIPPED" &&
                            "bg-muted text-muted-foreground line-through",
                        )}
                      >
                        {workout.programWorkout.name}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail */}
          {selectedDay && (
            <DayDetailSheet
              date={selectedDay}
              workout={selectedWorkout ?? null}
              programId={schedule?.programId ?? null}
              onClose={() => setSelectedDay(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
