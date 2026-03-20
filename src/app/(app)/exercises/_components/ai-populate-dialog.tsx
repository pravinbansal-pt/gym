"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateExercises,
  saveGeneratedExercises,
} from "@/lib/actions/ai";
import type { GeneratedExercise } from "@/lib/actions/ai";

interface MuscleGroup {
  id: string;
  name: string;
  displayOrder: number;
}

interface AIPopulateDialogProps {
  muscleGroups: MuscleGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: "Barbell",
  DUMBBELL: "Dumbbell",
  MACHINE: "Machine",
  CABLE: "Cable",
  BODYWEIGHT: "Bodyweight",
  SMITH_MACHINE: "Smith Machine",
  EZ_BAR: "EZ Bar",
  KETTLEBELL: "Kettlebell",
  RESISTANCE_BAND: "Resistance Band",
  OTHER: "Other",
};

type PromptMode = "muscle-group" | "count" | "free-form";

export function AIPopulateDialog({
  muscleGroups,
  open,
  onOpenChange,
}: AIPopulateDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PromptMode>("muscle-group");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [exerciseCount, setExerciseCount] = useState("5");
  const [freeFormPrompt, setFreeFormPrompt] = useState("");

  const [generatedExercises, setGeneratedExercises] = useState<
    GeneratedExercise[]
  >([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [savedCount, setSavedCount] = useState<number | null>(null);

  function resetState() {
    setGeneratedExercises([]);
    setSelectedIndices(new Set());
    setError(null);
    setApiKeyMissing(false);
    setSavedCount(null);
  }

  function buildPrompt(): string {
    switch (mode) {
      case "muscle-group": {
        const mgName =
          muscleGroups.find((mg) => mg.id === selectedMuscleGroup)?.name ??
          "various";
        const count = parseInt(exerciseCount) || 5;
        return `Add ${count} exercises for ${mgName}`;
      }
      case "count": {
        const count = parseInt(exerciseCount) || 5;
        return `Add ${count} varied exercises across different muscle groups`;
      }
      case "free-form":
        return freeFormPrompt;
    }
  }

  function handleGenerate() {
    const prompt = buildPrompt();
    if (!prompt.trim()) return;

    resetState();

    startGenerate(async () => {
      const result = await generateExercises(prompt);
      if (result.success) {
        setGeneratedExercises(result.data);
        // Select all by default
        setSelectedIndices(new Set(result.data.map((_, i) => i)));
      } else {
        if (result.error === "ANTHROPIC_API_KEY_MISSING") {
          setApiKeyMissing(true);
        } else {
          setError(result.error);
        }
      }
    });
  }

  function toggleExercise(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIndices.size === generatedExercises.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(generatedExercises.map((_, i) => i)));
    }
  }

  function handleSave() {
    const selected = generatedExercises.filter((_, i) =>
      selectedIndices.has(i)
    );
    if (selected.length === 0) return;

    startSave(async () => {
      const result = await saveGeneratedExercises(selected);
      if (result.success) {
        setSavedCount(result.data.count);
        router.refresh();
        // Close after a brief delay so user sees the success message
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
      } else {
        setError(result.error);
      }
    });
  }

  function handleClose(openState: boolean) {
    if (!openState) {
      resetState();
      setFreeFormPrompt("");
    }
    onOpenChange(openState);
  }

  const hasResults = generatedExercises.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={hasResults ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI Populate Exercises
          </DialogTitle>
          <DialogDescription>
            Use AI to suggest exercises to add to your library.
          </DialogDescription>
        </DialogHeader>

        {/* API Key Missing */}
        {apiKeyMissing && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  API Key Not Configured
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> to
                  your <code className="rounded bg-muted px-1">.env</code> file.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {savedCount !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Check className="size-4 text-primary" />
            <p className="text-sm text-primary">
              Successfully added {savedCount} exercise{savedCount !== 1 ? "s" : ""} to
              your library!
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Prompt Configuration - shown when no results yet */}
        {!hasResults && savedCount === null && (
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("muscle-group")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "muscle-group"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Muscle Group
              </button>
              <button
                type="button"
                onClick={() => setMode("count")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "count"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                By Count
              </button>
              <button
                type="button"
                onClick={() => setMode("free-form")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "free-form"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Free-form
              </button>
            </div>

            {mode === "muscle-group" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Muscle Group</Label>
                  <Select
                    value={selectedMuscleGroup}
                    onValueChange={(val) => setSelectedMuscleGroup(val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select muscle group" />
                    </SelectTrigger>
                    <SelectContent>
                      {muscleGroups.map((mg) => (
                        <SelectItem key={mg.id} value={mg.id}>
                          {mg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Number of Exercises</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={exerciseCount}
                    onChange={(e) => setExerciseCount(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mode === "count" && (
              <div className="grid gap-2">
                <Label>Number of Exercises</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Will generate a varied selection across different muscle groups.
                </p>
              </div>
            )}

            {mode === "free-form" && (
              <div className="grid gap-2">
                <Label>Prompt</Label>
                <Textarea
                  placeholder='e.g., "Add Olympic lifting exercises" or "Add cable exercises for back"'
                  value={freeFormPrompt}
                  onChange={(e) => setFreeFormPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Generated Exercises Preview */}
        {hasResults && savedCount === null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {generatedExercises.length} exercise{generatedExercises.length !== 1 ? "s" : ""}{" "}
                suggested ({selectedIndices.size} selected)
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedIndices.size === generatedExercises.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {generatedExercises.map((exercise, index) => {
                const isSelected = selectedIndices.has(index);
                return (
                  <button
                    key={`${exercise.name}-${index}`}
                    type="button"
                    onClick={() => toggleExercise(index)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{exercise.name}</p>
                      {exercise.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {exercise.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge variant="secondary">{exercise.muscleGroup}</Badge>
                        <Badge variant="outline">
                          {EQUIPMENT_LABELS[exercise.equipmentType] ??
                            exercise.equipmentType}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {savedCount === null && (
          <DialogFooter>
            {!hasResults ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={
                    isGenerating ||
                    (mode === "muscle-group" && !selectedMuscleGroup) ||
                    (mode === "free-form" && !freeFormPrompt.trim())
                  }
                >
                  {isGenerating ? (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Sparkles className="size-4" data-icon="inline-start" />
                  )}
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedExercises([]);
                    setSelectedIndices(new Set());
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || selectedIndices.size === 0}
                >
                  {isSaving ? (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Plus className="size-4" data-icon="inline-start" />
                  )}
                  {isSaving
                    ? "Adding..."
                    : `Add ${selectedIndices.size} Selected`}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
