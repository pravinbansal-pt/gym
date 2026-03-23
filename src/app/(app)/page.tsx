import Link from "next/link";
import { db } from "@/lib/db";
import { getAppSettings } from "./settings/_actions";
import { unitLabel } from "@/lib/weight-utils";
import { formatDistance, formatPace, formatMovingTime, distanceUnitLabel } from "@/lib/cardio-utils";
import {
  Dumbbell,
  Calendar,
  Flame,
  Weight,
  Play,
  Clock,
  FolderKanban,
  Route,
  Footprints,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteSessionButton } from "./_components/delete-session-button";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const settings = await getAppSettings();
  const unit = unitLabel(settings.defaultWeightUnit);
  const dUnit = settings.defaultDistanceUnit;

  const [
    recentSessions,
    weekSessions,
    activeProgram,
    weekCardio,
    recentCardio,
    allCardioDates,
  ] = await Promise.all([
    // Recent 5 completed sessions
    db.workoutSession.findMany({
      where: { status: "COMPLETED" },
      include: {
        program: { select: { name: true } },
        programWorkout: { select: { name: true } },
        exercises: {
          include: {
            exercise: { select: { name: true } },
            sets: {
              where: { completedAt: { not: null } },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
      orderBy: { endedAt: "desc" },
      take: 5,
    }),

    // This week's completed sessions
    db.workoutSession.findMany({
      where: {
        status: "COMPLETED",
        endedAt: { gte: startOfWeek, lt: endOfWeek },
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
    }),

    // Active program with workouts
    db.program.findFirst({
      where: { isActive: true },
      include: {
        workouts: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercises: {
              include: {
                exercise: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    // This week's cardio activities
    db.cardioActivity.findMany({
      where: {
        activityDate: { gte: startOfWeek, lt: endOfWeek },
      },
    }),

    // Recent 5 cardio activities
    db.cardioActivity.findMany({
      orderBy: { activityDate: "desc" },
      take: 5,
    }),

    // All cardio dates for streak
    db.cardioActivity.findMany({
      select: { activityDate: true },
      orderBy: { activityDate: "desc" },
    }),
  ]);

  // Calculate stats
  const workoutsThisWeek = weekSessions.length;

  const totalVolumeThisWeek = weekSessions.reduce(
    (total, session) =>
      total +
      session.exercises.reduce(
        (exTotal, ex) =>
          exTotal +
          ex.sets.reduce(
            (setTotal, set) =>
              setTotal + (set.weight ?? 0) * (set.reps ?? 0),
            0
          ),
        0
      ),
    0
  );

  // Cardio stats
  const weekDistanceMeters = weekCardio.reduce(
    (sum, a) => sum + a.distanceMeters,
    0
  );

  // Calculate streak (including cardio)
  let streak = 0;
  const allCompletedDates = await db.workoutSession.findMany({
    where: { status: "COMPLETED", endedAt: { not: null } },
    select: { endedAt: true },
    orderBy: { endedAt: "desc" },
  });

  const uniqueDates = new Set<string>();
  for (const s of allCompletedDates) {
    uniqueDates.add(s.endedAt!.toISOString().split("T")[0]);
  }
  for (const a of allCardioDates) {
    uniqueDates.add(a.activityDate.toISOString().split("T")[0]);
  }

  if (uniqueDates.size > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split("T")[0];

    if (!uniqueDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (uniqueDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Determine next workout in program cycle
  let nextWorkout: {
    id: string;
    name: string;
    exerciseCount: number;
    programId: string;
    workoutType: string;
    targetDistanceMeters: number | null;
  } | null = null;

  if (activeProgram && activeProgram.workouts.length > 0) {
    // Check both strength sessions and cardio activities for the last completed
    const [lastProgramSession, lastCardioForProgram] = await Promise.all([
      db.workoutSession.findFirst({
        where: {
          programId: activeProgram.id,
          status: "COMPLETED",
        },
        select: { programWorkoutId: true, endedAt: true },
        orderBy: { endedAt: "desc" },
      }),
      db.cardioActivity.findFirst({
        where: {
          programId: activeProgram.id,
          programWorkoutId: { not: null },
        },
        select: { programWorkoutId: true, activityDate: true },
        orderBy: { activityDate: "desc" },
      }),
    ]);

    // Find the most recent completed workout (strength or cardio)
    let lastWorkoutId: string | null = null;
    if (lastProgramSession && lastCardioForProgram) {
      const sessionDate = lastProgramSession.endedAt ?? new Date(0);
      if (lastCardioForProgram.activityDate > sessionDate) {
        lastWorkoutId = lastCardioForProgram.programWorkoutId;
      } else {
        lastWorkoutId = lastProgramSession.programWorkoutId;
      }
    } else if (lastProgramSession) {
      lastWorkoutId = lastProgramSession.programWorkoutId;
    } else if (lastCardioForProgram) {
      lastWorkoutId = lastCardioForProgram.programWorkoutId;
    }

    if (lastWorkoutId) {
      const lastIdx = activeProgram.workouts.findIndex(
        (w) => w.id === lastWorkoutId
      );
      const nextIdx = (lastIdx + 1) % activeProgram.workouts.length;
      const w = activeProgram.workouts[nextIdx];
      nextWorkout = {
        id: w.id,
        name: w.name,
        exerciseCount: w.exercises.length,
        programId: activeProgram.id,
        workoutType: w.workoutType,
        targetDistanceMeters: w.targetDistanceMeters,
      };
    } else {
      const w = activeProgram.workouts[0];
      nextWorkout = {
        id: w.id,
        name: w.name,
        exerciseCount: w.exercises.length,
        programId: activeProgram.id,
        workoutType: w.workoutType,
        targetDistanceMeters: w.targetDistanceMeters,
      };
    }
  }

  // Format recent sessions for display
  const formattedSessions = recentSessions.map((s) => {
    const totalVolume = s.exercises.reduce(
      (acc, ex) =>
        acc +
        ex.sets.reduce(
          (sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0),
          0
        ),
      0
    );
    const durationSeconds =
      s.startedAt && s.endedAt
        ? Math.floor(
            (s.endedAt.getTime() - s.startedAt.getTime()) / 1000
          )
        : 0;

    return {
      id: s.id,
      type: "strength" as const,
      name: s.name ?? s.programWorkout?.name ?? "Workout",
      date: s.endedAt ?? s.startedAt ?? s.createdAt,
      duration: durationSeconds,
      exerciseCount: s.exercises.length,
      totalVolume: Math.round(totalVolume),
    };
  });

  // Format recent cardio for display
  const formattedCardio = recentCardio.map((a) => ({
    id: a.id,
    type: "cardio" as const,
    name: a.name,
    date: a.activityDate,
    distanceMeters: a.distanceMeters,
    movingTimeSeconds: a.movingTimeSeconds,
    averagePaceSecsPerKm: a.averagePaceSecsPerKm,
  }));

  // Merge and sort recent activity
  type RecentItem =
    | (typeof formattedSessions)[number]
    | (typeof formattedCardio)[number];

  const recentActivity: RecentItem[] = [
    ...formattedSessions,
    ...formattedCardio,
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">{todayFormatted}</p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Workouts This Week</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {workoutsThisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Dumbbell className="size-3.5" />
              <span>sessions completed</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Volume This Week</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totalVolumeThisWeek > 0
                ? `${Math.round(totalVolumeThisWeek).toLocaleString()} ${unit}`
                : `0 ${unit}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Weight className="size-3.5" />
              <span>total weight moved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Distance This Week</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {weekDistanceMeters > 0
                ? formatDistance(weekDistanceMeters, dUnit)
                : `0 ${distanceUnitLabel(dUnit)}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Route className="size-3.5" />
              <span>
                {weekCardio.length} {weekCardio.length === 1 ? "run" : "runs"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {streak} {streak === 1 ? "day" : "days"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame className="size-3.5" />
              <span>consecutive training days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next workout card */}
        {nextWorkout && activeProgram && (
          <Card>
            <CardHeader>
              <CardDescription>Next Workout</CardDescription>
              <CardTitle className="flex items-center gap-2">
                {nextWorkout.name}
                {nextWorkout.workoutType === "CARDIO" && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Cardio
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {nextWorkout.workoutType === "CARDIO" ? (
                  <span className="flex items-center gap-1.5">
                    <Footprints className="size-3.5" />
                    {nextWorkout.targetDistanceMeters
                      ? formatDistance(nextWorkout.targetDistanceMeters, dUnit)
                      : "Run"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="size-3.5" />
                    {nextWorkout.exerciseCount} exercises
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="size-3.5" />
                  {activeProgram.name}
                </span>
              </div>
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/programs/${nextWorkout.programId}/workouts/${nextWorkout.id}`}
                  />
                }
              >
                <Play className="size-4" />
                {nextWorkout.workoutType === "CARDIO" ? "View Run" : "Start"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 5 workouts and runs</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No completed workouts yet. Start your first workout!
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        {item.type === "cardio" && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Run
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(new Date(item.date))}
                        </span>
                        {item.type === "strength" && (
                          <>
                            {item.duration > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatDuration(item.duration)}
                              </span>
                            )}
                            <span>
                              {item.exerciseCount} exercises
                            </span>
                            <span>
                              {item.totalVolume.toLocaleString()} {unit}
                            </span>
                          </>
                        )}
                        {item.type === "cardio" && (
                          <>
                            <span className="flex items-center gap-1">
                              <Route className="size-3" />
                              {formatDistance(item.distanceMeters, dUnit)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatMovingTime(item.movingTimeSeconds)}
                            </span>
                            {item.averagePaceSecsPerKm && item.averagePaceSecsPerKm > 0 && (
                              <span>
                                {formatPace(item.averagePaceSecsPerKm, dUnit)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {item.type === "strength" && (
                      <DeleteSessionButton sessionId={item.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
