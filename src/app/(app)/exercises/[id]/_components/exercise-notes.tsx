"use client";

import { useState, useCallback, useTransition } from "react";
import { toast } from "sonner";
import {
  Pin,
  PinOff,
  Plus,
  Pencil,
  Trash2,
  Search,
  StickyNote,
  Calendar,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createNote,
  togglePinNote,
  updateNote,
  deleteNote,
} from "@/lib/actions/notes";

// ─── Types ──────────────────────────────────────────────────────────

interface NoteData {
  id: string;
  exerciseId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  sessionExercise: {
    workoutSession: {
      id: string;
      name: string | null;
      startedAt: string | null;
      createdAt: string;
    };
  } | null;
}

interface ExerciseNotesProps {
  exerciseId: string;
  initialNotes: NoteData[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

function getGroupKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Main Component ─────────────────────────────────────────────────

export function ExerciseNotes({ exerciseId, initialNotes }: ExerciseNotesProps) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── Filter notes ─────────────────────────────────────────────

  const filteredNotes = notes.filter((note) =>
    searchQuery
      ? note.content.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.isPinned);

  // Group unpinned notes by date
  const groupedNotes = unpinnedNotes.reduce<Record<string, NoteData[]>>(
    (acc, note) => {
      const key = getGroupKey(note.createdAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    },
    {}
  );

  const sortedGroupKeys = Object.keys(groupedNotes).sort(
    (a, b) => b.localeCompare(a)
  );

  // ─── Create Note ──────────────────────────────────────────────

  const handleCreateNote = useCallback(() => {
    if (!newNoteContent.trim()) return;

    startTransition(async () => {
      const result = await createNote({
        exerciseId,
        content: newNoteContent.trim(),
      });

      if (result.success) {
        const noteData = result.data as NoteData;
        setNotes((prev) => [
          {
            ...noteData,
            createdAt:
              typeof noteData.createdAt === "string"
                ? noteData.createdAt
                : new Date(noteData.createdAt).toISOString(),
            updatedAt:
              typeof noteData.updatedAt === "string"
                ? noteData.updatedAt
                : new Date(noteData.updatedAt).toISOString(),
          },
          ...prev,
        ]);
        setNewNoteContent("");
        setShowAddDialog(false);
        toast.success("Note added");
      } else {
        toast.error(result.error);
      }
    });
  }, [exerciseId, newNoteContent]);

  // ─── Toggle Pin ───────────────────────────────────────────────

  const handleTogglePin = useCallback((noteId: string) => {
    startTransition(async () => {
      const result = await togglePinNote(noteId);

      if (result.success) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, isPinned: !n.isPinned } : n
          )
        );
      } else {
        toast.error(result.error);
      }
    });
  }, []);

  // ─── Edit Note ────────────────────────────────────────────────

  const startEditing = useCallback((note: NoteData) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  }, []);

  const handleUpdateNote = useCallback(() => {
    if (!editingNoteId || !editContent.trim()) return;

    startTransition(async () => {
      const result = await updateNote(editingNoteId, {
        content: editContent.trim(),
      });

      if (result.success) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingNoteId
              ? { ...n, content: editContent.trim() }
              : n
          )
        );
        setEditingNoteId(null);
        setEditContent("");
        toast.success("Note updated");
      } else {
        toast.error(result.error);
      }
    });
  }, [editingNoteId, editContent]);

  const cancelEditing = useCallback(() => {
    setEditingNoteId(null);
    setEditContent("");
  }, []);

  // ─── Delete Note ──────────────────────────────────────────────

  const handleDeleteNote = useCallback((noteId: string) => {
    startTransition(async () => {
      const result = await deleteNote(noteId);

      if (result.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setDeleteConfirmId(null);
        toast.success("Note deleted");
      } else {
        toast.error(result.error);
      }
    });
  }, []);

  // ─── Note Card ────────────────────────────────────────────────

  function NoteCard({ note }: { note: NoteData }) {
    const isEditing = editingNoteId === note.id;
    const sessionName =
      note.sessionExercise?.workoutSession?.name ?? null;
    const sessionDate =
      note.sessionExercise?.workoutSession?.startedAt ??
      note.sessionExercise?.workoutSession?.createdAt ??
      null;

    return (
      <div
        className={`group relative rounded-lg border p-3 transition-colors ${
          note.isPinned
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border hover:border-border/80 hover:bg-muted/30"
        }`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={isPending}
              >
                <X className="size-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateNote}
                disabled={isPending || !editContent.trim()}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="size-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">
                {note.content}
              </p>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleTogglePin(note.id)}
                  title={note.isPinned ? "Unpin note" : "Pin note"}
                  disabled={isPending}
                >
                  {note.isPinned ? (
                    <PinOff className="size-3.5" />
                  ) : (
                    <Pin className="size-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => startEditing(note)}
                  title="Edit note"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setDeleteConfirmId(note.id)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete note"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              <span>{formatDate(note.createdAt)}</span>
              {sessionName && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {sessionName}
                    {sessionDate && ` - ${formatDateShort(sessionDate)}`}
                  </Badge>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  if (notes.length === 0 && !showAddDialog) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <StickyNote className="size-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-medium text-muted-foreground">
            No notes yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Add form cues, tips, or reminders for this exercise.
          </p>
          <Button
            className="mt-4 gap-1.5"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="size-4" />
            Add Note
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="gap-1.5 shrink-0"
        >
          <Plus className="size-4" />
          Add Note
        </Button>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pin className="size-3.5 text-amber-600" />
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Pinned
            </h3>
            <Badge variant="secondary" className="text-[10px] h-4">
              {pinnedNotes.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* Grouped Notes */}
      {sortedGroupKeys.length > 0 && (
        <div className="space-y-4">
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2">
              <StickyNote className="size-3.5 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                All Notes
              </h3>
            </div>
          )}
          {sortedGroupKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {formatDate(groupedNotes[dateKey][0].createdAt)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {groupedNotes[dateKey].map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {filteredNotes.length === 0 && searchQuery && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Search className="size-8 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              No notes matching &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Note Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a form cue, tip, or reminder for this exercise.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="E.g., Keep elbows tucked, focus on squeezing at the top..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewNoteContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={isPending || !newNoteContent.trim()}
            >
              {isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="size-4 mr-1.5" />
              )}
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteNote(deleteConfirmId)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-1.5" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
