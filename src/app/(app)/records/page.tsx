import { db } from "@/lib/db";
import { Trophy } from "lucide-react";
import { RecordsView } from "./_components/records-view";

export default async function RecordsPage() {
  const [personalRecords, muscleGroups] = await Promise.all([
    // Get the best PR per exercise (highest estimated 1RM)
    // We fetch all PRs and group in code since Prisma doesn't support
    // "distinct on" with ordering easily across all databases
    db.personalRecord.findMany({
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            equipmentType: true,
            primaryMuscleGroup: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { achievedAt: "desc" },
    }),
    db.muscleGroup.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Group PRs by exercise, keeping only the best (highest 1RM) for each
  const bestByExercise = new Map<
    string,
    {
      exerciseId: string;
      exerciseName: string;
      muscleGroupId: string;
      muscleGroupName: string;
      equipmentType: string;
      bestWeight: number;
      bestReps: number;
      estimated1RM: number;
      achievedAt: string;
      isRecent: boolean;
    }
  >();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Also track the best weight and best reps separately
  const bestWeightByExercise = new Map<string, number>();
  const bestRepsByExercise = new Map<string, number>();

  for (const pr of personalRecords) {
    const exId = pr.exerciseId;

    // Track best weight
    const currentBestWeight = bestWeightByExercise.get(exId) ?? 0;
    if (pr.weight > currentBestWeight) {
      bestWeightByExercise.set(exId, pr.weight);
    }

    // Track best reps
    const currentBestReps = bestRepsByExercise.get(exId) ?? 0;
    if (pr.reps > currentBestReps) {
      bestRepsByExercise.set(exId, pr.reps);
    }

    // Track best 1RM
    const existing = bestByExercise.get(exId);
    if (!existing || pr.estimated1RM > existing.estimated1RM) {
      bestByExercise.set(exId, {
        exerciseId: exId,
        exerciseName: pr.exercise.name,
        muscleGroupId: pr.exercise.primaryMuscleGroup.id,
        muscleGroupName: pr.exercise.primaryMuscleGroup.name,
        equipmentType: pr.exercise.equipmentType,
        bestWeight: pr.weight,
        bestReps: pr.reps,
        estimated1RM: Math.round(pr.estimated1RM * 10) / 10,
        achievedAt: pr.achievedAt.toISOString(),
        isRecent: pr.achievedAt >= sevenDaysAgo,
      });
    }
  }

  // Merge best weight/reps into the records
  const records = Array.from(bestByExercise.values()).map((rec) => ({
    ...rec,
    bestWeight: bestWeightByExercise.get(rec.exerciseId) ?? rec.bestWeight,
    bestReps: bestRepsByExercise.get(rec.exerciseId) ?? rec.bestReps,
  }));

  // Sort by muscle group then exercise name
  records.sort((a, b) => {
    if (a.muscleGroupName !== b.muscleGroupName)
      return a.muscleGroupName.localeCompare(b.muscleGroupName);
    return a.exerciseName.localeCompare(b.exerciseName);
  });

  const serializedMuscleGroups = muscleGroups.map((mg) => ({
    id: mg.id,
    name: mg.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-amber-500" />
          <h1 className="text-3xl font-bold tracking-tight">
            Personal Records
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Your all-time best performances across all exercises.
        </p>
      </div>

      <RecordsView records={records} muscleGroups={serializedMuscleGroups} />
    </div>
  );
}
