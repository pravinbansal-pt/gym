-- CreateEnum
CREATE TYPE "DistanceUnit" AS ENUM ('KM', 'MILES');

-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'CARDIO');

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "defaultDistanceUnit" "DistanceUnit" NOT NULL DEFAULT 'KM';

-- AlterTable
ALTER TABLE "ProgramWorkout" ADD COLUMN     "cardioNotes" TEXT,
ADD COLUMN     "targetDistanceMeters" DOUBLE PRECISION,
ADD COLUMN     "targetDurationSeconds" INTEGER,
ADD COLUMN     "targetPaceSecondsPerKm" DOUBLE PRECISION,
ADD COLUMN     "workoutType" "WorkoutType" NOT NULL DEFAULT 'STRENGTH';

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "stravaAthleteId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioActivity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activityType" TEXT NOT NULL DEFAULT 'Run',
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "movingTimeSeconds" INTEGER NOT NULL,
    "elapsedTimeSeconds" INTEGER NOT NULL,
    "averagePaceSecsPerKm" DOUBLE PRECISION,
    "averageSpeedMps" DOUBLE PRECISION,
    "maxSpeedMps" DOUBLE PRECISION,
    "elevationGainMeters" DOUBLE PRECISION,
    "elevationLossMeters" DOUBLE PRECISION,
    "averageHeartrate" DOUBLE PRECISION,
    "maxHeartrate" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "calories" DOUBLE PRECISION,
    "splits" JSONB,
    "laps" JSONB,
    "bestEfforts" JSONB,
    "summaryPolyline" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "stravaActivityId" BIGINT,
    "programWorkoutId" TEXT,
    "programId" TEXT,
    "activityDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardioActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardioActivity_stravaActivityId_key" ON "CardioActivity"("stravaActivityId");

-- CreateIndex
CREATE INDEX "CardioActivity_activityDate_idx" ON "CardioActivity"("activityDate");

-- CreateIndex
CREATE INDEX "CardioActivity_stravaActivityId_idx" ON "CardioActivity"("stravaActivityId");

-- CreateIndex
CREATE INDEX "CardioActivity_programWorkoutId_idx" ON "CardioActivity"("programWorkoutId");

-- CreateIndex
CREATE INDEX "CardioActivity_source_idx" ON "CardioActivity"("source");

-- AddForeignKey
ALTER TABLE "CardioActivity" ADD CONSTRAINT "CardioActivity_programWorkoutId_fkey" FOREIGN KEY ("programWorkoutId") REFERENCES "ProgramWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioActivity" ADD CONSTRAINT "CardioActivity_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
