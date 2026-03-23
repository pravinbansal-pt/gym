-- CreateTable
CREATE TABLE "PreviousUsername" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviousUsername_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreviousUsername_username_idx" ON "PreviousUsername"("username");

-- CreateIndex
CREATE INDEX "PreviousUsername_userId_idx" ON "PreviousUsername"("userId");

-- AddForeignKey
ALTER TABLE "PreviousUsername" ADD CONSTRAINT "PreviousUsername_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
