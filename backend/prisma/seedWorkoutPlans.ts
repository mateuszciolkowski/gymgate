import prisma from "../src/config/database.js";
import { BUILT_IN_USER_ID } from "../src/config/constants.js";

export async function seedWorkoutPlans() {
  console.log("🌱 Seeding built-in workout plans...");

  const globalExerciseName = "Prostowanie ramienia na wyciągu jednorącz";
  let globalExercise = await prisma.exercise.findFirst({
    where: { name: globalExerciseName, creatorUserId: null },
  });
  if (!globalExercise) {
    globalExercise = await prisma.exercise.create({
      data: {
        name: globalExerciseName,
        muscleGroups: ["TRICEPS"],
        description:
          "Jednostronne prostowanie ramienia na wyciągu górnym — izolacja tricepsa",
        creatorUserId: null,
      },
    });
    console.log("✓ Created global exercise:", globalExerciseName);
  }

  const planDefinitions: { name: string; exerciseNames: string[] }[] = [
    {
      name: "FBW Mężczyzna - Trening A",
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
      name: "FBW Mężczyzna - Trening B",
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
      name: "FBW Mężczyzna - Trening C",
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
      name: "FBW Kobieta - Trening A",
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
      name: "FBW Kobieta - Trening B",
      exerciseNames: [
        "Martwy ciąg rumuński",
        "Przysiad sumo",
        "Wiosłowanie na wyciągu dolnym",
        "Odwodzenie nogi na maszynie",
        "Wspięcia na palce siedząc",
        "Prostowanie ramion na wyciągu z liną",
      ],
    },
  ];

  const allNames = Array.from(
    new Set(planDefinitions.flatMap((p) => p.exerciseNames)),
  );
  const dbExercises = await prisma.exercise.findMany({
    where: {
      name: { in: allNames },
      OR: [{ creatorUserId: null }, { creatorUserId: BUILT_IN_USER_ID }],
    },
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
