-- AlterTable
ALTER TABLE "exercise_user_stats" ADD COLUMN     "lastNote" TEXT;

WITH latest_completed_item_note AS (
  SELECT
    w."userId",
    wi."exerciseId",
    wi."notes",
    ROW_NUMBER() OVER (
      PARTITION BY w."userId", wi."exerciseId"
      ORDER BY w."workoutDate" DESC, wi."updatedAt" DESC
    ) AS rn
  FROM "workout_items" wi
  INNER JOIN "workouts" w ON w."id" = wi."workoutId"
  WHERE w."status" = 'COMPLETED'
)
UPDATE "exercise_user_stats" eus
SET "lastNote" = latest_completed_item_note."notes"
FROM latest_completed_item_note
WHERE latest_completed_item_note.rn = 1
  AND eus."userId" = latest_completed_item_note."userId"
  AND eus."exerciseId" = latest_completed_item_note."exerciseId";
