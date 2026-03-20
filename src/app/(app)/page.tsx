import Link from "next/link";
import { db } from "@/lib/db";
import {
  Dumbbell,
  Calendar,
  Flame,
  Weight,
  Trophy,
  Play,
  Clock,
  ChevronRight,
  FolderKanban,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeeklyVolumeChart } from "./_components/weekly-volume-chart";

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

function calculate1RM(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

export default async function DashboardPage() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  // Past 7 days for daily volume chart
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    recentSessions,
    weekSessions,
    activeProgram,
    recentPRs,
    dailyVolumeSessions,
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

    // Recent 5 personal records
    db.personalRecord.findMany({
      include: {
        exercise: {
          select: {
            name: true,
            primaryMuscleGroup: { select: { name: true } },
          },
        },
      },
      orderBy: { achievedAt: "desc" },
      take: 5,
    }),

    // Sessions for past 7 days volume chart
    db.workoutSession.findMany({
      where: {
        status: "COMPLETED",
        endedAt: { gte: sevenDaysAgo },
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

  // Calculate streak
  let streak = 0;
  const allCompletedDates = await db.workoutSession.findMany({
    where: { status: "COMPLETED", endedAt: { not: null } },
    select: { endedAt: true },
    orderBy: { endedAt: "desc" },
  });

  if (allCompletedDates.length > 0) {
    const uniqueDates = new Set(
      allCompletedDates.map((s) =>
        s.endedAt!.toISOString().split("T")[0]
      )
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check from today backwards
    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split("T")[0];

    // If no workout today, start from yesterday
    if (!uniqueDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (uniqueDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Build daily volume data for past 7 days
  const dailyVolumeData: Array<{ day: string; volume: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });

    const dayVolume = dailyVolumeSessions
      .filter((s) => s.endedAt && s.endedAt.toISOString().split("T")[0] === dateStr)
      .reduce(
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

    dailyVolumeData.push({ day: dayLabel, volume: Math.round(dayVolume) });
  }

  // Determine next workout in program cycle
  let nextWorkout: {
    id: string;
    name: string;
    exerciseCount: number;
    programId: string;
  } | null = null;

  if (activeProgram && activeProgram.workouts.length > 0) {
    // Find the last completed session for this program
    const lastProgramSession = await db.workoutSession.findFirst({
      where: {
        programId: activeProgram.id,
        status: "COMPLETED",
      },
      select: { programWorkoutId: true },
      orderBy: { endedAt: "desc" },
    });

    if (lastProgramSession?.programWorkoutId) {
      const lastIdx = activeProgram.workouts.findIndex(
        (w) => w.id === lastProgramSession.programWorkoutId
      );
      const nextIdx = (lastIdx + 1) % activeProgram.workouts.length;
      const w = activeProgram.workouts[nextIdx];
      nextWorkout = {
        id: w.id,
        name: w.name,
        exerciseCount: w.exercises.length,
        programId: activeProgram.id,
      };
    } else {
      // No session yet, start with the first workout
      const w = activeProgram.workouts[0];
      nextWorkout = {
        id: w.id,
        name: w.name,
        exerciseCount: w.exercises.length,
        programId: activeProgram.id,
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
      name: s.name ?? s.programWorkout?.name ?? "Workout",
      date: s.endedAt ?? s.startedAt ?? s.createdAt,
      duration: durationSeconds,
      exerciseCount: s.exercises.length,
      totalVolume: Math.round(totalVolume),
    };
  });

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">{todayFormatted}</p>
        </div>
        <Button size="lg" render={<Link href="/history" />}>
          <Play className="size-4" />
          Start Workout
        </Button>
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
                ? `${Math.round(totalVolumeThisWeek).toLocaleString()} kg`
                : "0 kg"}
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

        <Card>
          <CardHeader>
            <CardDescription>Active Program</CardDescription>
            <CardTitle className="text-2xl truncate">
              {activeProgram ? activeProgram.name : "None"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderKanban className="size-3.5" />
              {activeProgram ? (
                <Link
                  href={`/programs/${activeProgram.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  View program
                </Link>
              ) : (
                <Link
                  href="/programs"
                  className="underline-offset-4 hover:underline"
                >
                  Set up a program
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Next workout card */}
          {nextWorkout && activeProgram && (
            <Card>
              <CardHeader>
                <CardDescription>Next Workout</CardDescription>
                <CardTitle>{nextWorkout.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="size-3.5" />
                    {nextWorkout.exerciseCount} exercises
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="size-3.5" />
                    {activeProgram.name}
                  </span>
                </div>
                <Button
                  render={
                    <Link
                      href={`/programs/${nextWorkout.programId}/workouts/${nextWorkout.id}`}
                    />
                  }
                >
                  <Play className="size-4" />
                  Start
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Last 5 completed sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {formattedSessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No completed workouts yet. Start your first workout!
                </p>
              ) : (
                <div className="space-y-3">
                  {formattedSessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/history`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium">
                          {session.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(session.date)}
                          </span>
                          {session.duration > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDuration(session.duration)}
                            </span>
                          )}
                          <span>
                            {session.exerciseCount} exercises
                          </span>
                          <span>
                            {session.totalVolume.toLocaleString()} kg
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent PRs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent PRs</CardTitle>
                  <CardDescription>Latest personal records</CardDescription>
                </div>
                <Link href="/records">
                  <Button variant="ghost" size="sm">
                    View all
                    <ChevronRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentPRs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No personal records yet. Complete some sets to start tracking PRs!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentPRs.map((pr) => {
                    const sevenDaysAgoDate = new Date();
                    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
                    const isRecent = pr.achievedAt >= sevenDaysAgoDate;

                    return (
                      <div
                        key={pr.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                          <Trophy className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {pr.exercise.name}
                            </p>
                            {isRecent && (
                              <Badge variant="secondary" className="text-[10px]">
                                New!
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {pr.weight} kg x {pr.reps} reps
                            </span>
                            <span className="text-muted-foreground/50">|</span>
                            <span>
                              Est. 1RM: {Math.round(pr.estimated1RM)} kg
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(pr.achievedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly volume chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Volume</CardTitle>
              <CardDescription>Daily volume over the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyVolumeData.every((d) => d.volume === 0) ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No volume data for the past 7 days.
                </p>
              ) : (
                <WeeklyVolumeChart data={dailyVolumeData} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
