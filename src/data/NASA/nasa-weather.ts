'use server';
import fetch from 'node-fetch';
import https from 'node:https';

const NASA_API_URL =  process.env.NASA_WEATHER_API_URL ?? 'https://api.nasa.gov/insight_weather/';

/**
 * Type qui représente les données d'un utilisateur dans Tuleap.
 */
export type Dist_TuleapUser = {
  id: number;
  uri: string;
  user_url: string;
  real_name: string;
  display_name: string;
  username: string;
  ldap_id: string;
  avatar_url: string;
  is_anonymous: boolean;
  has_avatar: boolean;
  email?: string;
  status?: string;
};

/**
 * Fonction qui permet de récupérer le informations d'un utilisateur Tuleap.
 *
 * @param {string} token - Le token de l'API Tuleap
 * @param {string} userId - L'id de l'utilisateur à récupérer ou 'self' pour récupérer ces informations.
 * @return {*}  {(Promise<Dist_TuleapTracker | null>)}
 */
export const dist_GetUser = async (
  token: string,
  userId: number | 'self',
): Promise<Dist_TuleapUser | null> => {
  try {
    const tuleapResponse = await fetch(`${NASA_API_URL}users/${userId}`, {
      method: 'GET',
      headers: {
        'X-Auth-AccessKey': `${token}`,
        'Content-Type': 'application/json',
      },
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });
    if (!tuleapResponse.ok) return null;
    const content = await tuleapResponse.json();
    return content as Dist_TuleapUser;
  } catch {
    return null;
  }
};