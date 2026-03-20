"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Plus,
  Search,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddExerciseDialog } from "./add-exercise-dialog";
import { AIPopulateDialog } from "./ai-populate-dialog";

const EQUIPMENT_OPTIONS = [
  { value: "BARBELL", label: "Barbell" },
  { value: "DUMBBELL", label: "Dumbbell" },
  { value: "MACHINE", label: "Machine" },
  { value: "CABLE", label: "Cable" },
  { value: "BODYWEIGHT", label: "Bodyweight" },
  { value: "SMITH_MACHINE", label: "Smith Machine" },
  { value: "EZ_BAR", label: "EZ Bar" },
  { value: "KETTLEBELL", label: "Kettlebell" },
  { value: "RESISTANCE_BAND", label: "Resistance Band" },
  { value: "OTHER", label: "Other" },
] as const;

function formatEquipment(value: string): string {
  const found = EQUIPMENT_OPTIONS.find((opt) => opt.value === value);
  return found?.label ?? value;
}

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  equipmentType: string;
  imageUrl: string | null;
  primaryMuscleGroup: {
    id: string;
    name: string;
  };
}

interface MuscleGroup {
  id: string;
  name: string;
  displayOrder: number;
}

interface ExerciseListClientProps {
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  filters: {
    search?: string;
    muscleGroup?: string;
    equipment?: string;
  };
}

export function ExerciseListClient({
  exercises,
  muscleGroups,
  filters,
}: ExerciseListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? "");

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`/exercises?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition]
  );

  const clearFilters = useCallback(() => {
    setSearchValue("");
    startTransition(() => {
      router.push("/exercises");
    });
  }, [router, startTransition]);

  const hasFilters = filters.search || filters.muscleGroup || filters.equipment;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="mt-1 text-muted-foreground">
            Browse and manage your exercise library.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
            <Sparkles className="size-4" data-icon="inline-start" />
            AI Populate
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Exercise
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilters({ search: searchValue || undefined });
              }
            }}
            onBlur={() => {
              if (searchValue !== (filters.search ?? "")) {
                updateFilters({ search: searchValue || undefined });
              }
            }}
            className="pl-8"
          />
        </div>

        <Select
          value={filters.muscleGroup ?? ""}
          onValueChange={(val) =>
            updateFilters({ muscleGroup: val || undefined })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Muscle Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Muscle Groups</SelectItem>
            {muscleGroups.map((mg) => (
              <SelectItem key={mg.id} value={mg.id}>
                {mg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.equipment ?? ""}
          onValueChange={(val) =>
            updateFilters({ equipment: val || undefined })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Equipment</SelectItem>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <SelectItem key={eq.value} value={eq.value}>
                {eq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" data-icon="inline-start" />
            Clear filters
          </Button>
        )}

        {isPending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Exercise Grid */}
      {exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Dumbbell className="size-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No exercises found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Try adjusting your filters."
              : "Get started by adding your first exercise."}
          </p>
          {!hasFilters && (
            <Button
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4" data-icon="inline-start" />
              Add Exercise
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {exercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/exercises/${exercise.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                {/* Image Placeholder */}
                <div className="mx-4 flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
                  <Dumbbell className="size-10 text-muted-foreground/40" />
                </div>
                <CardHeader className="pb-0">
                  <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                    {exercise.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {exercise.primaryMuscleGroup.name}
                    </Badge>
                    <Badge variant="outline">
                      {formatEquipment(exercise.equipmentType)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Exercise Dialog */}
      <AddExerciseDialog
        muscleGroups={muscleGroups}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {/* AI Populate Dialog */}
      <AIPopulateDialog
        muscleGroups={muscleGroups}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
      />
    </div>
  );
}
