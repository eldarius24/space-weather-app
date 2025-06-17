import { SpaceWeatherDashboard } from '@/components/space-weather-dashboard';
import { getSpaceObjects } from '@/app/actions';
import { prisma } from '@/lib/prisma';
import { SpaceWeatherEvent } from '@/generated/prisma';

async function getEvents(): Promise<SpaceWeatherEvent[]> {
  try {
    const events = await prisma.spaceWeatherEvent.findMany({
      orderBy: {
        startTime: 'desc',
      },
      take: 20,
    });
    return events;
  } catch (error) {
    console.error('Failed to fetch space weather events:', error);
    return [];
  }
}

export default async function Home() {
  const initialSpaceObjects = await getSpaceObjects();
  const initialEvents = await getEvents();

  return (
    <main className="container mx-auto p-4">
      <SpaceWeatherDashboard 
        initialSpaceObjects={initialSpaceObjects}
        initialEvents={initialEvents}
      />
    </main>
  );
}
