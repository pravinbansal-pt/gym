import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Footprints, Route, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WorkoutHeader } from "./_components/workout-header";
import { ExerciseList } from "./_components/exercise-list";
import { AddExercise } from "./_components/add-exercise";
import { StartWorkoutButton } from "./_components/start-workout-button";
import { ImportDialog } from "@/components/import/import-dialog";
import { formatDistance, formatPace, formatMovingTime } from "@/lib/cardio-utils";
import { estimateWorkoutMinutes, formatEstimatedTime } from "@/lib/workout-time";
import { getAppSettings } from "../../../../settings/_actions";

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
          sets: {
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!workout || workout.programId !== programId) notFound();

  // Cardio workout — different view
  if (workout.workoutType === "CARDIO") {
    const settings = await getAppSettings();
    const distanceUnit = settings.defaultDistanceUnit;

    // Fetch past cardio activities linked to this workout
    const pastActivities = await db.cardioActivity.findMany({
      where: { programWorkoutId: workoutId },
      orderBy: { activityDate: "desc" },
      take: 5,
    });

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

        <div>
          <div className="flex items-center gap-2">
            <Footprints className="size-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">{workout.name}</h1>
            <Badge variant="outline">Cardio</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Day {workout.dayIndex + 1}
            {workout.phase ? ` \u00B7 ${workout.phase.name}` : ""}
          </p>
        </div>

        {/* Targets */}
        {(workout.targetDistanceMeters || workout.targetDurationSeconds || workout.targetPaceSecondsPerKm || workout.cardioNotes) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                {workout.targetDistanceMeters && (
                  <div className="flex items-center gap-1.5">
                    <Route className="size-4 text-muted-foreground" />
                    <span>{formatDistance(workout.targetDistanceMeters, distanceUnit)}</span>
                  </div>
                )}
                {workout.targetDurationSeconds && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 text-muted-foreground" />
                    <span>{formatMovingTime(workout.targetDurationSeconds)}</span>
                  </div>
                )}
                {workout.targetPaceSecondsPerKm && (
                  <div className="flex items-center gap-1.5">
                    <Timer className="size-4 text-muted-foreground" />
                    <span>{formatPace(workout.targetPaceSecondsPerKm, distanceUnit)}</span>
                  </div>
                )}
                {workout.cardioNotes && (
                  <div className="text-muted-foreground italic">
                    {workout.cardioNotes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            render={<Link href="/cardio" />}
            variant="outline"
            size="sm"
          >
            <Footprints className="size-4" data-icon="inline-start" />
            Log Run in Cardio
          </Button>
        </div>

        {/* Past activities for this workout */}
        {pastActivities.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="mb-3 text-lg font-semibold">Past Runs</h2>
              <div className="space-y-2">
                {pastActivities.map((a) => (
                  <Link
                    key={a.id}
                    href={`/cardio/${a.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.activityDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatDistance(a.distanceMeters, distanceUnit)}</span>
                      <span>{formatMovingTime(a.movingTimeSeconds)}</span>
                      {a.averagePaceSecsPerKm && (
                        <span>{formatPace(a.averagePaceSecsPerKm, distanceUnit)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Strength workout — existing view
  // Fetch previous session data for each exercise (last completed session for this workout)
  const lastSession = await db.workoutSession.findFirst({
    where: {
      programWorkoutId: workoutId,
      status: "COMPLETED",
    },
    orderBy: { endedAt: "desc" },
    include: {
      exercises: {
        include: {
          sets: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  // Build a map: exerciseId → array of { weight, reps }
  const previousData: Record<string, Array<{ weight: number | null; reps: number | null }>> = {};
  if (lastSession) {
    for (const ex of lastSession.exercises) {
      previousData[ex.exerciseId] = ex.sets.map((s: { weight: number | null; reps: number | null }) => ({
        weight: s.weight,
        reps: s.reps,
      }));
    }
  }

  // Fetch the exercise library and muscle groups for the add exercise form
  const [exercises, muscleGroups] = await Promise.all([
    db.exercise.findMany({
      include: { primaryMuscleGroup: true },
      orderBy: [{ primaryMuscleGroup: { displayOrder: "asc" } }, { name: "asc" }],
    }),
    db.muscleGroup.findMany({
      orderBy: { displayOrder: "asc" },
    }),
  ]);

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
        estimatedTime={
          workout.exercises.length > 0
            ? formatEstimatedTime(estimateWorkoutMinutes(workout.exercises))
            : null
        }
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
        previousData={previousData}
        defaults={{
          warmUpSets: workout.program.defaultWarmUpSets,
          workingSets: workout.program.defaultWorkingSets,
          warmUpPercent: workout.program.defaultWarmUpPercent,
          restSeconds: workout.program.defaultRestSeconds,
        }}
      />

      <div className="flex gap-2">
        <AddExercise
          availableExercises={availableExercises}
          muscleGroups={muscleGroups}
          programId={programId}
          workoutId={workoutId}
        />
        <ImportDialog
          mode="exercises"
          exercises={exercises.map((e) => ({
            id: e.id,
            name: e.name,
            muscleGroup: e.primaryMuscleGroup?.name ?? "",
            equipmentType: e.equipmentType,
          }))}
          programId={programId}
          workoutId={workoutId}
          trigger={
            <Button variant="outline" className="h-12 border-dashed gap-2 px-5">
              <Sparkles className="size-4" />
              AI Import
            </Button>
          }
        />
      </div>
    </div>
  );
}
