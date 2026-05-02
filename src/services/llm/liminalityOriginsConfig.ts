/**
 * Config unique pour les appels HTTP vers le backend Liminality / Synesia Origins
 * (GET /execution, GET /datasources/available, etc.) — même clé et même base URL que le provider liminality.
 */

import { getLLMConfig } from './config';

export function getLiminalityOriginsApiConfig(): { apiKey: string; baseUrl: string } {
  const config = getLLMConfig();
  const apiKey = config.providers.liminality.apiKey;
  const baseUrl = config.providers.liminality.baseUrl;

  if (!apiKey) {
    throw new Error('LIMINALITY_API_KEY manquante dans la configuration');
  }

  if (!baseUrl) {
    throw new Error('LIMINALITY_BASE_URL manquante dans la configuration');
  }

  return { apiKey, baseUrl };
}
