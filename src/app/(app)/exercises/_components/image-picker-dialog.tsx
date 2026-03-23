"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, Check, Upload, X, Sparkles } from "lucide-react";
import { generateExerciseImages, saveExerciseImage } from "../_actions";

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  equipmentType: string;
  muscleGroup: string;
  exerciseId: string;
  onImageSaved?: (imageUrl: string) => void;
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  exerciseName,
  equipmentType,
  muscleGroup,
  exerciseId,
  onImageSaved,
}: ImagePickerDialogProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasGenerated = images.length > 0;

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setSelectedIndex(null);
    setImages([]);
    try {
      const result = await generateExerciseImages(
        exerciseName,
        equipmentType,
        muscleGroup,
        exerciseId,
        referenceImage
      );
      const ts = Date.now();
      setImages(result.map((p) => `${p}?t=${ts}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setIsGenerating(false);
    }
  }, [exerciseName, equipmentType, muscleGroup, exerciseId, referenceImage]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setReferenceImage(reader.result as string);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }

  async function handleSave() {
    if (selectedIndex === null || !images[selectedIndex]) return;
    setIsSaving(true);
    try {
      const selectedPath = images[selectedIndex].split("?")[0];
      const url = await saveExerciseImage(exerciseId, selectedPath);
      onImageSaved?.(url);
      onOpenChange(false);
    } catch {
      setError("Failed to save image");
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    setImages([]);
    setSelectedIndex(null);
    setError(null);
    setReferenceImage(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl" onPaste={handlePaste}>
        <DialogHeader>
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>
            {hasGenerated
              ? `Pick your favourite image for ${exerciseName}, or regenerate for new options.`
              : `Optionally add a reference image, then generate images for ${exerciseName}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Reference image upload */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Style reference (optional)</span>
            {referenceImage && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => setReferenceImage(null)}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
          {referenceImage ? (
            <div className="flex items-center gap-3">
              <img
                src={referenceImage}
                alt="Style reference"
                className="size-16 rounded-md border object-cover"
              />
              <span className="text-xs text-muted-foreground">
                Reference attached
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 p-3 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:text-foreground"
            >
              <Upload className="size-4" />
              Upload or paste an image
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Initial state: show Generate button */}
        {!hasGenerated && !isGenerating && (
          <Button onClick={generate} className="w-full" size="lg">
            <Sparkles className="size-4" data-icon="inline-start" />
            Generate Images
          </Button>
        )}

        {/* Loading or results */}
        {(isGenerating || hasGenerated) && (
          <div className="grid grid-cols-3 gap-3">
            {isGenerating
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-square items-center justify-center rounded-lg bg-muted animate-pulse"
                  >
                    {i === 1 && (
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                ))
              : images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIndex(i)}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                      selectedIndex === i
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Generated option ${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    {selectedIndex === i && (
                      <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </div>
                    )}
                  </button>
                ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Footer — only show Regenerate/Use Selected after first generation */}
        {(hasGenerated || isGenerating) && (
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={generate}
              disabled={isGenerating || isSaving}
            >
              <RefreshCw
                className={`size-4 ${isGenerating ? "animate-spin" : ""}`}
                data-icon="inline-start"
              />
              Regenerate
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Skip
              </Button>
              <Button
                onClick={handleSave}
                disabled={selectedIndex === null || isSaving || isGenerating}
              >
                {isSaving && (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                )}
                Use Selected
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
