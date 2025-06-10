'use server';
import { prisma } from '@/lib/prisma';
import redisClient from '@/lib/redis';
import logger from '@/lib/logger';
import { authenticateToSpaceTrack } from './auth';
import { SPACE_TRACK_API_URL } from './constants';
import { SpaceTrack_GeneralPertubation } from './general-pertubation';
import fetch from 'node-fetch';
import https from 'node:https';
import { setTimeout } from 'node:timers/promises';
import { gzip, unzip } from 'node:zlib';
import { promisify } from 'node:util';

// Promisify zlib functions
const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

// Clés Redis pour le cache
const SPACE_TRACK_CACHE_KEY = 'space_track:gp:cache';
const SPACE_TRACK_LAST_SYNC_KEY = 'space_track:gp:last_sync';
const SPACE_TRACK_SYNC_LOCK_KEY = 'space_track:gp:sync_lock';

// Configuration du backoff exponentiel
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 seconde

/**
 * Vérifie si une synchronisation est déjà en cours
 * @returns {Promise<boolean>} true si une synchronisation est en cours
 */
const isSyncInProgress = async (): Promise<boolean> => {
  const lockExists = await redisClient.get<string>(SPACE_TRACK_SYNC_LOCK_KEY);
  return !!lockExists;
};

/**
 * Acquiert un verrou pour la synchronisation
 * @param {number} ttl Durée de vie du verrou en secondes
 * @returns {Promise<boolean>} true si le verrou a été acquis
 */
const acquireSyncLock = async (ttl: number = 300): Promise<boolean> => {
  try {
    await redisClient.set(SPACE_TRACK_SYNC_LOCK_KEY, 'locked', ttl);
    return true;
  } catch (error) {
    logger.error('Erreur lors de l\'acquisition du verrou', { error });
    return false;
  }
};

/**
 * Libère le verrou de synchronisation
 */
const releaseSyncLock = async (): Promise<void> => {
  await redisClient.del(SPACE_TRACK_SYNC_LOCK_KEY);
};

/**
 * Récupère la date de dernière synchronisation
 * @returns {Promise<Date | null>} Date de dernière synchronisation ou null
 */
const getLastSyncDate = async (): Promise<Date | null> => {
  const lastSyncStr = await redisClient.get<string>(SPACE_TRACK_LAST_SYNC_KEY);
  return lastSyncStr ? new Date(lastSyncStr) : null;
};

/**
 * Met à jour la date de dernière synchronisation
 * @param {Date} date Date de synchronisation
 */
const updateLastSyncDate = async (date: Date = new Date()): Promise<void> => {
  await redisClient.set(SPACE_TRACK_LAST_SYNC_KEY, date.toISOString());
};

/**
 * Récupère les données du cache
 * @returns {Promise<SpaceTrack_GeneralPertubation[] | null>} Données en cache ou null
 */
const getCachedData = async (): Promise<SpaceTrack_GeneralPertubation[] | null> => {
  const compressedData = await redisClient.get<Buffer>(SPACE_TRACK_CACHE_KEY);
  if (!compressedData) return null;
  
  try {
    // S'assurer que compressedData est bien un Buffer
    const buffer = Buffer.isBuffer(compressedData)
      ? compressedData
      : Buffer.from(compressedData as unknown as string);
    
    const decompressedData = await unzipAsync(buffer);
    return JSON.parse(decompressedData.toString());
  } catch (error) {
    logger.error('Erreur lors de la décompression des données du cache', { error });
    return null;
  }
};

/**
 * Met en cache les données compressées
 * @param {SpaceTrack_GeneralPertubation[]} data Données à mettre en cache
 * @param {number} ttl Durée de vie du cache en secondes
 */
const cacheData = async (
  data: SpaceTrack_GeneralPertubation[],
  ttl: number = 3600
): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data);
    const compressedData = await gzipAsync(Buffer.from(jsonData));
    
    // S'assurer que compressedData est bien un Buffer avant de le stocker
    if (!Buffer.isBuffer(compressedData)) {
      throw new Error('Les données compressées ne sont pas un Buffer valide');
    }
    
    await redisClient.set(SPACE_TRACK_CACHE_KEY, compressedData, ttl);
    logger.info('Données mises en cache avec succès', {
      count: data.length,
      compressedSize: compressedData.length,
      originalSize: jsonData.length,
      compressionRatio: (compressedData.length / jsonData.length).toFixed(2),
    });
  } catch (error) {
    logger.error('Erreur lors de la mise en cache des données', { error });
  }
};

