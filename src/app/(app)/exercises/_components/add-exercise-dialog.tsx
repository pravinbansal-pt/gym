"use client";

import { useState, useTransition } from "react";
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
import { Loader2, Sparkles } from "lucide-react";
import { createExercise, aiPopulateExercise } from "../_actions";
import { ImagePickerDialog } from "./image-picker-dialog";

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
  const [isAiFilling, setIsAiFilling] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroupId, setMuscleGroupId] = useState("");
  const [equipmentType, setEquipmentType] = useState("OTHER");
  const [weightUnit, setWeightUnit] = useState("DEFAULT");

  // Image picker state
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [createdExerciseId, setCreatedExerciseId] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setDescription("");
    setMuscleGroupId("");
    setEquipmentType("OTHER");
    setWeightUnit("DEFAULT");
    setCreatedExerciseId(null);
  }

  async function handleAiFill() {
    if (!name.trim()) return;
    setIsAiFilling(true);
    try {
      const result = await aiPopulateExercise(name.trim());
      if (result.name) setName(result.name);
      setDescription(result.description);
      if (result.muscleGroupId) setMuscleGroupId(result.muscleGroupId);
      setEquipmentType(result.equipmentType);
    } catch {
      // silently fail — user can still fill manually
    } finally {
      setIsAiFilling(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const exercise = await createExercise(formData);
        setCreatedExerciseId(exercise.id);
        onOpenChange(false);
        setShowImagePicker(true);
      } catch {
        // Error handling could be improved with toast notifications
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleImagePickerClose(pickerOpen: boolean) {
    setShowImagePicker(pickerOpen);
    if (!pickerOpen) {
      resetForm();
      router.refresh();
    }
  }

  const muscleGroupName =
    muscleGroups.find((mg) => mg.id === muscleGroupId)?.name ?? "";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                <div className="flex gap-2">
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Bench Press"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAiFill}
                    disabled={isAiFilling || !name.trim()}
                    title="Auto-fill with AI"
                  >
                    {isAiFilling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe the exercise, form cues, tips..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="primaryMuscleGroupId">Primary Muscle Group</Label>
                <Select
                  name="primaryMuscleGroupId"
                  required
                  value={muscleGroupId}
                  onValueChange={(v) => setMuscleGroupId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select muscle group">
                      {muscleGroupName || "Select muscle group"}
                    </SelectValue>
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
                  value={equipmentType}
                  onValueChange={(v) => setEquipmentType(v ?? "OTHER")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select equipment">
                      {EQUIPMENT_OPTIONS.find((eq) => eq.value === equipmentType)?.label ?? "Select equipment"}
                    </SelectValue>
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

              <div className="grid gap-2">
                <Label htmlFor="weightUnit">Weight Unit</Label>
                <Select
                  name="weightUnit"
                  value={weightUnit}
                  onValueChange={(v) => setWeightUnit(v ?? "DEFAULT")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select weight unit">
                      {weightUnit === "KG" ? "Kilograms (kg)" : weightUnit === "LBS" ? "Pounds (lbs)" : "Use default"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Use default</SelectItem>
                    <SelectItem value="KG">Kilograms (kg)</SelectItem>
                    <SelectItem value="LBS">Pounds (lbs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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

      {createdExerciseId && (
        <ImagePickerDialog
          open={showImagePicker}
          onOpenChange={handleImagePickerClose}
          exerciseName={name}
          equipmentType={equipmentType}
          muscleGroup={muscleGroupName}
          exerciseId={createdExerciseId}
        />
      )}
    </>
  );
}
