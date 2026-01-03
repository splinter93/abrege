/**
 * Export centralisé du service ModelOverrideService
 * 
 * Pattern singleton : initialise le service avec les rules par défaut
 * Conforme aux services LLM existants (SystemMessageBuilder.getInstance())
 */

import { ModelOverrideService } from './ModelOverrideService';
import { ImageSupportRule } from './rules/ImageSupportRule';
import { ReasoningOverrideRule } from './rules/ReasoningOverrideRule';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Instance singleton du service avec rules initialisées
 */
let serviceInstance: ModelOverrideService | null = null;

/**
 * Récupère l'instance du service avec les rules initialisées
 * 
 * Lazy initialization : les rules sont enregistrées au premier appel
 */
function getServiceInstance(): ModelOverrideService {
  if (!serviceInstance) {
    serviceInstance = ModelOverrideService.getInstance();
    
    // Enregistrer les rules par défaut (ordre = priorité)
    // 1. ImageSupportRule (priorité haute : images critiques)
    serviceInstance.registerRule(new ImageSupportRule());
    
    // 2. ReasoningOverrideRule (priorité basse : préférence utilisateur)
    serviceInstance.registerRule(new ReasoningOverrideRule());
    
    logger.info('[ModelOverride] ✅ Service initialisé avec rules par défaut');
  }
  
  return serviceInstance;
}

/**
 * Export du service singleton
 */
export const modelOverrideService = getServiceInstance();

// Export des types pour utilisation externe
export type {
  ModelOverrideContext,
  ModelOverrideResult,
  ModelOverrideRule,
  LLMParams
} from './types';

export type { ModelResolutionResult } from './ModelOverrideService';

