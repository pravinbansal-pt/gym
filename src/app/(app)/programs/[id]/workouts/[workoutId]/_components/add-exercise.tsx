"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addExerciseToWorkout } from "../../../../_actions";
import { AddExerciseDialog } from "@/app/(app)/exercises/_components/add-exercise-dialog";

type Exercise = {
  id: string;
  name: string;
  equipmentType: string;
  primaryMuscleGroup: { id: string; name: string };
};

type MuscleGroup = {
  id: string;
  name: string;
  displayOrder: number;
};

const EQUIPMENT_OPTIONS = [
  { value: "BARBELL", label: "Barbell" },
  { value: "DUMBBELL", label: "Dumbbell" },
  { value: "MACHINE", label: "Machine" },
  { value: "CABLE", label: "Cable" },
  { value: "BODYWEIGHT", label: "Bodyweight" },
  { value: "SMITH_MACHINE", label: "Smith Machine" },
  { value: "EZ_BAR", label: "EZ Bar" },
  { value: "KETTLEBELL", label: "Kettlebell" },
  { value: "RESISTANCE_BAND", label: "Band" },
  { value: "OTHER", label: "Other" },
] as const;

function formatEquipment(type: string): string {
  return EQUIPMENT_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function AddExercise({
  availableExercises,
  muscleGroups,
  programId,
  workoutId,
}: {
  availableExercises: Exercise[];
  muscleGroups: MuscleGroup[];
  programId: string;
  workoutId: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [adding, startAdding] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  // Only show equipment types that exist in the available exercises
  const availableEquipmentTypes = useMemo(() => {
    const types = new Set(availableExercises.map((e) => e.equipmentType));
    return EQUIPMENT_OPTIONS.filter((o) => types.has(o.value));
  }, [availableExercises]);

  // Only show muscle groups that exist in the available exercises
  const availableMuscleGroups = useMemo(() => {
    const ids = new Set(availableExercises.map((e) => e.primaryMuscleGroup.id));
    return muscleGroups.filter((mg) => ids.has(mg.id));
  }, [availableExercises, muscleGroups]);

  const filtered = useMemo(() => {
    let result = availableExercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscleGroup.name.toLowerCase().includes(q)
      );
    }
    if (muscleFilter) {
      result = result.filter((e) => e.primaryMuscleGroup.id === muscleFilter);
    }
    if (equipmentFilter) {
      result = result.filter((e) => e.equipmentType === equipmentFilter);
    }
    return result;
  }, [availableExercises, search, muscleFilter, equipmentFilter]);

  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, exercise) => {
    const group = exercise.primaryMuscleGroup.name;
    if (!acc[group]) acc[group] = [];
    acc[group].push(exercise);
    return acc;
  }, {});

  function handleSelect(exercise: Exercise) {
    startAdding(async () => {
      await addExerciseToWorkout(workoutId, programId, exercise.id);
      setOpen(false);
      resetFilters();
    });
  }

  function resetFilters() {
    setSearch("");
    setMuscleFilter("");
    setEquipmentFilter("");
  }

  return (
    <div>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetFilters();
        }}
      >
        <DialogTrigger
          render={
            <Button variant="outline" className="w-full border-dashed h-12">
              <Plus className="size-4" />
              Add Exercise from Library
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Exercise</DialogTitle>
            <DialogDescription>
              Choose an exercise to add. Default sets will be created
              automatically &mdash; you can configure them inline after adding.
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

          {/* Muscle group filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setMuscleFilter("")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !muscleFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Muscles
            </button>
            {availableMuscleGroups.map((mg) => (
              <button
                key={mg.id}
                type="button"
                onClick={() =>
                  setMuscleFilter(muscleFilter === mg.id ? "" : mg.id)
                }
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  muscleFilter === mg.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {mg.name}
              </button>
            ))}
          </div>

          {/* Equipment type filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEquipmentFilter("")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !equipmentFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All Equipment
            </button>
            {availableEquipmentTypes.map((eq) => (
              <button
                key={eq.value}
                type="button"
                onClick={() =>
                  setEquipmentFilter(
                    equipmentFilter === eq.value ? "" : eq.value
                  )
                }
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  equipmentFilter === eq.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {eq.label}
              </button>
            ))}
          </div>

          <ScrollArea className="max-h-64">
            {Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Dumbbell className="size-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {availableExercises.length === 0
                    ? "All exercises have been added to this workout, or the library is empty."
                    : "No exercises match your filters."}
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
                          disabled={adding}
                          onClick={() => handleSelect(exercise)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
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

          {/* Create new exercise */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              resetFilters();
              setCreateOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Plus className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Create New Exercise</p>
              <p className="text-xs text-muted-foreground">
                Can&apos;t find what you need? Add it to your library.
              </p>
            </div>
          </button>
        </DialogContent>
      </Dialog>

      <AddExerciseDialog
        muscleGroups={muscleGroups}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
