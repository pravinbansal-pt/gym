"use client";

import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  Timer,
  Flame,
  Target,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  removeExerciseFromWorkout,
  reorderWorkoutExercise,
  updateWorkoutExercise,
} from "../../../../_actions";

type ProgramDefaults = {
  warmUpSets: number;
  workingSets: number;
  warmUpPercent: number;
  restSeconds: number;
};

type ExerciseConfig = {
  id: string;
  orderIndex: number;
  warmUpSets: number | null;
  workingSets: number | null;
  warmUpPercent: number | null;
  targetReps: string | null;
  restSeconds: number | null;
  exercise: {
    id: string;
    name: string;
    equipmentType: string;
    primaryMuscleGroup: { name: string };
  };
};

function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatEquipment(type: string): string {
  return type
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

export function ExerciseList({
  exercises,
  programId,
  workoutId,
  defaults,
}: {
  exercises: ExerciseConfig[];
  programId: string;
  workoutId: string;
  defaults: ProgramDefaults;
}) {
  if (exercises.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Exercises</h2>
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No exercises added yet. Add exercises from the library below.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">
        Exercises
        <Badge variant="secondary" className="ml-2">
          {exercises.length}
        </Badge>
      </h2>
      <div className="space-y-2">
        {exercises.map((config, idx) => (
          <ExerciseCard
            key={config.id}
            config={config}
            programId={programId}
            workoutId={workoutId}
            defaults={defaults}
            isFirst={idx === 0}
            isLast={idx === exercises.length - 1}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  config,
  programId,
  workoutId,
  defaults,
  isFirst,
  isLast,
  index,
}: {
  config: ExerciseConfig;
  programId: string;
  workoutId: string;
  defaults: ProgramDefaults;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}) {
  const [deleting, setDeleting] = useState(false);

  const warmUp = config.warmUpSets ?? defaults.warmUpSets;
  const working = config.workingSets ?? defaults.workingSets;
  const rest = config.restSeconds ?? defaults.restSeconds;
  const warmUpPct = config.warmUpPercent ?? defaults.warmUpPercent;

  const hasOverride =
    config.warmUpSets !== null ||
    config.workingSets !== null ||
    config.restSeconds !== null ||
    config.warmUpPercent !== null;

  return (
    <Card size="sm" className="group">
      <CardContent className="flex items-start gap-3">
        <div className="flex flex-col gap-0.5 pt-1">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst}
            onClick={() =>
              reorderWorkoutExercise(config.id, programId, workoutId, "up")
            }
          >
            <ChevronUp className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast}
            onClick={() =>
              reorderWorkoutExercise(config.id, programId, workoutId, "down")
            }
          >
            <ChevronDown className="size-3" />
          </Button>
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-sm font-bold text-muted-foreground mt-1">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <p className="font-medium">{config.exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {config.exercise.primaryMuscleGroup.name}
              {" \u00B7 "}
              {formatEquipment(config.exercise.equipmentType)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Flame className="size-3" />
              {warmUp} warm-up + {working} working
            </Badge>
            {config.targetReps && (
              <Badge variant="outline" className="text-xs gap-1">
                <Target className="size-3" />
                {config.targetReps} reps
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1">
              <Timer className="size-3" />
              {formatRestTime(rest)}
            </Badge>
            {hasOverride && (
              <Badge variant="secondary" className="text-xs gap-1">
                <AlertCircle className="size-3" />
                Custom
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <EditExerciseDialog
            config={config}
            programId={programId}
            workoutId={workoutId}
            defaults={defaults}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await removeExerciseFromWorkout(config.id, programId, workoutId);
              setDeleting(false);
            }}
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditExerciseDialog({
  config,
  programId,
  workoutId,
  defaults,
}: {
  config: ExerciseConfig;
  programId: string;
  workoutId: string;
  defaults: ProgramDefaults;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [useDefaultWarmUp, setUseDefaultWarmUp] = useState(
    config.warmUpSets === null
  );
  const [useDefaultWorking, setUseDefaultWorking] = useState(
    config.workingSets === null
  );
  const [useDefaultRest, setUseDefaultRest] = useState(
    config.restSeconds === null
  );
  const [useDefaultWarmUpPct, setUseDefaultWarmUpPct] = useState(
    config.warmUpPercent === null
  );
  const [warmUpPct, setWarmUpPct] = useState(
    config.warmUpPercent !== null
      ? Math.round(config.warmUpPercent * 100)
      : Math.round(defaults.warmUpPercent * 100)
  );

  async function handleSubmit(formData: FormData) {
    setPending(true);

    if (useDefaultWarmUp) formData.delete("warmUpSets");
    if (useDefaultWorking) formData.delete("workingSets");
    if (useDefaultRest) formData.delete("restSeconds");
    if (useDefaultWarmUpPct) {
      formData.delete("warmUpPercent");
    } else {
      formData.set("warmUpPercent", warmUpPct.toString());
    }

    await updateWorkoutExercise(config.id, programId, workoutId, formData);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-xs">
            <Pencil className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {config.exercise.name}</DialogTitle>
          <DialogDescription>
            Configure sets, reps, and rest for this exercise. Leave as default
            to inherit program settings.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-warmUpSets">Warm-up Sets</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultWarmUp}
                  onChange={(e) => setUseDefaultWarmUp(e.target.checked)}
                  className="rounded"
                />
                Use default ({defaults.warmUpSets})
              </label>
            </div>
            <Input
              id="edit-warmUpSets"
              name="warmUpSets"
              type="number"
              min={0}
              max={10}
              defaultValue={config.warmUpSets ?? defaults.warmUpSets}
              disabled={useDefaultWarmUp}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-workingSets">Working Sets</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultWorking}
                  onChange={(e) => setUseDefaultWorking(e.target.checked)}
                  className="rounded"
                />
                Use default ({defaults.workingSets})
              </label>
            </div>
            <Input
              id="edit-workingSets"
              name="workingSets"
              type="number"
              min={1}
              max={20}
              defaultValue={config.workingSets ?? defaults.workingSets}
              disabled={useDefaultWorking}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Warm-up Weight %</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultWarmUpPct}
                  onChange={(e) => setUseDefaultWarmUpPct(e.target.checked)}
                  className="rounded"
                />
                Use default ({Math.round(defaults.warmUpPercent * 100)}%)
              </label>
            </div>
            {!useDefaultWarmUpPct && (
              <div className="space-y-1">
                <Slider
                  value={[warmUpPct]}
                  onValueChange={(val) => {
                      const arr = Array.isArray(val) ? val : [val];
                      setWarmUpPct(arr[0]);
                    }}
                  min={0}
                  max={100}
                />
                <p className="text-xs text-muted-foreground">{warmUpPct}%</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-targetReps">Target Reps</Label>
            <Input
              id="edit-targetReps"
              name="targetReps"
              placeholder="e.g., 8-12"
              defaultValue={config.targetReps ?? ""}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-restSeconds">Rest (seconds)</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultRest}
                  onChange={(e) => setUseDefaultRest(e.target.checked)}
                  className="rounded"
                />
                Use default ({formatRestTime(defaults.restSeconds)})
              </label>
            </div>
            <Input
              id="edit-restSeconds"
              name="restSeconds"
              type="number"
              min={0}
              max={600}
              step={5}
              defaultValue={config.restSeconds ?? defaults.restSeconds}
              disabled={useDefaultRest}
              className="w-24"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
