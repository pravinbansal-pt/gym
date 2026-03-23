"use client";

import { useMemo } from "react";
import {
  Activity,
  Trophy,
  Dumbbell,
  TrendingUp,
  Weight,
  Repeat,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────

interface SetData {
  id: string;
  setType: string;
  weight: number | null;
  reps: number | null;
  orderIndex: number;
  completedAt: string | null;
}

interface SessionGroup {
  session: {
    id: string;
    name: string | null;
    startedAt: string | null;
    endedAt: string | null;
    status: string;
    createdAt: string;
  };
  sets: SetData[];
}

interface ExerciseHistoryProps {
  exerciseId: string;
  history: SessionGroup[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

// ─── Chart Configs ──────────────────────────────────────────────────

const e1rmChartConfig: ChartConfig = {
  estimated1RM: {
    label: "Est. 1RM",
    color: "hsl(var(--chart-1))",
  },
};

const bestSetChartConfig: ChartConfig = {
  weight: {
    label: "Weight",
    color: "hsl(var(--chart-2))",
  },
  reps: {
    label: "Reps",
    color: "hsl(var(--chart-3))",
  },
};

const volumeChartConfig: ChartConfig = {
  volume: {
    label: "Volume",
    color: "hsl(var(--chart-4))",
  },
};

// ─── Main Component ─────────────────────────────────────────────────

export function ExerciseHistory({ exerciseId, history }: ExerciseHistoryProps) {
  // ─── Compute analytics ─────────────────────────────────────────

  const analytics = useMemo(() => {
    if (!history.length) return null;

    let totalSessions = history.length;
    let bestE1RM = 0;
    let bestE1RMDate = "";
    let maxWeight = 0;
    let maxReps = 0;
    let totalVolume = 0;

    // Chart data arrays (chronological order for charts)
    const e1rmData: Array<{ date: string; dateLabel: string; estimated1RM: number }> = [];
    const bestSetData: Array<{ date: string; dateLabel: string; weight: number; reps: number }> = [];
    const volumeData: Array<{ date: string; dateLabel: string; volume: number }> = [];

    // Process in chronological order for charts
    const chronological = [...history].reverse();

    for (const group of chronological) {
      const sessionDate =
        group.session.startedAt ?? group.session.createdAt;
      const dateLabel = formatDateShort(sessionDate);
      let sessionBestE1RM = 0;
      let sessionBestWeight = 0;
      let sessionBestReps = 0;
      let sessionVolume = 0;

      for (const set of group.sets) {
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;

        if (w > 0 && r > 0) {
          const e1rm = calculate1RM(w, r);
          if (e1rm > sessionBestE1RM) {
            sessionBestE1RM = e1rm;
          }
          if (e1rm > bestE1RM) {
            bestE1RM = e1rm;
            bestE1RMDate = sessionDate;
          }
          if (w > maxWeight) maxWeight = w;
          if (r > maxReps) maxReps = r;

          sessionVolume += w * r;
          totalVolume += w * r;

          // Track best set (highest weight with at least 1 rep)
          if (w > sessionBestWeight || (w === sessionBestWeight && r > sessionBestReps)) {
            sessionBestWeight = w;
            sessionBestReps = r;
          }
        }
      }

      if (sessionBestE1RM > 0) {
        e1rmData.push({
          date: sessionDate,
          dateLabel,
          estimated1RM: Math.round(sessionBestE1RM * 10) / 10,
        });
      }

      if (sessionBestWeight > 0) {
        bestSetData.push({
          date: sessionDate,
          dateLabel,
          weight: sessionBestWeight,
          reps: sessionBestReps,
        });
      }

      if (sessionVolume > 0) {
        volumeData.push({
          date: sessionDate,
          dateLabel,
          volume: Math.round(sessionVolume),
        });
      }
    }

    return {
      totalSessions,
      bestE1RM: Math.round(bestE1RM * 10) / 10,
      bestE1RMDate,
      maxWeight,
      maxReps,
      totalVolume: Math.round(totalVolume),
      e1rmData,
      bestSetData,
      volumeData,
    };
  }, [history]);

  // ─── Empty state ──────────────────────────────────────────────

  if (!history.length || !analytics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Activity className="size-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">
            No workout history yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Complete a workout with this exercise to see your history here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Activity className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Sessions</p>
              <p className="text-lg font-bold tabular-nums">
                {analytics.totalSessions}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
              <Trophy className="size-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Best 1RM</p>
              <p className="text-lg font-bold tabular-nums">
                {analytics.bestE1RM > 0 ? `${analytics.bestE1RM}` : "\u2014"}
              </p>
              {analytics.bestE1RMDate && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDateShort(analytics.bestE1RMDate)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
              <Weight className="size-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Max Weight</p>
              <p className="text-lg font-bold tabular-nums">
                {analytics.maxWeight > 0 ? `${analytics.maxWeight}` : "\u2014"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10 shrink-0">
              <Repeat className="size-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Max Reps</p>
              <p className="text-lg font-bold tabular-nums">
                {analytics.maxReps > 0 ? analytics.maxReps : "\u2014"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
              <BarChart3 className="size-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">Total Volume</p>
              <p className="text-lg font-bold tabular-nums">
                {analytics.totalVolume > 0
                  ? analytics.totalVolume.toLocaleString()
                  : "\u2014"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {analytics.e1rmData.length >= 2 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Estimated 1RM Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="size-4" />
                Estimated 1RM Over Time
              </CardTitle>
              <CardDescription>
                Best estimated 1RM per session (Epley formula)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={e1rmChartConfig} className="h-[220px] w-full">
                <AreaChart
                  data={analytics.e1rmData}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="e1rmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-estimated1RM)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-estimated1RM)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    width={40}
                    domain={["auto", "auto"]}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          if (payload?.[0]?.payload?.date) {
                            return formatDate(payload[0].payload.date);
                          }
                          return "";
                        }}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="estimated1RM"
                    stroke="var(--color-estimated1RM)"
                    fill="url(#e1rmGrad)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-estimated1RM)" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Volume Per Session */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="size-4" />
                Volume Per Session
              </CardTitle>
              <CardDescription>
                Total weight x reps per workout session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={volumeChartConfig} className="h-[220px] w-full">
                <BarChart
                  data={analytics.volumeData}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    width={48}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          if (payload?.[0]?.payload?.date) {
                            return formatDate(payload[0].payload.date);
                          }
                          return "";
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="volume"
                    fill="var(--color-volume)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Best Set Over Time (full width if we have data) */}
      {analytics.bestSetData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Dumbbell className="size-4" />
              Best Set Over Time
            </CardTitle>
            <CardDescription>
              Heaviest weight used per session with rep count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={bestSetChartConfig} className="h-[220px] w-full">
              <LineChart
                data={analytics.bestSetData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="weight"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={4}
                  width={40}
                  domain={["auto", "auto"]}
                />
                <YAxis
                  yAxisId="reps"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickMargin={4}
                  width={30}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        if (payload?.[0]?.payload?.date) {
                          return formatDate(payload[0].payload.date);
                        }
                        return "";
                      }}
                    />
                  }
                />
                <Line
                  yAxisId="weight"
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--color-weight)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-weight)" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="reps"
                  type="monotone"
                  dataKey="reps"
                  stroke="var(--color-reps)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "var(--color-reps)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="size-4" />
          Session History
        </h3>

        {history.map((group) => {
          const sessionDate =
            group.session.startedAt ?? group.session.createdAt;
          const sessionVolume = group.sets.reduce((sum, s) => {
            const w = s.weight ?? 0;
            const r = s.reps ?? 0;
            return sum + w * r;
          }, 0);

          return (
            <Card key={group.session.id}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">
                      {formatDate(sessionDate)}
                    </CardTitle>
                    {group.session.name && (
                      <Badge variant="outline" className="text-xs">
                        {group.session.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(sessionVolume).toLocaleString()} vol
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Set</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead className="text-right">Est. 1RM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sets.map((set, idx) => {
                      const w = set.weight ?? 0;
                      const r = set.reps ?? 0;
                      const e1rm =
                        w > 0 && r > 0 ? calculate1RM(w, r) : null;

                      return (
                        <TableRow key={set.id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                set.setType === "WARM_UP"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {set.setType === "WARM_UP"
                                ? "Warm-up"
                                : "Working"}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {w > 0 ? w : "\u2014"}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {r > 0 ? r : "\u2014"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {e1rm && set.setType === "WORKING" ? (
                              <span className="font-medium">
                                {Math.round(e1rm * 10) / 10}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {"\u2014"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
