-- CreateEnum
CREATE TYPE "ScheduledWorkoutStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "WorkoutSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "trainingDays" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "googleCalendarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledWorkout" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "programWorkoutId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "originalDate" DATE,
    "status" "ScheduledWorkoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sessionId" TEXT,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSchedule_userId_idx" ON "WorkoutSchedule"("userId");

-- CreateIndex
CREATE INDEX "WorkoutSchedule_programId_idx" ON "WorkoutSchedule"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledWorkout_sessionId_key" ON "ScheduledWorkout"("sessionId");

-- CreateIndex
CREATE INDEX "ScheduledWorkout_scheduleId_idx" ON "ScheduledWorkout"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledWorkout_scheduledDate_idx" ON "ScheduledWorkout"("scheduledDate");

-- CreateIndex
CREATE INDEX "ScheduledWorkout_status_idx" ON "ScheduledWorkout"("status");

-- CreateIndex
CREATE INDEX "ScheduledWorkout_programWorkoutId_idx" ON "ScheduledWorkout"("programWorkoutId");

-- AddForeignKey
ALTER TABLE "WorkoutSchedule" ADD CONSTRAINT "WorkoutSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSchedule" ADD CONSTRAINT "WorkoutSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkoutSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_programWorkoutId_fkey" FOREIGN KEY ("programWorkoutId") REFERENCES "ProgramWorkout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledWorkout" ADD CONSTRAINT "ScheduledWorkout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
