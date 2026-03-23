-- CreateTable
CREATE TABLE "ProgramWorkoutSet" (
    "id" TEXT NOT NULL,
    "programWorkoutExerciseId" TEXT NOT NULL,
    "setType" "SetType" NOT NULL DEFAULT 'WORKING',
    "targetWeight" DOUBLE PRECISION,
    "targetReps" TEXT,
    "restSeconds" INTEGER NOT NULL DEFAULT 90,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "ProgramWorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramWorkoutSet_programWorkoutExerciseId_idx" ON "ProgramWorkoutSet"("programWorkoutExerciseId");

-- AddForeignKey
ALTER TABLE "ProgramWorkoutSet" ADD CONSTRAINT "ProgramWorkoutSet_programWorkoutExerciseId_fkey" FOREIGN KEY ("programWorkoutExerciseId") REFERENCES "ProgramWorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