/**
 * Construit l'URL de requête avec les paramètres de synchronisation différentielle
 * @param {Date | null} lastSyncDate Date de dernière synchronisation
 * @returns {string} URL de requête
 */
const buildQueryUrl = (lastSyncDate: Date | null): string => {
  let url = `${SPACE_TRACK_API_URL}/basicspacedata/query/class/gp`;
  
  // Limiter le nombre de résultats pour les tests
  url += '/limit/100';
  
  // Si nous avons une date de dernière synchronisation, ne récupérer que les données plus récentes
  if (lastSyncDate) {
    const formattedDate = lastSyncDate.toISOString().replace('T', ' ').replace('Z', '');
    url += `/predicates/EPOCH>${formattedDate}`;
  }
  
  // Ordonner par EPOCH pour faciliter les synchronisations futures
  url += '/orderby/EPOCH%20asc';
  
  return url;
};

/**
 * Effectue une requête à l'API Space-Track avec gestion des erreurs et backoff exponentiel
 * @param {string} url URL de la requête
 * @param {string} sessionCookies Cookies de session
 * @returns {Promise<SpaceTrack_GeneralPertubation[]>} Données récupérées
 */
const fetchWithRetry = async (
  url: string,
  sessionCookies: string
): Promise<SpaceTrack_GeneralPertubation[]> => {
  let attempt = 0;
  
  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      logger.debug(`Tentative ${attempt + 1}/${MAX_RETRY_ATTEMPTS} pour ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip',
          Cookie: sessionCookies,
        },
        agent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });
      
      if (response.status === 200) {
        const content = await response.json();
        
        if (!Array.isArray(content)) {
          throw new Error('Format de réponse inattendu de Space-Track');
        }
        
        return content as SpaceTrack_GeneralPertubation[];
      }
      
      // Si le statut est 429 (Too Many Requests) ou 5xx, on réessaie
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        
        logger.warn(`Limite de requêtes atteinte ou erreur serveur, attente de ${waitTime}ms avant réessai`, {
          status: response.status,
          attempt: attempt + 1,
          waitTime,
        });
        
        await setTimeout(waitTime);
        attempt++;
        continue;
      }
      
      // Autres erreurs
      const errorBody = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${errorBody.substring(0, 200)}`);
    } catch (error) {
      if (attempt >= MAX_RETRY_ATTEMPTS - 1) {
        throw error;
      }
      
      const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      logger.warn(`Erreur lors de la requête, réessai dans ${waitTime}ms`, {
        error: error instanceof Error ? error.message : String(error),
        attempt: attempt + 1,
      });
      
      await setTimeout(waitTime);
      attempt++;
    }
  }
  
  throw new Error(`Échec après ${MAX_RETRY_ATTEMPTS} tentatives`);
};

/**
 * Traite et stocke les données dans la base de données
 * @param {SpaceTrack_GeneralPertubation[]} data Données à traiter
 */
