/**
 * Next.js Instrumentation Hook
 * Initialise Sentry côté serveur
 * 
 * Ce fichier est automatiquement exécuté par Next.js au démarrage du serveur
 * Il permet d'initialiser Sentry avant que les routes API ne soient chargées
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Importer la configuration Sentry serveur
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Configuration Edge
    await import('./sentry.edge.config');
  }
}

