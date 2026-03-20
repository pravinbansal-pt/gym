"use server";

import { db } from "@/lib/db";
import { ProgramType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

interface CreateProgramInput {
  name: string;
  description?: string;
  type?: ProgramType;
  defaultRestSeconds?: number;
  defaultWarmUpSets?: number;
  defaultWorkingSets?: number;
  defaultWarmUpPercent?: number;
}

interface UpdateProgramInput {
  name?: string;
  description?: string;
  type?: ProgramType;
  defaultRestSeconds?: number;
  defaultWarmUpSets?: number;
  defaultWorkingSets?: number;
  defaultWarmUpPercent?: number;
  isActive?: boolean;
}

interface CreatePhaseInput {
  name: string;
  description?: string;
  durationWeeks?: number;
}

interface UpdatePhaseInput {
  name?: string;
  description?: string;
  orderIndex?: number;
  durationWeeks?: number;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function getPrograms(): Promise<ActionResult> {
  try {
    const programs = await db.program.findMany({
      include: {
        _count: {
          select: {
            phases: true,
            workouts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: programs };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch programs",
    };
  }
}

export async function getProgram(id: string): Promise<ActionResult> {
  try {
    const program = await db.program.findUnique({
      where: { id },
      include: {
        phases: {
          orderBy: { orderIndex: "asc" },
          include: {
            workouts: {
              orderBy: { orderIndex: "asc" },
              include: {
                exercises: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    exercise: {
                      include: {
                        primaryMuscleGroup: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workouts: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercises: {
              orderBy: { orderIndex: "asc" },
              include: {
                exercise: {
                  include: {
                    primaryMuscleGroup: true,
                  },
                },
              },
            },
            phase: true,
          },
        },
      },
    });

    if (!program) {
      return { success: false, error: "Program not found" };
    }

    return { success: true, data: program };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch program",
    };
  }
}

export async function createProgram(
  data: CreateProgramInput
): Promise<ActionResult> {
  try {
    const program = await db.program.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type ?? "SIMPLE",
        defaultRestSeconds: data.defaultRestSeconds ?? 90,
        defaultWarmUpSets: data.defaultWarmUpSets ?? 1,
        defaultWorkingSets: data.defaultWorkingSets ?? 3,
        defaultWarmUpPercent: data.defaultWarmUpPercent ?? 0.6,
      },
    });

    revalidatePath("/programs");
    return { success: true, data: program };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create program",
    };
  }
}

export async function updateProgram(
  id: string,
  data: UpdateProgramInput
): Promise<ActionResult> {
  try {
    const program = await db.program.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.defaultRestSeconds !== undefined && {
          defaultRestSeconds: data.defaultRestSeconds,
        }),
        ...(data.defaultWarmUpSets !== undefined && {
          defaultWarmUpSets: data.defaultWarmUpSets,
        }),
        ...(data.defaultWorkingSets !== undefined && {
          defaultWorkingSets: data.defaultWorkingSets,
        }),
        ...(data.defaultWarmUpPercent !== undefined && {
          defaultWarmUpPercent: data.defaultWarmUpPercent,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    return { success: true, data: program };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update program",
    };
  }
}

export async function deleteProgram(id: string): Promise<ActionResult> {
  try {
    await db.program.delete({ where: { id } });

    revalidatePath("/programs");
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete program",
    };
  }
}

export async function createPhase(
  programId: string,
  data: CreatePhaseInput
): Promise<ActionResult> {
  try {
    // Get the max orderIndex for phases in this program
    const maxOrder = await db.programPhase.aggregate({
      where: { programId },
      _max: { orderIndex: true },
    });

    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    const phase = await db.programPhase.create({
      data: {
        programId,
        name: data.name,
        description: data.description,
        durationWeeks: data.durationWeeks ?? 4,
        orderIndex: nextOrder,
      },
    });

    revalidatePath(`/programs/${programId}`);
    return { success: true, data: phase };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create phase",
    };
  }
}

export async function updatePhase(
  id: string,
  data: UpdatePhaseInput
): Promise<ActionResult> {
  try {
    const phase = await db.programPhase.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.durationWeeks !== undefined && {
          durationWeeks: data.durationWeeks,
        }),
      },
    });

    revalidatePath(`/programs/${phase.programId}`);
    return { success: true, data: phase };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update phase",
    };
  }
}

export async function deletePhase(id: string): Promise<ActionResult> {
  try {
    const phase = await db.programPhase.delete({ where: { id } });

    revalidatePath(`/programs/${phase.programId}`);
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete phase",
    };
  }
}

export async function reorderPhases(
  programId: string,
  phaseIds: string[]
): Promise<ActionResult> {
  try {
    await db.$transaction(
      phaseIds.map((phaseId, index) =>
        db.programPhase.update({
          where: { id: phaseId },
          data: { orderIndex: index },
        })
      )
    );

    revalidatePath(`/programs/${programId}`);
    return { success: true, data: { programId, phaseIds } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder phases",
    };
  }
}

export async function setActiveProgram(id: string): Promise<ActionResult> {
  try {
    // Unset all active programs, then set this one
    await db.$transaction([
      db.program.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      db.program.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    revalidatePath("/programs");
    revalidatePath(`/programs/${id}`);
    revalidatePath("/"); // Dashboard may show active program
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to set active program",
    };
  }
}
