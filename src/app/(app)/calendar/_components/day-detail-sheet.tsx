"use client"

import { useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Play, SkipForward, ArrowRight, CheckCircle2, X, ExternalLink } from "lucide-react"
import { skipWorkout, deferWorkout } from "../_actions"
import { startWorkoutSession } from "@/app/(app)/programs/_actions"
import { toast } from "sonner"
import type { ScheduledWorkoutData } from "./calendar-view"

interface DayDetailSheetProps {
  date: Date
  workout: ScheduledWorkoutData | null
  programId: string | null
  onClose: () => void
}

export function DayDetailSheet({ date, workout, programId, onClose }: DayDetailSheetProps) {
  const [isPending, startTransition] = useTransition()

  function handleSkip() {
    if (!workout) return
    startTransition(async () => {
      try {
        await skipWorkout(workout.id)
        toast.success("Workout skipped")
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to skip workout")
      }
    })
  }

  function handleDefer() {
    if (!workout) return
    startTransition(async () => {
      try {
        await deferWorkout(workout.id)
        toast.success("Workout pushed to next training day")
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to defer workout")
      }
    })
  }

  function handleStart() {
    if (!workout || !programId) return
    startTransition(async () => {
      try {
        await startWorkoutSession(workout.programWorkout.id, programId, workout.id)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to start workout")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {format(date, "EEEE, MMMM d")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {workout && (
              <Badge
                variant={
                  workout.status === "COMPLETED"
                    ? "default"
                    : workout.status === "SKIPPED"
                      ? "secondary"
                      : "outline"
                }
              >
                {workout.status === "COMPLETED" && <CheckCircle2 className="mr-1 size-3" />}
                {workout.status === "SKIPPED" && <SkipForward className="mr-1 size-3" />}
                {workout.status.toLowerCase()}
              </Badge>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!workout ? (
          <p className="text-sm text-muted-foreground">Rest day</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{workout.programWorkout.name}</h3>
                {programId && (
                  <Link
                    href={`/programs/${programId}/workouts/${workout.programWorkout.id}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Edit
                    <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {workout.programWorkout.exercises.map((e, i) => (
                  <p key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dumbbell className="size-3" />
                    {e.exercise.name}
                  </p>
                ))}
              </div>
            </div>

            {workout.status === "SCHEDULED" && (
              <div className="space-y-2">
                <Button
                  onClick={handleStart}
                  disabled={isPending}
                  className="w-full"
                >
                  <Play className="size-4" />
                  {isPending ? "Starting..." : "Start Workout"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDefer}
                    disabled={isPending}
                    className="flex-1"
                  >
                    <ArrowRight className="size-4" />
                    Push Back
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="text-muted-foreground"
                  >
                    <SkipForward className="size-4" />
                    Skip
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
