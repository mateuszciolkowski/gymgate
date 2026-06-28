import prisma from "../src/config/database.js";
import { seedWorkoutPlans } from "./seedWorkoutPlans.js";

async function main() {
  console.log("🌱 Seeding database...");

  // Never delete users — seed only adds missing data (safe for production)
  const existingUser = await prisma.user.findUnique({ where: { id: "1" } });
  if (!existingUser) {
    const testUser = await prisma.user.create({
      data: {
        id: "1",
        email: "mateusz@gymgate.com",
        firstName: "Mateusz",
        lastName: "Ciołkowski",
        phone: "+48123456789",
        password: "test123",
      },
    });
    console.log("✓ Created test user:", {
      id: testUser.id,
      email: testUser.email,
      name: `${testUser.firstName} ${testUser.lastName}`,
    });
  } else {
    console.log("✓ Test user already exists, skipping");
  }

  const exercises = await prisma.exercise.createMany({
    data: [
      {
        name: "Wyciskanie sztangi na ławce płaskiej",
        muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
        description: "Podstawowe ćwiczenie na masę klatki piersiowej",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie hantli na ławce płaskiej",
        muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
        description: "Większy zakres ruchu niż ze sztangą",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie sztangi na ławce skośnej",
        muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"],
        description: "Górna część klatki piersiowej",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie hantli na ławce skośnej",
        muscleGroups: ["CHEST", "SHOULDERS", "TRICEPS"],
        description: "Izolacja górnej części klatki",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie na ławce skośnej głową w dół",
        muscleGroups: ["CHEST", "TRICEPS"],
        description: "Dolna część klatki piersiowej",
        creatorUserId: "1",
      },
      {
        name: "Rozpiętki hantlami na ławce płaskiej",
        muscleGroups: ["CHEST"],
        description: "Rozciąganie i izolacja klatki",
        creatorUserId: "1",
      },
      {
        name: "Rozpiętki hantlami na ławce skośnej",
        muscleGroups: ["CHEST"],
        description: "Górna część klatki - rozpiętki",
        creatorUserId: "1",
      },
      {
        name: "Pompki klasyczne",
        muscleGroups: ["CHEST", "TRICEPS", "SHOULDERS"],
        description: "Ćwiczenie z ciężarem własnego ciała",
        creatorUserId: "1",
      },
      {
        name: "Pompki diamentowe",
        muscleGroups: ["CHEST", "TRICEPS"],
        description: "Wariant pompek z naciskiem na triceps",
        creatorUserId: "1",
      },
      {
        name: "Krzyżowanie linek wyciągu",
        muscleGroups: ["CHEST"],
        description: "Ćwiczenie izolujące na linach",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie na maszynie",
        muscleGroups: ["CHEST", "TRICEPS"],
        description: "Bezpieczna alternatywa dla początkujących",
        creatorUserId: "1",
      },
      {
        name: "Rozpiętki na maszynie",
        muscleGroups: ["CHEST"],
        description: "Izolacja klatki na maszynie",
        creatorUserId: "1",
      },
      {
        name: "Pullover hantlem",
        muscleGroups: ["CHEST", "LATS"],
        description: "Rozciąganie klatki i grzbietu",
        creatorUserId: "1",
      },
      {
        name: "Martwy ciąg klasyczny",
        muscleGroups: ["BACK", "HAMSTRINGS", "GLUTES", "LOWER_BACK", "TRAPS"],
        description: "Król ćwiczeń na plecy i całe ciało",
        creatorUserId: "1",
      },
      {
        name: "Martwy ciąg sumo",
        muscleGroups: ["BACK", "GLUTES", "QUADS", "ADDUCTORS"],
        description: "Wariant z szerszym rozstawieniem nóg",
        creatorUserId: "1",
      },
      {
        name: "Martwy ciąg rumuński",
        muscleGroups: ["HAMSTRINGS", "GLUTES", "LOWER_BACK"],
        description: "Tylna część nóg i dolne plecy",
        creatorUserId: "1",
      },
      {
        name: "Podciąganie na drążku nachwytem",
        muscleGroups: ["BACK", "LATS", "BICEPS"],
        description: "Najlepsze na szerokość pleców",
        creatorUserId: "1",
      },
      {
        name: "Podciąganie na drążku podchwytem",
        muscleGroups: ["BACK", "LATS", "BICEPS"],
        description: "Większy udział bicepsów",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie sztangą w opadzie",
        muscleGroups: ["BACK", "MIDDLE_BACK", "LATS", "TRAPS"],
        description: "Buduje grubość pleców",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie sztangą podchwytem",
        muscleGroups: ["BACK", "LATS", "BICEPS"],
        description: "Większy zakres ruchu",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie hantlem",
        muscleGroups: ["BACK", "LATS", "MIDDLE_BACK"],
        description: "Jednostronne wiosłowanie z podporą",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie focze hantlami na ławce skośnej",
        muscleGroups: ["BACK", "MIDDLE_BACK", "LATS"],
        description: "Seal row - leżąc na ławce skośnej",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie T-bar",
        muscleGroups: ["BACK", "MIDDLE_BACK", "TRAPS"],
        description: "Stabilne wiosłowanie na masę",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie na maszynie",
        muscleGroups: ["BACK", "MIDDLE_BACK", "LATS"],
        description: "Wiosłowanie na maszynie — kontrolowany ruch, bezpieczne dla kręgosłupa",
        creatorUserId: "1",
      },
      {
        name: "Ściąganie drążka wyciągu górnego",
        muscleGroups: ["BACK", "LATS", "BICEPS"],
        description: "Alternatywa dla podciągania",
        creatorUserId: "1",
      },
      {
        name: "Ściąganie drążka wyciągu wąskim chwytem",
        muscleGroups: ["BACK", "LATS", "BICEPS"],
        description: "Grubość dolnej części pleców",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie na wyciągu dolnym",
        muscleGroups: ["BACK", "MIDDLE_BACK", "LATS"],
        description: "Kontrolowane wiosłowanie siedząc",
        creatorUserId: "1",
      },
      {
        name: "Wznosy barków (shrugs) ze sztangą",
        muscleGroups: ["TRAPS", "NECK"],
        description: "Izolacja górnej części trapezów",
        creatorUserId: "1",
      },
      {
        name: "Wznosy barków z hantlami",
        muscleGroups: ["TRAPS"],
        description: "Większy zakres ruchu niż ze sztangą",
        creatorUserId: "1",
      },
      {
        name: "Wznosy tułowia na ławce rzymskiej",
        muscleGroups: ["LOWER_BACK", "GLUTES", "HAMSTRINGS"],
        description: "Wzmocnienie dolnej części pleców na ławce rzymskiej",
        creatorUserId: "1",
      },
      {
        name: "Good morning",
        muscleGroups: ["LOWER_BACK", "HAMSTRINGS", "GLUTES"],
        description: "Pochylanie tułowia ze sztangą",
        creatorUserId: "1",
      },
      {
        name: "Face pulls",
        muscleGroups: ["SHOULDERS", "TRAPS", "MIDDLE_BACK"],
        description: "Tylne partie barków i górna część pleców",
        creatorUserId: "1",
      },

      {
        name: "Wyciskanie sztangi nad głowę (OHP)",
        muscleGroups: ["SHOULDERS", "TRICEPS"],
        description: "Podstawowe ćwiczenie na barki",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie hantli nad głowę",
        muscleGroups: ["SHOULDERS", "TRICEPS"],
        description: "Większy zakres ruchu",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie Arnolda",
        muscleGroups: ["SHOULDERS", "TRICEPS"],
        description: "Wariant z rotacją hantli",
        creatorUserId: "1",
      },
      {
        name: "Unoszenie hantli bokiem",
        muscleGroups: ["SHOULDERS"],
        description: "Izolacja środkowej części barków",
        creatorUserId: "1",
      },
      {
        name: "Unoszenie hantli w przód",
        muscleGroups: ["SHOULDERS"],
        description: "Przednia część barków",
        creatorUserId: "1",
      },
      {
        name: "Unoszenie hantli w opadzie",
        muscleGroups: ["SHOULDERS"],
        description: "Tylna część barków",
        creatorUserId: "1",
      },
      {
        name: "Wiosłowanie sztangi stojąc",
        muscleGroups: ["SHOULDERS", "TRAPS"],
        description: "Buduje masę barków i trapezów",
        creatorUserId: "1",
      },
      {
        name: "Unoszenie na linie bokiem",
        muscleGroups: ["SHOULDERS"],
        description: "Izolacja bocznej części barków",
        creatorUserId: "1",
      },
      {
        name: "Odwodzenie linki wyciągu jednorącz na tył barku",
        muscleGroups: ["SHOULDERS"],
        description: "Izolacja tylnej części barku - jednorącz na wyciągu",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie na maszynie",
        muscleGroups: ["SHOULDERS", "TRICEPS"],
        description: "Bezpieczne wyciskanie na barki",
        creatorUserId: "1",
      },

      {
        name: "Uginanie sztangi łamanej",
        muscleGroups: ["BICEPS", "FOREARMS"],
        description: "Bezpieczniejsze dla nadgarstków",
        creatorUserId: "1",
      },
      {
        name: "Uginanie hantli naprzemiennie",
        muscleGroups: ["BICEPS", "FOREARMS"],
        description: "Jednostronne uginanie z rotacją",
        creatorUserId: "1",
      },
      {
        name: "Uginanie hantli młotkowe",
        muscleGroups: ["BICEPS", "FOREARMS"],
        description: "Neutralny chwyt - przedramiona",
        creatorUserId: "1",
      },
      {
        name: "Uginanie na modlitewniku",
        muscleGroups: ["BICEPS"],
        description: "Izolacja bicepsów",
        creatorUserId: "1",
      },
      {
        name: "Uginanie na wyciągu dolnym",
        muscleGroups: ["BICEPS"],
        description: "Stałe napięcie przez cały ruch",
        creatorUserId: "1",
      },
      {
        name: "Uginanie na ławce skośnej",
        muscleGroups: ["BICEPS"],
        description: "Większe rozciągnięcie bicepsów",
        creatorUserId: "1",
      },

      {
        name: "Wyciskanie wąskim chwytem",
        muscleGroups: ["TRICEPS", "CHEST"],
        description: "Podstawowe ćwiczenie na triceps",
        creatorUserId: "1",
      },
      {
        name: "Prostowanie ramion na wyciągu",
        muscleGroups: ["TRICEPS"],
        description: "Izolacja tricepsów",
        creatorUserId: "1",
      },
      {
        name: "Prostowanie ramion na wyciągu z liną",
        muscleGroups: ["TRICEPS"],
        description: "Wariant z liną - większy zakres ruchu",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie francuskie sztangą",
        muscleGroups: ["TRICEPS"],
        description: "Leżąc - rozciąga tricepsy",
        creatorUserId: "1",
      },
      {
        name: "Wyciskanie francuskie hantlem",
        muscleGroups: ["TRICEPS"],
        description: "Jednostronne lub oburęczne",
        creatorUserId: "1",
      },
      {
        name: "Francuskie wyciskanie hantli nad głowę",
        muscleGroups: ["TRICEPS"],
        description: "Wyciskanie hantli nad głowę w pozycji stojącej lub siedzącej",
        creatorUserId: "1",
      },
      {
        name: "Dipy na poręczach",
        muscleGroups: ["TRICEPS", "CHEST", "SHOULDERS"],
        description: "Zaawansowane ćwiczenie z ciężarem ciała",
        creatorUserId: "1",
      },
      {
        name: "Prostowanie ramienia z hantlem w opadzie",
        muscleGroups: ["TRICEPS"],
        description: "Jednostronne wzmocnienie",
        creatorUserId: "1",
      },
      {
        name: "Prostowanie ramion chwyt odwrotny",
        muscleGroups: ["TRICEPS", "FOREARMS"],
        description: "Zmiana chwytu aktywuje inne włókna",
        creatorUserId: "1",
      },

      {
        name: "Przysiady ze sztangą na plecach",
        muscleGroups: ["QUADS", "GLUTES", "HAMSTRINGS"],
        description: "Król ćwiczeń na nogi",
        creatorUserId: "1",
      },
      {
        name: "Przysiady bułgarskie",
        muscleGroups: ["QUADS", "GLUTES"],
        description: "Jednostronne przysiady z wyłożoną nogą",
        creatorUserId: "1",
      },
      {
        name: "Przysiad sumo",
        muscleGroups: ["QUADS", "GLUTES", "ADDUCTORS"],
        description: "Przysiad z szerszym rozstawieniem nóg",
        creatorUserId: "1",
      },
      {
        name: "Wypychanie nóg na suwnicy",
        muscleGroups: ["QUADS", "GLUTES", "HAMSTRINGS"],
        description: "Bezpieczna alternatywa dla przysiadów",
        creatorUserId: "1",
      },
      {
        name: "Hack squats",
        muscleGroups: ["QUADS", "GLUTES"],
        description: "Przysiady na maszynie",
        creatorUserId: "1",
      },
      {
        name: "Wykroki ze sztangą",
        muscleGroups: ["QUADS", "GLUTES", "HAMSTRINGS"],
        description: "Jednostronne ćwiczenie funkcjonalne",
        creatorUserId: "1",
      },
      {
        name: "Wykroki z hantlami",
        muscleGroups: ["QUADS", "GLUTES", "HAMSTRINGS"],
        description: "Łatwiejsze do wykonania niż ze sztangą",
        creatorUserId: "1",
      },
      {
        name: "Prostowanie nóg na maszynie",
        muscleGroups: ["QUADS"],
        description: "Izolacja czworogłowego",
        creatorUserId: "1",
      },
      {
        name: "Uginanie nóg leżąc",
        muscleGroups: ["HAMSTRINGS"],
        description: "Izolacja tylnej części uda",
        creatorUserId: "1",
      },
      {
        name: "Uginanie nóg siedząc",
        muscleGroups: ["HAMSTRINGS"],
        description: "Wariant z większym rozciągnięciem",
        creatorUserId: "1",
      },
      {
        name: "Hip thrust ze sztangą",
        muscleGroups: ["GLUTES", "HAMSTRINGS"],
        description: "Najlepsze na pośladki",
        creatorUserId: "1",
      },
      {
        name: "Glute bridge",
        muscleGroups: ["GLUTES"],
        description: "Izolowane spięcie pośladków leżąc",
        creatorUserId: "1",
      },
      {
        name: "Odwodzenie nogi na maszynie",
        muscleGroups: ["GLUTES", "ADDUCTORS"],
        description: "Boczna część pośladków",
        creatorUserId: "1",
      },
      {
        name: "Przywodzenie nóg na maszynie",
        muscleGroups: ["ADDUCTORS"],
        description: "Wewnętrzna część uda",
        creatorUserId: "1",
      },
      {
        name: "Wspięcia na palce stojąc",
        muscleGroups: ["CALVES"],
        description: "Podstawowe ćwiczenie na łydki",
        creatorUserId: "1",
      },
      {
        name: "Wspięcia na palce siedząc",
        muscleGroups: ["CALVES"],
        description: "Izolacja płaskiej części łydki",
        creatorUserId: "1",
      },
      {
        name: "Nordic curls",
        muscleGroups: ["HAMSTRINGS"],
        description: "Zaawansowane ćwiczenie na tylną część uda",
        creatorUserId: "1",
      },
      {
        name: "Plank",
        muscleGroups: ["ABS", "OBLIQUES"],
        description: "Podstawowe ćwiczenie izometryczne",
        creatorUserId: "1",
      },
      {
        name: "Plank boczny",
        muscleGroups: ["OBLIQUES", "ABS"],
        description: "Wzmacnia skośne brzucha",
        creatorUserId: "1",
      },
      {
        name: "Unoszenie nóg w zwisie",
        muscleGroups: ["ABS", "HIP_FLEXORS"],
        description: "Zaawansowane ćwiczenie na brzuch",
        creatorUserId: "1",
      },
      {
        name: "Nożyce",
        muscleGroups: ["ABS", "HIP_FLEXORS"],
        description: "Dynamiczne ćwiczenie na dolny brzuch",
        creatorUserId: "1",
      },
      {
        name: "Dead bug",
        muscleGroups: ["ABS", "HIP_FLEXORS"],
        description: "Stabilizacja core",
        creatorUserId: "1",
      },
      {
        name: "Spięcia brzucha na wyciągu",
        muscleGroups: ["ABS"],
        description: "Ćwiczenie z obciążeniem",
        creatorUserId: "1",
      },
      {
        name: "Hollow body hold",
        muscleGroups: ["ABS"],
        description: "Zaawansowana deska",
        creatorUserId: "1",
      },

      {
        name: "Kickback na wyciągu",
        muscleGroups: ["GLUTES"],
        description: "Izolacja pośladków — odrzut nogi w tył na wyciągu dolnym",
        creatorUserId: null,
      },
      {
        name: "Step up",
        muscleGroups: ["QUADS", "GLUTES"],
        description: "Wejście na podwyższenie — jednostronne ćwiczenie na nogi i pośladki",
        creatorUserId: null,
      },
      {
        name: "Farmer walk",
        muscleGroups: ["FULL_BODY", "FOREARMS", "TRAPS"],
        description: "Chód farmera z obciążeniem",
        creatorUserId: "1",
      },

      {
        name: "Zwijanie nadgarstków ze sztangą",
        muscleGroups: ["FOREARMS"],
        description: "Wzmacnianie przedramion",
        creatorUserId: "1",
      },
      {
        name: "Odwrotne zwijanie nadgarstków",
        muscleGroups: ["FOREARMS"],
        description: "Górna część przedramion",
        creatorUserId: "1",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✓ Created ${exercises.count} exercises`);

  await seedWorkoutPlans();

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
