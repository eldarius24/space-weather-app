/**
 * URL de l'API Space-Track
 */
export const SPACE_TRACK_API_URL = process.env.SPACE_TRACK_API_URL ?? 'https://www.space-track.org';

/**
 * Clé Redis pour stocker le cookie de session Space-Track
 */
export const SPACE_TRACK_SESSION_KEY = 'api:space_track:session_cookie';

/**
 * TTL de la session en secondes (2 heures)
 */
export const SESSION_TTL = 7200;
