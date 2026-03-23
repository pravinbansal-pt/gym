"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/get-session";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CreateNoteInput {
  exerciseId: string;
  sessionExerciseId?: string;
  content: string;
  isPinned?: boolean;
}

interface UpdateNoteInput {
  content?: string;
  isPinned?: boolean;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function getNotesForExercise(
  exerciseId: string,
  limit?: number
): Promise<ActionResult> {
  try {
    const notes = await db.exerciseNote.findMany({
      where: { exerciseId },
      include: {
        sessionExercise: {
          include: {
            workoutSession: {
              select: {
                id: true,
                name: true,
                startedAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    return { success: true, data: notes };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch exercise notes",
    };
  }
}

export async function getNotesForSessionExercise(
  sessionExerciseId: string
): Promise<ActionResult> {
  try {
    const notes = await db.exerciseNote.findMany({
      where: { sessionExerciseId },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: notes };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch session exercise notes",
    };
  }
}

export async function getPinnedNotes(
  exerciseId: string
): Promise<ActionResult> {
  try {
    const notes = await db.exerciseNote.findMany({
      where: {
        exerciseId,
        isPinned: true,
      },
      include: {
        sessionExercise: {
          include: {
            workoutSession: {
              select: {
                id: true,
                name: true,
                startedAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: notes };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch pinned notes",
    };
  }
}

export async function createNote(
  data: CreateNoteInput
): Promise<ActionResult> {
  try {
    await requireAuth();
    const note = await db.exerciseNote.create({
      data: {
        exerciseId: data.exerciseId,
        sessionExerciseId: data.sessionExerciseId,
        content: data.content,
        isPinned: data.isPinned ?? false,
      },
      include: {
        sessionExercise: {
          include: {
            workoutSession: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    revalidatePath(`/exercises/${data.exerciseId}`);
    return { success: true, data: note };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

export async function updateNote(
  id: string,
  data: UpdateNoteInput
): Promise<ActionResult> {
  try {
    await requireAuth();
    const note = await db.exerciseNote.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      },
    });

    revalidatePath(`/exercises/${note.exerciseId}`);
    return { success: true, data: note };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

export async function togglePinNote(id: string): Promise<ActionResult> {
  try {
    await requireAuth();
    // Get the current note to check its pinned status
    const existing = await db.exerciseNote.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Note not found" };
    }

    const note = await db.exerciseNote.update({
      where: { id },
      data: {
        isPinned: !existing.isPinned,
      },
    });

    revalidatePath(`/exercises/${note.exerciseId}`);
    return { success: true, data: note };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to toggle pin note",
    };
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const note = await db.exerciseNote.delete({
      where: { id },
    });

    revalidatePath(`/exercises/${note.exerciseId}`);
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}
