import { simpleLogger as logger } from '@/utils/logger';

/**
 * Exemple simplifié (stub) pour éviter les dépendances manquantes en build.
 * Les orchestrateurs complets sont testés séparément.
 */
export class SimpleChatExample {
  static async runExample() {
    logger.info('[SimpleChatExample] Exemple désactivé pour la compilation.');
    return { success: true };
  }

  static async runInteractiveExample() {
    logger.info('[SimpleChatExample] Exemple interactif désactivé pour la compilation.');
    return { success: true };
  }
}

// Fonction utilitaire pour tester
export async function testSimpleChat() {
  await SimpleChatExample.runExample();
  await SimpleChatExample.runInteractiveExample();
}
