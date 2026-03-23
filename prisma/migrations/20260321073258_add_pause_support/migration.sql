-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "totalPausedSeconds" INTEGER NOT NULL DEFAULT 0;
