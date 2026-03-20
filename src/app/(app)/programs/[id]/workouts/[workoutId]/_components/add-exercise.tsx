"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { addExerciseToWorkout } from "../../../../_actions";

type Exercise = {
  id: string;
  name: string;
  equipmentType: string;
  primaryMuscleGroup: { name: string };
};

type Defaults = {
  warmUpSets: number;
  workingSets: number;
  warmUpPercent: number;
  restSeconds: number;
};

function formatEquipment(type: string): string {
  return type
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

export function AddExercise({
  availableExercises,
  programId,
  workoutId,
  defaults,
}: {
  availableExercises: Exercise[];
  programId: string;
  workoutId: string;
  defaults: Defaults;
}) {
  const [open, setOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Add Exercise</h2>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedExercise(null); }}>
        <DialogTrigger
          render={
            <Button variant="outline" className="w-full border-dashed h-12">
              <Plus className="size-4" />
              Add Exercise from Library
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          {!selectedExercise ? (
            <ExercisePicker
              exercises={availableExercises}
              onSelect={setSelectedExercise}
            />
          ) : (
            <ExerciseConfigForm
              exercise={selectedExercise}
              programId={programId}
              workoutId={workoutId}
              defaults={defaults}
              onBack={() => setSelectedExercise(null)}
              onDone={() => {
                setOpen(false);
                setSelectedExercise(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExercisePicker({
  exercises,
  onSelect,
}: {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.primaryMuscleGroup.name
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  // Group by muscle group
  const grouped = filtered.reduce<Record<string, Exercise[]>>(
    (acc, exercise) => {
      const group = exercise.primaryMuscleGroup.name;
      if (!acc[group]) acc[group] = [];
      acc[group].push(exercise);
      return acc;
    },
    {}
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Exercise</DialogTitle>
        <DialogDescription>
          Choose an exercise from your library to add to this workout.
        </DialogDescription>
      </DialogHeader>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <ScrollArea className="max-h-80">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Dumbbell className="size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {exercises.length === 0
                ? "All exercises have been added to this workout, or the library is empty."
                : "No exercises match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([groupName, groupExercises]) => (
              <div key={groupName}>
                <p className="mb-1 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {groupName}
                </p>
                <div className="space-y-0.5">
                  {groupExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => onSelect(exercise)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Dumbbell className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {exercise.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatEquipment(exercise.equipmentType)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

function ExerciseConfigForm({
  exercise,
  programId,
  workoutId,
  defaults,
  onBack,
  onDone,
}: {
  exercise: Exercise;
  programId: string;
  workoutId: string;
  defaults: Defaults;
  onBack: () => void;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [useDefaultWarmUp, setUseDefaultWarmUp] = useState(true);
  const [useDefaultWorking, setUseDefaultWorking] = useState(true);
  const [useDefaultRest, setUseDefaultRest] = useState(true);
  const [useDefaultWarmUpPct, setUseDefaultWarmUpPct] = useState(true);
  const [warmUpPct, setWarmUpPct] = useState(defaults.warmUpPercent);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    formData.set("exerciseId", exercise.id);

    if (useDefaultWarmUp) formData.delete("warmUpSets");
    if (useDefaultWorking) formData.delete("workingSets");
    if (useDefaultRest) formData.delete("restSeconds");
    if (useDefaultWarmUpPct) {
      formData.delete("warmUpPercent");
    } else {
      formData.set("warmUpPercent", warmUpPct.toString());
    }

    await addExerciseToWorkout(workoutId, programId, formData);
    setPending(false);
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Configure {exercise.name}</DialogTitle>
        <DialogDescription>
          Set up this exercise for your workout. Leave settings as default to
          inherit from program defaults.
        </DialogDescription>
      </DialogHeader>
      <form action={handleSubmit} className="space-y-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Dumbbell className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{exercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {exercise.primaryMuscleGroup.name}
                {" \u00B7 "}
                {formatEquipment(exercise.equipmentType)}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-warmUpSets">Warm-up Sets</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultWarmUp}
                  onChange={(e) => setUseDefaultWarmUp(e.target.checked)}
                  className="rounded"
                />
                Default ({defaults.warmUpSets})
              </label>
            </div>
            <Input
              id="add-warmUpSets"
              name="warmUpSets"
              type="number"
              min={0}
              max={10}
              defaultValue={defaults.warmUpSets}
              disabled={useDefaultWarmUp}
              className="w-24"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="add-workingSets">Working Sets</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useDefaultWorking}
                  onChange={(e) => setUseDefaultWorking(e.target.checked)}
                  className="rounded"
                />
                Default ({defaults.workingSets})
              </label>
            </div>
            <Input
              id="add-workingSets"
              name="workingSets"
              type="number"
              min={1}
              max={20}
              defaultValue={defaults.workingSets}
              disabled={useDefaultWorking}
              className="w-24"
            />
          </div>
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
              Default ({defaults.warmUpPercent}%)
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
          <Label htmlFor="add-targetReps">Target Reps</Label>
          <Input
            id="add-targetReps"
            name="targetReps"
            placeholder="e.g., 8-12"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="add-restSeconds">Rest (seconds)</Label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useDefaultRest}
                onChange={(e) => setUseDefaultRest(e.target.checked)}
                className="rounded"
              />
              Default ({defaults.restSeconds}s)
            </label>
          </div>
          <Input
            id="add-restSeconds"
            name="restSeconds"
            type="number"
            min={0}
            max={600}
            step={5}
            defaultValue={defaults.restSeconds}
            disabled={useDefaultRest}
            className="w-24"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Exercise"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
