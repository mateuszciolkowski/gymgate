-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "skippedPlanExerciseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workoutPlanId" TEXT;

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorUserId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderInPlan" INTEGER NOT NULL,

    CONSTRAINT "workout_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_plans_creatorUserId_name_key" ON "workout_plans"("creatorUserId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_items_planId_exerciseId_key" ON "workout_plan_items"("planId", "exerciseId");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "workout_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_items" ADD CONSTRAINT "workout_plan_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_items" ADD CONSTRAINT "workout_plan_items_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