const processAndStoreData = async (data: SpaceTrack_GeneralPertubation[]): Promise<void> => {
  logger.info(`Traitement de ${data.length} objets orbitaux`);
  
  // Traitement par lots pour éviter de surcharger la base de données
  const batchSize = 50;
  const batches = Math.ceil(data.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, data.length);
    const batch = data.slice(start, end);
    
    logger.debug(`Traitement du lot ${i + 1}/${batches} (${batch.length} objets)`);
    
    // Traitement parallèle des objets du lot
    await Promise.all(
      batch.map(async (item) => {
        try {
          // Vérifier si l'objet existe déjà dans la base de données
          const existingObjectQuery = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM space_objects WHERE "noradId" = ${item.NORAD_CAT_ID}
          `;
          const existingObject = existingObjectQuery.length > 0;
          
          // Préparer les données pour l'insertion/mise à jour
          const objectData = {
            noradId: item.NORAD_CAT_ID,
            name: item.OBJECT_NAME || `Unknown-${item.NORAD_CAT_ID}`,
            objectType: item.OBJECT_TYPE || 'UNKNOWN',
            countryCode: item.COUNTRY_CODE || 'UNK',
            launchDate: item.LAUNCH_DATE || null,
            epoch: item.EPOCH || null,
            meanMotion: item.MEAN_MOTION || null,
            eccentricity: item.ECCENTRICITY || null,
            inclination: item.INCLINATION || null,
            raOfAscNode: item.RA_OF_ASC_NODE || null,
            argOfPericenter: item.ARG_OF_PERICENTER || null,
            meanAnomaly: item.MEAN_ANOMALY || null,
            period: item.PERIOD || null,
            apoapsis: item.APOAPSIS || null,
            periapsis: item.PERIAPSIS || null,
            lastUpdated: new Date(),
            rawData: item as unknown as Record<string, unknown>,
          };
          
          // Utiliser une requête SQL brute pour l'upsert
          if (existingObject) {
            // Mise à jour
            await prisma.$executeRaw`
              UPDATE space_objects
              SET
                name = ${objectData.name},
                "objectType" = ${objectData.objectType},
                "countryCode" = ${objectData.countryCode},
                "launchDate" = ${objectData.launchDate},
                epoch = ${objectData.epoch},
                "meanMotion" = ${objectData.meanMotion},
                eccentricity = ${objectData.eccentricity},
                inclination = ${objectData.inclination},
                "raOfAscNode" = ${objectData.raOfAscNode},
                "argOfPericenter" = ${objectData.argOfPericenter},
                "meanAnomaly" = ${objectData.meanAnomaly},
                period = ${objectData.period},
                apoapsis = ${objectData.apoapsis},
                periapsis = ${objectData.periapsis},
                "lastUpdated" = ${objectData.lastUpdated},
                "rawData" = ${JSON.stringify(objectData.rawData)}
              WHERE "noradId" = ${item.NORAD_CAT_ID}
            `;
          } else {
            // Création
            await prisma.$executeRaw`
              INSERT INTO space_objects (
                id, "noradId", name, "objectType", "countryCode", "launchDate",
                epoch, "meanMotion", eccentricity, inclination, "raOfAscNode",
                "argOfPericenter", "meanAnomaly", period, apoapsis, periapsis,
                "lastUpdated", "rawData", "createdAt"
              ) VALUES (
                ${crypto.randomUUID()}, ${item.NORAD_CAT_ID}, ${objectData.name},
                ${objectData.objectType}, ${objectData.countryCode}, ${objectData.launchDate},
                ${objectData.epoch}, ${objectData.meanMotion}, ${objectData.eccentricity},
                ${objectData.inclination}, ${objectData.raOfAscNode}, ${objectData.argOfPericenter},
                ${objectData.meanAnomaly}, ${objectData.period}, ${objectData.apoapsis},
                ${objectData.periapsis}, ${objectData.lastUpdated},
                ${JSON.stringify(objectData.rawData)}, ${new Date()}
              )
            `;
            
            logger.info(`Nouvel objet orbital détecté: ${item.OBJECT_NAME || item.NORAD_CAT_ID}`);
            // Ici, on pourrait implémenter une logique de notification
          }
        } catch (error) {
          logger.error(`Erreur lors du traitement de l'objet ${item.NORAD_CAT_ID}`, {
            error: error instanceof Error ? error.message : String(error),
            object: item.OBJECT_NAME || item.NORAD_CAT_ID,
          });
        }
      })
    );
  }
  
  logger.info('Traitement des données terminé');
};

/**
 * Synchronise les données de Space-Track
 * @param {boolean} forceSync Forcer la synchronisation même si une synchronisation récente a été effectuée
 * @returns {Promise<{ success: boolean, message: string, count?: number }>} Résultat de la synchronisation
 */
