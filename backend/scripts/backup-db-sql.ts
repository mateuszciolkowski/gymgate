import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "NULL";
  }
  if (typeof val === "boolean") {
    return val ? "TRUE" : "FALSE";
  }
  if (typeof val === "number") {
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'::timestamp with time zone`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) {
      return "'{}'";
    }
    const escapedElements = val.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(",");
    return `'{${escapedElements}}'`;
  }
  if (typeof val === "object") {
    // e.g. Decimal or custom object
    if ("toString" in val) {
      const str = String(val);
      if (!isNaN(Number(str))) return str;
      return `'${str.replace(/'/g, "''")}'`;
    }
    return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateTableInserts(tableName: string, rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const sqlLines: string[] = [];
  sqlLines.push(`-- Table: ${tableName} (${rows.length} rows)`);

  for (const row of rows) {
    const columns = Object.keys(row);
    const escapedColumns = columns.map((col) => `"${col}"`).join(", ");
    const values = columns.map((col) => escapeSqlValue(row[col])).join(", ");
    sqlLines.push(`INSERT INTO "${tableName}" (${escapedColumns}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
  }

  sqlLines.push("");
  return sqlLines;
}

async function createSqlBackup() {
  console.log("Rozpoczynam generowanie pełnego zrzutu SQL z bazy Supabase...");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Fetch in proper foreign key order
  const users = await prisma.user.findMany();
  const exercises = await prisma.exercise.findMany();
  const exercisePhotos = await prisma.exercisePhoto.findMany();
  const workoutPlans = await prisma.workoutPlan.findMany();
  const workoutPlanItems = await prisma.workoutPlanItem.findMany();
  const workouts = await prisma.workout.findMany();
  const workoutItems = await prisma.workoutItem.findMany();
  const workoutSets = await prisma.workoutSet.findMany();
  const exerciseUserStats = await prisma.exerciseUserStats.findMany();
  const exercisePendingNotes = await prisma.exercisePendingNote.findMany();
  const userFavoritePlans = await prisma.userFavoritePlan.findMany();

  const sqlStatements: string[] = [
    `-- ==========================================================`,
    `-- GymGate Supabase PostgreSQL Backup`,
    `-- Exported at: ${new Date().toISOString()}`,
    `-- Total tables: 11`,
    `-- ==========================================================`,
    ``,
    `SET statement_timeout = 0;`,
    `SET client_encoding = 'UTF8';`,
    `SET standard_conforming_strings = on;`,
    ``,
    `BEGIN;`,
    ``,
    ...generateTableInserts("users", users as unknown as Record<string, unknown>[]),
    ...generateTableInserts("exercises", exercises as unknown as Record<string, unknown>[]),
    ...generateTableInserts("exercise_photos", exercisePhotos as unknown as Record<string, unknown>[]),
    ...generateTableInserts("workout_plans", workoutPlans as unknown as Record<string, unknown>[]),
    ...generateTableInserts("workout_plan_items", workoutPlanItems as unknown as Record<string, unknown>[]),
    ...generateTableInserts("workouts", workouts as unknown as Record<string, unknown>[]),
    ...generateTableInserts("workout_items", workoutItems as unknown as Record<string, unknown>[]),
    ...generateTableInserts("workout_sets", workoutSets as unknown as Record<string, unknown>[]),
    ...generateTableInserts("exercise_user_stats", exerciseUserStats as unknown as Record<string, unknown>[]),
    ...generateTableInserts("exercise_pending_notes", exercisePendingNotes as unknown as Record<string, unknown>[]),
    ...generateTableInserts("user_favorite_plans", userFavoritePlans as unknown as Record<string, unknown>[]),
    `COMMIT;`,
    ``,
  ];

  const backupFilePath = path.join(backupDir, `supabase_backup_${timestamp}.sql`);
  fs.writeFileSync(backupFilePath, sqlStatements.join("\n"), "utf-8");

  console.log(`\n✅ Backup SQL został pomyślnie utworzony!`);
  console.log(`📁 Ścieżka do pliku: ${backupFilePath}`);
  console.log(`📊 Podsumowanie wygenerowanych instrukcji SQL:`);
  console.log(`   - users: ${users.length}`);
  console.log(`   - exercises: ${exercises.length}`);
  console.log(`   - workouts: ${workouts.length}`);
  console.log(`   - workout_items: ${workoutItems.length}`);
  console.log(`   - workout_sets: ${workoutSets.length}`);
  console.log(`   - workout_plans: ${workoutPlans.length}`);
  console.log(`   - exercise_user_stats: ${exerciseUserStats.length}`);
}

createSqlBackup()
  .catch((err) => {
    console.error("❌ Błąd podczas tworzenia backupu SQL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
