/**
 * URL de l'API Space-Track
 */
export const SPACE_TRACK_API_URL =
  process.env.SPACE_TRACK_API_URL ?? 'https://www.space-track.org';

/**
 * Clé Redis pour stocker le cookie de session Space-Track
 */
export const SPACE_TRACK_SESSION_KEY = 'api:space_track:session_cookie';

/**
 * TTL de la session en secondes (2 heures)
 */
export const SESSION_TTL = 7200;

// Clés Redis pour le cache
export const SPACE_TRACK_CACHE_KEY = 'space_track:gp:cache';
export const SPACE_TRACK_LAST_SYNC_KEY = 'space_track:gp:last_sync';
export const SPACE_TRACK_SYNC_LOCK_KEY = 'space_track:gp:sync_lock';

// Configuration du backoff exponentiel
export const MAX_RETRY_ATTEMPTS = 5;
export const INITIAL_RETRY_DELAY = 1000; // 1 seconde

// Clés Redis pour le cache des general perturbations
export const SPACE_TRACK_GP_CACHE_KEY = 'space-track:general-perturbations';
export const SPACE_TRACK_GP_CACHE_TTL = 3600; // 1 heure en secondes