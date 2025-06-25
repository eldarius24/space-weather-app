"use server";
import { SpaceTrackGeneralPerturbation } from '@/generated/prisma';
import logger from '@/lib/logger';
import redisClient from '@/lib/redis';
import { fetchGeneralPerturbations } from './general-pertubation';
import {
  SPACE_TRACK_GP_CACHE_KEY,
  SPACE_TRACK_GP_CACHE_TTL,
} from './constants';

/**
 * Synchronise les données orbitales avec Redis
 * @param forceRefresh {boolean} Force la récupération depuis l'API même si les données sont en cache
 * @returns {Promise<SpaceTrackGeneralPerturbation[]>} Liste des objets orbitaux
 */
export const getSyncGeneralPerturbationsOrGetFromApi = async (
  forceRefresh = false,
): Promise<SpaceTrackGeneralPerturbation[]> => {
  try {
    logger.info('Début de la synchronisation Redis des données Space-Track...');

    // Vérifier si les données sont en cache et si on ne force pas le refresh
    if (!forceRefresh) {
      const cachedData = await redisClient.get<SpaceTrackGeneralPerturbation[]>(
        SPACE_TRACK_GP_CACHE_KEY,
      );
      if (cachedData) {
        logger.info('Données récupérées depuis le cache Redis', {
          count: cachedData.length,
        });
        return cachedData;
      }
      logger.info('Aucune donnée en cache, récupération depuis l\'API Space-Track');
    }

    // Récupérer les données depuis l'API Space-Track
    logger.info("Récupération des données depuis l'API Space-Track...");
    const freshData = await fetchGeneralPerturbations();

    if (freshData instanceof Error) {
      logger.error(
        'Erreur lors de la récupération des données depuis Space-Track',
        {
          errorMessage: freshData.message,
        },
      );
      throw freshData;
    }

    // Stocker les données dans Redis
    await redisClient.set(
      SPACE_TRACK_GP_CACHE_KEY,
      freshData,
      SPACE_TRACK_GP_CACHE_TTL,
    );
    logger.info(
      `Données stockées dans Redis avec expiration de ${SPACE_TRACK_GP_CACHE_TTL}s`,
      {
        count: freshData.length,
      },
    );

    return freshData;
  } catch (error) {
    logger.error('Erreur lors de la synchronisation Redis', {
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Échec de synchronisation Redis: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    );
  }
};