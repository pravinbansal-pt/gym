-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'SMITH_MACHINE', 'EZ_BAR', 'KETTLEBELL', 'RESISTANCE_BAND', 'OTHER');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('PERIODIZED', 'SIMPLE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('WARM_UP', 'WORKING');

-- CreateTable
CREATE TABLE "MuscleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MuscleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "equipmentType" "EquipmentType" NOT NULL DEFAULT 'OTHER',
    "imageUrl" TEXT,
    "primaryMuscleGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProgramType" NOT NULL DEFAULT 'SIMPLE',
    "defaultRestSeconds" INTEGER NOT NULL DEFAULT 90,
    "defaultWarmUpSets" INTEGER NOT NULL DEFAULT 1,
    "defaultWorkingSets" INTEGER NOT NULL DEFAULT 3,
    "defaultWarmUpPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramPhase" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "durationWeeks" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "ProgramPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramWorkout" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "phaseId" TEXT,
    "name" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "ProgramWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramWorkoutExercise" (
    "id" TEXT NOT NULL,
    "programWorkoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "warmUpSets" INTEGER,
    "workingSets" INTEGER,
    "warmUpPercent" DOUBLE PRECISION,
    "targetReps" TEXT,
    "restSeconds" INTEGER,

    CONSTRAINT "ProgramWorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "programId" TEXT,
    "programWorkoutId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSessionExercise" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "WorkoutSessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "setType" "SetType" NOT NULL DEFAULT 'WORKING',
    "weight" DOUBLE PRECISION,
    "reps" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseNote" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sessionExerciseId" TEXT,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExerciseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "estimated1RM" DOUBLE PRECISION NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workoutSessionId" TEXT,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SecondaryMuscles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SecondaryMuscles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "MuscleGroup_name_key" ON "MuscleGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE INDEX "Exercise_primaryMuscleGroupId_idx" ON "Exercise"("primaryMuscleGroupId");

-- CreateIndex
CREATE INDEX "ProgramPhase_programId_idx" ON "ProgramPhase"("programId");

-- CreateIndex
CREATE INDEX "ProgramWorkout_programId_idx" ON "ProgramWorkout"("programId");

-- CreateIndex
CREATE INDEX "ProgramWorkout_phaseId_idx" ON "ProgramWorkout"("phaseId");

-- CreateIndex
CREATE INDEX "ProgramWorkoutExercise_programWorkoutId_idx" ON "ProgramWorkoutExercise"("programWorkoutId");

-- CreateIndex
CREATE INDEX "ProgramWorkoutExercise_exerciseId_idx" ON "ProgramWorkoutExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSession_programId_idx" ON "WorkoutSession"("programId");

-- CreateIndex
CREATE INDEX "WorkoutSession_programWorkoutId_idx" ON "WorkoutSession"("programWorkoutId");

-- CreateIndex
CREATE INDEX "WorkoutSession_startedAt_idx" ON "WorkoutSession"("startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_status_idx" ON "WorkoutSession"("status");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_workoutSessionId_idx" ON "WorkoutSessionExercise"("workoutSessionId");

-- CreateIndex
CREATE INDEX "WorkoutSessionExercise_exerciseId_idx" ON "WorkoutSessionExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSet_sessionExerciseId_idx" ON "WorkoutSet"("sessionExerciseId");

-- CreateIndex
CREATE INDEX "ExerciseNote_exerciseId_idx" ON "ExerciseNote"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseNote_sessionExerciseId_idx" ON "ExerciseNote"("sessionExerciseId");

-- CreateIndex
CREATE INDEX "PersonalRecord_exerciseId_idx" ON "PersonalRecord"("exerciseId");

-- CreateIndex
CREATE INDEX "PersonalRecord_achievedAt_idx" ON "PersonalRecord"("achievedAt");

-- CreateIndex
CREATE INDEX "_SecondaryMuscles_B_index" ON "_SecondaryMuscles"("B");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_primaryMuscleGroupId_fkey" FOREIGN KEY ("primaryMuscleGroupId") REFERENCES "MuscleGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramPhase" ADD CONSTRAINT "ProgramPhase_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkout" ADD CONSTRAINT "ProgramWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkout" ADD CONSTRAINT "ProgramWorkout_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProgramPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkoutExercise" ADD CONSTRAINT "ProgramWorkoutExercise_programWorkoutId_fkey" FOREIGN KEY ("programWorkoutId") REFERENCES "ProgramWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkoutExercise" ADD CONSTRAINT "ProgramWorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_programWorkoutId_fkey" FOREIGN KEY ("programWorkoutId") REFERENCES "ProgramWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSessionExercise" ADD CONSTRAINT "WorkoutSessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "WorkoutSessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseNote" ADD CONSTRAINT "ExerciseNote_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "WorkoutSessionExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SecondaryMuscles" ADD CONSTRAINT "_SecondaryMuscles_A_fkey" FOREIGN KEY ("A") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SecondaryMuscles" ADD CONSTRAINT "_SecondaryMuscles_B_fkey" FOREIGN KEY ("B") REFERENCES "MuscleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
