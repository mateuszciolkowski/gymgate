import prisma from "../src/config/database.js";
import { BUILT_IN_USER_ID } from "../src/config/constants.js";

export async function seedWorkoutPlans() {
  console.log("🌱 Seeding built-in workout plans...");

  // Ensure global exercises exist
  const globalExercises = [
    {
      name: "Prostowanie ramienia na wyciągu jednorącz",
      muscleGroups: ["TRICEPS"],
      description: "Jednostronne prostowanie ramienia na wyciągu górnym — izolacja tricepsa",
    },
    {
      name: "Kickback na wyciągu",
      muscleGroups: ["GLUTES"],
      description: "Izolacja pośladków — odrzut nogi w tył na wyciągu dolnym",
    },
    {
      name: "Step up",
      muscleGroups: ["QUADS", "GLUTES"],
      description: "Wejście na podwyższenie — jednostronne ćwiczenie na nogi i pośladki",
    },
  ];
  for (const ex of globalExercises) {
    const exists = await prisma.exercise.findFirst({ where: { name: ex.name, creatorUserId: null } });
    if (!exists) {
      await prisma.exercise.create({ data: { ...ex, creatorUserId: null } });
      console.log("✓ Created global exercise:", ex.name);
    }
  }

  // Add description to "Podciągnie na maszynie" if missing
  await prisma.exercise.updateMany({
    where: { name: "Podciągnie na maszynie", description: null },
    data: { description: "Podciąganie wspomagane na maszynie — ułatwiona wersja podciągania na drążku" },
  });

  // Merge duplicate Glute Bridge: migrate workout_items from user copy to seed copy, then delete user copy
  const seedGlute = await prisma.exercise.findFirst({ where: { name: "Glute bridge", creatorUserId: "1" } });
  const userGlute = await prisma.exercise.findFirst({ where: { name: "Glute Bridge", creatorUserId: { not: "1" } } });
  if (seedGlute && userGlute) {
    await prisma.workoutItem.updateMany({
      where: { exerciseId: userGlute.id },
      data: { exerciseId: seedGlute.id },
    });
    await prisma.exercise.delete({ where: { id: userGlute.id } });
    console.log("✓ Merged duplicate Glute Bridge");
  }

  // Rename existing v1 plans (add " - v1" suffix if not already present)
  const v1PlanNames = [
    "FBW Mężczyzna - Trening A",
    "FBW Mężczyzna - Trening B",
    "FBW Mężczyzna - Trening C",
    "FBW Kobieta - Trening A",
    "FBW Kobieta - Trening B",
  ];
  for (const name of v1PlanNames) {
    const plan = await prisma.workoutPlan.findFirst({ where: { name, creatorUserId: null } });
    if (plan) {
      await prisma.workoutPlan.update({ where: { id: plan.id }, data: { name: `${name} - v1` } });
      console.log(`✓ Renamed to v1: ${name}`);
    }
  }

  const planDefinitions: { name: string; exerciseNames: string[] }[] = [
    {
      name: "FBW Mężczyzna - Trening A - v1",
      exerciseNames: [
        "Podciąganie na drążku nachwytem",
        "Przysiady bułgarskie",
        "Glute bridge",
        "Wyciskanie hantli na ławce skośnej",
        "Uginanie na modlitewniku",
        "Wyciskanie francuskie hantlem",
      ],
    },
    {
      name: "FBW Mężczyzna - Trening B - v1",
      exerciseNames: [
        "Wyciskanie sztangi nad głowę (OHP)",
        "Wiosłowanie focze hantlami na ławce skośnej",
        "Dipy na poręczach",
        "Uginanie na ławce skośnej",
        "Wspięcia na palce siedząc",
        "Wznosy tułowia na ławce rzymskiej",
        "Rozpiętki na maszynie",
      ],
    },
    {
      name: "FBW Mężczyzna - Trening C - v1",
      exerciseNames: [
        "Wyciskanie sztangi na ławce płaskiej",
        "Martwy ciąg klasyczny",
        "Wypychanie nóg na suwnicy",
        "Prostowanie ramienia na wyciągu jednorącz",
        "Uginanie sztangi łamanej",
        "Uginanie hantli młotkowe",
        "Odwodzenie linki wyciągu jednorącz na tył barku",
      ],
    },
    {
      name: "FBW Kobieta - Trening A - v1",
      exerciseNames: [
        "Przysiady bułgarskie",
        "Glute bridge",
        "Ściąganie drążka wyciągu górnego",
        "Wznosy tułowia na ławce rzymskiej",
        "Uginanie hantli młotkowe",
        "Francuskie wyciskanie hantli nad głowę",
        "Unoszenie hantli bokiem",
      ],
    },
    {
      name: "FBW Kobieta - Trening B - v1",
      exerciseNames: [
        "Martwy ciąg rumuński",
        "Przysiad sumo",
        "Wiosłowanie na wyciągu dolnym",
        "Odwodzenie nogi na maszynie",
        "Wspięcia na palce siedząc",
        "Prostowanie ramion na wyciągu z liną",
      ],
    },
    {
      name: "FBW Kobieta v2 - Trening A",
      exerciseNames: [
        "Przysiady bułgarskie",
        "Hip thrust ze sztangą",
        "Podciągnie na maszynie",
        "Wyciskanie hantli na ławce skośnej",
        "Prostowanie ramion na wyciągu z liną",
        "Uginanie hantli młotkowe",
        "Face pulls",
      ],
    },
    {
      name: "FBW Kobieta v2 - Trening B",
      exerciseNames: [
        "Przysiad sumo",
        "Wypychanie nóg na suwnicy",
        "Kickback na wyciągu",
        "Ściąganie drążka wyciągu górnego",
        "Wznosy tułowia na ławce rzymskiej",
        "Francuskie wyciskanie hantli nad głowę",
        "Wypychanie łydek na suwnicy",
      ],
    },
    {
      name: "FBW Kobieta v2 - Trening C",
      exerciseNames: [
        "Martwy ciąg rumuński",
        "Step up",
        "Wiosłowanie hantlem",
        "Prostowanie nóg na maszynie",
        "Wyciskanie hantli nad głowę",
        "Uginanie na modlitewniku",
      ],
    },
    {
      name: "FBW Mężczyzna v2 - Trening A",
      exerciseNames: [
        "Przysiady bułgarskie",
        "Hip thrust ze sztangą",
        "Wyciskanie hantli na ławce skośnej",
        "Podciąganie na drążku nachwytem",
        "Francuskie wyciskanie hantli nad głowę",
        "Bayesian curl",
        "Face pulls",
      ],
    },
    {
      name: "FBW Mężczyzna v2 - Trening B",
      exerciseNames: [
        "Martwy ciąg rumuński",
        "Wypychanie nóg na suwnicy",
        "Wiosłowanie T-bar",
        "Wyciskanie hantli nad głowę",
        "Uginanie hantli siedząc",
        "Rozpiętki na maszynie",
        "Rozpiętki odwrotne na maszynie",
        "Wypychanie łydek na suwnicy",
      ],
    },
    {
      name: "FBW Mężczyzna v2 - Trening C",
      exerciseNames: [
        "Wyciskanie sztangi na ławce skośnej",
        "Ściąganie drążka wyciągu górnego",
        "Unoszenie hantli bokiem",
        "Prostowanie nóg na maszynie",
        "Prostowanie ramienia na wyciągu jednorącz",
        "Uginanie hantli młotkowe",
      ],
    },
  ];

  const allNames = Array.from(
    new Set(planDefinitions.flatMap((p) => p.exerciseNames)),
  );
  const dbExercises = await prisma.exercise.findMany({
    where: { name: { in: allNames } },
    select: { id: true, name: true, creatorUserId: true },
  });

  const byName = new Map<string, string>();
  for (const ex of dbExercises) {
    if (!byName.has(ex.name) || ex.creatorUserId === null) {
      byName.set(ex.name, ex.id);
    }
  }

  const missing = allNames.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    throw new Error(
      `Missing exercises required by built-in plans: ${missing.join(", ")}`,
    );
  }

  // Upsert: preserve existing plan IDs to avoid invalidating frontend caches
  const existingPlans = await prisma.workoutPlan.findMany({
    where: { creatorUserId: null },
  });
  const existingByName = new Map(existingPlans.map((p) => [p.name, p]));
  const definitionNames = new Set(planDefinitions.map((p) => p.name));

  // Delete plans no longer in definitions
  for (const existing of existingPlans) {
    if (!definitionNames.has(existing.name)) {
      await prisma.workoutPlan.delete({ where: { id: existing.id } });
      console.log(`✓ Removed obsolete built-in plan: ${existing.name}`);
    }
  }

  for (const plan of planDefinitions) {
    const existing = existingByName.get(plan.name);
    if (existing) {
      // Keep existing plan ID, just replace its items
      await prisma.$transaction(async (tx) => {
        await tx.workoutPlanItem.deleteMany({ where: { planId: existing.id } });
        await tx.workoutPlanItem.createMany({
          data: plan.exerciseNames.map((name, index) => ({
            planId: existing.id,
            exerciseId: byName.get(name)!,
            orderInPlan: index,
          })),
        });
      });
      console.log(`✓ Updated built-in plan: ${plan.name}`);
    } else {
      await prisma.workoutPlan.create({
        data: {
          name: plan.name,
          creatorUserId: null,
          isPublic: true,
          items: {
            create: plan.exerciseNames.map((name, index) => ({
              exerciseId: byName.get(name)!,
              orderInPlan: index,
            })),
          },
        },
      });
      console.log(`✓ Created built-in plan: ${plan.name}`);
    }
  }
}
