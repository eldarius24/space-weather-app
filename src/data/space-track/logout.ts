'use server';
import redisClient from "@/lib/redis";
import { SPACE_TRACK_API_URL, SPACE_TRACK_SESSION_KEY } from "./constants";
import logger from "@/lib/logger";

/**
 * Déconnexion de l'API Space-Track et suppression de la session Redis
 */
export const logoutFromSpaceTrack = async (): Promise<void> => {
  try {
    // Récupérer le cookie de session depuis Redis
    const spaceTrackSessionCookie = await redisClient.get<string>(
      SPACE_TRACK_SESSION_KEY,
    );

    if (!spaceTrackSessionCookie) {
      logger.info('Aucune session Space-Track active à déconnecter');
      return; // Déjà déconnecté
    }

    logger.info('Déconnexion de Space-Track...');

    // Appel API pour se déconnecter
    await fetch(`${SPACE_TRACK_API_URL}/auth/logout`, {
      method: 'GET',
      headers: {
        Cookie: spaceTrackSessionCookie,
      }
    });

    // Supprimer la session de Redis
    await redisClient.del(SPACE_TRACK_SESSION_KEY);
    logger.info(
      'Déconnexion réussie de Space-Track et session supprimée de Redis',
    );
  } catch (error) {
    logger.error('Erreur lors de la déconnexion de Space-Track', { error });
  }
};