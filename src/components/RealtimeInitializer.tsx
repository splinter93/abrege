"use client";

import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

/**
 * Composant pour initialiser le système de polling intelligent
 * Le realtime Supabase est désactivé, on utilise uniquement le polling
 */
export default function RealtimeInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    
    logger.debug('[RealtimeInitializer] 🚀 Initialisation du système de polling intelligent...');
    logger.debug('[RealtimeInitializer] ✅ Système de polling intelligent initialisé (realtime désactivé)');
    
    return () => {
      logger.debug('[RealtimeInitializer] 🛑 Arrêt du système de polling intelligent...');
      initialized.current = false;
    };
  }, []);

  return null;
} 