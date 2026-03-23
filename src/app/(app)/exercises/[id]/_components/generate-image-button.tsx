"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ImageIcon, RefreshCw } from "lucide-react";
import { ImagePickerDialog } from "../../_components/image-picker-dialog";

interface GenerateImageButtonProps {
  exerciseId: string;
  exerciseName: string;
  equipmentType: string;
  muscleGroup: string;
  hasImage: boolean;
}

export function GenerateImageButton({
  exerciseId,
  exerciseName,
  equipmentType,
  muscleGroup,
  hasImage,
}: GenerateImageButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      router.refresh();
    }
  }

  return (
    <>
      <Button
        variant={hasImage ? "outline" : "default"}
        size={hasImage ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        {hasImage ? (
          <RefreshCw className="size-4" data-icon="inline-start" />
        ) : (
          <ImageIcon className="size-4" data-icon="inline-start" />
        )}
        {hasImage ? "Regenerate Image" : "Generate Image"}
      </Button>

      <ImagePickerDialog
        open={open}
        onOpenChange={handleOpenChange}
        exerciseId={exerciseId}
        exerciseName={exerciseName}
        equipmentType={equipmentType}
        muscleGroup={muscleGroup}
      />
    </>
  );
}
