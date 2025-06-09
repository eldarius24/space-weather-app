'use server';
import redisClient from '@/lib/redis';
import logger from '@/lib/logger';
import fetch from 'node-fetch';
import https from 'node:https';
import { SPACE_TRACK_API_URL, SPACE_TRACK_SESSION_KEY, SESSION_TTL } from './constants';

/**
 * Extrait les cookies pertinents de l'en-tête Set-Cookie
 * @param setCookieHeaders L'en-tête Set-Cookie
 * @returns Les cookies formatés pour les requêtes
 */
const extractCookies = (setCookieHeaders: string): string => {
  // La structure des cookies peut être complexe car certains cookies peuvent contenir des virgules
  // Méthode plus robuste pour extraire tous les cookies
  const cookieRegex = /([^=]+=[^;]+);/g;
  const matches = [...setCookieHeaders.matchAll(cookieRegex)];
  
  // Extraire uniquement la partie NAME=VALUE de chaque cookie
  const cookies = matches
    .map(match => match[1].trim())
    // Filtrer les cookies d'authentification principaux (selon la doc de Space-Track)
    .filter(cookie => {
      const cookieName = cookie.split('=')[0].toLowerCase();
      return cookieName.includes('session') || 
             cookieName === 'spacetrack' || 
             cookieName.includes('auth');
    });
  
  logger.debug(`Cookies extraits: ${cookies.length}`);
  return cookies.join('; ');
};

/**
 * Authentifie auprès de l'API Space-Track et récupère un cookie de session
 * @returns {Promise<string>} Le cookie de session pour les requêtes ultérieures
 */
export const authenticateToSpaceTrack = async (): Promise<string> => {  try {
    // 1. Vérifier si nous avons déjà un cookie de session valide dans Redis
    const sessionCookie = await redisClient.get<string>(SPACE_TRACK_SESSION_KEY);
    
    if (sessionCookie) {
      logger.info('Session Space-Track trouvée dans Redis');
      // Vérifier que le cookie est toujours valide avec une requête simple
      try {
        const testResponse = await fetch(`${SPACE_TRACK_API_URL}/basicspacedata/modeldef/class/gp`, {
          method: 'GET',
          headers: { 'Cookie': sessionCookie },
          agent: new https.Agent({ rejectUnauthorized: false }),
        });
        
        if (testResponse.status === 200) {
          logger.info('Session Space-Track valide');
          return sessionCookie;
        }
        
        logger.warn('Session Space-Track expirée, reconnexion nécessaire');
        await redisClient.del(SPACE_TRACK_SESSION_KEY);
      } catch (error) {
        logger.error('Erreur lors de la vérification du cookie', { error });
        await redisClient.del(SPACE_TRACK_SESSION_KEY);
      }
    }    // 2. Authentification nécessaire - vérifier les identifiants
    if (!process.env.SPACE_TRACK_USERNAME || !process.env.SPACE_TRACK_PASSWORD) {
      logger.error('Identifiants Space-Track manquants');
      throw new Error('Les identifiants Space-Track ne sont pas configurés');
    }

    logger.info('Connexion à Space-Track...', { 
      username: process.env.SPACE_TRACK_USERNAME?.substring(0, 3) + '***' 
    });
    
    // 3. Préparation des données d'authentification conformément à la documentation
    const loginUrl = `${SPACE_TRACK_API_URL}/ajaxauth/login`;
    const formData = new URLSearchParams();
    formData.append('identity', process.env.SPACE_TRACK_USERNAME);
    formData.append('password', process.env.SPACE_TRACK_PASSWORD);
    
    // 4. Exécution de la requête d'authentification
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'follow',  // Important: suivre les redirections automatiquement
      agent: new https.Agent({ rejectUnauthorized: false }),
    });
      // 5. Vérification de la réponse
    if (!loginResponse.ok) {
      const errorBody = await loginResponse.text();
      logger.error('Échec d\'authentification Space-Track', { 
        status: loginResponse.status,
        statusText: loginResponse.statusText,
        errorPreview: errorBody.substring(0, 200)
      });
      throw new Error(`Échec d'authentification: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    // 6. Récupération des cookies
    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      logger.error('Aucun cookie reçu de Space-Track', {
        headers: Object.fromEntries(loginResponse.headers.entries())
      });
      throw new Error('Aucun cookie de session reçu de Space-Track');
    }
    
    // 7. Extraction et formatage du cookie pour les requêtes suivantes
    const formattedCookie = extractCookies(cookies);
      // 9. Stockage du cookie dans Redis pour 2 heures (défini dans SESSION_TTL)
    await redisClient.set(SPACE_TRACK_SESSION_KEY, formattedCookie, SESSION_TTL);
    logger.info('Authentification Space-Track réussie', { ttl: SESSION_TTL });
    
    return formattedCookie;
  } catch (error) {
    logger.error('Erreur d\'authentification à Space-Track', { 
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Échec de l'authentification à Space-Track: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

/**
 * Déconnexion de l'API Space-Track et suppression de la session Redis
 */
export const logoutFromSpaceTrack = async (): Promise<void> => {
  try {
    // Récupérer le cookie de session depuis Redis
    const spaceTrackSessionCookie = await redisClient.get<string>(SPACE_TRACK_SESSION_KEY);
    
    if (!spaceTrackSessionCookie) {
      logger.info('Aucune session Space-Track active à déconnecter');
      return; // Déjà déconnecté
    }

    logger.info('Déconnexion de Space-Track...');
    
    // Appel API pour se déconnecter
    await fetch(`${SPACE_TRACK_API_URL}/auth/logout`, {
      method: 'GET',
      headers: {
        'Cookie': spaceTrackSessionCookie,
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
    
    // Supprimer la session de Redis
    await redisClient.del(SPACE_TRACK_SESSION_KEY);
    logger.info('Déconnexion réussie de Space-Track et session supprimée de Redis');
  } catch (error) {
    logger.error('Erreur lors de la déconnexion de Space-Track', { error });
  }
};
