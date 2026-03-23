import type { DistanceUnit } from "@/generated/prisma/client";

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;
const KM_PER_MILE = METERS_PER_MILE / METERS_PER_KM;

export function metersToKm(meters: number): number {
  return meters / METERS_PER_KM;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToUnit(meters: number, unit: DistanceUnit): number {
  return unit === "MILES" ? metersToMiles(meters) : metersToKm(meters);
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "MILES" ? "mi" : "km";
}

export function formatDistance(meters: number, unit: DistanceUnit): string {
  const value = metersToUnit(meters, unit);
  return `${value.toFixed(2)} ${distanceUnitLabel(unit)}`;
}

/** Convert seconds-per-km to seconds-per-mile */
export function kmPaceToMilePace(secsPerKm: number): number {
  return secsPerKm * KM_PER_MILE;
}

function formatPaceValue(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Format pace from seconds-per-km, converting to user's unit */
export function formatPace(
  secsPerKm: number,
  unit: DistanceUnit
): string {
  const paceSeconds =
    unit === "MILES" ? kmPaceToMilePace(secsPerKm) : secsPerKm;
  return `${formatPaceValue(paceSeconds)} /${distanceUnitLabel(unit)}`;
}

/** Compute pace in seconds per km from distance (m) and time (s) */
export function computePace(
  distanceMeters: number,
  movingTimeSeconds: number
): number {
  if (distanceMeters <= 0) return 0;
  return movingTimeSeconds / (distanceMeters / METERS_PER_KM);
}

/** Format duration as "32:15" or "1:02:30" */
export function formatMovingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
