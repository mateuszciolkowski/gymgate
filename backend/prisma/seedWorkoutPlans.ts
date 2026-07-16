import prisma from "../src/config/database.js";

/**
 * Single source of truth for built-in workout plans.
 * Requires all referenced exercises to exist already (see seedExercises.ts).
 */
const planDefinitions: { name: string; shortName: string; exerciseNames: string[] }[] = [
  {
    name: "FBW Mężczyzna - Trening A - v1",
    shortName: "FBW Trening A",
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
    shortName: "FBW Trening B",
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
    shortName: "FBW Trening C",
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
    shortName: "FBW Trening A",
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
    shortName: "FBW Trening B",
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
    name: "FBW Kobieta - Trening A - v2",
    shortName: "FBW Trening A",
    exerciseNames: [
      "Przysiady bułgarskie",
      "Hip thrust ze sztangą",
      "Podciągnie na maszynie",
      "Wznosy tułowia na ławce rzymskiej",
      "Prostowanie ramion na wyciągu z liną",
      "Uginanie hantli młotkowe",
      "Face pulls",
    ],
  },
  {
    name: "FBW Kobieta - Trening B - v2",
    shortName: "FBW Trening B",
    exerciseNames: [
      "Przysiad sumo",
      "Wypychanie nóg na suwnicy",
      "Kickback na wyciągu",
      "Ściąganie drążka wyciągu górnego",
      "Wyciskanie hantli na ławce skośnej",
      "Francuskie wyciskanie hantli nad głowę",
      "Prostowanie nóg na maszynie",
      "Wypychanie łydek na suwnicy",
    ],
  },
  {
    name: "FBW Kobieta - Trening C - v2",
    shortName: "FBW Trening C",
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
    name: "FBW Mężczyzna - Trening A - v2",
    shortName: "FBW Trening A",
    exerciseNames: [
      "Przysiady bułgarskie",
      "Hip thrust ze sztangą",
      "Wyciskanie hantli na ławce skośnej",
      "Podciąganie na drążku nachwytem",
      "Bayesian curl",
      "Face pulls",
      "Wyprosty ramion z linkami wyciągu dolnego nad głową",
    ],
  },
  {
    name: "FBW Mężczyzna - Trening B - v2",
    shortName: "FBW Trening B",
    exerciseNames: [
      "Martwy ciąg rumuński",
      "Wypychanie nóg na suwnicy",
      "Wiosłowanie na maszynie",
      "Wyciskanie hantli nad głowę",
      "Uginanie hantli siedząc",
      "Rozpiętki na maszynie",
      "Rozpiętki odwrotne na maszynie",
      "Wypychanie łydek na suwnicy",
    ],
  },
  {
    name: "FBW Mężczyzna - Trening C - v2",
    shortName: "FBW Trening C",
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

export async function seedWorkoutPlans() {
  console.log("🌱 Seeding built-in workout plans...");

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
        await tx.workoutPlan.update({
          where: { id: existing.id },
          data: { shortName: plan.shortName },
        });
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
          shortName: plan.shortName,
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
