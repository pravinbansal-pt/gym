-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LBS');

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "weightUnit" "WeightUnit";

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultWeightUnit" "WeightUnit" NOT NULL DEFAULT 'KG',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
