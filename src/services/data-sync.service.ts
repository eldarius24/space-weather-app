"use server";

import { syncNasaFlares } from '@/data/NASA/nasa-weather';
import { syncSpaceTrackData } from '@/data/space-track/sync-service';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * Orchestre la synchronisation des données depuis toutes les sources actives.
 */
export const syncAllDataSources = async () => {
  logger.info('Starting all data sources synchronization...');

  const dataSources = await prisma.dataSource.findMany({
    where: { isActive: true },
  });

  for (const source of dataSources) {
    logger.info(`Syncing data for source: ${source.name}`);
    try {
      let syncResult;
      
      switch (source.name) {
        case 'NASA':
          syncResult = await syncNasaFlares();
          break;
        case 'SPACE-TRACK':
          syncResult = await syncSpaceTrackData();
          break;
        // Ajoutez d'autres cas pour l'ESA, etc.
        default:
          logger.warn(`No sync logic implemented for source: ${source.name}`);
          continue;
      }
      
      // Mettre à jour le statut de la source après une synchronisation réussie
      await prisma.dataSource.update({
        where: { id: source.id },
        data: {
          lastSync: new Date(),
          status: 'ACTIVE',
        },
      });
      
      logger.info(`Successfully synced source ${source.name}`, { syncResult });
    } catch (error) {
      logger.error(`Failed to sync source ${source.name}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Mettre à jour le statut de la source en cas d'erreur
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { status: 'ERROR' },
      });
    }
  }

  logger.info('All data sources synchronization finished.');
};