"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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
import { Loader2, Trash2 } from "lucide-react";
import { updateExercise, deleteExercise } from "../../../_actions";

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

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  equipmentType: string;
  primaryMuscleGroupId: string;
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

interface EditExerciseFormProps {
  exercise: Exercise;
  muscleGroups: MuscleGroup[];
}

export function EditExerciseForm({
  exercise,
  muscleGroups,
}: EditExerciseFormProps) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startSaveTransition(async () => {
      try {
        await updateExercise(exercise.id, formData);
      } catch {
        // Will redirect on success; error stays on page
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteExercise(exercise.id);
      } catch {
        // Will redirect on success
      }
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Exercise Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={exercise.name}
                placeholder="e.g. Bench Press"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={exercise.description ?? ""}
                placeholder="Describe the exercise, form cues, tips..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="primaryMuscleGroupId">
                  Primary Muscle Group
                </Label>
                <Select
                  name="primaryMuscleGroupId"
                  defaultValue={exercise.primaryMuscleGroupId}
                  required
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
                <Label htmlFor="equipmentType">Equipment Type</Label>
                <Select
                  name="equipmentType"
                  defaultValue={exercise.equipmentType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <SelectItem key={eq.value} value={eq.value}>
                        {eq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" data-icon="inline-start" />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/exercises/${exercise.id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exercise</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{exercise.name}&rdquo;?
              This action cannot be undone. All associated workout history and
              notes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              )}
              Delete Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
