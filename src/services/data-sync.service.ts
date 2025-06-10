import { syncNasaFlares } from '@/data/NASA/nasa-weather';
import { prisma } from '@/lib/prisma';

/**
 * Orchestre la synchronisation des données depuis toutes les sources actives.
 */
export const syncAllDataSources = async () => {
  console.log('Starting all data sources synchronization...');

  const dataSources = await prisma.dataSource.findMany({
    where: { isActive: true },
  });

  for (const source of dataSources) {
    console.log(`Syncing data for source: ${source.name}`);
    try {
      switch (source.name) {
        case 'NASA':
          await syncNasaFlares();
          break;
        // Ajoutez d'autres cas pour l'ESA, etc.
        default:
          console.warn(`No sync logic implemented for source: ${source.name}`);
      }
      // Mettre à jour le statut de la source après une synchronisation réussie
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { lastSync: new Date(), status: 'ACTIVE' },
      });
    } catch (error) {
      console.error(`Failed to sync source ${source.name}:`, error);
      // Mettre à jour le statut de la source en cas d'erreur
      await prisma.dataSource.update({
        where: { id: source.id },
        data: { status: 'ERROR' },
      });
    }
  }

  console.log('All data sources synchronization finished.');
};