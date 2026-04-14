-- AlterTable
ALTER TABLE "workout_items" ADD COLUMN "previousNote" TEXT;

-- CreateTable
CREATE TABLE "exercise_pending_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pending_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercise_pending_notes_userId_exerciseId_key" ON "exercise_pending_notes"("userId", "exerciseId");

-- AddForeignKey
ALTER TABLE "exercise_pending_notes" ADD CONSTRAINT "exercise_pending_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_pending_notes" ADD CONSTRAINT "exercise_pending_notes_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
