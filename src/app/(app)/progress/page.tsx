import { db } from "@/lib/db";
import { TrendingUp } from "lucide-react";
import { VolumeOverTimeChart } from "./_components/volume-over-time-chart";
import { WorkoutFrequencyChart } from "./_components/workout-frequency-chart";
import { StrengthTrendsChart } from "./_components/strength-trends-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function getWeekLabel(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ProgressPage() {
  const now = new Date();

  // 12 weeks ago
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(now.getDate() - 84);
  twelveWeeksAgo.setHours(0, 0, 0, 0);

  const [completedSessions, exercises, allPRs] = await Promise.all([
    // All completed sessions in the past 12 weeks
    db.workoutSession.findMany({
      where: {
        status: "COMPLETED",
        endedAt: { gte: twelveWeeksAgo },
      },
      include: {
        exercises: {
          include: {
            sets: {
              where: { completedAt: { not: null } },
            },
          },
        },
      },
      orderBy: { endedAt: "asc" },
    }),

    // All exercises that have PRs
    db.exercise.findMany({
      where: {
        personalRecords: { some: {} },
      },
      select: {
        id: true,
        name: true,
        primaryMuscleGroup: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),

    // All personal records for strength trends
    db.personalRecord.findMany({
      include: {
        exercise: {
          select: { id: true, name: true },
        },
      },
      orderBy: { achievedAt: "asc" },
    }),
  ]);

  // Build weekly volume data (past 12 weeks)
  const weeklyVolumeMap = new Map<string, number>();
  const weeklyCountMap = new Map<string, number>();

  // Initialize all 12 weeks
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    const ws = getWeekStart(weekStart);
    const key = ws.toISOString().split("T")[0];
    weeklyVolumeMap.set(key, 0);
    weeklyCountMap.set(key, 0);
  }

  for (const session of completedSessions) {
    if (!session.endedAt) continue;
    const ws = getWeekStart(session.endedAt);
    const key = ws.toISOString().split("T")[0];

    // Volume
    const sessionVolume = session.exercises.reduce(
      (total, ex) =>
        total +
        ex.sets.reduce(
          (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
          0
        ),
      0
    );

    if (weeklyVolumeMap.has(key)) {
      weeklyVolumeMap.set(key, (weeklyVolumeMap.get(key) ?? 0) + sessionVolume);
    }

    // Count
    if (weeklyCountMap.has(key)) {
      weeklyCountMap.set(key, (weeklyCountMap.get(key) ?? 0) + 1);
    }
  }

  const weeklyVolumeData = Array.from(weeklyVolumeMap.entries()).map(
    ([dateStr, volume]) => ({
      week: getWeekLabel(new Date(dateStr)),
      volume: Math.round(volume),
    })
  );

  const weeklyFrequencyData = Array.from(weeklyCountMap.entries()).map(
    ([dateStr, count]) => ({
      week: getWeekLabel(new Date(dateStr)),
      workouts: count,
    })
  );

  // Build strength trends data: group PRs by exercise
  const prsByExercise = new Map<
    string,
    Array<{ date: string; estimated1RM: number }>
  >();

  for (const pr of allPRs) {
    const exId = pr.exerciseId;
    if (!prsByExercise.has(exId)) {
      prsByExercise.set(exId, []);
    }
    prsByExercise.get(exId)!.push({
      date: pr.achievedAt.toISOString().split("T")[0],
      estimated1RM: Math.round(pr.estimated1RM * 10) / 10,
    });
  }

  const strengthData: Record<string, Array<{ date: string; estimated1RM: number }>> = {};
  for (const [exId, prs] of prsByExercise) {
    strengthData[exId] = prs;
  }

  const exerciseOptions = exercises.map((e) => ({
    id: e.id,
    name: e.name,
    muscleGroup: e.primaryMuscleGroup.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Track your training volume, frequency, and strength gains over time.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Volume over time */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Over Time</CardTitle>
            <CardDescription>
              Total weekly volume (kg) over the past 12 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyVolumeData.every((d) => d.volume === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No volume data available. Complete some workouts to see your progress.
              </p>
            ) : (
              <VolumeOverTimeChart data={weeklyVolumeData} />
            )}
          </CardContent>
        </Card>

        {/* Workout frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Frequency</CardTitle>
            <CardDescription>
              Workouts per week over the past 12 weeks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyFrequencyData.every((d) => d.workouts === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No workout data available. Start training to track your consistency.
              </p>
            ) : (
              <WorkoutFrequencyChart data={weeklyFrequencyData} />
            )}
          </CardContent>
        </Card>

        {/* Strength trends */}
        <Card>
          <CardHeader>
            <CardTitle>Strength Trends</CardTitle>
            <CardDescription>
              Estimated 1RM progression for each exercise
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exerciseOptions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No personal records available. Complete some working sets to track strength gains.
              </p>
            ) : (
              <StrengthTrendsChart
                exercises={exerciseOptions}
                strengthData={strengthData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
