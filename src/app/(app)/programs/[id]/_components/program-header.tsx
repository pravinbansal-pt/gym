"use client";

import { useState } from "react";
import { Layers, RotateCcw, Zap, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  toggleProgramActive,
  updateProgram,
  deleteProgram,
} from "../../_actions";

type Program = {
  id: string;
  name: string;
  description: string | null;
  type: "SIMPLE" | "PERIODIZED";
  isActive: boolean;
};

export function ProgramHeader({ program }: { program: Program }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {program.name}
          </h1>
          {program.type === "PERIODIZED" ? (
            <Badge variant="secondary">
              <Layers className="size-3" />
              Periodized
            </Badge>
          ) : (
            <Badge variant="outline">
              <RotateCcw className="size-3" />
              Simple
            </Badge>
          )}
          {program.isActive && (
            <Badge variant="default">
              <Zap className="size-3" />
              Active
            </Badge>
          )}
        </div>
        {program.description && (
          <p className="text-muted-foreground">{program.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ActiveToggle programId={program.id} isActive={program.isActive} />
        <EditProgramDialog program={program} />
        <DeleteProgramButton programId={program.id} name={program.name} />
      </div>
    </div>
  );
}

function ActiveToggle({
  programId,
  isActive,
}: {
  programId: string;
  isActive: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState(isActive);

  async function handleToggle(newVal: boolean) {
    setPending(true);
    setChecked(newVal);
    await toggleProgramActive(programId, newVal);
    setPending(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">
        Active
      </Label>
      <Switch
        id="active-toggle"
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={pending}
      />
    </div>
  );
}

function EditProgramDialog({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    await updateProgram(program.id, formData);
    setPending(false);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" />
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Program</DialogTitle>
          <DialogDescription>
            Update the program name and description.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={program.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={program.description ?? ""}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProgramButton({
  programId,
  name,
}: {
  programId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    await deleteProgram(programId);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Program</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{name}&rdquo;? This will
            remove all workouts and exercise configurations within it. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting..." : "Delete Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
