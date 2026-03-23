import type { WeightUnit } from "@/generated/prisma/client";

export function unitLabel(unit: WeightUnit): string {
  return unit === "LBS" ? "lbs" : "kg";
}

export function getWeightIncrements(unit: WeightUnit): {
  working: number;
  warmUp: number;
} {
  return unit === "LBS"
    ? { working: 10, warmUp: 5 }
    : { working: 5, warmUp: 2.5 };
}

export function resolveWeightUnit(
  exerciseUnit: WeightUnit | null | undefined,
  globalDefault: WeightUnit
): WeightUnit {
  return exerciseUnit ?? globalDefault;
}
