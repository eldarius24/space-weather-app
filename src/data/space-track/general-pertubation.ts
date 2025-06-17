'use server';
import fetch from 'node-fetch';
import https from 'node:https';
import { SPACE_TRACK_API_URL } from './constants';
import { authenticateToSpaceTrack } from './auth';
import logger from '../../lib/logger';
import { SpaceTrackGeneralPerturbation } from '@/generated/prisma';

/**
 * Récupère les données orbitales (general perturbations) depuis l'API Space-Track
 * @returns {Promise<SpaceTrackGeneralPerturbation[] | Error>} Liste des objets orbitaux ou erreur
 */
export const fetchGeneralPerturbations = async (): Promise<
  SpaceTrackGeneralPerturbation[] | Error
> => {
  try {
    logger.info('Début de la récupération des données Space-Track...');

    // Authentification pour obtenir les cookies de session
    const sessionCookies = await authenticateToSpaceTrack();

    const requestUrl = `${SPACE_TRACK_API_URL}/basicspacedata/query/class/gp/limit/100`;
    logger.debug(`Envoi de requête à ${requestUrl}`);

    const spaceDataResponse = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookies,
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    logger.info(
      `Réponse de l'API Space-Track: ${spaceDataResponse.status} ${spaceDataResponse.statusText}`,
    );

    if (spaceDataResponse.status !== 200) {
      const responseText = await spaceDataResponse.text();
      logger.error('Échec de la requête Space-Track', {
        status: spaceDataResponse.status,
        statusText: spaceDataResponse.statusText,
        responseText: responseText.substring(0, 500),
      });
      throw new Error(
        `Échec de la requête Space-Track: ${spaceDataResponse.status} ${spaceDataResponse.statusText}`,
      );
    }

    const content = await spaceDataResponse.json();
    logger.info('Données récupérées avec succès', {
      count: Array.isArray(content) ? content.length : 'non-array',
      type: typeof content,
    });

    if (!Array.isArray(content)) {
      logger.error('Format de réponse inattendu', {
        content: JSON.stringify(content).substring(0, 200),
      });
      throw new Error('Format de réponse inattendu de Space-Track');
    }

    return content as SpaceTrackGeneralPerturbation[];
  } catch (error) {
    logger.error('Erreur lors de la récupération des données Space-Track', {
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Échec de récupération des données Space-Track: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    );
  }
};
