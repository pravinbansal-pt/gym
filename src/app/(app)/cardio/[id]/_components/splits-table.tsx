"use client";

import type { DistanceUnit } from "@/generated/prisma/client";
import { formatPace } from "@/lib/cardio-utils";

interface Split {
  split: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed: number;
  average_heartrate?: number;
  elevation_difference: number;
}

export function SplitsTable({
  splits,
  distanceUnit,
}: {
  splits: Split[];
  distanceUnit: DistanceUnit;
}) {
  if (!splits || splits.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="py-2 text-left font-medium">Split</th>
            <th className="py-2 text-right font-medium">Pace</th>
            <th className="py-2 text-right font-medium">Elev</th>
            {splits.some((s) => s.average_heartrate) && (
              <th className="py-2 text-right font-medium">HR</th>
            )}
          </tr>
        </thead>
        <tbody>
          {splits.map((split) => {
            const paceSecsPerKm =
              split.average_speed > 0
                ? 1000 / split.average_speed
                : 0;

            return (
              <tr key={split.split} className="border-b last:border-0">
                <td className="py-2 tabular-nums">{split.split} km</td>
                <td className="py-2 text-right tabular-nums">
                  {paceSecsPerKm > 0
                    ? formatPace(paceSecsPerKm, distanceUnit)
                    : "--"}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {split.elevation_difference > 0 ? "+" : ""}
                  {Math.round(split.elevation_difference)} m
                </td>
                {splits.some((s) => s.average_heartrate) && (
                  <td className="py-2 text-right tabular-nums">
                    {split.average_heartrate
                      ? `${Math.round(split.average_heartrate)} bpm`
                      : "--"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
