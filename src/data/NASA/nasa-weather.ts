'use server';

import { EventType, Severity } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

// URL de l'API DONKI (Database of Notifications, Knowledge, Information) de la NASA
const NASA_API_URL = 'https://api.nasa.gov/DONKI/FLR';
const API_KEY = process.env.NASA_API_KEY ?? 'DEMO_KEY';

/**
 * Interface décrivant la structure d'un événement de type "Solar Flare" (FLR)
 * retourné par l'API DONKI de la NASA.
 */
interface NasaDonkiFlareEvent {
  flrID: string;
  instrument: string;
  beginTime: string;
  peakTime: string;
  endTime: string | null;
  classType: string;
  sourceLocation: string;
  activeRegionNum: number;
  link: string;
}

/**
 * Normalise un événement brut de l'API DONKI vers le modèle SpaceWeatherEvent.
 * @param event - L'événement brut de l'API NASA.
 * @returns Un objet formaté pour l'insertion dans la base de données.
 */
const normalizeEvent = (event: NasaDonkiFlareEvent) => {
  // Logique de base pour mapper la classe de l'éruption à une sévérité
  let severity: Severity = Severity.LOW;
  if (event.classType.startsWith('M')) {
    severity = Severity.MEDIUM;
  } else if (event.classType.startsWith('X')) {
    severity = Severity.HIGH;
  }

  return {
    eventType: EventType.SOLAR_FLARE,
    severity,
    description: `Solar flare of class ${event.classType} from active region ${event.activeRegionNum}. Instrument: ${event.instrument}.`,
    startTime: new Date(event.beginTime),
    endTime: event.endTime ? new Date(event.endTime) : null,
    source: 'NASA',
    sourceId: event.flrID,
    data: JSON.stringify(event), // Stockage des données brutes pour référence
  };
};

/**
 * Récupère les données de météo spatiale (éruptions solaires) depuis l'API de la NASA,
 * les normalise et les insère ou met à jour dans la base de données.
 */
export const syncNasaFlares = async () => {
  console.log('Starting sync with NASA DONKI API...');
  try {
    const startDate = subDays(new Date(), 30).toISOString().split('T')[0]; // 30 derniers jours
    const requestUrl = `${NASA_API_URL}?startDate=${startDate}&api_key=${API_KEY}`;

    const response = await fetch(requestUrl);
    if (!response.ok) {
      throw new Error(
        `NASA API request failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const events: NasaDonkiFlareEvent[] = await response.json();
    if (!events || events.length === 0) {
      console.log('No new solar flare events found from NASA.');
      return;
    }

    console.log(`Found ${events.length} events from NASA. Normalizing and saving...`);

    for (const event of events) {
      const normalized = normalizeEvent(event);

      await prisma.spaceWeatherEvent.upsert({
        where: {
          source_sourceId: {
            source: 'NASA',
            sourceId: normalized.sourceId,
          },
        },
        create: normalized,
        update: normalized,
      });
    }

    console.log(`Successfully synced ${events.length} events from NASA.`);
  } catch (error) {
    console.error('Error syncing data from NASA:', error);
  }
};
