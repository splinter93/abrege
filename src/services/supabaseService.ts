import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import { ENV } from '@/config/env';

// Cache pour éviter les créations multiples de clients
let supabaseClient: SupabaseClient | null = null;

/**
 * Service centralisé pour Supabase avec cache
 * Évite les créations multiples de clients et optimise les performances
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = ENV.supabase.url;
    const supabaseAnonKey = ENV.supabase.anonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Logs conditionnels pour éviter le spam en production
    if (ENV.isDevelopment) {
      logger.dev('🔧 Initialisation client Supabase centralisé');
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

/**
 * Cache simple pour les requêtes fréquentes
 * Ne pas utiliser pour des données critiques ou multi-user
 */
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCachedQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  const cached = queryCache.get(key);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    if (ENV.isDevelopment) {
      logger.dev(`📦 Cache hit pour: ${key}`);
    }
    return Promise.resolve(cached.data as T);
  }

  return queryFn().then(data => {
    queryCache.set(key, { data, timestamp: now });
    if (ENV.isDevelopment) {
      logger.dev(`💾 Cache miss pour: ${key}`);
    }
    return data;
  });
}

/**
 * Nettoyer le cache (utile pour les tests ou en cas de problème)
 */
export function clearCache(): void {
  queryCache.clear();
  if (ENV.isDevelopment) {
    logger.dev('🧹 Cache Supabase nettoyé');
  }
} 