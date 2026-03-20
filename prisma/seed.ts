import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, EquipmentType } from '../src/generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Muscle Groups ──────────────────────────────────────────────────────────

const muscleGroups = [
  { name: 'Chest', displayOrder: 1 },
  { name: 'Back', displayOrder: 2 },
  { name: 'Shoulders', displayOrder: 3 },
  { name: 'Biceps', displayOrder: 4 },
  { name: 'Triceps', displayOrder: 5 },
  { name: 'Forearms', displayOrder: 6 },
  { name: 'Quadriceps', displayOrder: 7 },
  { name: 'Hamstrings', displayOrder: 8 },
  { name: 'Glutes', displayOrder: 9 },
  { name: 'Calves', displayOrder: 10 },
  { name: 'Abs', displayOrder: 11 },
  { name: 'Obliques', displayOrder: 12 },
  { name: 'Traps', displayOrder: 13 },
  { name: 'Lats', displayOrder: 14 },
] as const;

// ─── Exercise definitions ───────────────────────────────────────────────────

interface ExerciseDef {
  name: string;
  equipmentType: EquipmentType;
  primaryMuscle: string;
  secondaryMuscles: string[];
  description: string;
}

const exercises: ExerciseDef[] = [
  // ── Chest (8) ──────────────────────────────────────────────────────────
  {
    name: 'Bench Press (Barbell)',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    description: 'Lie on a flat bench and press a barbell upward from chest level.',
  },
  {
    name: 'Incline Bench Press',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Shoulders', 'Triceps'],
    description: 'Press a barbell upward on an incline bench to target the upper chest.',
  },
  {
    name: 'Decline Bench Press',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    description: 'Press a barbell upward on a decline bench to target the lower chest.',
  },
  {
    name: 'Dumbbell Flyes',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Shoulders'],
    description: 'Lie on a flat bench and open your arms wide with dumbbells, then bring them together above your chest.',
  },
  {
    name: 'Cable Crossover',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Shoulders'],
    description: 'Stand between two cable pulleys and bring the handles together in front of your chest.',
  },
  {
    name: 'Push-Ups',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders', 'Abs'],
    description: 'Lower and raise your body using your arms while keeping a straight plank position.',
  },
  {
    name: 'Chest Dips',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Triceps', 'Shoulders'],
    description: 'Lean forward on parallel bars and lower your body to emphasize chest engagement.',
  },
  {
    name: 'Pec Deck Machine',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Chest',
    secondaryMuscles: ['Shoulders'],
    description: 'Sit in the pec deck machine and bring the padded arms together in front of your chest.',
  },

  // ── Back (8) ───────────────────────────────────────────────────────────
  {
    name: 'Deadlift',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Hamstrings', 'Glutes', 'Traps', 'Forearms'],
    description: 'Lift a barbell from the floor to hip level by driving through your legs and extending your back.',
  },
  {
    name: 'Barbell Row',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats', 'Traps'],
    description: 'Hinge at the hips and row a barbell toward your lower chest.',
  },
  {
    name: 'Pull-Ups',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats', 'Forearms'],
    description: 'Hang from a bar with an overhand grip and pull your body upward until your chin clears the bar.',
  },
  {
    name: 'Lat Pulldown',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats'],
    description: 'Sit at a lat pulldown machine and pull the bar down to your upper chest.',
  },
  {
    name: 'Seated Cable Row',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats', 'Traps'],
    description: 'Sit at a cable row station and pull the handle toward your midsection.',
  },
  {
    name: 'T-Bar Row',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats', 'Traps'],
    description: 'Straddle a T-bar row apparatus and row the weight toward your chest.',
  },
  {
    name: 'Single-Arm Dumbbell Row',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats'],
    description: 'Support yourself on a bench with one hand and row a dumbbell with the other arm.',
  },
  {
    name: 'Chin-Ups',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Back',
    secondaryMuscles: ['Biceps', 'Lats', 'Forearms'],
    description: 'Hang from a bar with an underhand grip and pull your body upward.',
  },

  // ── Shoulders (8) ─────────────────────────────────────────────────────
  {
    name: 'Overhead Press',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Triceps', 'Traps'],
    description: 'Press a barbell overhead from shoulder height to full arm extension.',
  },
  {
    name: 'Lateral Raise',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Traps'],
    description: 'Raise dumbbells out to the sides until your arms are parallel with the floor.',
  },
  {
    name: 'Front Raise',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Chest'],
    description: 'Raise dumbbells in front of you to shoulder height with straight arms.',
  },
  {
    name: 'Face Pull',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Traps', 'Back'],
    description: 'Pull a rope attachment toward your face at the cable station, squeezing your rear delts.',
  },
  {
    name: 'Reverse Fly',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Traps', 'Back'],
    description: 'Bend forward and raise dumbbells out to the sides to target the rear deltoids.',
  },
  {
    name: 'Arnold Press',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Triceps'],
    description: 'Press dumbbells overhead while rotating your palms from facing you to facing forward.',
  },
  {
    name: 'Upright Row',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Traps', 'Biceps'],
    description: 'Pull a barbell straight up along your body to chin height, leading with your elbows.',
  },
  {
    name: 'Dumbbell Shoulder Press',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Shoulders',
    secondaryMuscles: ['Triceps', 'Traps'],
    description: 'Sit or stand and press dumbbells overhead from shoulder level.',
  },

  // ── Biceps (7) ────────────────────────────────────────────────────────
  {
    name: 'Barbell Curl',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Curl a barbell upward by flexing at the elbows while keeping your upper arms stationary.',
  },
  {
    name: 'Dumbbell Curl',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Curl dumbbells upward by flexing at the elbows, alternating or simultaneously.',
  },
  {
    name: 'Hammer Curl',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Curl dumbbells with a neutral (palms facing each other) grip to target the brachialis.',
  },
  {
    name: 'Preacher Curl',
    equipmentType: EquipmentType.EZ_BAR,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Rest your arms on a preacher bench and curl the bar upward for strict bicep isolation.',
  },
  {
    name: 'Incline Dumbbell Curl',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Sit on an incline bench and curl dumbbells to place a deep stretch on the biceps.',
  },
  {
    name: 'Cable Curl',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Curl a cable attachment upward to maintain constant tension on the biceps.',
  },
  {
    name: 'Concentration Curl',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Biceps',
    secondaryMuscles: ['Forearms'],
    description: 'Sit and brace your elbow against your inner thigh while curling a dumbbell for peak contraction.',
  },

  // ── Triceps (7) ───────────────────────────────────────────────────────
  {
    name: 'Tricep Pushdown',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Triceps',
    secondaryMuscles: [],
    description: 'Push a cable attachment downward by extending your elbows while keeping your upper arms fixed.',
  },
  {
    name: 'Overhead Tricep Extension',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Shoulders'],
    description: 'Hold a dumbbell overhead and lower it behind your head by bending at the elbows.',
  },
  {
    name: 'Skull Crushers',
    equipmentType: EquipmentType.EZ_BAR,
    primaryMuscle: 'Triceps',
    secondaryMuscles: [],
    description: 'Lie on a bench and lower an EZ-bar toward your forehead by bending at the elbows.',
  },
  {
    name: 'Close-Grip Bench Press',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Chest', 'Shoulders'],
    description: 'Perform a bench press with a narrow grip to shift emphasis to the triceps.',
  },
  {
    name: 'Tricep Dips',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Chest', 'Shoulders'],
    description: 'Lower and raise your body on parallel bars while keeping an upright torso to target triceps.',
  },
  {
    name: 'Diamond Push-Ups',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Triceps',
    secondaryMuscles: ['Chest', 'Shoulders'],
    description: 'Perform push-ups with your hands close together in a diamond shape beneath your chest.',
  },
  {
    name: 'Tricep Kickback',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Triceps',
    secondaryMuscles: [],
    description: 'Hinge forward and extend a dumbbell behind you by straightening your arm at the elbow.',
  },

  // ── Forearms (4) ──────────────────────────────────────────────────────
  {
    name: 'Wrist Curl',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Forearms',
    secondaryMuscles: [],
    description: 'Rest your forearms on a bench and curl a barbell upward using only your wrists.',
  },
  {
    name: 'Reverse Wrist Curl',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Forearms',
    secondaryMuscles: [],
    description: 'Rest your forearms on a bench with palms facing down and extend the barbell upward.',
  },
  {
    name: 'Reverse Barbell Curl',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Forearms',
    secondaryMuscles: ['Biceps'],
    description: 'Curl a barbell with an overhand grip to target the brachioradialis and forearm extensors.',
  },
  {
    name: 'Plate Pinch Hold',
    equipmentType: EquipmentType.OTHER,
    primaryMuscle: 'Forearms',
    secondaryMuscles: [],
    description: 'Pinch two weight plates together with your fingers and hold for time to build grip strength.',
  },

  // ── Quadriceps (7) ────────────────────────────────────────────────────
  {
    name: 'Squat',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Abs'],
    description: 'Place a barbell on your upper back and squat down until your thighs are parallel to the floor.',
  },
  {
    name: 'Front Squat',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Abs'],
    description: 'Hold a barbell across the front of your shoulders and squat down to target the quads.',
  },
  {
    name: 'Leg Press',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    description: 'Push a weighted sled away from you using your legs on a leg press machine.',
  },
  {
    name: 'Leg Extension',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: [],
    description: 'Sit in a leg extension machine and straighten your legs to isolate the quadriceps.',
  },
  {
    name: 'Bulgarian Split Squat',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    description: 'Stand in a staggered stance with your rear foot on a bench and squat down on the front leg.',
  },
  {
    name: 'Hack Squat',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes'],
    description: 'Lean back against the hack squat machine pad and squat down to target the quads.',
  },
  {
    name: 'Walking Lunges',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Quadriceps',
    secondaryMuscles: ['Glutes', 'Hamstrings'],
    description: 'Step forward into alternating lunges while holding dumbbells at your sides.',
  },

  // ── Hamstrings (6) ────────────────────────────────────────────────────
  {
    name: 'Romanian Deadlift',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Back'],
    description: 'Hinge at the hips and lower a barbell along your legs while keeping them nearly straight.',
  },
  {
    name: 'Leg Curl (Lying)',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Calves'],
    description: 'Lie face down on a leg curl machine and curl the pad toward your glutes.',
  },
  {
    name: 'Leg Curl (Seated)',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: [],
    description: 'Sit in a seated leg curl machine and curl the pad underneath you.',
  },
  {
    name: 'Nordic Curl',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Glutes'],
    description: 'Kneel with your ankles secured and slowly lower your torso forward under control.',
  },
  {
    name: 'Good Morning',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Back', 'Glutes'],
    description: 'Place a barbell on your back and hinge forward at the hips while keeping your legs nearly straight.',
  },
  {
    name: 'Dumbbell Romanian Deadlift',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Hamstrings',
    secondaryMuscles: ['Glutes', 'Back'],
    description: 'Hold dumbbells and hinge at the hips, lowering them along your legs with a slight knee bend.',
  },

  // ── Glutes (6) ────────────────────────────────────────────────────────
  {
    name: 'Hip Thrust',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Hamstrings'],
    description: 'Lean your upper back against a bench and thrust a barbell upward by extending your hips.',
  },
  {
    name: 'Glute Bridge',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Hamstrings', 'Abs'],
    description: 'Lie on your back with knees bent and drive your hips upward, squeezing your glutes at the top.',
  },
  {
    name: 'Cable Kickback',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Hamstrings'],
    description: 'Attach an ankle cuff to a cable and kick your leg straight back against the resistance.',
  },
  {
    name: 'Sumo Deadlift',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Quadriceps', 'Hamstrings', 'Back'],
    description: 'Deadlift with a wide stance and toes pointed out to increase glute and inner thigh engagement.',
  },
  {
    name: 'Step-Ups',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Quadriceps', 'Hamstrings'],
    description: 'Step onto an elevated platform one leg at a time while holding dumbbells.',
  },
  {
    name: 'Kettlebell Swing',
    equipmentType: EquipmentType.KETTLEBELL,
    primaryMuscle: 'Glutes',
    secondaryMuscles: ['Hamstrings', 'Back', 'Abs'],
    description: 'Swing a kettlebell between your legs and thrust your hips forward to propel it to chest height.',
  },

  // ── Calves (4) ────────────────────────────────────────────────────────
  {
    name: 'Calf Raise (Standing)',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Calves',
    secondaryMuscles: [],
    description: 'Stand on a raised platform and rise up onto your toes using a standing calf raise machine.',
  },
  {
    name: 'Calf Raise (Seated)',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Calves',
    secondaryMuscles: [],
    description: 'Sit in a seated calf raise machine and press upward through the balls of your feet.',
  },
  {
    name: 'Donkey Calf Raise',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Calves',
    secondaryMuscles: [],
    description: 'Bend at the hips on a donkey calf raise machine and press up through your toes.',
  },
  {
    name: 'Single-Leg Calf Raise',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Calves',
    secondaryMuscles: [],
    description: 'Hold a dumbbell and rise onto the toes of one foot on an elevated surface.',
  },

  // ── Abs (7) ───────────────────────────────────────────────────────────
  {
    name: 'Crunch',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Abs',
    secondaryMuscles: [],
    description: 'Lie on your back with knees bent and curl your upper body toward your knees.',
  },
  {
    name: 'Plank',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Abs',
    secondaryMuscles: ['Obliques', 'Shoulders'],
    description: 'Hold a rigid push-up position on your forearms, bracing your core.',
  },
  {
    name: 'Hanging Leg Raise',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Abs',
    secondaryMuscles: ['Obliques'],
    description: 'Hang from a bar and raise your legs until they are parallel to the floor or higher.',
  },
  {
    name: 'Cable Crunch',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Abs',
    secondaryMuscles: [],
    description: 'Kneel in front of a cable machine and crunch the rope attachment downward.',
  },
  {
    name: 'Ab Wheel Rollout',
    equipmentType: EquipmentType.OTHER,
    primaryMuscle: 'Abs',
    secondaryMuscles: ['Shoulders'],
    description: 'Kneel and roll an ab wheel forward, extending your body, then pull back to the start.',
  },
  {
    name: 'Dead Bug',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Abs',
    secondaryMuscles: ['Obliques'],
    description: 'Lie on your back and alternately extend opposite arm and leg while keeping your back flat.',
  },
  {
    name: 'Mountain Climbers',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Abs',
    secondaryMuscles: ['Shoulders', 'Quadriceps'],
    description: 'In a push-up position, rapidly drive your knees toward your chest in an alternating pattern.',
  },

  // ── Obliques (5) ──────────────────────────────────────────────────────
  {
    name: 'Russian Twist',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Abs'],
    description: 'Sit with your torso leaned back and rotate side to side, optionally holding a weight.',
  },
  {
    name: 'Side Plank',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Abs', 'Shoulders'],
    description: 'Support your body on one forearm and the side of one foot, keeping your hips elevated.',
  },
  {
    name: 'Woodchop (Cable)',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Abs', 'Shoulders'],
    description: 'Rotate your torso diagonally while pulling a cable from high to low or low to high.',
  },
  {
    name: 'Bicycle Crunch',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Abs'],
    description: 'Lie on your back and alternately bring each elbow to the opposite knee in a pedaling motion.',
  },
  {
    name: 'Pallof Press',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Obliques',
    secondaryMuscles: ['Abs'],
    description: 'Stand sideways to a cable machine and press the handle straight out, resisting rotation.',
  },

  // ── Traps (5) ─────────────────────────────────────────────────────────
  {
    name: 'Shrugs (Barbell)',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Traps',
    secondaryMuscles: ['Shoulders'],
    description: 'Hold a barbell at arm\'s length and shrug your shoulders straight up toward your ears.',
  },
  {
    name: 'Shrugs (Dumbbell)',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Traps',
    secondaryMuscles: ['Shoulders'],
    description: 'Hold dumbbells at your sides and shrug your shoulders straight up toward your ears.',
  },
  {
    name: "Farmer's Walk",
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Traps',
    secondaryMuscles: ['Forearms', 'Abs', 'Shoulders'],
    description: 'Hold heavy dumbbells at your sides and walk for distance or time with an upright posture.',
  },
  {
    name: 'Rack Pull',
    equipmentType: EquipmentType.BARBELL,
    primaryMuscle: 'Traps',
    secondaryMuscles: ['Back', 'Forearms'],
    description: 'Pull a barbell from an elevated rack position to lockout, targeting the upper back and traps.',
  },
  {
    name: 'Cable Shrug',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Traps',
    secondaryMuscles: ['Shoulders'],
    description: 'Stand facing a low cable pulley and shrug your shoulders upward against cable resistance.',
  },

  // ── Lats (5) ──────────────────────────────────────────────────────────
  {
    name: 'Straight-Arm Pulldown',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Lats',
    secondaryMuscles: ['Back', 'Abs'],
    description: 'Stand at a cable machine and push the bar down in an arc with straight arms to isolate the lats.',
  },
  {
    name: 'Close-Grip Lat Pulldown',
    equipmentType: EquipmentType.CABLE,
    primaryMuscle: 'Lats',
    secondaryMuscles: ['Biceps', 'Back'],
    description: 'Pull a close-grip handle down to your chest on a lat pulldown machine.',
  },
  {
    name: 'Dumbbell Pullover',
    equipmentType: EquipmentType.DUMBBELL,
    primaryMuscle: 'Lats',
    secondaryMuscles: ['Chest', 'Triceps'],
    description: 'Lie across a bench and lower a dumbbell behind your head in an arc, then pull it back over.',
  },
  {
    name: 'Inverted Row',
    equipmentType: EquipmentType.BODYWEIGHT,
    primaryMuscle: 'Lats',
    secondaryMuscles: ['Biceps', 'Back', 'Forearms'],
    description: 'Lie beneath a bar set at waist height and pull your chest up to the bar.',
  },
  {
    name: 'Machine Row',
    equipmentType: EquipmentType.MACHINE,
    primaryMuscle: 'Lats',
    secondaryMuscles: ['Biceps', 'Back'],
    description: 'Sit at a machine row station and pull the handles toward your torso.',
  },
];

