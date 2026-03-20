"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2 } from "lucide-react";
import { createExercise } from "../_actions";

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

interface MuscleGroup {
  id: string;
  name: string;
  displayOrder: number;
}

interface AddExerciseDialogProps {
  muscleGroups: MuscleGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddExerciseDialog({
  muscleGroups,
  open,
  onOpenChange,
}: AddExerciseDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createExercise(formData);
        onOpenChange(false);
        router.refresh();
      } catch {
        // Error handling could be improved with toast notifications
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>
            Add a new exercise to your library.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Bench Press"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the exercise, form cues, tips..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="primaryMuscleGroupId">Primary Muscle Group</Label>
              <Select name="primaryMuscleGroupId" required>
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
              <Select name="equipmentType" defaultValue="OTHER">
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

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
              Add Exercise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
