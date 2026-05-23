import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const LOCAL_URL = process.env.DATABASE_URL_LOCAL;
if (!LOCAL_URL) {
  console.error("❌ DATABASE_URL_LOCAL is not set in .env");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: LOCAL_URL });

// ── Dane użytkownika testowego ────────────────────────────────────────────────

const TEST_USER = {
  id: "local-test-user-1",
  email: "test@gymgate.com",
  password: "Test1234!",
  firstName: "Jan",
  lastName: "Kowalski",
};

// ── Definicje dni treningowych ────────────────────────────────────────────────
// cycleOffset: 0 = najnowszy cykl (najcięższe obciążenia), 3 = najstarszy (lżejsze)

type ExerciseData = { name: string; sets: { weight: number; reps: number }[] };
type WorkoutDay = { name: string; durationSeconds: number; exercises: ExerciseData[] };

const buildDays = (cycleOffset: number): WorkoutDay[] => {
  const c = cycleOffset;
  return [
    {
      name: "Klatka piersiowa",
      durationSeconds: 3900,
      exercises: [
        {
          name: "Wyciskanie sztangi na ławce płaskiej",
          sets: [
            { weight: 60 + c * 2.5, reps: 8 },
            { weight: 65 + c * 2.5, reps: 6 },
            { weight: 70 + c * 2.5, reps: 5 },
          ],
        },
        {
          name: "Wyciskanie hantli na ławce skośnej",
          sets: [
            { weight: 22 + c * 2, reps: 10 },
            { weight: 26 + c * 2, reps: 8 },
            { weight: 26 + c * 2, reps: 7 },
          ],
        },
        {
          name: "Rozpiętki hantlami na ławce płaskiej",
          sets: [
            { weight: 14 + c, reps: 12 },
            { weight: 16 + c, reps: 10 },
            { weight: 16 + c, reps: 9 },
          ],
        },
      ],
    },
    {
      name: "Plecy",
      durationSeconds: 4200,
      exercises: [
        {
          name: "Martwy ciąg klasyczny",
          sets: [
            { weight: 80 + c * 5, reps: 5 },
            { weight: 100 + c * 5, reps: 4 },
            { weight: 110 + c * 5, reps: 3 },
          ],
        },
        {
          name: "Wiosłowanie sztangą w opadzie",
          sets: [
            { weight: 55 + c * 2.5, reps: 8 },
            { weight: 60 + c * 2.5, reps: 7 },
            { weight: 60 + c * 2.5, reps: 6 },
          ],
        },
        {
          name: "Ściąganie drążka wyciągu górnego",
          sets: [
            { weight: 48 + c * 2, reps: 10 },
            { weight: 52 + c * 2, reps: 9 },
            { weight: 52 + c * 2, reps: 8 },
          ],
        },
      ],
    },
    {
      name: "Nogi",
      durationSeconds: 4500,
      exercises: [
        {
          name: "Przysiady ze sztangą na plecach",
          sets: [
            { weight: 65 + c * 2.5, reps: 8 },
            { weight: 75 + c * 2.5, reps: 6 },
            { weight: 85 + c * 2.5, reps: 5 },
          ],
        },
        {
          name: "Wypychanie nóg na suwnicy",
          sets: [
            { weight: 110 + c * 5, reps: 12 },
            { weight: 130 + c * 5, reps: 10 },
            { weight: 130 + c * 5, reps: 9 },
          ],
        },
        {
          name: "Uginanie nóg leżąc",
          sets: [
            { weight: 28 + c * 2, reps: 12 },
            { weight: 32 + c * 2, reps: 10 },
            { weight: 32 + c * 2, reps: 9 },
          ],
        },
      ],
    },
    {
      name: "Barki i ramiona",
      durationSeconds: 3600,
      exercises: [
        {
          name: "Wyciskanie sztangi nad głowę (OHP)",
          sets: [
            { weight: 42.5 + c * 2.5, reps: 8 },
            { weight: 47.5 + c * 2.5, reps: 6 },
            { weight: 47.5 + c * 2.5, reps: 5 },
          ],
        },
        {
          name: "Uginanie sztangi łamanej",
          sets: [
            { weight: 28 + c * 2, reps: 10 },
            { weight: 32 + c * 2, reps: 8 },
            { weight: 32 + c * 2, reps: 7 },
          ],
        },
        {
          name: "Prostowanie ramion na wyciągu",
          sets: [
            { weight: 23 + c * 2, reps: 12 },
            { weight: 27 + c * 2, reps: 10 },
            { weight: 27 + c * 2, reps: 9 },
          ],
        },
      ],
    },
  ];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

type StatsEntry = {
  maxWeight: number;
  maxWeightReps: number;
  maxWeightDate: Date;
  lastWeight: number;
  lastReps: number;
  lastDate: Date;
  count: number;
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding LOCAL database...");

  await prisma.user.deleteMany({ where: { id: TEST_USER.id } });
  console.log("✓ Cleared previous test user data");

  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
  const user = await prisma.user.create({
    data: { ...TEST_USER, password: hashedPassword },
  });
  console.log(`✓ Created user: ${user.email} / ${TEST_USER.password}`);

  // Ćwiczenia globalne — creatorUserId null lub "1" (obydwa są globalne wg konwencji projektu)
  const allExercises = await prisma.exercise.findMany({
    where: { OR: [{ creatorUserId: null }, { creatorUserId: "1" }] },
  });
  if (allExercises.length === 0) {
    console.error("❌ Brak globalnych ćwiczeń. Uruchom najpierw: DB_ENV=local npm run seed");
    process.exit(1);
  }
  const exerciseMap = new Map(allExercises.map((e) => [e.name, e.id]));
  console.log(`✓ Loaded ${exerciseMap.size} global exercises`);

  // 16 treningów: 4 cykle × 4 typy, co ~6 dni wstecz (od najnowszego)
  // Iteracja: i = 15 (najnowszy) → i = 0 (najstarszy)
  const TOTAL = 16;
  const statsMap = new Map<string, StatsEntry>();

  for (let i = TOTAL - 1; i >= 0; i--) {
    // cycleOffset: i=15 → 3 (najnowszy cykl, najcięższe), i=0 → 0 (najstarszy)
    const cycleOffset = Math.floor(i / 4);
    const dayType = buildDays(cycleOffset)[i % 4];
    // Daty: i=15 → 3 dni temu, i=0 → 93 dni temu
    const workoutDate = daysAgo((TOTAL - 1 - i) * 6 + 3);

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        workoutName: dayType.name,
        status: "COMPLETED",
        durationSeconds: dayType.durationSeconds,
        workoutDate,
      },
    });

    for (let exIdx = 0; exIdx < dayType.exercises.length; exIdx++) {
      const ex = dayType.exercises[exIdx];
      const exerciseId = exerciseMap.get(ex.name);
      if (!exerciseId) {
        console.warn(`  ⚠ Exercise not found: "${ex.name}"`);
        continue;
      }

      const item = await prisma.workoutItem.create({
        data: { workoutId: workout.id, exerciseId, orderInWorkout: exIdx + 1 },
      });

      await prisma.workoutSet.createMany({
        data: ex.sets.map((s, idx) => ({
          itemId: item.id,
          setNumber: idx + 1,
          weight: s.weight,
          repetitions: s.reps,
        })),
      });

      // Akumuluj statystyki: iterujemy najnowszy → najstarszy
      // lastWeight/lastReps ustawiamy tylko przy pierwszym napotkaniu (= najnowszy trening)
      const maxSet = ex.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
      const key = `${user.id}:${exerciseId}`;
      const prev = statsMap.get(key);

      if (!prev) {
        // Pierwsze napotkanie = najnowszy trening
        statsMap.set(key, {
          maxWeight: maxSet.weight,
          maxWeightReps: maxSet.reps,
          maxWeightDate: workoutDate,
          lastWeight: maxSet.weight,
          lastReps: maxSet.reps,
          lastDate: workoutDate,
          count: 1,
        });
      } else {
        // Starszy trening — aktualizuj tylko max jeśli większy; last* zostaje z najnowszego
        const newIsMax = maxSet.weight > prev.maxWeight;
        statsMap.set(key, {
          maxWeight: newIsMax ? maxSet.weight : prev.maxWeight,
          maxWeightReps: newIsMax ? maxSet.reps : prev.maxWeightReps,
          maxWeightDate: newIsMax ? workoutDate : prev.maxWeightDate,
          lastWeight: prev.lastWeight,
          lastReps: prev.lastReps,
          lastDate: prev.lastDate,
          count: prev.count + 1,
        });
      }
    }
  }

  console.log(`✓ Created ${TOTAL} completed workouts`);

  // Zapisz statystyki
  for (const [key, s] of statsMap) {
    const [userId, exerciseId] = key.split(":");
    await prisma.exerciseUserStats.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: {
        userId,
        exerciseId,
        maxWeight: s.maxWeight,
        maxWeightReps: s.maxWeightReps,
        maxWeightDate: s.maxWeightDate,
        lastWeight: s.lastWeight,
        lastReps: s.lastReps,
        lastWorkoutDate: s.lastDate,
        totalWorkouts: s.count,
      },
      update: {
        maxWeight: s.maxWeight,
        maxWeightReps: s.maxWeightReps,
        maxWeightDate: s.maxWeightDate,
        lastWeight: s.lastWeight,
        lastReps: s.lastReps,
        lastWorkoutDate: s.lastDate,
        totalWorkouts: s.count,
      },
    });
  }
  console.log(`✓ Built stats for ${statsMap.size} exercise+user pairs`);

  // Aktywny trening DRAFT
  const benchId = exerciseMap.get("Wyciskanie sztangi na ławce płaskiej");
  const inclineId = exerciseMap.get("Wyciskanie hantli na ławce skośnej");
  if (benchId && inclineId) {
    const draft = await prisma.workout.create({
      data: {
        userId: user.id,
        workoutName: "Klatka piersiowa",
        status: "DRAFT",
        items: {
          create: [
            { exerciseId: benchId, orderInWorkout: 1 },
            { exerciseId: inclineId, orderInWorkout: 2 },
          ],
        },
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { activeWorkoutId: draft.id },
    });
    console.log("✓ Created active DRAFT workout (Klatka piersiowa)");
  }

  console.log("\n✅ Local seed complete!");
  console.log(`   Email:    ${TEST_USER.email}`);
  console.log(`   Hasło:    ${TEST_USER.password}`);
  console.log(`   Treningi: ${TOTAL} zakończone + 1 aktywny DRAFT`);
  console.log(`   Stats:    ${statsMap.size} ćwiczeń z historią`);
}

main()
  .catch((e) => {
    console.error("❌ Local seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
