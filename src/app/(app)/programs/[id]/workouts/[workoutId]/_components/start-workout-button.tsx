"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWorkoutSession } from "../../../../_actions";

export function StartWorkoutButton({
  workoutId,
  programId,
  exerciseCount,
}: {
  workoutId: string;
  programId: string;
  exerciseCount: number;
}) {
  const [pending, setPending] = useState(false);

  async function handleStart() {
    if (exerciseCount === 0) return;
    setPending(true);
    await startWorkoutSession(workoutId, programId);
  }

  return (
    <Button
      size="lg"
      disabled={pending || exerciseCount === 0}
      onClick={handleStart}
    >
      <Play className="size-4" />
      {pending ? "Starting..." : "Start Workout"}
    </Button>
  );
}
