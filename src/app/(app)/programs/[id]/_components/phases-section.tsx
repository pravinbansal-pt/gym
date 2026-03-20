"use client";

import { useState } from "react";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhase,
} from "../../_actions";

type Phase = {
  id: string;
  name: string;
  description: string | null;
  orderIndex: number;
  durationWeeks: number;
};

export function PhasesSection({
  programId,
  phases,
}: {
  programId: string;
  phases: Phase[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold tracking-tight">Phases</h2>
          <Badge variant="secondary">{phases.length}</Badge>
        </div>
        <PhaseFormDialog programId={programId} />
      </div>

      {phases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Layers className="size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No phases defined yet. Add phases to organize your training into
              blocks like Hypertrophy, Strength, or Peaking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {phases.map((phase, idx) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              programId={programId}
              isFirst={idx === 0}
              isLast={idx === phases.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseCard({
  phase,
  programId,
  isFirst,
  isLast,
}: {
  phase: Phase;
  programId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst}
            onClick={() => reorderPhase(phase.id, programId, "up")}
          >
            <ChevronUp className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast}
            onClick={() => reorderPhase(phase.id, programId, "down")}
          >
            <ChevronDown className="size-3" />
          </Button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{phase.name}</span>
            <Badge variant="outline" className="shrink-0">
              <Calendar className="size-3" />
              {phase.durationWeeks} {phase.durationWeeks === 1 ? "week" : "weeks"}
            </Badge>
          </div>
          {phase.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {phase.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <PhaseFormDialog programId={programId} phase={phase} />
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              await deletePhase(phase.id, programId);
              setDeleting(false);
            }}
          >
            <Trash2 className="size-3 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PhaseFormDialog({
  programId,
  phase,
}: {
  programId: string;
  phase?: Phase;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isEditing = !!phase;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    if (isEditing) {
      await updatePhase(phase.id, programId, formData);
    } else {
      await createPhase(programId, formData);
    }
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="ghost" size="icon-xs">
              <Pencil className="size-3" />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Plus className="size-3.5" />
              Add Phase
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Phase" : "Add Phase"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this training phase."
              : "Add a new training phase to your program."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase-name">Phase Name</Label>
            <Input
              id="phase-name"
              name="name"
              placeholder="e.g., Hypertrophy"
              defaultValue={phase?.name ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phase-weeks">Duration (weeks)</Label>
            <Input
              id="phase-weeks"
              name="durationWeeks"
              type="number"
              min={1}
              max={52}
              defaultValue={phase?.durationWeeks ?? 4}
              className="w-24"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phase-desc">Description</Label>
            <Textarea
              id="phase-desc"
              name="description"
              placeholder="Goals, focus areas, etc."
              defaultValue={phase?.description ?? ""}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Phase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
