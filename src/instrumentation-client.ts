/**
 * Sentry Client Configuration
 * Configuration pour le monitoring côté client (browser)
 * Migré depuis sentry.client.config.ts (Next.js 16+)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay (optionnel, peut être activé plus tard)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  
  // Environnement
  environment: process.env.NODE_ENV || 'development',
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Enable sending user PII (Personally Identifiable Information)
  sendDefaultPii: true,
  
  // Ignorer certaines erreurs
  ignoreErrors: [
    // Erreurs réseau communes (non critiques)
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    // Erreurs de résolution DNS
    'Resolving timed out',
  ],
  
  // Avant d'envoyer l'erreur
  beforeSend(event, hint) {
    // Filtrer les erreurs en développement
    if (process.env.NODE_ENV === 'development') {
      return null; // Ne pas envoyer en dev
    }
    
    // Ne pas envoyer si pas de DSN
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    
    return event;
  },
  
  // Tags par défaut
  initialScope: {
    tags: {
      component: 'client',
    },
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
