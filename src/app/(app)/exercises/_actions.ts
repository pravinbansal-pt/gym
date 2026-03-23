"use server";

import { db } from "@/lib/db";
import { EquipmentType, WeightUnit } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export async function getExercises(filters?: {
  search?: string;
  muscleGroup?: string;
  equipment?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }
  if (filters?.muscleGroup) {
    where.primaryMuscleGroupId = filters.muscleGroup;
  }
  if (filters?.equipment) {
    where.equipmentType = filters.equipment;
  }

  return db.exercise.findMany({
    where,
    include: {
      primaryMuscleGroup: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getExerciseById(id: string) {
  return db.exercise.findUnique({
    where: { id },
    include: {
      primaryMuscleGroup: true,
      secondaryMuscleGroups: true,
      personalRecords: {
        orderBy: { estimated1RM: "desc" },
        take: 1,
      },
      sessionExercises: {
        include: {
          workoutSession: true,
        },
        orderBy: {
          workoutSession: { startedAt: "desc" },
        },
        take: 1,
      },
      _count: {
        select: {
          sessionExercises: true,
        },
      },
    },
  });
}

export async function getMuscleGroups() {
  return db.muscleGroup.findMany({
    orderBy: { displayOrder: "asc" },
  });
}

export async function createExercise(formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const primaryMuscleGroupId = formData.get("primaryMuscleGroupId") as string;
  const equipmentType = (formData.get("equipmentType") as EquipmentType) || "OTHER";
  const rawWeightUnit = formData.get("weightUnit") as string | null;
  const weightUnit =
    rawWeightUnit && (rawWeightUnit === "KG" || rawWeightUnit === "LBS")
      ? (rawWeightUnit as WeightUnit)
      : null;

  if (!name || !primaryMuscleGroupId) {
    throw new Error("Name and primary muscle group are required");
  }

  const exercise = await db.exercise.create({
    data: {
      name,
      description,
      primaryMuscleGroupId,
      equipmentType,
      weightUnit,
    },
  });

  revalidatePath("/exercises");
  return exercise;
}

export async function updateExercise(id: string, formData: FormData) {
  await requireAuth();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const primaryMuscleGroupId = formData.get("primaryMuscleGroupId") as string;
  const equipmentType = (formData.get("equipmentType") as EquipmentType) || "OTHER";
  const rawWeightUnit = formData.get("weightUnit") as string | null;
  const weightUnit =
    rawWeightUnit && (rawWeightUnit === "KG" || rawWeightUnit === "LBS")
      ? (rawWeightUnit as WeightUnit)
      : null;

  if (!name || !primaryMuscleGroupId) {
    throw new Error("Name and primary muscle group are required");
  }

  await db.exercise.update({
    where: { id },
    data: {
      name,
      description: description ?? null,
      primaryMuscleGroupId,
      equipmentType,
      weightUnit,
    },
  });

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  redirect(`/exercises/${id}`);
}

export async function deleteExercise(id: string) {
  await requireAuth();
  await db.exercise.delete({ where: { id } });

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function aiPopulateExercise(exerciseName: string) {
  await requireAuth();
  const muscleGroups = await db.muscleGroup.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const muscleGroupNames = muscleGroups.map((mg) => mg.name);
  const equipmentTypes = [
    "BARBELL",
    "DUMBBELL",
    "MACHINE",
    "CABLE",
    "BODYWEIGHT",
    "SMITH_MACHINE",
    "EZ_BAR",
    "KETTLEBELL",
    "RESISTANCE_BAND",
    "OTHER",
  ];

  const openai = new OpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a fitness expert. Given an exercise name (which may be informal, misspelled, or abbreviated), return a JSON object with:
- "name": the proper, standard name for this exercise (e.g. "Hip Abductor Machine" not "hip abductors")
- "description": a concise description (2-3 sentences) with form cues and tips
- "muscleGroup": the primary muscle group, must be one of: ${JSON.stringify(muscleGroupNames)}
- "equipmentType": must be one of: ${JSON.stringify(equipmentTypes)}

Return only valid JSON.`,
      },
      {
        role: "user",
        content: exerciseName,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = JSON.parse(content) as {
    name: string;
    description: string;
    muscleGroup: string;
    equipmentType: string;
  };

  // Map muscle group name back to ID
  const matchedGroup = muscleGroups.find(
    (mg) => mg.name.toLowerCase() === parsed.muscleGroup.toLowerCase()
  );

  return {
    name: parsed.name,
    description: parsed.description,
    muscleGroupId: matchedGroup?.id ?? null,
    equipmentType: equipmentTypes.includes(parsed.equipmentType)
      ? parsed.equipmentType
      : "OTHER",
  };
}

export async function generateExerciseImages(
  exerciseName: string,
  equipmentType: string,
  muscleGroup: string,
  exerciseId: string,
  userReferenceBase64?: string | null
): Promise<string[]> {
  await requireAuth();
  const openai = new OpenAI();

  const equipment = equipmentType.toLowerCase().replace(/_/g, " ");
  const muscle = muscleGroup.toLowerCase();

  const prompt = `3D rendered anatomical illustration of a muscular male figure performing ${exerciseName} with ${equipment}. The figure's body is rendered in grayscale/silver with detailed visible muscle anatomy. ONLY the ${muscle} muscles are highlighted in red-orange color — no other muscles should be colored. All other muscles (including synergists, stabilizers, and secondary movers) must remain completely grayscale/silver. The figure wears only black shorts. Pure white background with no shadows on the background. The gym equipment is rendered realistically in dark metallic tones. The figure has a bald head with minimal facial features. Isometric 3D perspective view showing proper exercise form. Clean medical/anatomical illustration style. No text, no watermarks, no logos. Match the exact visual style of the reference image provided — same rendering technique, same anatomy illustration approach, same color treatment but with ONLY the ${muscle} highlighted in red/orange and every other muscle in grayscale.`;

  const dir = path.join(process.cwd(), "public", "exercises");
  await mkdir(dir, { recursive: true });

  // Build reference image — user-supplied or default ExerciseDB sample
  const { toFile } = await import("openai/uploads");
  let referenceFile;
  if (userReferenceBase64) {
    const b64 = userReferenceBase64.replace(/^data:image\/\w+;base64,/, "");
    referenceFile = await toFile(Buffer.from(b64, "base64"), "reference.png", { type: "image/png" });
  } else {
    const sampleRes = await fetch("https://cdn.exercisedb.dev/media/images/CNKJtB2O5Y.webp");
    const sampleBuffer = Buffer.from(await sampleRes.arrayBuffer());
    referenceFile = await toFile(sampleBuffer, "reference.webp", { type: "image/webp" });
  }

  const results = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      openai.images.edit({
        model: "gpt-image-1.5",
        image: referenceFile,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
      }).then(async (res) => {
        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error("Image data missing");
        const filename = `${exerciseId}_option${i}.png`;
        await writeFile(path.join(dir, filename), Buffer.from(b64, "base64"));
        return `/exercises/${filename}`;
      })
    )
  );

  return results;
}

export async function saveExerciseImage(
  exerciseId: string,
  selectedPath: string
): Promise<string> {
  await requireAuth();
  const dir = path.join(process.cwd(), "public", "exercises");
  const finalFilename = `${exerciseId}.png`;
  const finalPath = path.join(dir, finalFilename);

  // Rename the selected option to the final filename
  const { rename, unlink } = await import("fs/promises");
  const sourcePath = path.join(process.cwd(), "public", selectedPath);
  await rename(sourcePath, finalPath);

  // Clean up the other options
  for (let i = 0; i < 3; i++) {
    const optionPath = path.join(dir, `${exerciseId}_option${i}.png`);
    try {
      await unlink(optionPath);
    } catch {
      // Already renamed or doesn't exist
    }
  }

  const imageUrl = `/exercises/${finalFilename}`;

  await db.exercise.update({
    where: { id: exerciseId },
    data: { imageUrl },
  });

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath("/programs", "layout");

  return imageUrl;
}
