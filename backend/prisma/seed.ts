import prisma from "../src/config/database.js";
import { seedExercises } from "./seedExercises.js";
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

  await seedExercises();
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