export const syncSpaceTrackData = async (
  forceSync: boolean = false
): Promise<{ success: boolean; message: string; count?: number }> => {
  // Vérifier si une synchronisation est déjà en cours
  if (await isSyncInProgress()) {
    return {
      success: false,
      message: 'Une synchronisation est déjà en cours',
    };
  }
  
  try {
    // Acquérir le verrou de synchronisation
    if (!(await acquireSyncLock())) {
      return {
        success: false,
        message: 'Impossible d\'acquérir le verrou de synchronisation',
      };
    }
    
    logger.info('Début de la synchronisation des données Space-Track');
    
    // Récupérer la date de dernière synchronisation
    const lastSyncDate = forceSync ? null : await getLastSyncDate();
    
    // Si une synchronisation a été effectuée récemment (moins de 15 minutes) et qu'on ne force pas
    if (
      lastSyncDate &&
      !forceSync &&
      new Date().getTime() - lastSyncDate.getTime() < 15 * 60 * 1000
    ) {
      logger.info('Synchronisation récente, utilisation du cache');
      
      // Récupérer les données du cache
      const cachedData = await getCachedData();
      
      if (cachedData) {
        logger.info(`${cachedData.length} objets récupérés depuis le cache`);
        await releaseSyncLock();
        return {
          success: true,
          message: 'Données récupérées depuis le cache',
          count: cachedData.length,
        };
      }
      
      // Si le cache est vide, on continue avec une synchronisation complète
      logger.warn('Cache vide, exécution d\'une synchronisation complète');
    }
    
    // Authentification pour obtenir les cookies de session
    const sessionCookies = await authenticateToSpaceTrack();
    
    // Construire l'URL de requête
    const queryUrl = buildQueryUrl(lastSyncDate);
    logger.debug(`URL de requête: ${queryUrl}`);
    
    // Récupérer les données avec gestion des erreurs et backoff exponentiel
    const data = await fetchWithRetry(queryUrl, sessionCookies);
    logger.info(`${data.length} objets récupérés depuis Space-Track`);
    
    // Si aucune donnée n'est récupérée, on utilise le cache
    if (data.length === 0) {
      logger.info('Aucune nouvelle donnée, utilisation du cache');
      const cachedData = await getCachedData();
      
      if (cachedData) {
        await updateLastSyncDate();
        await releaseSyncLock();
        return {
          success: true,
          message: 'Aucune nouvelle donnée, utilisation du cache',
          count: cachedData.length,
        };
      }
    }
    
    // Traiter et stocker les données
    await processAndStoreData(data);
    
    // Mettre en cache les données
    await cacheData(data);
    
    // Mettre à jour la date de dernière synchronisation
    await updateLastSyncDate();
    
    logger.info('Synchronisation des données Space-Track terminée avec succès');
    
    return {
      success: true,
      message: 'Synchronisation réussie',
      count: data.length,
    };
  } catch (error) {
    logger.error('Erreur lors de la synchronisation des données Space-Track', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return {
      success: false,
      message: `Erreur lors de la synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  } finally {
    // Libérer le verrou de synchronisation
    await releaseSyncLock();
  }
};

/**
 * Récupère les données de Space-Track, en utilisant le cache si disponible
 * @returns {Promise<SpaceTrack_GeneralPertubation[]>} Données de Space-Track
 */
export const getSpaceTrackData = async (): Promise<SpaceTrack_GeneralPertubation[]> => {
  try {
    // Essayer de récupérer les données du cache
    const cachedData = await getCachedData();
    
    if (cachedData) {
      logger.info(`${cachedData.length} objets récupérés depuis le cache`);
      return cachedData;
    }
    
    // Si le cache est vide, lancer une synchronisation
    logger.info('Cache vide, lancement d\'une synchronisation');
    const syncResult = await syncSpaceTrackData(true);
    
    if (!syncResult.success) {
      throw new Error(syncResult.message);
    }
    
    // Récupérer les données du cache après la synchronisation
    const freshData = await getCachedData();
    
    if (!freshData) {
      throw new Error('Impossible de récupérer les données après synchronisation');
    }
    
    return freshData;
  } catch (error) {
    logger.error('Erreur lors de la récupération des données Space-Track', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};