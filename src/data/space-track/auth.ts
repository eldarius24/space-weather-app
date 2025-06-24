'use server';
import redisClient from '@/lib/redis';
import logger from '@/lib/logger';
import fetch from 'node-fetch';
import https from 'node:https';
import {
  SPACE_TRACK_API_URL,
  SPACE_TRACK_SESSION_KEY,
  SESSION_TTL,
} from './constants';

/**
 * Extrait les cookies pertinents de l'en-tête Set-Cookie
 * @param setCookieHeaders Les en-têtes Set-Cookie
 * @returns Les cookies formatés pour les requêtes
 */
const extractCookies = (setCookieHeaders: string[] | null): string => {
  if (!setCookieHeaders) return '';

  const cookies: string[] = [];

  // Traitement de chaque en-tête Set-Cookie individuellement
  setCookieHeaders.forEach((header) => {
    // Extraire la partie NAME=VALUE du cookie
    const cookiePart = header.split(';')[0];
    if (cookiePart) cookies.push(cookiePart.trim());
  });

  logger.debug(`Cookies extraits: ${cookies.length}`);
  return cookies.join('; ');
};

/**
 * Authentifie auprès de l'API Space-Track et récupère un cookie de session
 * @returns {Promise<string>} Le cookie de session pour les requêtes ultérieures
 */
export const authenticateToSpaceTrack = async (): Promise<string> => {
  logger.info("Tentative d'identification à Space-Track...");
  try {
    const sessionCookie = await redisClient.get<string>(
      SPACE_TRACK_SESSION_KEY,
    );

    if (sessionCookie) {
      logger.info('Session Space-Track trouvée dans Redis');
      return sessionCookie; // Session déjà active, pas besoin de se reconnecter
    }

    // Vérifier les identifiants
    if (
      !process.env.SPACE_TRACK_USERNAME ||
      !process.env.SPACE_TRACK_PASSWORD
    ) {
      logger.error('Identifiants Space-Track manquants');
      throw new Error('Les identifiants Space-Track ne sont pas configurés');
    }

    // Création de l'URL d'authentification selon la documentation officielle
    const loginUrl = `${SPACE_TRACK_API_URL}/ajaxauth/login`;
    const body = new URLSearchParams({
      identity: process.env.SPACE_TRACK_USERNAME || '',
      password: process.env.SPACE_TRACK_PASSWORD || '',
    });

    logger.debug("Envoi de la requête d'authentification...");

    // Exécution de la requête d'authentification
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      redirect: 'manual',
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    // Vérification de la réponse
    if (loginResponse.status !== 200) {
      const errorBody = await loginResponse.text();
      logger.error("Échec d'authentification Space-Track", {
        status: loginResponse.status,
        statusText: loginResponse.statusText,
        errorPreview: errorBody.substring(0, 200),
      });
      throw new Error(
        `Échec d'authentification: ${loginResponse.status} ${loginResponse.statusText}`,
      );
    }

    // Récupération des cookies
    const rawSetCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    if (!rawSetCookieHeaders || rawSetCookieHeaders.length === 0) {
      logger.error('Aucun cookie reçu de Space-Track', {
        headers: Object.fromEntries(loginResponse.headers.entries()),
      });
      throw new Error('Aucun cookie de session reçu de Space-Track');
    }

    // Extraction et formatage des cookies
    const formattedCookie = extractCookies(rawSetCookieHeaders);

    // Vérifier que le cookie contient bien ce qu'il faut
    if (!formattedCookie.includes('SpaceTrack')) {
      logger.warn('Cookie SpaceTrack non trouvé dans la réponse', {
        cookiePreview: formattedCookie.substring(0, 100),
      });
    }

    // Stockage du cookie dans Redis
    await redisClient.set(
      SPACE_TRACK_SESSION_KEY,
      formattedCookie,
      SESSION_TTL,
    );
    logger.info('Authentification Space-Track réussie', {
      cookieLength: formattedCookie.length,
      ttl: SESSION_TTL,
    });

    return formattedCookie;
  } catch (error) {
    logger.error("Erreur d'authentification à Space-Track", {
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Échec de l'authentification à Space-Track: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    );
  }
};
