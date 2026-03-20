"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Timer,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Trophy,
  X,
  SkipForward,
  StickyNote,
  Pin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  completeSet,
  uncompleteSet,
  updateSet,
  addSet,
  removeSet,
  startSession,
  endSession,
  saveExerciseNote,
} from "../../_actions";

// ─── Types ──────────────────────────────────────────────────────────

interface SetData {
  id: string;
  setType: "WARM_UP" | "WORKING";
  weight: number | null;
  reps: number | null;
  orderIndex: number;
  completedAt: string | null;
  estimated1RM?: number | null;
  isNewPR?: boolean;
}

interface ExerciseData {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  orderIndex: number;
  restSeconds: number;
  warmUpPercent: number;
  sets: SetData[];
  notes: Array<{
    id: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
  }>;
  prevPerformance: {
    sets: Array<{ setType: string; weight: number | null; reps: number | null }>;
    date: string | null;
  } | null;
  pinnedNotes: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
}

interface SessionData {
  id: string;
  name: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  startedAt: string | null;
  endedAt: string | null;
  exercises: ExerciseData[];
}

// ─── Utility Functions ──────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ─── Main Component ─────────────────────────────────────────────────

export function LiveSession({
  initialSession,
}: {
  initialSession: SessionData;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData>(initialSession);
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    () => new Set(initialSession.exercises.length > 0 ? [initialSession.exercises[0].id] : [])
  );

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(
    session.startedAt ? new Date(session.startedAt) : null
  );

  // Rest timer state
  const [restTimer, setRestTimer] = useState<{
    active: boolean;
    remaining: number;
    total: number;
  }>({ active: false, remaining: 0, total: 0 });
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-end tracking
  const lastInteractionRef = useRef<Date>(new Date());
  const autoEndRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Note dialog state
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    exerciseId: string;
    sessionExerciseId: string;
    exerciseName: string;
  }>({ open: false, exerciseId: "", sessionExerciseId: "", exerciseName: "" });
  const [noteContent, setNoteContent] = useState("");
  const [notePinned, setNotePinned] = useState(false);

  // Finish workout dialog
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);

  // ─── Elapsed Timer ──────────────────────────────────────────────

  useEffect(() => {
    if (session.status === "IN_PROGRESS" && startedAtRef.current) {
      // Calculate already elapsed time
      const now = new Date();
      const elapsed = Math.floor(
        (now.getTime() - startedAtRef.current.getTime()) / 1000
      );
      setElapsedSeconds(elapsed);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.status]);

  // ─── Auto-End Check ─────────────────────────────────────────────

  useEffect(() => {
    if (session.status !== "IN_PROGRESS") return;

    autoEndRef.current = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - lastInteractionRef.current.getTime();
      if (diff > 30 * 60 * 1000) {
        // 30 minutes
        handleEndSession(true);
      }
    }, 60_000);

    return () => {
      if (autoEndRef.current) clearInterval(autoEndRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  // ─── Track Interactions ─────────────────────────────────────────

  const trackInteraction = useCallback(() => {
    lastInteractionRef.current = new Date();
  }, []);

  // ─── Toggle Exercise Expand ─────────────────────────────────────

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

  // ─── Start Session (L4) ────────────────────────────────────────

  const handleStartSession = useCallback(async () => {
    if (session.status !== "PLANNED") return;

    await startSession(session.id);
    const now = new Date();
    startedAtRef.current = now;
    setSession((prev) => ({
      ...prev,
      status: "IN_PROGRESS",
      startedAt: now.toISOString(),
    }));

    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [session.id, session.status]);

  // ─── End Session ────────────────────────────────────────────────

  const handleEndSession = useCallback(
    async (autoEnded = false) => {
      if (session.status === "COMPLETED") return;

      await endSession(session.id);

      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      if (autoEndRef.current) clearInterval(autoEndRef.current);

      setSession((prev) => ({
        ...prev,
        status: "COMPLETED",
        endedAt: new Date().toISOString(),
      }));

      setRestTimer({ active: false, remaining: 0, total: 0 });

      if (autoEnded) {
        toast.info("Session auto-ended due to 30 minutes of inactivity");
      } else {
        toast.success("Workout completed!");
      }

      setFinishDialogOpen(false);
      router.refresh();
    },
    [session.id, session.status, router]
  );

  // ─── Rest Timer (L3) ───────────────────────────────────────────

  const startRestTimer = useCallback((seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);

    setRestTimer({ active: true, remaining: seconds, total: seconds });

    restTimerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev.remaining <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          toast.info("Rest time complete!", { duration: 3000 });
          return { ...prev, active: false, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }, []);

  const skipRestTimer = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer({ active: false, remaining: 0, total: 0 });
  }, []);

  const adjustRestTimer = useCallback((delta: number) => {
    setRestTimer((prev) => ({
      ...prev,
      remaining: Math.max(0, prev.remaining + delta),
      total: Math.max(0, prev.total + delta),
    }));
  }, []);

  // ─── Track which exercise the rest timer belongs to ─────────
  const [restTimerExerciseId, setRestTimerExerciseId] = useState<string | null>(null);

  const startRestTimerForExercise = useCallback((seconds: number, exerciseId: string) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimerExerciseId(exerciseId);
    setRestTimer({ active: true, remaining: seconds, total: seconds });

    restTimerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev.remaining <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          toast.info("Rest time complete!", { duration: 3000 });
          return { ...prev, active: false, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }, []);

  // ─── Update Set Weight/Reps Locally ────────────────────────────

  const updateSetLocally = useCallback(
    (exerciseId: string, setId: string, field: "weight" | "reps", value: number | null) => {
      trackInteraction();
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

      // Debounced server sync
      updateSet(setId, { [field]: value });
    },
    [trackInteraction]
  );

  // ─── Complete Set (L2) ─────────────────────────────────────────

  const handleCompleteSet = useCallback(
    async (exercise: ExerciseData, set: SetData) => {
      trackInteraction();

      // Auto-start session on first set completion (L4)
      if (session.status === "PLANNED") {
        await handleStartSession();
      }

      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;

      if (set.completedAt) {
        // Uncomplete the set
        await uncompleteSet(set.id);
        setSession((prev) => ({
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exercise.id
              ? {
                  ...ex,
                  sets: ex.sets.map((s) =>
                    s.id === set.id
                      ? { ...s, completedAt: null, estimated1RM: null, isNewPR: false }
                      : s
                  ),
                }
              : ex
          ),
        }));
        return;
      }

      // Complete the set
      const result = await completeSet(set.id, weight, reps);

      const est1RM =
        set.setType === "WORKING" && weight > 0 && reps > 0
          ? calculate1RM(weight, reps)
          : null;

      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exercise.id
            ? {
                ...ex,
                sets: ex.sets.map((s) =>
                  s.id === set.id
                    ? {
                        ...s,
                        completedAt: new Date().toISOString(),
                        estimated1RM: est1RM,
                        isNewPR: result.isNewPR,
                      }
                    : s
                ),
              }
            : ex
        ),
      }));

      if (result.isNewPR) {
        toast.success(`New Personal Record! Est. 1RM: ${est1RM} kg`, {
          duration: 5000,
        });
      }

      // Trigger rest timer for this exercise
      startRestTimerForExercise(exercise.restSeconds, exercise.id);
    },
    [session.status, handleStartSession, startRestTimerForExercise, trackInteraction]
  );

  // ─── Add Set ───────────────────────────────────────────────────

  const handleAddSet = useCallback(
    async (exerciseId: string) => {
      trackInteraction();
      const newSet = await addSet(exerciseId);

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
                    completedAt: null,
                  },
                ],
              }
            : ex
        ),
      }));
    },
    [trackInteraction]
  );

  // ─── Remove Set ────────────────────────────────────────────────

  const handleRemoveSet = useCallback(
    async (exerciseId: string, setId: string) => {
      trackInteraction();
      await removeSet(setId);

      setSession((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
            : ex
        ),
      }));
    },
    [trackInteraction]
  );

  // ─── Save Note ─────────────────────────────────────────────────

  const handleSaveNote = useCallback(async () => {
    if (!noteContent.trim()) return;

    const note = await saveExerciseNote(
      noteDialog.exerciseId,
      noteDialog.sessionExerciseId,
      noteContent.trim(),
      notePinned
    );

    setSession((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === noteDialog.sessionExerciseId
          ? {
              ...ex,
              notes: [
                {
                  id: note.id,
                  content: note.content,
                  isPinned: note.isPinned,
                  createdAt: note.createdAt.toISOString(),
                },
                ...ex.notes,
              ],
            }
          : ex
      ),
    }));

    setNoteDialog({ open: false, exerciseId: "", sessionExerciseId: "", exerciseName: "" });
    setNoteContent("");
    setNotePinned(false);
    toast.success("Note saved");
  }, [noteContent, notePinned, noteDialog]);

  // ─── Compute warm-up weight suggestion ─────────────────────────

  const getWarmUpWeight = useCallback(
    (exercise: ExerciseData, set: SetData): number | null => {
      if (set.setType !== "WARM_UP") return null;
      // Look at the first working set's weight (or prev performance)
      const firstWorkingSet = exercise.sets.find(
        (s) => s.setType === "WORKING" && s.weight !== null && s.weight > 0
      );
      if (firstWorkingSet?.weight) {
        return Math.round(firstWorkingSet.weight * exercise.warmUpPercent * 2) / 2;
      }
      // Fallback to previous performance
      if (exercise.prevPerformance) {
        const prevWorking = exercise.prevPerformance.sets.find(
          (s) => s.setType === "WORKING" && s.weight
        );
        if (prevWorking?.weight) {
          return Math.round(prevWorking.weight * exercise.warmUpPercent * 2) / 2;
        }
      }
      return null;
    },
    []
  );

  // ─── Compute session summary ───────────────────────────────────

  const completedSets = session.exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completedAt).length,
    0
  );
  const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const totalVolume = session.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets
        .filter((s) => s.completedAt && s.weight && s.reps)
        .reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0),
    0
  );

  const isCompleted = session.status === "COMPLETED";

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background">
        {/* Session Header — compact single row */}
        <div className="flex items-center justify-between border-b px-3 sm:px-6 py-2 sm:py-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight">{session.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{completedSets}/{totalSets} sets</span>
              <span>&middot;</span>
              <span>{Math.round(totalVolume).toLocaleString()} kg</span>
              {isCompleted && <Badge variant="secondary" className="text-[10px] h-4">Done</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-sm sm:text-base tabular-nums">
              <Timer className="size-3.5 text-muted-foreground" />
              <span className={session.status === "IN_PROGRESS" ? "text-foreground font-semibold" : "text-muted-foreground"}>
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            {!isCompleted && (
              <Button variant="default" size="sm" onClick={() => setFinishDialogOpen(true)} className="gap-1 h-8 text-xs sm:text-sm">
                <Check className="size-3.5" />
                Finish
              </Button>
            )}
            {isCompleted && (
              <Button variant="outline" size="sm" onClick={() => router.push("/history")} className="h-8 text-xs">
                History
              </Button>
            )}
          </div>
        </div>

        {/* Sticky Rest Timer (only shows when active) */}
        {restTimer.active && (
          <div className="flex items-center justify-between border-b bg-blue-50 dark:bg-blue-950/30 px-3 sm:px-6 py-1.5">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Rest</span>
              <span className="font-mono text-xl sm:text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {formatTime(restTimer.remaining)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => adjustRestTimer(-30)} disabled={restTimer.remaining <= 30} className="px-2 py-1 text-xs border border-blue-200 dark:border-blue-800 rounded-md bg-white dark:bg-blue-900 text-blue-600 dark:text-blue-400 disabled:opacity-30">-30s</button>
              <button onClick={() => adjustRestTimer(30)} className="px-2 py-1 text-xs border border-blue-200 dark:border-blue-800 rounded-md bg-white dark:bg-blue-900 text-blue-600 dark:text-blue-400">+30s</button>
              <button onClick={skipRestTimer} className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white font-medium">Skip</button>
            </div>
          </div>
        )}
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 sm:p-4 space-y-2 max-w-4xl">
          {session.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isExpanded={expandedExercises.has(exercise.id)}
              onToggle={() => toggleExercise(exercise.id)}
              onCompleteSet={(set) => handleCompleteSet(exercise, set)}
              onUpdateSet={(setId, field, value) =>
                updateSetLocally(exercise.id, setId, field, value)
              }
              onAddSet={() => handleAddSet(exercise.id)}
              onRemoveSet={(setId) => handleRemoveSet(exercise.id, setId)}
              onOpenNote={() =>
                setNoteDialog({
                  open: true,
                  exerciseId: exercise.exerciseId,
                  sessionExerciseId: exercise.id,
                  exerciseName: exercise.exerciseName,
                })
              }
              getWarmUpWeight={(set) => getWarmUpWeight(exercise, set)}
              isCompleted={isCompleted}
              restTimer={restTimerExerciseId === exercise.id ? restTimer : null}
            />
          ))}
        </div>
      </div>

      {/* Finish Dialog */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finish Workout?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              You have completed {completedSets} of {totalSets} sets.
            </p>
            <p>Total volume: {Math.round(totalVolume).toLocaleString()} kg</p>
            <p>Duration: {formatTime(elapsedSeconds)}</p>
            {completedSets < totalSets && (
              <p className="text-amber-600 dark:text-amber-400">
                You have {totalSets - completedSets} incomplete sets.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinishDialogOpen(false)}
            >
              Continue Workout
            </Button>
            <Button onClick={() => handleEndSession(false)}>
              Finish Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) =>
          setNoteDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note for {noteDialog.exerciseName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Add a note for this exercise..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={notePinned}
                onChange={(e) => setNotePinned(e.target.checked)}
                className="rounded"
              />
              <Pin className="size-3.5" />
              Pin this note (show in future sessions)
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialog({ open: false, exerciseId: "", sessionExerciseId: "", exerciseName: "" });
                setNoteContent("");
                setNotePinned(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote} disabled={!noteContent.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Exercise Card Component ────────────────────────────────────────

function ExerciseCard({
  exercise,
  isExpanded,
  onToggle,
  onCompleteSet,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onOpenNote,
  getWarmUpWeight,
  isCompleted,
  restTimer,
}: {
  exercise: ExerciseData;
  isExpanded: boolean;
  onToggle: () => void;
  onCompleteSet: (set: SetData) => void;
  onUpdateSet: (setId: string, field: "weight" | "reps", value: number | null) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onOpenNote: () => void;
  getWarmUpWeight: (set: SetData) => number | null;
  isCompleted: boolean;
  restTimer: { active: boolean; remaining: number; total: number } | null;
}) {
  const completedCount = exercise.sets.filter((s) => s.completedAt).length;
  const allComplete = completedCount === exercise.sets.length && exercise.sets.length > 0;

  // Find the last completed set index to insert rest timer after it
  const lastCompletedIdx = exercise.sets.reduce(
    (last, s, i) => (s.completedAt ? i : last),
    -1
  );

  return (
    <div className={`border rounded-lg overflow-hidden ${allComplete ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
      {/* Exercise Header — compact */}
      <button onClick={onToggle} className="w-full flex items-center justify-between px-2.5 sm:px-3 py-2 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-6 rounded-md bg-muted text-xs font-bold text-muted-foreground">
            {exercise.orderIndex + 1}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight">{exercise.exerciseName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{exercise.muscleGroup}</span>
              <span className="text-[10px] text-muted-foreground">{completedCount}/{exercise.sets.length} sets</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {allComplete && <Check className="size-4 text-green-600" />}
          {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {isExpanded && (
        <div>
          {/* Pinned Notes */}
          {exercise.pinnedNotes.length > 0 && (
            <div className="px-2.5 sm:px-3 pb-1.5 space-y-1">
              {exercise.pinnedNotes.map((note) => (
                <div key={note.id} className="flex items-start gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                  <Pin className="size-3 mt-0.5 shrink-0" />
                  <span>{note.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* Previous Performance */}
          {exercise.prevPerformance && (
            <div className="mx-2.5 sm:mx-3 mb-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              <span className="font-medium">Prev: </span>
              {exercise.prevPerformance.sets
                .filter((s) => s.setType === "WORKING")
                .map((s, i, arr) => `${s.weight ?? 0}x${s.reps ?? 0}${i < arr.length - 1 ? ", " : ""}`)
                .join("")}
            </div>
          )}

          {/* Sets — no table borders, tight rows */}
          <div>
            {exercise.sets.map((set, idx) => (
              <div key={set.id}>
                <SetRow
                  set={set}
                  index={idx}
                  onComplete={() => onCompleteSet(set)}
                  onUpdateWeight={(val) => onUpdateSet(set.id, "weight", val)}
                  onUpdateReps={(val) => onUpdateSet(set.id, "reps", val)}
                  onRemove={() => onRemoveSet(set.id)}
                  warmUpSuggestion={getWarmUpWeight(set)}
                  isCompleted={isCompleted}
                />
                {/* Rest timer inline between sets */}
                {restTimer?.active && idx === lastCompletedIdx && idx < exercise.sets.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-y border-blue-100 dark:border-blue-900">
                    <Timer className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-mono text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      {String(Math.floor(restTimer.remaining / 60)).padStart(2, "0")}:{String(restTimer.remaining % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 1RM inline after sets */}
          {exercise.sets.some((s) => s.completedAt && s.setType === "WORKING" && s.estimated1RM && s.estimated1RM > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap px-2.5 sm:px-3 py-1.5">
              {exercise.sets
                .filter((s) => s.completedAt && s.setType === "WORKING" && s.estimated1RM && s.estimated1RM > 0)
                .map((s) => (
                  <span key={s.id} className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 ${s.isNewPR ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                    {s.isNewPR && <Trophy className="size-3" />}
                    1RM: {s.estimated1RM}kg
                    {s.isNewPR && <span className="text-[9px] font-bold bg-amber-600 text-white px-1 rounded">PR</span>}
                  </span>
                ))}
            </div>
          )}

          {/* Actions — compact */}
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 border-t border-dashed">
            {!isCompleted && (
              <button onClick={onAddSet} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">
                <Plus className="size-3" />Set
              </button>
            )}
            <button onClick={onOpenNote} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">
              <StickyNote className="size-3" />Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Set Row Component ──────────────────────────────────────────────

function SetRow({
  set,
  index,
  onComplete,
  onUpdateWeight,
  onUpdateReps,
  onRemove,
  warmUpSuggestion,
  isCompleted: sessionCompleted,
}: {
  set: SetData;
  index: number;
  onComplete: () => void;
  onUpdateWeight: (val: number | null) => void;
  onUpdateReps: (val: number | null) => void;
  onRemove: () => void;
  warmUpSuggestion: number | null;
  isCompleted: boolean;
}) {
  const isComplete = !!set.completedAt;
  const isWarmUp = set.setType === "WARM_UP";
  const displayWeight = set.weight ?? warmUpSuggestion ?? undefined;

  const adjustWeight = (delta: number) => {
    const current = set.weight ?? warmUpSuggestion ?? 0;
    onUpdateWeight(Math.max(0, current + delta));
  };

  const adjustReps = (delta: number) => {
    const current = set.reps ?? 0;
    onUpdateReps(Math.max(0, current + delta));
  };

  return (
    <div className={`grid grid-cols-[1.75rem_1fr_1fr_2rem_1.25rem] items-center px-2.5 sm:px-3 min-h-[44px] border-t border-border/50 ${isComplete ? "bg-green-500/5" : isWarmUp ? "bg-muted/20" : ""}`}>
      {/* Set # with type dot */}
      <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <span className={`size-1.5 rounded-full shrink-0 ${isWarmUp ? "bg-orange-400" : "bg-blue-500"}`} />
        {index + 1}
      </div>

      {/* Weight — embedded stepper */}
      <div className="flex items-center gap-0">
        {!sessionCompleted && (
          <button onClick={() => adjustWeight(isWarmUp ? -2.5 : -5)} disabled={isComplete} className="size-8 flex items-center justify-center text-muted-foreground active:bg-muted rounded-l-md disabled:opacity-20 touch-manipulation">
            <Minus className="size-3.5" />
          </button>
        )}
        <input
          type="number"
          inputMode="decimal"
          value={displayWeight ?? ""}
          onChange={(e) => onUpdateWeight(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder={warmUpSuggestion ? String(warmUpSuggestion) : "0"}
          className="h-8 w-full min-w-0 flex-1 bg-muted/40 border-0 text-center text-sm font-semibold tabular-nums rounded-none focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
          disabled={isComplete || sessionCompleted}
        />
        {!sessionCompleted && (
          <button onClick={() => adjustWeight(isWarmUp ? 2.5 : 5)} disabled={isComplete} className="size-8 flex items-center justify-center text-muted-foreground active:bg-muted rounded-r-md disabled:opacity-20 touch-manipulation">
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {/* Reps — embedded stepper */}
      <div className="flex items-center gap-0">
        {!sessionCompleted && (
          <button onClick={() => adjustReps(-1)} disabled={isComplete} className="size-8 flex items-center justify-center text-muted-foreground active:bg-muted rounded-l-md disabled:opacity-20 touch-manipulation">
            <Minus className="size-3.5" />
          </button>
        )}
        <input
          type="number"
          inputMode="numeric"
          value={set.reps ?? ""}
          onChange={(e) => onUpdateReps(e.target.value ? parseInt(e.target.value, 10) : null)}
          placeholder="0"
          className="h-8 w-full min-w-0 flex-1 bg-muted/40 border-0 text-center text-sm font-semibold tabular-nums rounded-none focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
          disabled={isComplete || sessionCompleted}
        />
        {!sessionCompleted && (
          <button onClick={() => adjustReps(1)} disabled={isComplete} className="size-8 flex items-center justify-center text-muted-foreground active:bg-muted rounded-r-md disabled:opacity-20 touch-manipulation">
            <Plus className="size-3.5" />
          </button>
        )}
      </div>

      {/* Complete */}
      <div className="flex justify-center">
        {!sessionCompleted && (
          <button onClick={onComplete} className={`size-8 flex items-center justify-center rounded-md border touch-manipulation ${isComplete ? "bg-green-600 border-green-600 text-white" : "border-border hover:bg-muted"}`}>
            <Check className="size-4" />
          </button>
        )}
        {sessionCompleted && isComplete && <Check className="size-4 text-green-600" />}
      </div>

      {/* Remove */}
      <div className="flex justify-center">
        {!sessionCompleted && !isComplete && (
          <button onClick={onRemove} className="size-6 flex items-center justify-center text-muted-foreground/50 hover:text-destructive touch-manipulation">
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
