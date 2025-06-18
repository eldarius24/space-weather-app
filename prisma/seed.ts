import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Création de la source de données NASA si elle n'existe pas
  const nasaSource = await prisma.dataSource.upsert({
    where: { name: 'NASA' },
    update: {},
    create: {
      name: 'NASA',
      endpoint: 'https://api.nasa.gov',
      apiKey: process.env.NASA_API_KEY || 'DEMO_KEY',
      isActive: true,
    },
  });

  console.log(`Created or found data source: ${nasaSource.name}`);

  //Création de la source de données space track si elle n'existe pas
  const spaceTrackSource = await prisma.dataSource.upsert({
    where: { name: 'SPACE-TRACK' },
    update: {},
    create: {
      name: 'SPACE-TRACK',
      endpoint: 'https://www.space-track.org',
      userName: process.env.SPACE_TRACK_USERNAME,
      password: process.env.SPACE_TRACK_PASSWORD,
      isActive: true,
    },
  });

  console.log(`Created or found data source: ${spaceTrackSource.name}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });