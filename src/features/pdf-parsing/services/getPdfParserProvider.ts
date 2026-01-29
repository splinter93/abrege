/**
 * Factory : retourne le provider de parsing PDF configuré via env ou override (query pdf_parser).
 * PDF_PARSER_PROVIDER=railway (défaut) | mistral.
 * Override : pdf_parser=railway|mistral en query pour le choix utilisateur (settings chat).
 */

import { logger, LogCategory } from '@/utils/logger';
import type { IPdfParserProvider } from './contract';
import { MistralOcrAdapter, RailwayHybridAdapter } from './adapters';

const PROVIDER_ENV = 'PDF_PARSER_PROVIDER';
const DEFAULT_PROVIDER = 'railway';

let cachedDefaultProvider: IPdfParserProvider | null = null;
const cachedByOverride: Record<string, IPdfParserProvider> = {};

function getProviderIdFromEnv(): string {
  const raw = process.env[PROVIDER_ENV];
  if (raw && raw.trim().length > 0) {
    return raw.trim().toLowerCase();
  }
  return DEFAULT_PROVIDER;
}

function getProviderById(id: string): IPdfParserProvider {
  if (id === 'railway') {
    if (!cachedByOverride['railway']) {
      cachedByOverride['railway'] = new RailwayHybridAdapter();
    }
    return cachedByOverride['railway'];
  }
  if (id === 'mistral') {
    if (!cachedByOverride['mistral']) {
      cachedByOverride['mistral'] = new MistralOcrAdapter();
    }
    return cachedByOverride['mistral'];
  }
  logger.warn(LogCategory.API, '[getPdfParserProvider] Unknown provider id', { id });
  return getProviderById('railway');
}

/**
 * Retourne le provider à utiliser.
 * @param overrideId - Optionnel : 'railway' | 'mistral' (ex. depuis query pdf_parser). Si fourni et valide, ce provider est utilisé.
 */
export function getPdfParserProvider(overrideId?: string): IPdfParserProvider {
  const override = overrideId?.trim().toLowerCase();
  if (override === 'railway' || override === 'mistral') {
    return getProviderById(override);
  }
  if (cachedDefaultProvider !== null) {
    return cachedDefaultProvider;
  }
  const id = getProviderIdFromEnv();
  if (id === 'railway') {
    cachedDefaultProvider = new RailwayHybridAdapter();
    return cachedDefaultProvider;
  }
  if (id === 'mistral') {
    cachedDefaultProvider = new MistralOcrAdapter();
    return cachedDefaultProvider;
  }
  logger.warn(LogCategory.API, '[getPdfParserProvider] Unknown env provider, fallback to railway', {
    provided: id,
    envKey: PROVIDER_ENV,
  });
  cachedDefaultProvider = new RailwayHybridAdapter();
  return cachedDefaultProvider;
}
