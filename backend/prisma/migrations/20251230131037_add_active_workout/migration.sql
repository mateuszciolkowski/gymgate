/*
  Warnings:

  - A unique constraint covering the columns `[activeWorkoutId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeWorkoutId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_activeWorkoutId_key" ON "users"("activeWorkoutId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activeWorkoutId_fkey" FOREIGN KEY ("activeWorkoutId") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
