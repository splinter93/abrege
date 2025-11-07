/**
 * Exemple d'utilisation du SimpleChatOrchestrator
 * Style ChatGPT avec tools intelligents
 */

import { simpleChatOrchestrator } from '../services/SimpleChatOrchestrator';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Exemple d'utilisation du système de chat intelligent
 */
export class SimpleChatExample {
  /**
   * Exemple de conversation avec tools
   */
  static async runExample() {
    logger.info('[SimpleChatExample] 🚀 Démarrage exemple de chat intelligent');

    const context = {
      userToken: 'user-token-example',
      sessionId: 'session-123',
      maxRetries: 3,
      maxToolCalls: 20
    };

    const history = [];

    try {
      // Message 1 : Demande simple
      const response1 = await simpleChatOrchestrator.processMessage(
        "Bonjour, peux-tu me dire combien de notes j'ai ?",
        history,
        context
      );

      logger.info('[SimpleChatExample] Réponse 1:', {
        success: response1.success,
        content: response1.content,
        toolsUsed: response1.toolCalls.length,
        toolsResults: response1.toolResults.length
      });

      // Message 2 : Demande complexe avec plusieurs tools
      const response2 = await simpleChatOrchestrator.processMessage(
        "Crée une nouvelle note sur 'Mon projet' dans mon premier classeur, puis cherche des notes similaires",
        history,
        context
      );

      logger.info('[SimpleChatExample] Réponse 2:', {
        success: response2.success,
        content: response2.content,
        toolsUsed: response2.toolCalls.length,
        toolsResults: response2.toolResults.length
      });

      // Message 3 : Demande avec erreur potentielle
      const response3 = await simpleChatOrchestrator.processMessage(
        "Supprime la note avec l'ID 'note-inexistante'",
        history,
        context
      );

      logger.info('[SimpleChatExample] Réponse 3:', {
        success: response3.success,
        content: response3.content,
        toolsUsed: response3.toolCalls.length,
        toolsResults: response3.toolResults.length,
        error: response3.error
      });

      logger.info('[SimpleChatExample] ✅ Exemple terminé avec succès');

    } catch (error) {
      logger.error('[SimpleChatExample] ❌ Erreur lors de l\'exemple:', error);
    }
  }

  /**
   * Exemple de conversation interactive
   */
  static async runInteractiveExample() {
    logger.info('[SimpleChatExample] 🎮 Démarrage exemple interactif');

    const context = {
      userToken: 'user-token-example',
      sessionId: 'session-interactive',
      maxRetries: 2,
      maxToolCalls: 3
    };

    const history = [];

    // Simulation d'une conversation
    const messages = [
      "Salut ! Peux-tu me lister mes classeurs ?",
      "Parfait, maintenant crée une note de test dans le premier classeur",
      "Maintenant cherche des notes qui contiennent 'test'",
      "Supprime la note que tu viens de créer"
    ];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      logger.info(`[SimpleChatExample] 💬 Message ${i + 1}: ${message}`);

      try {
        const response = await simpleChatOrchestrator.processMessage(
          message,
          history,
          context
        );

        logger.info(`[SimpleChatExample] 🤖 Réponse ${i + 1}:`, {
          content: response.content,
          toolsUsed: response.toolCalls.map(tc => tc.function.name),
          success: response.success
        });

        // Ajouter à l'historique
        history.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        });

        history.push({
          role: 'assistant',
          content: response.content,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error(`[SimpleChatExample] ❌ Erreur message ${i + 1}:`, error);
      }
    }

    logger.info('[SimpleChatExample] ✅ Exemple interactif terminé');
  }
}

// Fonction utilitaire pour tester
export async function testSimpleChat() {
  await SimpleChatExample.runExample();
  await SimpleChatExample.runInteractiveExample();
}
