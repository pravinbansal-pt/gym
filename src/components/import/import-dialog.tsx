"use client";

import { useState, useMemo, useRef, useCallback, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Link as LinkIcon,
  Image,
  FileText,
  Upload,
  X,
  Sparkles,
  Check,
  Plus,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Search,
  Dumbbell,
} from "lucide-react";
import Link from "next/link";
import {
  parseWorkoutContent,
  matchExercises,
  importWorkout,
  type ImportMode,
  type ParsedWorkout,
  type ExerciseMatch,
} from "@/lib/actions/import";

interface ExerciseInfo {
  id: string;
  name: string;
  muscleGroup: string;
  equipmentType: string;
}

interface ImportDialogProps {
  mode: ImportMode;
  trigger: React.ReactElement;
  /** All exercises in the library, for match selection */
  exercises: ExerciseInfo[];
  /** For "workouts" or "exercises" mode */
  programId?: string;
  /** For "exercises" mode */
  workoutId?: string;
}

type Step = "input" | "review" | "done";

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: "Barbell",
  DUMBBELL: "Dumbbell",
  MACHINE: "Machine",
  CABLE: "Cable",
  BODYWEIGHT: "Bodyweight",
  SMITH_MACHINE: "Smith Machine",
  EZ_BAR: "EZ Bar",
  KETTLEBELL: "Kettlebell",
  RESISTANCE_BAND: "Band",
  OTHER: "Other",
};

// ─── Exercise Picker Dialog ─────────────────────────────────────────────────

function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  onSelect,
  parsedName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseInfo[];
  onSelect: (exerciseId: string | null) => void;
  parsedName: string;
}) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");

  const muscleGroups = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of exercises) {
      if (e.muscleGroup) set.set(e.muscleGroup, e.muscleGroup);
    }
    return Array.from(set.values()).sort();
  }, [exercises]);

  const equipmentTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of exercises) {
      if (e.equipmentType) set.add(e.equipmentType);
    }
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscleGroup.toLowerCase().includes(q)
      );
    }
    if (muscleFilter) {
      result = result.filter((e) => e.muscleGroup === muscleFilter);
    }
    if (equipmentFilter) {
      result = result.filter((e) => e.equipmentType === equipmentFilter);
    }
    return result;
  }, [exercises, search, muscleFilter, equipmentFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ExerciseInfo[]>>((acc, ex) => {
      const group = ex.muscleGroup || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(ex);
      return acc;
    }, {});
  }, [filtered]);

  function handleClose() {
    setSearch("");
    setMuscleFilter("");
    setEquipmentFilter("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Exercise</DialogTitle>
          <DialogDescription>
            Find a match for &ldquo;{parsedName}&rdquo; or create a new exercise.
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
          {muscleGroups.map((mg) => (
            <button
              key={mg}
              type="button"
              onClick={() => setMuscleFilter(muscleFilter === mg ? "" : mg)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                muscleFilter === mg
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {mg}
            </button>
          ))}
        </div>

        {/* Equipment filter */}
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
          {equipmentTypes.map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() =>
                setEquipmentFilter(equipmentFilter === eq ? "" : eq)
              }
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                equipmentFilter === eq
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {EQUIPMENT_LABELS[eq] || eq}
            </button>
          ))}
        </div>

        <ScrollArea className="max-h-64">
          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Dumbbell className="size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No exercises match your filters.
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
                        onClick={() => {
                          onSelect(exercise.id);
                          handleClose();
                        }}
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
                            {EQUIPMENT_LABELS[exercise.equipmentType] || exercise.equipmentType}
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

        {/* Create new option */}
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            handleClose();
          }}
          className="flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            <Plus className="size-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Create New Exercise</p>
            <p className="text-xs text-muted-foreground">
              Will be created automatically on import.
            </p>
          </div>
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Import Dialog ──────────────────────────────────────────────────────────

const MODE_LABELS: Record<ImportMode, { title: string; description: string }> = {
  program: {
    title: "Import Program",
    description: "Import a full program with workouts from a URL, screenshot, or text.",
  },
  workouts: {
    title: "Import Workouts",
    description: "Import workout(s) and add them to this program.",
  },
  exercises: {
    title: "Import Exercises",
    description: "Import exercises and add them to this workout.",
  },
};

