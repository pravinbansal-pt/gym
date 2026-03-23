-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN "exerciseDbId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_exerciseDbId_key" ON "Exercise"("exerciseDbId");
