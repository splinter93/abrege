/**
 * Service de gestion des erreurs Groq pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentResponse } from '@/types/specializedAgents';

/**
 * Service de gestion des erreurs Groq
 */
export class GroqErrorHandler {
  /**
   * Gère les erreurs 400 de Groq (limitations d'images)
   */
  handleGroq400Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.warn(`[GroqErrorHandler] ⚠️ Erreur 400 Groq - Limitations d'image`, {
      traceId,
      model,
      error: errorText
    });

    // Message d'erreur explicite pour l'utilisateur
    const errorMessage = `🖼️ Erreur d'image détectée par Groq. Vérifiez les limitations suivantes :

📏 **Taille maximale** : 20MB par image
🖥️ **Résolution maximale** : 33 mégapixels (33,177,600 pixels)
📊 **Images par requête** : Maximum 5 images
📝 **Format supporté** : JPG, PNG, WebP, GIF

💡 **Solutions** :
- Réduisez la taille de votre image
- Compressez l'image avant l'envoi
- Vérifiez que l'URL de l'image est accessible

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
   * Gère les erreurs 413 de Groq (images base64 trop grandes)
   */
  handleGroq413Error(errorText: string, traceId: string, model: string): SpecializedAgentResponse {
    logger.warn(`[GroqErrorHandler] ⚠️ Erreur 413 Groq - Image base64 trop grande`, {
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
}

