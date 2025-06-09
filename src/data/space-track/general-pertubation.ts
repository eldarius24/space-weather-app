'use server';
import fetch from 'node-fetch';
import https from 'node:https';
import logger from '@/lib/logger';
import { SPACE_TRACK_API_URL } from './constants';
import { authenticateToSpaceTrack } from './auth';

/**
 * Type qui représente les données d'une general pertubation provenant de space-track.org.
 * Représente les éléments orbitaux d'un objet spatial.
 */
export type SpaceTrack_GeneralPertubation = {
  CCSDS_OMM_VERS: string; // varchar(3)
  COMMENT: string; // varchar(33)
  CREATION_DATE?: Date; // datetime
  ORIGINATOR: string; // varchar(7)
  OBJECT_NAME?: string; // varchar(25)
  OBJECT_ID?: string; // varchar(12)
  CENTER_NAME: string; // varchar(5)
  REF_FRAME: string; // varchar(4)
  TIME_SYSTEM: string; // varchar(3)
  MEAN_ELEMENT_THEORY: string; // varchar(4)
  EPOCH?: Date; // datetime(6)
  MEAN_MOTION?: number; // decimal(13,8)
  ECCENTRICITY?: number; // decimal(13,8)
  INCLINATION?: number; // decimal(7,4)
  RA_OF_ASC_NODE?: number; // decimal(7,4)
  ARG_OF_PERICENTER?: number; // decimal(7,4)
  MEAN_ANOMALY?: number; // decimal(7,4)
  EPHEMERIS_TYPE?: number; // tinyint(4)
  CLASSIFICATION_TYPE?: string; // char(1)
  NORAD_CAT_ID: number; // int(10) unsigned
  ELEMENT_SET_NO?: number; // smallint(5) unsigned
  REV_AT_EPOCH?: number; // mediumint(8) unsigned
  BSTAR?: number; // decimal(19,14)
  MEAN_MOTION_DOT?: number; // decimal(9,8)
  MEAN_MOTION_DDOT?: number; // decimal(22,13)
  SEMIMAJOR_AXIS?: number; // double(12,3)
  PERIOD?: number; // double(12,3)
  APOAPSIS?: number; // double(12,3)
  PERIAPSIS?: number; // double(12,3)
  OBJECT_TYPE?: string; // varchar(12)
  RCS_SIZE?: string; // char(6)
  COUNTRY_CODE?: string; // char(6)
  LAUNCH_DATE?: Date; // date
  SITE?: string; // char(5)
  DECAY_DATE?: Date; // date
  FILE?: bigint; // bigint(20) unsigned
  GP_ID: number; // int(10) unsigned
  TLE_LINE0?: string; // varchar(27)
  TLE_LINE1?: string; // varchar(71)
  TLE_LINE2?: string; // varchar(71)
};

/**
 * Récupère les données orbitales (general perturbations) depuis l'API Space-Track
 * @returns {Promise<SpaceTrack_GeneralPertubation[] | Error>} Liste des objets orbitaux ou erreur
 */
export const fetchGeneralPerturbations = async (): Promise<SpaceTrack_GeneralPertubation[] | Error> => {
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
        'Cookie': sessionCookies
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    logger.info(`Réponse de l'API Space-Track: ${spaceDataResponse.status} ${spaceDataResponse.statusText}`);
    
    if (spaceDataResponse.status !== 200) {
      const responseText = await spaceDataResponse.text();
      logger.error('Échec de la requête Space-Track', {
        status: spaceDataResponse.status,
        statusText: spaceDataResponse.statusText,
        responseText: responseText.substring(0, 500)
      });
      throw new Error(`Échec de la requête Space-Track: ${spaceDataResponse.status} ${spaceDataResponse.statusText}`);
    }

    const content = await spaceDataResponse.json();
    logger.info('Données récupérées avec succès', {
      count: Array.isArray(content) ? content.length : 'non-array',
      type: typeof content
    });

    if (!Array.isArray(content)) {
      logger.error('Format de réponse inattendu', { content: JSON.stringify(content).substring(0, 200) });
      throw new Error('Format de réponse inattendu de Space-Track');
    }

    return content as SpaceTrack_GeneralPertubation[];
  } catch (error) {
    logger.error('Erreur lors de la récupération des données Space-Track', { 
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined 
    });
    throw new Error(`Échec de récupération des données Space-Track: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};