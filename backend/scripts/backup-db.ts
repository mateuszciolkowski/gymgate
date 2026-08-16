import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function createBackup() {
  console.log("Rozpoczynam pobieranie danych z bazy Supabase...");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const [
    users,
    exercises,
    exercisePhotos,
    workouts,
    workoutItems,
    workoutSets,
    workoutPlans,
    workoutPlanItems,
    exerciseUserStats,
    exercisePendingNotes,
    userFavoritePlans,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.exercise.findMany(),
    prisma.exercisePhoto.findMany(),
    prisma.workout.findMany(),
    prisma.workoutItem.findMany(),
    prisma.workoutSet.findMany(),
    prisma.workoutPlan.findMany(),
    prisma.workoutPlanItem.findMany(),
    prisma.exerciseUserStats.findMany(),
    prisma.exercisePendingNote.findMany(),
    prisma.userFavoritePlan.findMany(),
  ]);

  const backupData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        exercises: exercises.length,
        exercisePhotos: exercisePhotos.length,
        workouts: workouts.length,
        workoutItems: workoutItems.length,
        workoutSets: workoutSets.length,
        workoutPlans: workoutPlans.length,
        workoutPlanItems: workoutPlanItems.length,
        exerciseUserStats: exerciseUserStats.length,
        exercisePendingNotes: exercisePendingNotes.length,
        userFavoritePlans: userFavoritePlans.length,
      },
    },
    tables: {
      users,
      exercises,
      exercisePhotos,
      workouts,
      workoutItems,
      workoutSets,
      workoutPlans,
      workoutPlanItems,
      exerciseUserStats,
      exercisePendingNotes,
      userFavoritePlans,
    },
  };

  const backupFilePath = path.join(backupDir, `supabase_backup_${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log(`\n✅ Backup został pomyślnie utworzony!`);
  console.log(`📁 Ścieżka do pliku: ${backupFilePath}`);
  console.log(`📊 Podsumowanie zrzuconych rekordów:`);
  console.log(`   - Użytkownicy: ${users.length}`);
  console.log(`   - Ćwiczenia: ${exercises.length}`);
  console.log(`   - Treningi: ${workouts.length}`);
  console.log(`   - Elementy treningów: ${workoutItems.length}`);
  console.log(`   - Serie: ${workoutSets.length}`);
  console.log(`   - Plany treningowe: ${workoutPlans.length}`);
  console.log(`   - Statystyki ćwiczeń: ${exerciseUserStats.length}`);
}

createBackup()
  .catch((err) => {
    console.error("❌ Błąd podczas tworzenia backupu:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
