"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Save,
  ArrowLeft,
  Trash2,
  StickyNote,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  updateSessionSets,
  addSetToSession,
  removeSet,
} from "../../../workouts/_actions";

// ─── Types ──────────────────────────────────────────────────────────

interface SetData {
  id: string;
  setType: "WARM_UP" | "WORKING";
  weight: number | null;
  reps: number | null;
  orderIndex: number;
  completedAt: string | null;
}

interface ExerciseData {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  orderIndex: number;
  sets: SetData[];
  notes: Array<{
    id: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
  }>;
}

interface SessionData {
  id: string;
  name: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  programName: string | null;
  exercises: ExerciseData[];
}

// ─── Utility ────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "--";
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Main Component ─────────────────────────────────────────────────

export function EditSession({
  initialSession,
}: {
  initialSession: SessionData;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    () => new Set(initialSession.exercises.map((e) => e.id))
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Track pending changes
  const [pendingUpdates, setPendingUpdates] = useState<
    Map<string, { weight: number | null; reps: number | null }>
  >(new Map());

  const toggleExercise = useCallback((exerciseId: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }, []);

  const updateSetLocally = useCallback(
    (exerciseId: string, setId: string, field: "weight" | "reps", value: number | null) => {
      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === setId ? { ...s, [field]: value } : s
                ),
              }
            : ex
        ),
      }));

      setPendingUpdates((prev) => {
        const next = new Map(prev);
        const existing = next.get(setId) ?? { weight: null, reps: null };
        // Get current set value for the other field
        const currentSet = session.exercises
          .flatMap((e) => e.sets)
          .find((s) => s.id === setId);
        if (field === "weight") {
          next.set(setId, { weight: value, reps: existing.reps ?? currentSet?.reps ?? null });
        } else {
          next.set(setId, { weight: existing.weight ?? currentSet?.weight ?? null, reps: value });
        }
        return next;
      });

      setHasChanges(true);
    },
    [session.exercises]
  );

  const handleAddSet = useCallback(
    async (exerciseId: string) => {
      const newSet = await addSetToSession(exerciseId, {
        weight: null,
        reps: null,
      });

      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: [
                  ...ex.sets,
                  {
                    id: newSet.id,
                    setType: newSet.setType as "WARM_UP" | "WORKING",
                    weight: newSet.weight,
                    reps: newSet.reps,
                    orderIndex: newSet.orderIndex,
                    completedAt: newSet.completedAt?.toISOString() ?? null,
                  },
                ],
              }
            : ex
        ),
      }));
    },
    []
  );

  const handleRemoveSet = useCallback(
    async (exerciseId: string, setId: string) => {
      await removeSet(setId);

      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
            : ex
        ),
      }));

      setPendingUpdates((prev) => {
        const next = new Map(prev);
        next.delete(setId);
        return next;
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (pendingUpdates.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      const updates = Array.from(pendingUpdates.entries()).map(
        ([setId, data]) => ({
          setId,
          weight: data.weight,
          reps: data.reps,
        })
      );

      await updateSessionSets(session.id, updates);
      setPendingUpdates(new Map());
      setHasChanges(false);
      toast.success("Changes saved successfully");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [pendingUpdates, session.id]);

  // Session stats
  const totalVolume = session.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets.reduce(
        (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
        0
      ),
    0
  );
  const totalSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/history")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Dumbbell className="size-5" />
              Edit: {session.name}
            </h1>
            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
              <span>{formatDate(session.startedAt)}</span>
              {session.programName && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{session.programName}</span>
                </>
              )}
              <Separator orientation="vertical" className="h-3" />
              <span>{formatDuration(session.durationSeconds)}</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{totalSets} sets</span>
              <Separator orientation="vertical" className="h-3" />
              <span>{Math.round(totalVolume).toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-1.5"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Exercise List */}
      <div className="space-y-3 max-w-4xl">
        {session.exercises.map((exercise) => (
          <EditExerciseCard
            key={exercise.id}
            exercise={exercise}
            isExpanded={expandedExercises.has(exercise.id)}
            onToggle={() => toggleExercise(exercise.id)}
            onUpdateSet={(setId, field, value) =>
              updateSetLocally(exercise.id, setId, field, value)
            }
            onAddSet={() => handleAddSet(exercise.id)}
            onRemoveSet={(setId) => handleRemoveSet(exercise.id, setId)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Edit Exercise Card ─────────────────────────────────────────────

function EditExerciseCard({
  exercise,
  isExpanded,
  onToggle,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: {
  exercise: ExerciseData;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateSet: (setId: string, field: "weight" | "reps", value: number | null) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
}) {
  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-7 rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                  {exercise.orderIndex + 1}
                </div>
                <div className="text-left">
                  <CardTitle className="text-sm font-semibold">
                    {exercise.exerciseName}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {exercise.muscleGroup}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {exercise.sets.length} sets
                    </span>
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {/* Notes */}
            {exercise.notes.length > 0 && (
              <div className="space-y-1">
                {exercise.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                      note.isPinned
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        : "bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {note.isPinned ? (
                      <Pin className="size-3 mt-0.5 shrink-0" />
                    ) : (
                      <StickyNote className="size-3 mt-0.5 shrink-0" />
                    )}
                    <span>{note.content}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sets Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[3rem_5rem_1fr_1fr_2.5rem] gap-0 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-2">
                <div>Set</div>
                <div>Type</div>
                <div>Weight (kg)</div>
                <div>Reps</div>
                <div></div>
              </div>

              {exercise.sets.map((set, idx) => (
                <EditSetRow
                  key={set.id}
                  set={set}
                  index={idx}
                  onUpdateWeight={(val) => onUpdateSet(set.id, "weight", val)}
                  onUpdateReps={(val) => onUpdateSet(set.id, "reps", val)}
                  onRemove={() => onRemoveSet(set.id)}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onAddSet}
              className="gap-1"
            >
              <Plus className="size-3.5" />
              Add Set
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Edit Set Row ───────────────────────────────────────────────────

function EditSetRow({
  set,
  index,
  onUpdateWeight,
  onUpdateReps,
  onRemove,
}: {
  set: SetData;
  index: number;
  onUpdateWeight: (val: number | null) => void;
  onUpdateReps: (val: number | null) => void;
  onRemove: () => void;
}) {
  const isWarmUp = set.setType === "WARM_UP";

  const adjustWeight = (delta: number) => {
    const current = set.weight ?? 0;
    onUpdateWeight(Math.max(0, current + delta));
  };

  const adjustReps = (delta: number) => {
    const current = set.reps ?? 0;
    onUpdateReps(Math.max(0, current + delta));
  };

  return (
    <div
      className={`grid grid-cols-[3rem_5rem_1fr_1fr_2.5rem] gap-0 items-center px-3 py-1.5 border-t ${
        isWarmUp ? "bg-muted/30" : ""
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">
        {index + 1}
      </div>

      <div>
        <Badge
          variant={isWarmUp ? "outline" : "secondary"}
          className="text-[10px]"
        >
          {isWarmUp ? "Warm-up" : "Working"}
        </Badge>
      </div>

      <div className="flex items-center gap-1 pr-2">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => adjustWeight(isWarmUp ? -2.5 : -5)}
        >
          <Minus className="size-3" />
        </Button>
        <Input
          type="number"
          value={set.weight ?? ""}
          onChange={(e) =>
            onUpdateWeight(e.target.value ? parseFloat(e.target.value) : null)
          }
          placeholder="0"
          className="h-7 w-20 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => adjustWeight(isWarmUp ? 2.5 : 5)}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <div className="flex items-center gap-1 pr-2">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => adjustReps(-1)}
        >
          <Minus className="size-3" />
        </Button>
        <Input
          type="number"
          value={set.reps ?? ""}
          onChange={(e) =>
            onUpdateReps(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          placeholder="0"
          className="h-7 w-16 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => adjustReps(1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
