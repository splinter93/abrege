/**
 * Gestion des erreurs pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentResponse } from '@/types/specializedAgents';

export class ErrorHandler {
  /**
   * Gérer les erreurs 400 de Groq (requête invalide)
   */
  static handleGroq400Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.error(`[ErrorHandler] ❌ Erreur 400 Groq:`, {
      traceId,
      model,
      error: errorText
    });

    const errorMessage = `❌ Erreur de requête Groq (400).

🔍 **Détails** : ${errorText}

💡 **Solutions possibles** :
- Vérifier le format de la requête
- Réduire la taille de l'input
- Vérifier les paramètres du modèle

Modèle utilisé : ${model}`;

    return {
      success: false,
      error: errorMessage,
      metadata: {
        agentId: 'unknown',
        executionTime: 0,
        model
      }
    };
  }

  /**
   * Gérer les erreurs 413 de Groq (payload trop volumineux)
   */
  static handleGroq413Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.error(`[ErrorHandler] ❌ Erreur 413 Groq (payload trop volumineux):`, {
      traceId,
      model,
      error: errorText
    });

    const errorMessage = `🖼️ Image trop volumineuse pour Groq.

📏 **Limite base64** : 4MB maximum
💡 **Solution** : Utilisez une URL d'image au lieu d'un encodage base64

Modèle utilisé : ${model}`;

    return {
      success: false,
      error: errorMessage,
      metadata: {
        agentId: 'unknown',
        executionTime: 0,
        model
      }
    };
  }

  /**
   * Gérer les erreurs génériques
   */
  static handleGenericError(
    error: unknown,
    agentId: string,
    traceId: string,
    model: string
  ): SpecializedAgentResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error(`[ErrorHandler] ❌ Erreur générique:`, {
      traceId,
      agentId,
      model,
      error: errorMessage
    });

    return {
      success: false,
      error: `Erreur lors de l'exécution: ${errorMessage}`,
      metadata: {
        agentId,
        executionTime: 0,
        model
      }
    };
  }
}


