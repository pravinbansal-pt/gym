"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footprints, Timer, Route, MapPin } from "lucide-react";
import type { DistanceUnit } from "@/generated/prisma/client";
import { formatDistance, formatPace, distanceUnitLabel } from "@/lib/cardio-utils";

interface CardioStatsProps {
  weekDistance: number;
  weekRuns: number;
  weekAvgPace: number;
  totalDistance: number;
  distanceUnit: DistanceUnit;
}

export function CardioStats({
  weekDistance,
  weekRuns,
  weekAvgPace,
  totalDistance,
  distanceUnit,
}: CardioStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Runs This Week</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{weekRuns}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Footprints className="size-3.5" />
            <span>activities</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Distance This Week</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {weekDistance > 0
              ? formatDistance(weekDistance, distanceUnit)
              : `0 ${distanceUnitLabel(distanceUnit)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Route className="size-3.5" />
            <span>total distance</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Avg Pace This Week</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {weekAvgPace > 0 ? formatPace(weekAvgPace, distanceUnit) : "--"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="size-3.5" />
            <span>average pace</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total Distance</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {totalDistance > 0
              ? formatDistance(totalDistance, distanceUnit)
              : `0 ${distanceUnitLabel(distanceUnit)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>all time</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
