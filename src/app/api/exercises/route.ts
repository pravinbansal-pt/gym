import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EquipmentType } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreateExercisePayload {
  name: string;
  description?: string;
  equipmentType?: EquipmentType;
  imageUrl?: string;
  primaryMuscleGroupId?: string;
  primaryMuscleGroupName?: string;
  secondaryMuscleGroupIds?: string[];
  secondaryMuscleGroupNames?: string[];
}

// ─── GET Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const muscleGroupId = searchParams.get("muscleGroupId");
    const equipmentType = searchParams.get("equipmentType") as EquipmentType | null;
    const search = searchParams.get("search");
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const take = parseInt(searchParams.get("take") ?? "50", 10);

    const where: Record<string, unknown> = {};

    if (muscleGroupId) {
      where.primaryMuscleGroupId = muscleGroupId;
    }

    if (equipmentType && Object.values(EquipmentType).includes(equipmentType)) {
      where.equipmentType = equipmentType;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [exercises, total] = await Promise.all([
      db.exercise.findMany({
        where,
        include: {
          primaryMuscleGroup: true,
          secondaryMuscleGroups: true,
        },
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      db.exercise.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { exercises, total },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch exercises",
      },
      { status: 500 }
    );
  }
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateExercisePayload;

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Exercise name is required" },
        { status: 400 }
      );
    }

    // Resolve primary muscle group: by ID or by name
    let primaryMuscleGroupId = body.primaryMuscleGroupId;

    if (!primaryMuscleGroupId && body.primaryMuscleGroupName) {
      const muscleGroup = await db.muscleGroup.findFirst({
        where: {
          name: {
            equals: body.primaryMuscleGroupName,
            mode: "insensitive",
          },
        },
      });

      if (muscleGroup) {
        primaryMuscleGroupId = muscleGroup.id;
      }
    }

    if (!primaryMuscleGroupId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Primary muscle group is required. Provide primaryMuscleGroupId or primaryMuscleGroupName.",
        },
        { status: 400 }
      );
    }

    // Resolve secondary muscle groups by name if provided
    let secondaryMuscleGroupIds = body.secondaryMuscleGroupIds ?? [];

    if (
      body.secondaryMuscleGroupNames &&
      body.secondaryMuscleGroupNames.length > 0
    ) {
      const muscleGroups = await db.muscleGroup.findMany({
        where: {
          name: {
            in: body.secondaryMuscleGroupNames,
            mode: "insensitive",
          },
        },
      });
      const resolvedIds = muscleGroups.map((mg) => mg.id);
      secondaryMuscleGroupIds = [
        ...secondaryMuscleGroupIds,
        ...resolvedIds,
      ];
    }

    // Check for duplicate exercise name
    const existing = await db.exercise.findUnique({
      where: { name: body.name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Exercise "${body.name}" already exists`,
          existingExercise: existing,
        },
        { status: 409 }
      );
    }

    // Validate equipment type
    const equipmentType =
      body.equipmentType &&
      Object.values(EquipmentType).includes(body.equipmentType)
        ? body.equipmentType
        : "OTHER";

    const exercise = await db.exercise.create({
      data: {
        name: body.name,
        description: body.description,
        equipmentType,
        imageUrl: body.imageUrl,
        primaryMuscleGroupId,
        secondaryMuscleGroups:
          secondaryMuscleGroupIds.length > 0
            ? {
                connect: secondaryMuscleGroupIds.map((id) => ({ id })),
              }
            : undefined,
      },
      include: {
        primaryMuscleGroup: true,
        secondaryMuscleGroups: true,
      },
    });

    return NextResponse.json(
      { success: true, data: exercise },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create exercise",
      },
      { status: 500 }
    );
  }
}