// ─── Main seed function ─────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...\n');

  // 1. Upsert muscle groups
  console.log('Creating muscle groups...');
  const muscleGroupMap = new Map<string, string>();

  for (const mg of muscleGroups) {
    const result = await prisma.muscleGroup.upsert({
      where: { name: mg.name },
      update: { displayOrder: mg.displayOrder },
      create: { name: mg.name, displayOrder: mg.displayOrder },
    });
    muscleGroupMap.set(mg.name, result.id);
    console.log(`  ✓ ${mg.name} (order: ${mg.displayOrder})`);
  }

  console.log(`\n${muscleGroupMap.size} muscle groups seeded.\n`);

  // 2. Upsert exercises
  console.log('Creating exercises...');
  let count = 0;

  for (const ex of exercises) {
    const primaryId = muscleGroupMap.get(ex.primaryMuscle);
    if (!primaryId) {
      console.warn(`  ✗ Skipping "${ex.name}" – unknown primary muscle "${ex.primaryMuscle}"`);
      continue;
    }

    const secondaryIds = ex.secondaryMuscles
      .map((name) => muscleGroupMap.get(name))
      .filter((id): id is string => id !== undefined);

    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {
        description: ex.description,
        equipmentType: ex.equipmentType,
        primaryMuscleGroupId: primaryId,
        secondaryMuscleGroups: {
          set: secondaryIds.map((id) => ({ id })),
        },
      },
      create: {
        name: ex.name,
        description: ex.description,
        equipmentType: ex.equipmentType,
        primaryMuscleGroupId: primaryId,
        secondaryMuscleGroups: {
          connect: secondaryIds.map((id) => ({ id })),
        },
      },
    });

    count++;
    console.log(`  ✓ ${ex.name} (${ex.equipmentType}, primary: ${ex.primaryMuscle})`);
  }

  console.log(`\n${count} exercises seeded.`);
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
