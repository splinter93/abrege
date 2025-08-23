/**
 * Hook d'optimisation avec useMemo pour la Phase 2 : Qualité du Code
 * Améliore les performances en évitant les recalculs inutiles
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { MemoizationConfig, PerformanceMetrics } from '@/types/quality';

// ========================================
// HOOK PRINCIPAL D'OPTIMISATION
// ========================================

export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  config?: MemoizationConfig
): T {
  const memoizedValue = useMemo(factory, deps);
  
  // Configuration de performance
  const performanceRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
  });

  // Mesure des performances
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      performanceRef.current.renderTime = endTime - startTime;
      
      if (config?.maxSize && performanceRef.current.renderTime > config.maxSize) {
        console.warn('[useOptimizedMemo] Rendu lent détecté:', performanceRef.current.renderTime, 'ms');
      }
    };
  }, [deps, config?.maxSize]);

  return memoizedValue;
}

// ========================================
// HOOK DE MÉMOISATION AVANCÉE
// ========================================

export function useAdvancedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const previousValueRef = useRef<T | undefined>(undefined);
  const previousDepsRef = useRef<React.DependencyList | undefined>(undefined);

  return useMemo(() => {
    const newValue = factory();
    
    // Vérification d'égalité personnalisée
    if (
      previousValueRef.current !== undefined &&
      previousDepsRef.current &&
      equalityFn &&
      equalityFn(previousValueRef.current, newValue)
    ) {
      return previousValueRef.current;
    }

    previousValueRef.current = newValue;
    previousDepsRef.current = deps;
    
    return newValue;
  }, deps);
}

// ========================================
// HOOK DE MÉMOISATION CONDITIONNELLE
// ========================================

export function useConditionalMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  shouldMemoize: boolean
): T {
  const memoizedValue = useMemo(factory, shouldMemoize ? deps : []);
  
  if (shouldMemoize) {
    return memoizedValue;
  }
  
  return factory();
}

// ========================================
// HOOK DE MÉMOISATION AVEC TTL
// ========================================

export function useTTLMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  ttl: number
): T {
  const valueRef = useRef<T | undefined>(undefined);
  const timestampRef = useRef<number>(0);

  return useMemo(() => {
    const now = Date.now();
    
    // Vérifier si la valeur est encore valide
    if (
      valueRef.current !== undefined &&
      timestampRef.current &&
      now - timestampRef.current < ttl
    ) {
      return valueRef.current;
    }

    // Créer une nouvelle valeur
    const newValue = factory();
    valueRef.current = newValue;
    timestampRef.current = now;
    
    return newValue;
  }, deps);
}

// ========================================
// HOOK DE MÉMOISATION DE FONCTIONS
// ========================================

export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps) as T;
}

// ========================================
// HOOK DE MÉMOISATION D'OBJETS
// ========================================

export function useMemoizedObject<T extends Record<string, unknown>>(
  object: T,
  deps: React.DependencyList
): T {
  return useMemo(() => object, deps);
}

// ========================================
// HOOK DE MÉMOISATION DE TABLEAUX
// ========================================

export function useMemoizedArray<T>(
  array: T[],
  deps: React.DependencyList
): T[] {
  return useMemo(() => array, deps);
}

// ========================================
// HOOK DE MÉMOISATION DE STRINGS
// ========================================

export function useMemoizedString(
  string: string,
  deps: React.DependencyList
): string {
  return useMemo(() => string, deps);
}

// ========================================
// HOOK DE MÉMOISATION DE NOMBRES
// ========================================

export function useMemoizedNumber(
  number: number,
  deps: React.DependencyList
): number {
  return useMemo(() => number, deps);
}

// ========================================
// HOOK DE MÉMOISATION DE BOOLEANS
// ========================================

export function useMemoizedBoolean(
  boolean: boolean,
  deps: React.DependencyList
): boolean {
  return useMemo(() => boolean, deps);
}

// ========================================
// UTILITAIRES DE PERFORMANCE
// ========================================

export function usePerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      metricsRef.current.renderTime = endTime - startTime;
      
      // Mesurer l'utilisation mémoire si disponible
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metricsRef.current.memoryUsage = memory.usedJSHeapSize;
      }
    };
  }, []);

  return metricsRef.current;
}

// ========================================
// HOOK DE DÉBOGUAGE DES PERFORMANCES
// ========================================

export function useMemoDebug<T>(
  factory: () => T,
  deps: React.DependencyList,
  label: string
): T {
  const renderCountRef = useRef(0);
  const lastRenderRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current++;
    lastRenderRef.current = Date.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useMemoDebug] ${label} - Rendu #${renderCountRef.current}`);
    }
  });

  return useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useMemoDebug] ${label} - Calcul de la valeur`);
    }
    return factory();
  }, deps);
} 