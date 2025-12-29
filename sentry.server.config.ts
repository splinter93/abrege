// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring: 10% en prod, 100% en dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Environnement
  environment: process.env.NODE_ENV || 'development',

  // Ignorer certaines erreurs non critiques
  ignoreErrors: [
    'ValidationError',
    'UnauthorizedError',
  ],

  // Avant d'envoyer l'erreur
  beforeSend(event, hint) {
    // Ne pas envoyer en développement
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Ne pas envoyer si pas de DSN
    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return null;
    }
    
    return event;
  },
});
