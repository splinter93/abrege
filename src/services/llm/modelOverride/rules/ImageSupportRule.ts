/**
 * Rule : Fallback automatique vers Llama 4 Maverick si images présentes
 * 
 * Logique :
 * - Si provider === 'xai' → pas de switch (xAI a la vision native)
 * - Si hasImages === false → pas de switch
 * - Si modèle actuel supporte déjà les images → pas de switch
 * - Sinon → switch vers Llama 4 Maverick
 * 
 * Modèle fallback : meta-llama/llama-4-maverick-17b-128e-instruct
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ModelOverrideContext, ModelOverrideResult, ModelOverrideRule } from '../types';
import { getModelInfo } from '@/constants/groqModels';

/**
 * Modèle fallback pour la vision
 * 
 * Note: Llama 4 Scout est explicitement documenté comme supportant les images
 * Llama 4 Maverick pourrait ne pas supporter les images via l'API Groq
 */
const VISION_FALLBACK_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/**
 * Rule pour le fallback automatique vers un modèle avec vision
 */
export class ImageSupportRule implements ModelOverrideRule {
  name = 'ImageSupport';

  /**
   * Détermine si la rule doit être appliquée
   * 
   * Conditions :
   * - Provider !== 'xai' (xAI a la vision native)
   * - hasImages === true
   * - Modèle actuel ne supporte pas les images
   */
  shouldApply(context: ModelOverrideContext): boolean {
    // xAI a la vision native → pas de switch
    if (context.provider === 'xai') {
      return false;
    }

    // Pas d'images → pas de switch
    if (!context.hasImages) {
      return false;
    }

    // Vérifier si le modèle actuel supporte les images
    const modelSupportsImages = this.modelSupportsImages(context.originalModel);
    
    if (modelSupportsImages) {
      logger.dev(`[ImageSupportRule] ✅ Modèle ${context.originalModel} supporte déjà les images`);
      return false;
    }

    return true;
  }

  /**
   * Applique l'override : switch vers Llama 4 Maverick
   */
  apply(context: ModelOverrideContext): ModelOverrideResult {
    logger.info(`[ImageSupportRule] 🖼️ Switch vers modèle avec vision:`, {
      originalModel: context.originalModel,
      fallbackModel: VISION_FALLBACK_MODEL,
      provider: context.provider
    });

    return {
      model: VISION_FALLBACK_MODEL,
      originalModel: context.originalModel,
      reason: `Modèle ${context.originalModel} ne supporte pas les images → switch vers Llama 4 Maverick`,
      wasOverridden: true
    };
  }

  /**
   * Vérifie si un modèle supporte les images
   * 
   * Utilise getModelInfo() pour vérifier les capabilities
   * 
   * @param modelId - ID du modèle à vérifier
   * @returns True si le modèle supporte les images
   */
  private modelSupportsImages(modelId: string): boolean {
    const modelInfo = getModelInfo(modelId);
    
    if (!modelInfo) {
      // Si modèle inconnu, on assume qu'il ne supporte pas les images (sécurité)
      logger.warn(`[ImageSupportRule] ⚠️ Modèle inconnu: ${modelId}, assume pas de support images`);
      return false;
    }

    // Vérifier si 'images' est dans les capabilities
    const supportsImages = modelInfo.capabilities.includes('images');
    
    logger.dev(`[ImageSupportRule] 🔍 Vérification support images:`, {
      model: modelId,
      capabilities: modelInfo.capabilities,
      supportsImages
    });

    return supportsImages;
  }
}

