/**
 * Factory : retourne le provider de parsing PDF configuré via env.
 * PDF_PARSER_PROVIDER=railway (défaut) | custom (futur).
 */

import { logger, LogCategory } from '@/utils/logger';
import type { IPdfParserProvider } from './contract';
import { RailwayHybridAdapter } from './adapters';

const PROVIDER_ENV = 'PDF_PARSER_PROVIDER';
const DEFAULT_PROVIDER = 'railway';

let cachedProvider: IPdfParserProvider | null = null;

function getProviderId(): string {
  const raw = process.env[PROVIDER_ENV];
  if (raw && raw.trim().length > 0) {
    return raw.trim().toLowerCase();
  }
  return DEFAULT_PROVIDER;
}

/**
 * Retourne le provider singleton configuré.
 * Valeur inconnue → fallback sur railway + log warn.
 */
export function getPdfParserProvider(): IPdfParserProvider {
  if (cachedProvider !== null) {
    return cachedProvider;
  }
  const id = getProviderId();
  if (id === 'railway') {
    cachedProvider = new RailwayHybridAdapter();
    return cachedProvider;
  }
  logger.warn(LogCategory.API, '[getPdfParserProvider] Unknown provider, fallback to railway', {
    provided: id,
    envKey: PROVIDER_ENV,
  });
  cachedProvider = new RailwayHybridAdapter();
  return cachedProvider;
}
