import prisma from '../src/config/database.js'

async function main() {
  console.log('🌱 Seeding database...')

  // Usuń starych użytkowników (jeśli istnieją)
  await prisma.user.deleteMany()
  console.log('✓ Cleared users')

  // Utwórz użytkownika testowego
  const testUser = await prisma.user.create({
    data: {
      id: '1',
      email: 'mateusz@gymgate.com',
      firstName: 'Mateusz',
      lastName: 'Ciołkowski',
      phone: '+48123456789',
      password: 'test123', // ⚠️ W produkcji użyj bcrypt!
    },
  })

  console.log('✓ Created test user:', {
    id: testUser.id,
    email: testUser.email,
    name: `${testUser.firstName} ${testUser.lastName}`,
  })

  // Dodaj przykładowe ćwiczenia
  const exercises = await prisma.exercise.createMany({
    data: [
      {
        name: 'Wyciskanie na ławce płaskiej',
        muscleGroups: ['CHEST', 'TRICEPS'],
        description: 'Klasyczne wyciskanie sztangi na ławce płaskiej',
        creatorUserId: '1',
      },
      {
        name: 'Martwy ciąg',
        muscleGroups: ['BACK', 'HAMSTRINGS', 'GLUTES'],
        description: 'Podstawowe ćwiczenie na plecy i nogi',
        creatorUserId: '1',
      },
      {
        name: 'Przysiady ze sztangą',
        muscleGroups: ['QUADS', 'GLUTES'],
        description: 'Król ćwiczeń na nogi',
        creatorUserId: '1',
      },
      {
        name: 'Podciąganie na drążku',
        muscleGroups: ['BACK', 'BICEPS'],
        description: 'Ćwiczenie z własną masą ciała',
        creatorUserId: '1',
      },
      {
        name: 'OHP (Overhead Press)',
        muscleGroups: ['SHOULDERS', 'TRICEPS'],
        description: 'Wyciskanie sztangi nad głowę',
        creatorUserId: '1',
      },
    ],
    skipDuplicates: true,
  })

  console.log(`✓ Created ${exercises.count} exercises`)

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
