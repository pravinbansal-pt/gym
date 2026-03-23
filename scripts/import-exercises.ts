import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, EquipmentType } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const RAPIDAPI_HOST =
  "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
const API_KEY = process.env.RAPIDAPI_KEY!;

// Map API equipment names to our EquipmentType enum
const EQUIPMENT_MAP: Record<string, EquipmentType> = {
  BARBELL: "BARBELL",
  "OLYMPIC BARBELL": "BARBELL",
  "TRAP BAR": "BARBELL",
  DUMBBELL: "DUMBBELL",
  CABLE: "CABLE",
  "BODY WEIGHT": "BODYWEIGHT",
  "SMITH MACHINE": "SMITH_MACHINE",
  "EZ BARBELL": "EZ_BAR",
  KETTLEBELL: "KETTLEBELL",
  "RESISTANCE BAND": "RESISTANCE_BAND",
  BAND: "RESISTANCE_BAND",
  // Machine-like equipment
  "LEVERAGE MACHINE": "MACHINE",
  "SLED MACHINE": "MACHINE",
  ASSISTED: "MACHINE",
  // Everything else → OTHER
};

// Map API body parts to our MuscleGroup names
const BODYPART_TO_MUSCLE: Record<string, string> = {
  BACK: "Back",
  CALVES: "Calves",
  CHEST: "Chest",
  FOREARMS: "Forearms",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  "UPPER ARMS": "Biceps",
  TRICEPS: "Triceps",
  HAMSTRINGS: "Hamstrings",
  QUADRICEPS: "Quadriceps",
  THIGHS: "Quadriceps",
  WAIST: "Abs",
  HIPS: "Glutes",
  NECK: "Traps",
  FACE: "Traps",
  "FULL BODY": "Abs",
  HANDS: "Forearms",
  FEET: "Calves",
};

interface ApiExercise {
  exerciseId: string;
  name: string;
  imageUrl: string;
  imageUrls?: {
    "360p": string;
    "480p": string;
    "720p": string;
    "1080p": string;
  };
  bodyParts: string[];
  equipments: string[];
  exerciseType: string;
  targetMuscles: string[];
  secondaryMuscles: string[];
  keywords: string[];
}

interface ApiResponse {
  success: boolean;
  meta: {
    total: number;
    hasNextPage: boolean;
    nextCursor?: string;
  };
  data: ApiExercise[];
}

async function fetchPage(cursor?: string): Promise<ApiResponse> {
  const url = new URL(`https://${RAPIDAPI_HOST}/api/v1/exercises`);
  url.searchParams.set("limit", "50");
  if (cursor) url.searchParams.set("after", cursor);

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function fetchAllExercises(): Promise<ApiExercise[]> {
  const all: ApiExercise[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (true) {
    page++;
    console.log(`  Fetching page ${page}... (cursor: ${cursor ?? "start"})`);

    const res = await fetchPage(cursor);
    all.push(...res.data);

    console.log(`  Got ${res.data.length} exercises (total so far: ${all.length}/${res.meta.total})`);

    if (!res.meta.hasNextPage || !res.meta.nextCursor) break;
    cursor = res.meta.nextCursor;

    // Rate limit: wait 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  return all;
}

async function main() {
  console.log("=== ExerciseDB Import ===\n");

  // 1. Fetch all exercises from API
  console.log("1. Fetching all exercises from API...");
  const apiExercises = await fetchAllExercises();
  console.log(`\n   Fetched ${apiExercises.length} exercises total.\n`);

  // 2. Ensure all muscle groups exist
  console.log("2. Ensuring muscle groups exist...");
  const uniqueMuscleNames = new Set<string>();
  for (const ex of apiExercises) {
    for (const bp of ex.bodyParts) {
      const mapped = BODYPART_TO_MUSCLE[bp];
      if (mapped) uniqueMuscleNames.add(mapped);
    }
  }

  const muscleGroupMap = new Map<string, string>(); // name → id
  for (const name of uniqueMuscleNames) {
    const mg = await db.muscleGroup.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    muscleGroupMap.set(name, mg.id);
  }
  // Also load any existing ones
  const allMgs = await db.muscleGroup.findMany();
  for (const mg of allMgs) {
    muscleGroupMap.set(mg.name, mg.id);
  }
  console.log(`   ${muscleGroupMap.size} muscle groups ready.\n`);

  // 3. Clear existing exercises (cascade through dependent records)
  console.log("3. Clearing existing exercises...");
  // Delete dependents first
  const delSession = await db.workoutSessionExercise.deleteMany();
  const delProgram = await db.programWorkoutExercise.deleteMany();
  const delNotes = await db.exerciseNote.deleteMany();
  const delPRs = await db.personalRecord.deleteMany();
  console.log(`   Deleted ${delSession.count} session exercises, ${delProgram.count} program exercises, ${delNotes.count} notes, ${delPRs.count} PRs`);

  const delExercises = await db.exercise.deleteMany();
  console.log(`   Deleted ${delExercises.count} exercises.\n`);

  // 4. Insert exercises
  console.log("4. Inserting exercises...");
  let inserted = 0;
  let skipped = 0;
  const seenNames = new Set<string>();

  for (const ex of apiExercises) {
    const name = ex.name.trim();

    // Skip duplicate names
    if (seenNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    seenNames.add(name.toLowerCase());

    // Map equipment
    const apiEquip = ex.equipments[0] ?? "";
    const equipmentType: EquipmentType =
      EQUIPMENT_MAP[apiEquip] ?? "OTHER";

    // Map primary muscle group from first body part
    const primaryBp = ex.bodyParts[0] ?? "WAIST";
    const primaryMuscleName = BODYPART_TO_MUSCLE[primaryBp] ?? "Abs";
    const primaryMuscleGroupId = muscleGroupMap.get(primaryMuscleName);

    if (!primaryMuscleGroupId) {
      console.log(`   Skipping "${name}": no muscle group for "${primaryBp}"`);
      skipped++;
      continue;
    }

    // Map secondary muscle groups from remaining body parts
    const secondaryMuscleIds: string[] = [];
    for (let i = 1; i < ex.bodyParts.length; i++) {
      const secName = BODYPART_TO_MUSCLE[ex.bodyParts[i]];
      if (secName && muscleGroupMap.has(secName)) {
        const secId = muscleGroupMap.get(secName)!;
        if (secId !== primaryMuscleGroupId && !secondaryMuscleIds.includes(secId)) {
          secondaryMuscleIds.push(secId);
        }
      }
    }

    try {
      await db.exercise.create({
        data: {
          name,
          exerciseDbId: ex.exerciseId,
          imageUrl: ex.imageUrl,
          equipmentType,
          primaryMuscleGroupId,
          secondaryMuscleGroups: {
            connect: secondaryMuscleIds.map((id) => ({ id })),
          },
        },
      });
      inserted++;
    } catch (err: any) {
      if (err.code === "P2002") {
        // Unique constraint violation
        skipped++;
      } else {
        console.error(`   Error inserting "${name}":`, err.message);
        skipped++;
      }
    }
  }

  console.log(`\n   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);

  // 5. Summary
  const total = await db.exercise.count();
  console.log(`\n=== Done! ${total} exercises in database ===`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