export function ImportDialog({
  mode,
  trigger,
  exercises,
  programId,
  workoutId,
}: ImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");

  // Input state
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [parsedWorkout, setParsedWorkout] = useState<ParsedWorkout | null>(null);
  const [dayMatches, setDayMatches] = useState<ExerciseMatch[][]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [workoutName, setWorkoutName] = useState("");

  // Result state
  const [result, setResult] = useState<{
    newExerciseIds: string[];
    programId?: string;
    workoutIds: string[];
  } | null>(null);

  function reset() {
    setStep("input");
    setUrl("");
    setText("");
    setImageData(null);
    setError(null);
    setEditingMatch(null);
    setParsedWorkout(null);
    setDayMatches([]);
    setExcluded(new Set());
    setWorkoutName("");
    setResult(null);
    setIsLoading(false);
  }

  function handleClose() {
    if (result) router.refresh();
    reset();
    setOpen(false);
  }

  // ─── File/paste handlers ──────────────────────────────────────────

  function readImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file);
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        readImageFile(file);
        break;
      }
    }
  }, []);

  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      readImageFile(file);
    }
  }

  // ─── Parse ────────────────────────────────────────────────────────

  async function handleImport(type: "url" | "image" | "text") {
    setIsLoading(true);
    setError(null);

    try {
      let content: string;
      if (type === "url") {
        if (!url.trim()) throw new Error("Please enter a URL.");
        content = url.trim();
      } else if (type === "image") {
        if (!imageData) throw new Error("Please upload or paste an image.");
        content = imageData;
      } else {
        if (!text.trim()) throw new Error("Please enter some text.");
        content = text.trim();
      }

      const parsed = await parseWorkoutContent({ type, content, mode });
      setParsedWorkout(parsed);
      setWorkoutName(parsed.name || "Imported Workout");

      // Match exercises for each day
      const allMatches: ExerciseMatch[][] = [];
      for (const day of parsed.days) {
        const matches = await matchExercises(day.exercises);
        allMatches.push(matches);
      }
      setDayMatches(allMatches);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse workout content."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Toggle exclude ───────────────────────────────────────────────

  function toggleExclude(dayIdx: number, exIdx: number) {
    const key = `${dayIdx}-${exIdx}`;
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function changeMatch(dayIdx: number, exIdx: number, exerciseId: string) {
    setDayMatches((prev) =>
      prev.map((day, di) => {
        if (di !== dayIdx) return day;
        return day.map((m, ei) => {
          if (ei !== exIdx) return m;
          if (exerciseId === "__new__") {
            return { ...m, matchedExercise: null, confidence: 0, isNew: true };
          }
          const ex = exercises.find((e) => e.id === exerciseId);
          return {
            ...m,
            matchedExercise: ex ? { id: ex.id, name: ex.name } : null,
            confidence: 1.0,
            isNew: false,
          };
        });
      })
    );
  }

  // ─── Save ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!parsedWorkout) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await importWorkout({
        mode,
        workoutName,
        description: parsedWorkout.description,
        days: parsedWorkout.days.map((day, dayIdx) => ({
          name: day.name,
          exercises: (dayMatches[dayIdx] || []).map((m, exIdx) => ({
            parsedName: m.parsedName,
            matchedExerciseId: m.matchedExercise?.id ?? null,
            isNew: m.isNew,
            sets: m.sets,
            reps: m.reps,
            weight: m.weight,
            notes: m.notes,
            included: !excluded.has(`${dayIdx}-${exIdx}`),
          })),
        })),
        programId,
        workoutId,
      });

      setResult(res);
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import workout."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Count helpers ────────────────────────────────────────────────

  const totalIncluded = dayMatches.reduce(
    (sum, day, dayIdx) =>
      sum + day.filter((_, exIdx) => !excluded.has(`${dayIdx}-${exIdx}`)).length,
    0
  );

  const totalNew = dayMatches.reduce(
    (sum, day, dayIdx) =>
      sum +
      day.filter(
        (m, exIdx) => m.isNew && !excluded.has(`${dayIdx}-${exIdx}`)
      ).length,
    0
  );

  const { title, description } = MODE_LABELS[mode];

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger render={trigger} />
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
        onPaste={handlePaste}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* ─── Step: Input ──────────────────────────────── */}
        {step === "input" && (
          <div className="space-y-4">
            <Tabs defaultValue="url">
              <TabsList className="w-full">
                <TabsTrigger value="url" className="flex-1">
                  <LinkIcon className="size-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="image" className="flex-1">
                  <Image className="size-4" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1">
                  <FileText className="size-4" />
                  Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paste a URL to a workout plan, blog post, or article.
                </p>
                <Input
                  placeholder="https://example.com/workout-plan"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button
                  onClick={() => handleImport("url")}
                  disabled={isLoading || !url.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  ) : (
                    <Sparkles className="size-4" data-icon="inline-start" />
                  )}
                  Import from URL
                </Button>
              </TabsContent>

              <TabsContent value="image" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload a screenshot or photo of a workout, or paste from clipboard.
                </p>
                {imageData ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={imageData}
                      alt="Workout screenshot"
                      className="h-32 rounded-md border object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setImageData(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <Upload className="size-5" />
                    <span>{isDragging ? "Drop image here" : "Drag, upload, or paste an image"}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  onClick={() => handleImport("image")}
                  disabled={isLoading || !imageData}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  ) : (
                    <Sparkles className="size-4" data-icon="inline-start" />
                  )}
                  Import from Image
                </Button>
              </TabsContent>

              <TabsContent value="text" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Paste a workout description or exercise list.
                </p>
                <Textarea
                  placeholder={`e.g.\nBench Press 4x8\nIncline Dumbbell Press 3x10\nCable Flyes 3x12`}
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button
                  onClick={() => handleImport("text")}
                  disabled={isLoading || !text.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                  ) : (
                    <Sparkles className="size-4" data-icon="inline-start" />
                  )}
                  Import from Text
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {/* ─── Step: Review ─────────────────────────────── */}
        {step === "review" && parsedWorkout && (
          <div className="space-y-4">
            {/* Workout name (editable for program/workouts mode) */}
            {mode !== "exercises" && (
              <div className="space-y-2">
                <Label htmlFor="import-name">
                  {mode === "program" ? "Program Name" : "Workout Name"}
                </Label>
                <Input
                  id="import-name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{totalIncluded} exercise{totalIncluded !== 1 ? "s" : ""}</span>
              {parsedWorkout.days.length > 1 && (
                <span>{parsedWorkout.days.length} days</span>
              )}
              {totalNew > 0 && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
                  <Plus className="size-3" data-icon="inline-start" />
                  {totalNew} new
                </Badge>
              )}
            </div>

            {/* Exercise list by day */}
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {parsedWorkout.days.map((day, dayIdx) => (
                <div key={dayIdx} className="space-y-1.5">
                  {parsedWorkout.days.length > 1 && (
                    <h4 className="text-sm font-medium pt-1">{day.name}</h4>
                  )}

                  {(dayMatches[dayIdx] || []).map((match, exIdx) => {
                    const key = `${dayIdx}-${exIdx}`;
                    const isExcluded = excluded.has(key);

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-opacity ${
                          isExcluded ? "opacity-30" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">
                              {match.parsedName}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {match.sets}×{match.reps}
                            </span>
                          </div>

                          {!isExcluded && (
                            <div className="mt-0.5">
                              {match.isNew ? (
                                <button
                                  type="button"
                                  className="text-xs text-yellow-600 hover:text-yellow-500"
                                  onClick={() => setEditingMatch(key)}
                                >
                                  + Will create new exercise
                                  <span className="ml-1 text-muted-foreground underline">
                                    match instead
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditingMatch(key)}
                                >
                                  <Check className="size-3 text-green-500 shrink-0" />
                                  <span className="truncate">
                                    {match.matchedExercise?.name}
                                  </span>
                                  <span className="underline shrink-0">change</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => toggleExclude(dayIdx, exIdx)}
                          title={isExcluded ? "Include" : "Exclude"}
                        >
                          {isExcluded ? (
                            <Plus className="size-3.5" />
                          ) : (
                            <X className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("input")} disabled={isLoading}>
                <ArrowLeft className="size-4" data-icon="inline-start" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={isLoading || totalIncluded === 0}>
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Sparkles className="size-4" data-icon="inline-start" />
                )}
                Import {totalIncluded} Exercise{totalIncluded !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Exercise picker dialog for changing matches */}
        {editingMatch && (() => {
          const [dStr, eStr] = editingMatch.split("-");
          const dayIdx = parseInt(dStr, 10);
          const exIdx = parseInt(eStr, 10);
          const match = dayMatches[dayIdx]?.[exIdx];
          if (!match) return null;
          return (
            <ExercisePickerDialog
              open
              onOpenChange={() => setEditingMatch(null)}
              exercises={exercises}
              parsedName={match.parsedName}
              onSelect={(exerciseId) => {
                if (exerciseId === null) {
                  changeMatch(dayIdx, exIdx, "__new__");
                } else {
                  changeMatch(dayIdx, exIdx, exerciseId);
                }
                setEditingMatch(null);
              }}
            />
          );
        })()}

        {/* ─── Step: Done ──────────────────────────────── */}
        {step === "done" && result && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="size-12 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="text-sm text-muted-foreground">
                {result.workoutIds.length} workout{result.workoutIds.length !== 1 ? "s" : ""}
                {result.newExerciseIds.length > 0 && (
                  <>, {result.newExerciseIds.length} new exercise
                    {result.newExerciseIds.length !== 1 ? "s" : ""} created</>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {result.programId && (
                <Button
                  render={<Link href={`/programs/${result.programId}`} />}
                  onClick={() => { reset(); setOpen(false); }}
                >
                  View {mode === "program" ? "Program" : "Workout"}
                </Button>
              )}

              {result.newExerciseIds.length > 0 && (
                <Button
                  variant="outline"
                  render={<Link href="/exercises" />}
                  onClick={() => { reset(); setOpen(false); }}
                >
                  <ImagePlus className="size-4" data-icon="inline-start" />
                  Generate Images for New Exercises
                </Button>
              )}

              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
