"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  ExternalLink,
  Plus,
  Target,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  removeExerciseFromWorkout,
  reorderWorkoutExercise,
  updateProgramSet,
  addSetToExercise,
  removeProgramSet,
} from "../../../../_actions";

type SetConfig = {
  id: string;
  setType: "WARM_UP" | "WORKING";
  targetWeight: number | null;
  targetReps: string | null;
  restSeconds: number;
  orderIndex: number;
};

type PreviousSet = { weight: number | null; reps: number | null };

type ExerciseConfig = {
  id: string;
  orderIndex: number;
  warmUpSets: number | null;
  workingSets: number | null;
  warmUpPercent: number | null;
  targetReps: string | null;
  restSeconds: number | null;
  sets: SetConfig[];
  exercise: {
    id: string;
    name: string;
    description: string | null;
    equipmentType: string;
    imageUrl: string | null;
    primaryMuscleGroup: { name: string };
  };
};

type ProgramDefaults = {
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

function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `0:${secs.toString().padStart(2, "0")}`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseRestTime(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.includes(":")) {
    const [mins, secs] = trimmed.split(":");
    const m = parseInt(mins!, 10);
    const s = parseInt(secs!, 10);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = parseInt(trimmed, 10);
  if (isNaN(n) || n < 0) return null;
  return n * 60;
}

function autoFormatRest(value: string): string {
  const secs = parseRestTime(value);
  if (secs === null) return value;
  return formatRestTime(secs);
}

function formatPrevious(prev: PreviousSet | undefined): string {
  if (!prev) return "—";
  const w = prev.weight != null ? prev.weight : "—";
  const r = prev.reps != null ? prev.reps : "—";
  return `${w} kg × ${r}`;
}

export function ExerciseList({
  exercises,
  programId,
  workoutId,
  previousData,
  defaults,
}: {
  exercises: ExerciseConfig[];
  programId: string;
  workoutId: string;
  previousData: Record<string, PreviousSet[]>;
  defaults: ProgramDefaults;
}) {
  if (exercises.length === 0) {
    return (
      <div className="space-y-3">
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
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        Exercises
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {exercises.length}
        </span>
      </h2>
      <div className="space-y-1.5">
        {exercises.map((config, idx) => (
          <ExerciseRow
            key={config.id}
            config={config}
            programId={programId}
            workoutId={workoutId}
            previousSets={previousData[config.exercise.id] ?? []}
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

function ExerciseRow({
  config,
  programId,
  workoutId,
  previousSets,
  defaults,
  isFirst,
  isLast,
  index,
}: {
  config: ExerciseConfig;
  programId: string;
  workoutId: string;
  previousSets: PreviousSet[];
  defaults: ProgramDefaults;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const warmUpCount = config.sets.filter((s) => s.setType === "WARM_UP").length;
  const workingCount = config.sets.filter(
    (s) => s.setType === "WORKING"
  ).length;

  const { exercise } = config;

  return (
    <div className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-sm">
      {/* Header */}
      <div
        className="flex w-full items-center gap-2.5 px-3 py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Reorder */}
        <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={isFirst}
            className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 leading-none"
            onClick={() =>
              reorderWorkoutExercise(config.id, programId, workoutId, "up")
            }
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 leading-none"
            onClick={() =>
              reorderWorkoutExercise(config.id, programId, workoutId, "down")
            }
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        {/* Image with number overlay / fallback */}
        <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
          {exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs font-bold text-muted-foreground">
              {index + 1}
            </div>
          )}
          {exercise.imageUrl && (
            <div className="absolute bottom-0 right-0 flex size-4 items-center justify-center rounded-tl bg-black/60 text-[9px] font-bold text-white">
              {index + 1}
            </div>
          )}
        </div>

        {/* Name (clickable → modal) + meta */}
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <ExerciseInfoDialog exercise={exercise}>
            <button
              type="button"
              className="text-sm font-semibold leading-tight truncate hover:underline text-left"
            >
              {exercise.name}
            </button>
          </ExerciseInfoDialog>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {exercise.primaryMuscleGroup.name}
            {" · "}
            {formatEquipment(exercise.equipmentType)}
          </p>
        </div>

        {/* Set pills */}
        <div className="flex items-center gap-0.5 shrink-0">
          {config.sets.map((s) => (
            <div
              key={s.id}
              className={`h-4 w-[5px] rounded-sm ${
                s.setType === "WARM_UP"
                  ? "bg-amber-300 dark:bg-amber-500"
                  : "bg-blue-300 dark:bg-blue-500"
              }`}
            />
          ))}
          <span className="ml-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
            {warmUpCount > 0 && `${warmUpCount}W + `}
            {workingCount}S
          </span>
        </div>

        {/* Expand indicator */}
        <ChevronRight
          className={`size-4 text-muted-foreground/40 transition-transform duration-200 shrink-0 ${expanded ? "rotate-90" : ""}`}
        />

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={deleting}
          className="text-muted-foreground/40 hover:text-destructive shrink-0"
          onClick={async (e) => {
            e.stopPropagation();
            setDeleting(true);
            await removeExerciseFromWorkout(config.id, programId, workoutId);
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Expanded sets */}
      {expanded && (
        <div className="border-t bg-muted/20 px-3 py-1.5">
          <SetsEditor
            sets={config.sets}
            previousSets={previousSets}
            exerciseConfigId={config.id}
            programId={programId}
            workoutId={workoutId}
          />
        </div>
      )}
    </div>
  );
}

function ExerciseInfoDialog({
  exercise,
  children,
}: {
  exercise: ExerciseConfig["exercise"];
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger nativeButton={false} render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
          <DialogDescription>
            {exercise.primaryMuscleGroup.name}
            {" · "}
            {formatEquipment(exercise.equipmentType)}
          </DialogDescription>
        </DialogHeader>

        {/* Image */}
        {exercise.imageUrl ? (
          <div className="overflow-hidden rounded-lg bg-muted">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
            <Dumbbell className="size-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Description */}
        {exercise.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {exercise.description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {exercise.primaryMuscleGroup.name}
          </Badge>
          <Badge variant="outline">
            {formatEquipment(exercise.equipmentType)}
          </Badge>
        </div>

        {/* Link to full detail page */}
        <Link
          href={`/exercises/${exercise.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          View full details
          <ExternalLink className="size-3.5" />
        </Link>
      </DialogContent>
    </Dialog>
  );
}

function SetsEditor({
  sets,
  previousSets,
  exerciseConfigId,
  programId,
  workoutId,
}: {
  sets: SetConfig[];
  previousSets: PreviousSet[];
  exerciseConfigId: string;
  programId: string;
  workoutId: string;
}) {
  const [adding, startAdding] = useTransition();
  const lastSet = sets[sets.length - 1];
  const lastRest = lastSet ? formatRestTime(lastSet.restSeconds) : "1:30";

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className="h-7 w-10 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Set
            </TableHead>
            <TableHead className="h-7 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Previous
            </TableHead>
            <TableHead className="h-7 w-16 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              kg
            </TableHead>
            <TableHead className="h-7 w-14 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Reps
            </TableHead>
            <TableHead className="h-7 w-16 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Rest
            </TableHead>
            <TableHead className="h-7 w-7 px-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sets.map((set, idx) => (
            <SetRow
              key={set.id}
              set={set}
              index={idx}
              sets={sets}
              previous={previousSets[idx]}
              programId={programId}
              workoutId={workoutId}
            />
          ))}
        </TableBody>
      </Table>

      <button
        type="button"
        disabled={adding}
        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 bg-background py-2 text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
        onClick={() => {
          startAdding(async () => {
            await addSetToExercise(exerciseConfigId, programId, workoutId);
          });
        }}
      >
        <Plus className="size-3.5" />
        Add Set ({lastRest})
      </button>
    </div>
  );
}

function SetRow({
  set,
  index,
  sets,
  previous,
  programId,
  workoutId,
}: {
  set: SetConfig;
  index: number;
  sets: SetConfig[];
  previous: PreviousSet | undefined;
  programId: string;
  workoutId: string;
}) {
  const [removing, startRemoving] = useTransition();
  const [toggling, startToggling] = useTransition();
  const isWarmup = set.setType === "WARM_UP";

  const warmupIndex =
    sets.slice(0, index).filter((s) => s.setType === "WARM_UP").length + 1;
  const workingIndex =
    sets.slice(0, index).filter((s) => s.setType === "WORKING").length + 1;
  const label = isWarmup ? `W${warmupIndex}` : `S${workingIndex}`;

  return (
    <TableRow className="border-0 hover:bg-muted/30">
      <TableCell className="px-1 py-1 text-center">
        <button
          type="button"
          disabled={toggling}
          title={`Click to switch to ${isWarmup ? "working" : "warm-up"} set`}
          className="focus:outline-none"
          onClick={() => {
            startToggling(async () => {
              await updateProgramSet(set.id, programId, workoutId, {
                setType: isWarmup ? "WORKING" : "WARM_UP",
              });
            });
          }}
        >
          <span
            className={`inline-flex size-7 items-center justify-center rounded-md text-[10px] font-bold cursor-pointer select-none transition-colors ${
              isWarmup
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-800/60"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-800/60"
            }`}
          >
            {label}
          </span>
        </button>
      </TableCell>

      <TableCell className="px-1 py-1">
        <span className="text-xs text-muted-foreground/50">
          {formatPrevious(previous)}
        </span>
      </TableCell>

      <TableCell className="px-1 py-1">
        <SetInput
          defaultValue={set.targetWeight?.toString() ?? ""}
          placeholder="—"
          onCommit={(val) => {
            const weight = val ? parseFloat(val) : null;
            if (val && isNaN(weight!)) return;
            updateProgramSet(set.id, programId, workoutId, {
              targetWeight: weight,
            });
          }}
        />
      </TableCell>

      <TableCell className="px-1 py-1">
        <SetInput
          defaultValue={set.targetReps ?? ""}
          placeholder="—"
          onCommit={(val) => {
            updateProgramSet(set.id, programId, workoutId, {
              targetReps: val,
            });
          }}
        />
      </TableCell>

      <TableCell className="px-1 py-1">
        <RestChip
          restSeconds={set.restSeconds}
          onCommit={(secs) => {
            updateProgramSet(set.id, programId, workoutId, {
              restSeconds: secs,
            });
          }}
        />
      </TableCell>

      <TableCell className="px-0 py-1">
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={removing}
          className="text-muted-foreground/40 hover:text-destructive"
          onClick={() => {
            startRemoving(async () => {
              await removeProgramSet(set.id, programId, workoutId);
            });
          }}
        >
          <Minus className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function RestChip({
  restSeconds,
  onCommit,
}: {
  restSeconds: number;
  onCommit: (seconds: number) => void;
}) {
  const [value, setValue] = useState(formatRestTime(restSeconds));

  return (
    <div className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-500 transition-colors hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/50">
      <Clock className="size-3 shrink-0" />
      <input
        value={value}
        className="w-8 bg-transparent text-center text-[11px] font-semibold text-inherit outline-none"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const formatted = autoFormatRest(value);
          setValue(formatted);
          const secs = parseRestTime(value);
          if (secs !== null && secs !== restSeconds) {
            onCommit(secs);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function SetInput({
  defaultValue,
  placeholder,
  onCommit,
}: {
  defaultValue: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      value={value}
      placeholder={placeholder}
      className="h-7 w-full rounded-md border border-input bg-background px-2 text-center text-sm font-medium text-foreground outline-none hover:border-ring/50 focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/30"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== defaultValue) {
          onCommit(value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
