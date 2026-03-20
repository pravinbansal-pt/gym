"use client";

import { useState } from "react";
import { Plus, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createProgram } from "../_actions";

export function CreateProgramDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SIMPLE" | "PERIODIZED">("SIMPLE");
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    formData.set("type", type);
    await createProgram(formData);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Create Program
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Program</DialogTitle>
          <DialogDescription>
            Set up a new training program to organize your workouts.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Upper/Lower Split"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of this program..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Program Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("SIMPLE")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                  type === "SIMPLE"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Simple</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cycle through workouts in order. Great for repeating
                  routines.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setType("PERIODIZED")}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                  type === "PERIODIZED"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Periodized</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Organized into phases with different goals and durations.
                </p>
              </button>
            </div>
          </div>

          <input type="hidden" name="type" value={type} />

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create Program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
