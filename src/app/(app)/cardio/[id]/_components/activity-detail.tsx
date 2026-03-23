"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Route,
  Clock,
  Timer,
  Mountain,
  Heart,
  Footprints,
  Flame,
} from "lucide-react";
import type { DistanceUnit } from "@/generated/prisma/client";
import {
  formatDistance,
  formatPace,
  formatMovingTime,
} from "@/lib/cardio-utils";
import { SplitsTable } from "./splits-table";

interface BestEffort {
  name: string;
  distance: number;
  elapsed_time: number;
  moving_time: number;
}

interface Activity {
  id: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  averagePaceSecsPerKm: number | null;
  averageSpeedMps: number | null;
  maxSpeedMps: number | null;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  calories: number | null;
  splits: unknown;
  bestEfforts: unknown;
  source: string;
  activityDate: Date;
  programWorkout: { name: string } | null;
  program: { name: string } | null;
}

export function ActivityDetail({
  activity,
  distanceUnit,
}: {
  activity: Activity;
  distanceUnit: DistanceUnit;
}) {
  const dateStr = new Date(activity.activityDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bestEfforts = activity.bestEfforts as BestEffort[] | null;
  const splits = activity.splits as Array<{
    split: number;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    average_speed: number;
    average_heartrate?: number;
    elevation_difference: number;
  }> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{activity.name}</h1>
          <Badge variant="outline">{activity.activityType}</Badge>
          {activity.source === "strava" && (
            <Badge
              variant="secondary"
              className="bg-[#FC4C02]/10 text-[#FC4C02]"
            >
              Strava
            </Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">{dateStr}</p>
        {activity.programWorkout && (
          <p className="text-sm text-primary">
            {activity.program?.name} &middot; {activity.programWorkout.name}
          </p>
        )}
      </div>

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Route className="size-4" />}
          label="Distance"
          value={formatDistance(activity.distanceMeters, distanceUnit)}
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Moving Time"
          value={formatMovingTime(activity.movingTimeSeconds)}
        />
        <StatCard
          icon={<Timer className="size-4" />}
          label="Avg Pace"
          value={
            activity.averagePaceSecsPerKm
              ? formatPace(activity.averagePaceSecsPerKm, distanceUnit)
              : "--"
          }
        />
        {activity.elevationGainMeters != null && (
          <StatCard
            icon={<Mountain className="size-4" />}
            label="Elevation Gain"
            value={`${Math.round(activity.elevationGainMeters)} m`}
          />
        )}
        {activity.averageHeartrate != null && (
          <StatCard
            icon={<Heart className="size-4" />}
            label="Avg Heart Rate"
            value={`${Math.round(activity.averageHeartrate)} bpm`}
          />
        )}
        {activity.maxHeartrate != null && (
          <StatCard
            icon={<Heart className="size-4" />}
            label="Max Heart Rate"
            value={`${Math.round(activity.maxHeartrate)} bpm`}
          />
        )}
        {activity.averageCadence != null && (
          <StatCard
            icon={<Footprints className="size-4" />}
            label="Avg Cadence"
            value={`${Math.round(activity.averageCadence)} spm`}
          />
        )}
        {activity.calories != null && (
          <StatCard
            icon={<Flame className="size-4" />}
            label="Calories"
            value={`${Math.round(activity.calories)} kcal`}
          />
        )}
      </div>

      {/* Splits */}
      {splits && splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Splits</CardTitle>
          </CardHeader>
          <CardContent>
            <SplitsTable splits={splits} distanceUnit={distanceUnit} />
          </CardContent>
        </Card>
      )}

      {/* Best Efforts */}
      {bestEfforts && bestEfforts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Best Efforts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bestEfforts.map((effort, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">{effort.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatMovingTime(effort.moving_time)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
