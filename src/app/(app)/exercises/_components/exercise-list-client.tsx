"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Plus,
  Search,
  X,
  LayoutGrid,
  List,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddExerciseDialog } from "./add-exercise-dialog";

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
}

export function ExerciseListClient({
  exercises,
  muscleGroups,
}: ExerciseListClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [muscleGroupFilter, setMuscleGroupFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");

  const filteredExercises = useMemo(() => {
    let result = exercises;
    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (muscleGroupFilter) {
      result = result.filter((e) => e.primaryMuscleGroup.id === muscleGroupFilter);
    }
    if (equipmentFilter) {
      result = result.filter((e) => e.equipmentType === equipmentFilter);
    }
    return result;
  }, [exercises, searchValue, muscleGroupFilter, equipmentFilter]);

  const clearFilters = () => {
    setSearchValue("");
    setMuscleGroupFilter("");
    setEquipmentFilter("");
  };

  const hasFilters = searchValue || muscleGroupFilter || equipmentFilter;

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
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={muscleGroupFilter}
          onValueChange={(val) => setMuscleGroupFilter(val ?? "")}
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
          value={equipmentFilter}
          onValueChange={(val) => setEquipmentFilter(val ?? "")}
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

        <div className="ml-auto flex items-center gap-1 rounded-lg border p-0.5">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            className="size-8"
            onClick={() => setView("table")}
            aria-label="Table view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Exercise List */}
      {filteredExercises.length === 0 ? (
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
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/exercises/${exercise.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:bg-muted/50">
                <div className="mx-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-white">
                  {exercise.imageUrl ? (
                    <img
                      src={exercise.imageUrl}
                      alt={exercise.name}
                      className="max-h-full max-w-full object-contain"
                      suppressHydrationWarning
                    />
                  ) : (
                    <Dumbbell className="size-10 text-muted-foreground/40" />
                  )}
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
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 hidden sm:table-cell" />
                <TableHead>Name</TableHead>
                <TableHead>Muscle Group</TableHead>
                <TableHead className="hidden sm:table-cell">Equipment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExercises.map((exercise) => (
                <TableRow key={exercise.id} className="group">
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {exercise.imageUrl ? (
                        <img
                          src={exercise.imageUrl}
                          alt={exercise.name}
                          className="max-h-full max-w-full object-contain"
                          suppressHydrationWarning
                        />
                      ) : (
                        <Dumbbell className="size-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/exercises/${exercise.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {exercise.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {exercise.primaryMuscleGroup.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">
                      {formatEquipment(exercise.equipmentType)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddExerciseDialog
        muscleGroups={muscleGroups}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
