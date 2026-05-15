import prisma from "../src/config/database.js";
import { seedWorkoutPlans } from "./seedWorkoutPlans.js";

async function main() {
  console.log("🌱 Seeding built-in workout plans only (preserving users, exercises, workouts)...");
  await seedWorkoutPlans();
  console.log("✅ Built-in plans seeded successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seeding plans failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
