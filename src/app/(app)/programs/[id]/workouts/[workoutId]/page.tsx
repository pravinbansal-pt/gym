import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WorkoutHeader } from "./_components/workout-header";
import { ExerciseList } from "./_components/exercise-list";
import { AddExercise } from "./_components/add-exercise";
import { StartWorkoutButton } from "./_components/start-workout-button";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string; workoutId: string }>;
}) {
  const { id: programId, workoutId } = await params;

  const workout = await db.programWorkout.findUnique({
    where: { id: workoutId },
    include: {
      program: true,
      phase: true,
      exercises: {
        include: {
          exercise: {
            include: { primaryMuscleGroup: true },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!workout || workout.programId !== programId) notFound();

  // Fetch the exercise library for the add exercise form
  const exercises = await db.exercise.findMany({
    include: { primaryMuscleGroup: true },
    orderBy: [{ primaryMuscleGroup: { displayOrder: "asc" } }, { name: "asc" }],
  });

  // Exclude already-added exercises
  const existingExerciseIds = new Set(
    workout.exercises.map((we: { exerciseId: string }) => we.exerciseId)
  );
  const availableExercises = exercises.filter(
    (e: { id: string }) => !existingExerciseIds.has(e.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href={`/programs/${programId}`} />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Back to {workout.program.name}
        </span>
      </div>

      <WorkoutHeader
        workout={workout}
        programName={workout.program.name}
        phaseName={workout.phase?.name ?? null}
      />

      <div className="flex justify-end">
        <StartWorkoutButton
          workoutId={workoutId}
          programId={programId}
          exerciseCount={workout.exercises.length}
        />
      </div>

      <Separator />

      <ExerciseList
        exercises={workout.exercises}
        programId={programId}
        workoutId={workoutId}
        defaults={{
          warmUpSets: workout.program.defaultWarmUpSets,
          workingSets: workout.program.defaultWorkingSets,
          warmUpPercent: workout.program.defaultWarmUpPercent,
          restSeconds: workout.program.defaultRestSeconds,
        }}
      />

      <Separator />

      <AddExercise
        availableExercises={availableExercises}
        programId={programId}
        workoutId={workoutId}
        defaults={{
          warmUpSets: workout.program.defaultWarmUpSets,
          workingSets: workout.program.defaultWorkingSets,
          warmUpPercent: Math.round(
            workout.program.defaultWarmUpPercent * 100
          ),
          restSeconds: workout.program.defaultRestSeconds,
        }}
      />
    </div>
  );
}
