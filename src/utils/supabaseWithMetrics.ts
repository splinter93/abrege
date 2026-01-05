/**
 * Wrapper Supabase avec tracking automatique des latences DB
 * Intercepte toutes les queries et enregistre latences via MetricsCollector
 * Conforme GUIDE-EXCELLENCE-CODE.md : zero any, interfaces explicites
 */

import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import { metricsCollector } from '@/services/monitoring/MetricsCollector';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Créer un client Supabase avec tracking automatique des latences
 */
export function createSupabaseClientWithMetrics(
  url: string,
  key: string,
  options?: SupabaseClientOptions<'public'>
): SupabaseClient {
  const baseClient = createClient(url, key, options);

  // Wrapper pour intercepter les queries
  return new Proxy(baseClient, {
    get(target, prop) {
      const original = target[prop as keyof SupabaseClient];
      
      // Intercepter la méthode `from()` qui est le point d'entrée pour toutes les queries
      if (prop === 'from' && typeof original === 'function') {
        return (table: string) => {
          const queryBuilder = (original as (table: string) => unknown)(table);
          return wrapQueryBuilder(queryBuilder, table);
        };
      }
      
      // Retourner les autres propriétés/méthodes telles quelles
      if (typeof original === 'function') {
        return original.bind(target);
      }
      return original;
    }
  });
}

/**
 * Wrapper pour le query builder Supabase
 * Intercepte select, insert, update, delete pour mesurer latence
 */
function wrapQueryBuilder(queryBuilder: unknown, table: string): unknown {
  // Créer un proxy pour intercepter les méthodes du query builder
  return new Proxy(queryBuilder as Record<string, unknown>, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];
      
      // Intercepter les méthodes qui exécutent des queries
      if (prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete' || prop === 'upsert') {
        return (...args: unknown[]) => {
          const result = (original as (...args: unknown[]) => unknown).apply(target, args);
          
          // Si c'est une Promise (query exécutée), mesurer la latence
          if (result && typeof result === 'object' && 'then' in result) {
            return measureQueryLatency(result as Promise<unknown>, table, prop as string);
          }
          
          return result;
        };
      }
      
      // Pour les méthodes de chaînage (eq, order, limit, etc.), retourner le wrapper
      if (typeof original === 'function') {
        return (...args: unknown[]) => {
          const result = original.apply(target, args);
          
          // Si le résultat est encore un query builder, continuer à wrapper
          if (result && typeof result === 'object' && result !== target) {
            // Vérifier si c'est un query builder (a des méthodes comme select, insert, etc.)
            if ('select' in result || 'insert' in result || 'update' in result || 'delete' in result) {
              return wrapQueryBuilder(result, table);
            }
          }
          
          return result;
        };
      }
      
      return original;
    }
  });
}

/**
 * Mesurer la latence d'une query et l'enregistrer
 */
async function measureQueryLatency<T>(
  queryPromise: Promise<T>,
  table: string,
  operation: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryPromise;
    const latency = Date.now() - startTime;
    
    // Enregistrer la latence
    metricsCollector.recordDbQuery(table, latency);
    
    // Logger si latence élevée
    if (latency > 1000) {
      logger.warn(LogCategory.MONITORING, `[SupabaseMetrics] Slow query detected`, {
        table,
        operation,
        latency
      });
    }
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Enregistrer quand même la latence (même en cas d'erreur)
    metricsCollector.recordDbQuery(table, latency);
    
    logger.error(LogCategory.MONITORING, `[SupabaseMetrics] Query error`, {
      table,
      operation,
      latency
    }, error as Error);
    
    throw error;
  }
}

/**
 * Helper pour wrapper un client Supabase existant
 * Utile pour migrer progressivement
 */
export function wrapSupabaseClient(client: SupabaseClient): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Créer un nouveau client avec metrics (même config)
  return createSupabaseClientWithMetrics(url, key);
}

