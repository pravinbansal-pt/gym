"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Route, Trash2 } from "lucide-react";
import type { DistanceUnit } from "@/generated/prisma/client";
import { formatDistance, formatPace, formatMovingTime } from "@/lib/cardio-utils";
import { deleteCardioActivity } from "../_actions";
import { toast } from "sonner";

type Activity = {
  id: string;
  name: string;
  activityType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  averagePaceSecsPerKm: number | null;
  source: string;
  activityDate: Date;
  programWorkout: { name: string } | null;
};

export function ActivityList({
  activities,
  distanceUnit,
}: {
  activities: Activity[];
  distanceUnit: DistanceUnit;
}) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Route className="size-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          No activities yet. Log your first run or sync from Strava!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          distanceUnit={distanceUnit}
        />
      ))}
    </div>
  );
}

function ActivityCard({
  activity,
  distanceUnit,
}: {
  activity: Activity;
  distanceUnit: DistanceUnit;
}) {
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setDeleting(true);
    startTransition(async () => {
      try {
        await deleteCardioActivity(activity.id);
        toast.success("Activity deleted");
      } catch {
        toast.error("Failed to delete activity");
        setDeleting(false);
      }
    });
  }

  const dateStr = new Date(activity.activityDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Link
        href={`/cardio/${activity.id}`}
        className="flex flex-1 min-w-0 items-center gap-3"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{activity.name}</p>
            <Badge variant="outline" className="text-xs shrink-0">
              {activity.activityType}
            </Badge>
            {activity.source === "strava" && (
              <Badge
                variant="secondary"
                className="text-xs shrink-0 bg-[#FC4C02]/10 text-[#FC4C02]"
              >
                Strava
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Route className="size-3" />
              {formatDistance(activity.distanceMeters, distanceUnit)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatMovingTime(activity.movingTimeSeconds)}
            </span>
            {activity.averagePaceSecsPerKm && activity.averagePaceSecsPerKm > 0 && (
              <span>{formatPace(activity.averagePaceSecsPerKm, distanceUnit)}</span>
            )}
            {activity.programWorkout && (
              <span className="text-primary">
                {activity.programWorkout.name}
              </span>
            )}
          </div>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={deleting}
        onClick={handleDelete}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  );
}
