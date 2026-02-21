'use client';

import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * Composant client global pour initialiser les listeners Capacitor.
 * Monté une seule fois dans le layout racine.
 * - useCapacitorDeepLink : intercepte les deep links OAuth (scrivia://callback)
 */
export default function CapacitorInit() {
  useCapacitorDeepLink();
  return null;
}
