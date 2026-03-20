"use client";

import { ArrowRight, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Workout = {
  id: string;
  name: string;
  dayIndex: number;
  programId: string;
};

export function NextWorkoutIndicator({
  workouts,
  lastCompletedWorkoutId,
}: {
  workouts: Workout[];
  lastCompletedWorkoutId: string;
}) {
  if (workouts.length === 0) return null;

  const lastIdx = workouts.findIndex(
    (w) => w.id === lastCompletedWorkoutId
  );

  // Simple cycling: after the last workout, go back to the first
  const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % workouts.length;
  const nextWorkout = workouts[nextIdx];

  if (!nextWorkout) return null;

  return (
    <Link href={`/programs/${nextWorkout.programId}/workouts/${nextWorkout.id}`}>
      <Card className="border-primary/30 bg-primary/5 transition-shadow hover:shadow-md cursor-pointer">
        <CardContent className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <PlayCircle className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">Up Next</p>
            <p className="font-semibold">{nextWorkout.name}</p>
            <p className="text-xs text-muted-foreground">
              Day {nextWorkout.dayIndex + 1}
            </p>
          </div>
          <Badge variant="default">
            Start
            <ArrowRight className="size-3" />
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
