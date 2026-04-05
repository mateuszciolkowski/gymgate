BEGIN;

-- --------------------------------------------
-- power-user-seed.sql
-- One user with a large training history, custom exercises and stats.
-- Compatible with GymGate Prisma schema mapped tables.
-- --------------------------------------------

-- Fixed user identity
-- email: power.user@gymgate.local
-- password (plain): PowerUser123!
-- bcrypt hash generated with cost 10
WITH upsert_user AS (
  INSERT INTO users (id, email, password, "firstName", "lastName", phone, "activeWorkoutId", "updatedAt")
  VALUES (
    '11111111-1111-4111-8111-111111111111',
    'power.user@gymgate.local',
    '$2b$10$mhTSE083yy8xdHLHu3D3JeujJrbTM0C4Dn4ylQbKVKGX66wga/d4W',
    'Power',
    'User',
    '+48500111222',
    NULL,
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    "firstName" = EXCLUDED."firstName",
    "lastName" = EXCLUDED."lastName",
    phone = EXCLUDED.phone,
    "activeWorkoutId" = NULL,
    "updatedAt" = NOW()
  RETURNING id
)
SELECT 1;

-- Ensure stable UUID id for the seeded user even when account existed earlier
UPDATE users
SET id = '11111111-1111-4111-8111-111111111111'
WHERE email = 'power.user@gymgate.local'
  AND id <> '11111111-1111-4111-8111-111111111111';

-- Clear previous sample data for this user only
UPDATE users
SET "activeWorkoutId" = NULL, "updatedAt" = NOW()
WHERE id = '11111111-1111-4111-8111-111111111111';

DELETE FROM exercise_user_stats
WHERE "userId" = '11111111-1111-4111-8111-111111111111';

DELETE FROM workouts
WHERE "userId" = '11111111-1111-4111-8111-111111111111';

DELETE FROM exercises
WHERE "creatorUserId" = '11111111-1111-4111-8111-111111111111';

-- Custom exercises (owned by seeded user)
INSERT INTO exercises (id, name, "muscleGroups", description, "creatorUserId", "createdAt", "updatedAt")
VALUES
  ('21111111-1111-4111-8111-111111111111', 'Floor press z pauza', ARRAY['CHEST','TRICEPS']::"MuscleGroup"[], 'Wyciskanie lezac na podlodze z 1s pauza.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'Przysiad tempo 3-1-1', ARRAY['QUADS','GLUTES','HAMSTRINGS']::"MuscleGroup"[], 'Przysiad z wolna faza ekscentryczna.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('23333333-3333-4333-8333-333333333333', 'Martwy ciag z deficytu', ARRAY['BACK','GLUTES','HAMSTRINGS','LOWER_BACK']::"MuscleGroup"[], 'Ciag wykonany ze stopami na podwyzszeniu.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('24444444-4444-4444-8444-444444444444', 'Wioslowanie sztanga Pendlay', ARRAY['BACK','LATS','MIDDLE_BACK']::"MuscleGroup"[], 'Kazde powtorzenie startuje z ziemi.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('25555555-5555-4555-8555-555555555555', 'OHP seated strict', ARRAY['SHOULDERS','TRICEPS']::"MuscleGroup"[], 'Wyciskanie nad glowe bez wybicia nogami.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('26666666-6666-4666-8666-666666666666', 'Bulgarian split squat heavy', ARRAY['QUADS','GLUTES']::"MuscleGroup"[], 'Ciezkie bulgary z hantlami.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('27777777-7777-4777-8777-777777777777', 'Romanian deadlift pause', ARRAY['HAMSTRINGS','GLUTES','LOWER_BACK']::"MuscleGroup"[], 'RDL z zatrzymaniem pod kolanem.', '11111111-1111-4111-8111-111111111111', NOW(), NOW()),
  ('28888888-8888-4888-8888-888888888888', 'Incline dumbbell press neutral', ARRAY['CHEST','SHOULDERS','TRICEPS']::"MuscleGroup"[], 'Wyciskanie hantli na skosie chwytem neutralnym.', '11111111-1111-4111-8111-111111111111', NOW(), NOW());

-- Generate 30 completed workouts with sets (each workout gets 1 exercise in rotation)
WITH
generated_workouts AS (
  INSERT INTO workouts (id, "userId", "workoutDate", status, "workoutName", "gymName", location, "workoutNotes", "createdAt", "updatedAt")
  SELECT
    ('30000000-0000-4000-8000-' || LPAD(g::text, 12, '0')) AS id,
    '11111111-1111-4111-8111-111111111111' AS "userId",
    NOW() - ((31 - g) * INTERVAL '3 day') AS "workoutDate",
    'COMPLETED'::"WorkoutStatus" AS status,
    'Plan treningowy #' || g AS "workoutName",
    CASE WHEN g % 3 = 0 THEN 'GymGate Box' ELSE 'City Gym' END AS "gymName",
    CASE WHEN g % 2 = 0 THEN 'Warszawa' ELSE 'Krakow' END AS location,
    CASE WHEN g % 5 = 0 THEN 'Mocny trening, dobry progres.' ELSE NULL END AS "workoutNotes",
    NOW(),
    NOW()
  FROM generate_series(1, 30) AS g
  RETURNING id, "workoutDate"
),
indexed_workouts AS (
  SELECT
    gw.id AS workout_id,
    gw."workoutDate",
    ROW_NUMBER() OVER (ORDER BY gw."workoutDate") AS workout_idx
  FROM generated_workouts gw
),
exercise_rotation AS (
  SELECT * FROM (
    VALUES
      (1, '21111111-1111-4111-8111-111111111111', 70.0),
      (2, '22222222-2222-4222-8222-222222222222', 95.0),
      (3, '23333333-3333-4333-8333-333333333333', 125.0),
      (4, '24444444-4444-4444-8444-444444444444', 78.0),
      (5, '25555555-5555-4555-8555-555555555555', 48.0),
      (6, '26666666-6666-4666-8666-666666666666', 34.0),
      (7, '27777777-7777-4777-8777-777777777777', 102.0),
      (8, '28888888-8888-4888-8888-888888888888', 52.0)
  ) AS t(idx, exercise_id, base_weight)
),
inserted_items AS (
  INSERT INTO workout_items (id, "workoutId", "exerciseId", "orderInWorkout", notes, "createdAt", "updatedAt")
  SELECT
    ('40000000-0000-4000-8000-' || LPAD(iw.workout_idx::text, 12, '0')) AS id,
    iw.workout_id AS "workoutId",
    er.exercise_id AS "exerciseId",
    1 AS "orderInWorkout",
    'Sesja glowna pod progres.',
    NOW(),
    NOW()
  FROM indexed_workouts iw
  JOIN exercise_rotation er ON er.idx = (((iw.workout_idx - 1) % 8) + 1)
  RETURNING id, "workoutId", "exerciseId"
)
INSERT INTO workout_sets (id, "itemId", "setNumber", weight, repetitions, "createdAt", "updatedAt")
SELECT
  ('50000000-0000-4000-8000-' || LPAD(((ROW_NUMBER() OVER (ORDER BY ii.id)) * 10 + sn)::text, 12, '0')) AS id,
  ii.id AS "itemId",
  sn AS "setNumber",
  ROUND((er.base_weight + (sn * 1.5) + (iw.workout_idx * 0.6))::numeric, 2) AS weight,
  (10 - sn) AS repetitions,
  NOW(),
  NOW()
FROM inserted_items ii
JOIN indexed_workouts iw ON iw.workout_id::text = ii."workoutId"::text
JOIN exercise_rotation er ON er.exercise_id::text = ii."exerciseId"::text
CROSS JOIN generate_series(1, 3) AS sn;

-- Ensure each custom exercise has at least one dedicated completed workout with sets
WITH
custom_exercises AS (
  SELECT
    e.id AS exercise_id,
    ROW_NUMBER() OVER (ORDER BY e.id) AS rn
  FROM exercises e
  WHERE e."creatorUserId" = '11111111-1111-4111-8111-111111111111'
),
coverage_base AS (
  SELECT * FROM (
    VALUES
      ('21111111-1111-4111-8111-111111111111', 70.0),
      ('22222222-2222-4222-8222-222222222222', 95.0),
      ('23333333-3333-4333-8333-333333333333', 125.0),
      ('24444444-4444-4444-8444-444444444444', 78.0),
      ('25555555-5555-4555-8555-555555555555', 48.0),
      ('26666666-6666-4666-8666-666666666666', 34.0),
      ('27777777-7777-4777-8777-777777777777', 102.0),
      ('28888888-8888-4888-8888-888888888888', 52.0)
  ) AS t(exercise_id, base_weight)
),
coverage_workouts AS (
  INSERT INTO workouts (id, "userId", "workoutDate", status, "workoutName", "gymName", location, "workoutNotes", "createdAt", "updatedAt")
  SELECT
    ('31000000-0000-4000-8000-' || LPAD(ce.rn::text, 12, '0')) AS id,
    '11111111-1111-4111-8111-111111111111' AS "userId",
    NOW() - (ce.rn * INTERVAL '2 day') AS "workoutDate",
    'COMPLETED'::"WorkoutStatus",
    'Sesja dedykowana #' || ce.rn,
    'GymGate Box',
    'Warszawa',
    'Dedykowana sesja dla pokrycia statystyk cwiczenia.',
    NOW(),
    NOW()
  FROM custom_exercises ce
  RETURNING id
),
coverage_items AS (
  INSERT INTO workout_items (id, "workoutId", "exerciseId", "orderInWorkout", notes, "createdAt", "updatedAt")
  SELECT
    ('41000000-0000-4000-8000-' || LPAD(ce.rn::text, 12, '0')) AS id,
    cw.id AS "workoutId",
    ce.exercise_id AS "exerciseId",
    1 AS "orderInWorkout",
    'Sesja dedykowana pod statystyki.',
    NOW(),
    NOW()
  FROM custom_exercises ce
  JOIN coverage_workouts cw
    ON cw.id::text = ('31000000-0000-4000-8000-' || LPAD(ce.rn::text, 12, '0'))::text
  RETURNING id, "exerciseId"
)
INSERT INTO workout_sets (id, "itemId", "setNumber", weight, repetitions, "createdAt", "updatedAt")
SELECT
  ('51000000-0000-4000-8000-' || LPAD(((ROW_NUMBER() OVER (ORDER BY ci.id)) * 10 + sn)::text, 12, '0')) AS id,
  ci.id AS "itemId",
  sn AS "setNumber",
  ROUND((COALESCE(cb.base_weight, 50.0) + (sn * 2.0))::numeric, 2) AS weight,
  (10 - sn) AS repetitions,
  NOW(),
  NOW()
FROM coverage_items ci
LEFT JOIN coverage_base cb ON cb.exercise_id::text = ci."exerciseId"::text
CROSS JOIN generate_series(1, 3) AS sn;

-- Remove workouts without any sets for this user (safety cleanup)
DELETE FROM workouts w
WHERE w."userId" = '11111111-1111-4111-8111-111111111111'
  AND NOT EXISTS (
    SELECT 1
    FROM workout_items wi
    JOIN workout_sets ws ON ws."itemId" = wi.id
    WHERE wi."workoutId" = w.id
  );

-- Rebuild ExerciseUserStats from completed workouts for this user
DELETE FROM exercise_user_stats
WHERE "userId" = '11111111-1111-4111-8111-111111111111';

WITH
heaviest_per_workout_exercise AS (
  SELECT
    wi."exerciseId" AS exercise_id,
    w."workoutDate" AS workout_date,
    ws.weight,
    ws.repetitions,
    ROW_NUMBER() OVER (
      PARTITION BY w.id, wi."exerciseId"
      ORDER BY ws.weight DESC, ws.repetitions DESC
    ) AS rn
  FROM workouts w
  JOIN workout_items wi ON wi."workoutId" = w.id
  JOIN workout_sets ws ON ws."itemId" = wi.id
  WHERE w."userId" = '11111111-1111-4111-8111-111111111111'
    AND w.status = 'COMPLETED'::"WorkoutStatus"
),
best_sets AS (
  SELECT
    exercise_id,
    workout_date,
    weight,
    repetitions
  FROM heaviest_per_workout_exercise
  WHERE rn = 1
),
aggregated AS (
  SELECT
    exercise_id,
    MAX(weight) AS max_weight,
    (ARRAY_AGG(repetitions ORDER BY weight DESC, workout_date DESC))[1] AS max_weight_reps,
    (ARRAY_AGG(workout_date ORDER BY weight DESC, workout_date DESC))[1] AS max_weight_date,
    (ARRAY_AGG(weight ORDER BY workout_date DESC))[1] AS last_weight,
    (ARRAY_AGG(repetitions ORDER BY workout_date DESC))[1] AS last_reps,
    MAX(workout_date) AS last_workout_date,
    COUNT(*)::int AS total_workouts
  FROM best_sets
  GROUP BY exercise_id
),
numbered AS (
  SELECT
    exercise_id,
    max_weight,
    max_weight_reps,
    max_weight_date,
    last_weight,
    last_reps,
    last_workout_date,
    total_workouts,
    ROW_NUMBER() OVER (ORDER BY exercise_id) AS rn
  FROM aggregated
)
INSERT INTO exercise_user_stats (
  id,
  "userId",
  "exerciseId",
  "maxWeight",
  "maxWeightReps",
  "maxWeightDate",
  "lastWeight",
  "lastReps",
  "lastWorkoutDate",
  "totalWorkouts",
  "createdAt",
  "updatedAt"
)
SELECT
  ('60000000-0000-4000-8000-' || LPAD(rn::text, 12, '0')) AS id,
  '11111111-1111-4111-8111-111111111111' AS "userId",
  exercise_id AS "exerciseId",
  max_weight::numeric(6,2) AS "maxWeight",
  max_weight_reps::int AS "maxWeightReps",
  max_weight_date AS "maxWeightDate",
  last_weight::numeric(6,2) AS "lastWeight",
  last_reps::int AS "lastReps",
  last_workout_date AS "lastWorkoutDate",
  total_workouts AS "totalWorkouts",
  NOW(),
  NOW()
FROM numbered;

UPDATE users
SET "activeWorkoutId" = NULL, "updatedAt" = NOW()
WHERE id = '11111111-1111-4111-8111-111111111111';

COMMIT;
