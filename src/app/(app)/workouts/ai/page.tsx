"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Save,
  AlertTriangle,
  Dumbbell,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateWorkout,
  saveWorkoutAsSession,
  saveWorkoutToProgram,
  getProgramsForSelect,
} from "@/lib/actions/ai";
import type { GeneratedWorkout, GeneratedExercisePlan } from "@/lib/actions/ai";
import Link from "next/link";

const EXAMPLE_PROMPTS = [
  "Generate a push day focusing on chest with 5 exercises",
  "Create a full body workout for a beginner, 45 minutes",
  "Make a leg day with heavy compounds and isolation finishers",
  "Upper body pull workout with back and bicep focus",
  "Quick 30-minute HIIT-style strength circuit",
];

export default function AIWorkoutPlannerPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [saveMode, setSaveMode] = useState<"session" | "program">("session");
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  function handleGenerate() {
    if (!prompt.trim()) return;
    setError(null);
    setWorkout(null);
    setApiKeyMissing(false);

    startGenerate(async () => {
      const result = await generateWorkout(prompt.trim());
      if (result.success) {
        setWorkout(result.data);
      } else {
        if (result.error === "ANTHROPIC_API_KEY_MISSING") {
          setApiKeyMissing(true);
        } else {
          setError(result.error);
        }
      }
    });
  }

  function updateExercise(
    index: number,
    field: keyof GeneratedExercisePlan,
    value: string | number
  ) {
    if (!workout) return;
    const updated = { ...workout };
    updated.exercises = [...updated.exercises];
    updated.exercises[index] = {
      ...updated.exercises[index],
      [field]: value,
    };
    setWorkout(updated);
  }

  function removeExercise(index: number) {
    if (!workout) return;
    const updated = { ...workout };
    updated.exercises = updated.exercises.filter((_, i) => i !== index);
    setWorkout(updated);
  }

  function updateWorkoutName(name: string) {
    if (!workout) return;
    setWorkout({ ...workout, name });
  }

  function updateWorkoutDescription(description: string) {
    if (!workout) return;
    setWorkout({ ...workout, description });
  }

  async function handleOpenSaveDialog() {
    setSaveDialogOpen(true);
    const result = await getProgramsForSelect();
    if (result.success) {
      setPrograms(result.data);
    }
  }

  function handleSave() {
    if (!workout) return;

    startSave(async () => {
      if (saveMode === "session") {
        const result = await saveWorkoutAsSession(workout);
        if (result.success) {
          setSaveDialogOpen(false);
          router.push(`/workouts/${result.data.id}/session`);
        } else {
          setError(result.error);
          setSaveDialogOpen(false);
        }
      } else {
        if (!selectedProgramId) return;
        const result = await saveWorkoutToProgram(workout, selectedProgramId);
        if (result.success) {
          setSaveDialogOpen(false);
          router.push(`/programs/${selectedProgramId}`);
        } else {
          setError(result.error);
          setSaveDialogOpen(false);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/programs" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-7 text-primary" />
            AI Workout Planner
          </h1>
          <p className="mt-1 text-muted-foreground">
            Describe what you want and AI will build a workout from your exercise library.
          </p>
        </div>
      </div>

      {/* API Key Missing Warning */}
      {apiKeyMissing && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              API Key Not Configured
            </CardTitle>
            <CardDescription>
              The Anthropic API key is not set. To use AI features, add your API
              key to the environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-3 font-mono text-sm">
              <p className="text-muted-foreground"># Add to your .env file:</p>
              <p>ANTHROPIC_API_KEY=sk-ant-...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Section */}
      <Card>
        <CardHeader>
          <CardTitle>Describe Your Workout</CardTitle>
          <CardDescription>
            Tell the AI what kind of workout you want. Be as specific as you like --
            muscle groups, number of exercises, difficulty, equipment preferences, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g., Generate a push day focusing on chest with 5 exercises..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">
              Try:
            </span>
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Sparkles className="size-4" data-icon="inline-start" />
            )}
            {isGenerating ? "Generating..." : "Generate Workout"}
          </Button>
        </CardFooter>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Workout Preview */}
      {workout && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="size-5" />
                Generated Workout Preview
              </CardTitle>
              <CardDescription>
                Review and edit the workout below. Adjust sets, reps, and weights
                as needed, then save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Workout Name & Description */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="workout-name">Workout Name</Label>
                  <Input
                    id="workout-name"
                    value={workout.name}
                    onChange={(e) => updateWorkoutName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="workout-desc">Description</Label>
                  <Input
                    id="workout-desc"
                    value={workout.description}
                    onChange={(e) => updateWorkoutDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exercise List */}
          <div className="space-y-3">
            {workout.exercises.map((exercise, index) => (
              <Card key={`${exercise.exerciseId}-${index}`} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {index + 1}
                      </Badge>
                      <CardTitle>{exercise.exerciseName}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeExercise(index)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Warm-up Sets
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={exercise.warmUpSets}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "warmUpSets",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Working Sets
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={exercise.workingSets}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "workingSets",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Target Reps
                      </Label>
                      <Input
                        value={exercise.targetReps}
                        onChange={(e) =>
                          updateExercise(index, "targetReps", e.target.value)
                        }
                        placeholder="e.g., 8-10"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Suggested Weight
                      </Label>
                      <Input
                        value={exercise.suggestedWeight}
                        onChange={(e) =>
                          updateExercise(
                            index,
                            "suggestedWeight",
                            e.target.value
                          )
                        }
                        placeholder="e.g., moderate"
                      />
                    </div>
                  </div>
                  {exercise.notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {exercise.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {workout.exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
              <Dumbbell className="size-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">
                All exercises have been removed. Generate a new workout or add exercises back.
              </p>
            </div>
          )}

          {/* Save Actions */}
          {workout.exercises.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleOpenSaveDialog}>
                <Save className="size-4" data-icon="inline-start" />
                Save Workout
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Sparkles className="size-4" data-icon="inline-start" />
                )}
                Regenerate
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Workout</DialogTitle>
            <DialogDescription>
              Choose how to save this generated workout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setSaveMode("session")}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  saveMode === "session"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                  <Dumbbell className="size-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Save as Workout Session</p>
                  <p className="text-xs text-muted-foreground">
                    Create a standalone workout session you can start immediately.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSaveMode("program")}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  saveMode === "program"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                  <FolderPlus className="size-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Add to Program</p>
                  <p className="text-xs text-muted-foreground">
                    Add this workout as a day in an existing program.
                  </p>
                </div>
              </button>
            </div>

            {saveMode === "program" && (
              <div className="grid gap-2">
                <Label htmlFor="program-select">Select Program</Label>
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No programs found. Create a program first.
                  </p>
                ) : (
                  <Select
                    value={selectedProgramId}
                    onValueChange={(val) => setSelectedProgramId(val ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a program..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                (saveMode === "program" && !selectedProgramId)
              }
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Save className="size-4" data-icon="inline-start" />
              )}
              {isSaving
                ? "Saving..."
                : saveMode === "session"
                  ? "Create Session"
                  : "Add to Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
