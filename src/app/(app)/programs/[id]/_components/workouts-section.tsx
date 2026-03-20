"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  PlayCircle,
  GripVertical,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWorkout,
  updateWorkout,
  deleteWorkout,
  reorderWorkout,
} from "../../_actions";

type Phase = {
  id: string;
  name: string;
  orderIndex: number;
};

type Workout = {
  id: string;
  name: string;
  dayIndex: number;
  orderIndex: number;
  programId: string;
  phaseId: string | null;
  phase: Phase | null;
  _count: { exercises: number };
};

type Program = {
  id: string;
  type: "SIMPLE" | "PERIODIZED";
};

export function WorkoutsSection({
  program,
  workouts,
  phases,
  lastCompletedWorkoutId,
}: {
  program: Program;
  workouts: Workout[];
  phases: Phase[];
  lastCompletedWorkoutId: string | null;
}) {
  const isPeriodized = program.type === "PERIODIZED";

  // Group workouts by phase for periodized programs
  const groupedWorkouts = isPeriodized
    ? phases.map((phase) => ({
        phase,
        workouts: workouts.filter((w) => w.phaseId === phase.id),
      }))
    : null;

  const unassignedWorkouts = isPeriodized
    ? workouts.filter((w) => !w.phaseId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold tracking-tight">Workouts</h2>
          <Badge variant="secondary">{workouts.length}</Badge>
        </div>
        <WorkoutFormDialog programId={program.id} phases={phases} isPeriodized={isPeriodized} />
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Dumbbell className="size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No workouts added yet. Add your first workout to get started.
            </p>
          </CardContent>
        </Card>
      ) : isPeriodized && groupedWorkouts ? (
        <div className="space-y-6">
          {groupedWorkouts.map(({ phase, workouts: phaseWorkouts }) => (
            <div key={phase.id} className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-primary" />
                {phase.name}
                <span className="text-xs">
                  ({phaseWorkouts.length}{" "}
                  {phaseWorkouts.length === 1 ? "workout" : "workouts"})
                </span>
              </h3>
              {phaseWorkouts.length === 0 ? (
                <p className="pl-4 text-xs text-muted-foreground">
                  No workouts in this phase yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {phaseWorkouts.map((workout, idx) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      programId={program.id}
                      phases={phases}
                      isPeriodized={isPeriodized}
                      isFirst={idx === 0}
                      isLast={idx === phaseWorkouts.length - 1}
                      isNext={workout.id !== lastCompletedWorkoutId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {unassignedWorkouts && unassignedWorkouts.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-muted-foreground" />
                Unassigned
              </h3>
              <div className="space-y-1.5">
                {unassignedWorkouts.map((workout, idx) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    programId={program.id}
                    phases={phases}
                    isPeriodized={isPeriodized}
                    isFirst={idx === 0}
                    isLast={idx === unassignedWorkouts.length - 1}
                    isNext={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {workouts.map((workout, idx) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              programId={program.id}
              phases={phases}
              isPeriodized={isPeriodized}
              isFirst={idx === 0}
              isLast={idx === workouts.length - 1}
              isNext={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({
  workout,
  programId,
  phases,
  isPeriodized,
  isFirst,
  isLast,
  isNext,
}: {
  workout: Workout;
  programId: string;
  phases: Phase[];
  isPeriodized: boolean;
  isFirst: boolean;
  isLast: boolean;
  isNext: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <Card size="sm" className="group">
      <CardContent className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst}
            onClick={() => reorderWorkout(workout.id, programId, "up")}
          >
            <ChevronUp className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast}
            onClick={() => reorderWorkout(workout.id, programId, "down")}
          >
            <ChevronDown className="size-3" />
          </Button>
        </div>

        <Link
          href={`/programs/${programId}/workouts/${workout.id}`}
          className="flex flex-1 items-center gap-3 min-w-0"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-sm font-bold text-muted-foreground">
            {workout.dayIndex + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{workout.name}</p>
            <p className="text-xs text-muted-foreground">
              Day {workout.dayIndex + 1}
              {" \u00B7 "}
              {workout._count.exercises}{" "}
              {workout._count.exercises === 1 ? "exercise" : "exercises"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <WorkoutFormDialog
            programId={programId}
            phases={phases}
            isPeriodized={isPeriodized}
            workout={workout}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await deleteWorkout(workout.id, programId);
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

function WorkoutFormDialog({
  programId,
  phases,
  isPeriodized,
  workout,
}: {
  programId: string;
  phases: Phase[];
  isPeriodized: boolean;
  workout?: Workout;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(
    workout?.phaseId ?? ""
  );
  const isEditing = !!workout;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    if (isPeriodized && selectedPhase) {
      formData.set("phaseId", selectedPhase);
    }
    if (isEditing) {
      await updateWorkout(workout.id, programId, formData);
    } else {
      await createWorkout(programId, formData);
    }
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" size="icon-xs">
              <Pencil className="size-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Plus className="size-3.5" />
              Add Workout
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Workout" : "Add Workout"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this workout's details."
              : "Add a new workout to your program."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout Name</Label>
            <Input
              id="workout-name"
              name="name"
              placeholder="e.g., Upper Body A"
              defaultValue={workout?.name ?? ""}
              required
            />
          </div>

          {isPeriodized && phases.length > 0 && (
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select
                value={selectedPhase}
                onValueChange={(val) => setSelectedPhase(val ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Workout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
