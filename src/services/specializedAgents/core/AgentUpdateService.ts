/**
 * Service de mise à jour des agents spécialisés
 * Extrait de AgentCRUDService pour respecter limite 300 lignes
 */

import { createClient } from '@supabase/supabase-js';
import { simpleLogger as logger } from '@/utils/logger';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { AgentConfigService } from './AgentConfigService';
import { AgentConfigValidator } from '../validation/AgentConfigValidator';
import { SlugHelper } from './SlugHelper';

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Configuration Supabase manquante: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Service de mise à jour des agents spécialisés
 */
export class AgentUpdateService {
  private configValidator: AgentConfigValidator;

  constructor(private agentConfigService: AgentConfigService) {
    this.configValidator = new AgentConfigValidator();
  }

  /**
   * Mettre à jour complètement un agent spécialisé
   */
  async updateAgent(
    agentId: string, 
    updateData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[AgentUpdateService] 🔄 Mise à jour complète agent ${agentId}`, { traceId });

      // Validation des données de mise à jour
      const validation = this.configValidator.validateAgentConfig(updateData as Partial<SpecializedAgentConfig>);
      if (!validation.valid) {
        logger.warn(`[AgentUpdateService] ❌ Validation échouée:`, validation.errors);
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Vérifier que l'agent existe
      const existingAgent = await this.agentConfigService.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentUpdateService] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Détecter changement de display_name ou name et régénérer le slug
      const nameChanged = (
        (updateData.display_name && updateData.display_name !== existingAgent.display_name) ||
        (updateData.name && updateData.name !== existingAgent.name)
      );

      if (nameChanged) {
        const newName = (updateData.display_name || updateData.name) as string;
        const newSlug = await SlugHelper.generateAgentSlug(newName, existingAgent.id);
        updateData.slug = newSlug;
        
        logger.info(`[AgentUpdateService] 🔄 Slug agent mis à jour: "${existingAgent.slug}" → "${newSlug}"`);
      }

      // Préparer les données de mise à jour
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      // Mettre à jour en base
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(updatePayload)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[AgentUpdateService] ❌ Erreur mise à jour agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.agentConfigService.invalidateAgentCache(agentId);
      if (nameChanged && updateData.slug) {
        // Invalider aussi l'ancien slug
        this.agentConfigService.invalidateAgentCache(existingAgent.slug);
      }

      logger.dev(`[AgentUpdateService] ✅ Agent ${agentId} mis à jour`, { 
        traceId,
        updatedFields: Object.keys(updateData)
      });

      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[AgentUpdateService] ❌ Erreur mise à jour agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour partiellement un agent spécialisé
   */
  async patchAgent(
    agentId: string, 
    patchData: Record<string, unknown>, 
    traceId: string
  ): Promise<SpecializedAgentConfig | null> {
    try {
      logger.dev(`[AgentUpdateService] 🔧 Mise à jour partielle agent ${agentId}`, { traceId });

      // Vérifier que l'agent existe
      const existingAgent = await this.agentConfigService.getAgentByIdOrSlug(agentId);
      if (!existingAgent) {
        logger.warn(`[AgentUpdateService] ❌ Agent ${agentId} non trouvé`);
        return null;
      }

      // Validation seulement des champs modifiés
      const validation = this.configValidator.validateAgentConfig(patchData);
      if (!validation.valid) {
        logger.warn(`[AgentUpdateService] ❌ Validation échouée pour les champs modifiés:`, validation.errors);
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Détecter changement de display_name ou name et régénérer le slug
      const nameChanged = (
        (patchData.display_name && patchData.display_name !== existingAgent.display_name) ||
        (patchData.name && patchData.name !== existingAgent.name)
      );

      if (nameChanged) {
        const newName = (patchData.display_name || patchData.name) as string;
        const newSlug = await SlugHelper.generateAgentSlug(newName, existingAgent.id);
        patchData.slug = newSlug;
        
        logger.info(`[AgentUpdateService] 🔄 Slug agent mis à jour: "${existingAgent.slug}" → "${newSlug}"`);
      }

      // Auto-corriger le provider si le modèle change
      const modelChanged = (
        patchData.model && 
        typeof patchData.model === 'string' && 
        patchData.model !== existingAgent.model
      );

      if (modelChanged) {
        const newModel = patchData.model as string;
        
        // Déduire le provider depuis le modèle
        let deducedProvider: string;
        if (newModel.includes('grok')) {
          deducedProvider = 'xai';
        } else if (newModel.includes('openai/') || newModel.includes('llama') || newModel.includes('deepseek') || newModel.includes('mixtral')) {
          deducedProvider = 'groq';
        } else {
          deducedProvider = 'groq'; // fallback
        }
        
        // Auto-corriger le provider si nécessaire
        if (existingAgent.provider !== deducedProvider) {
          patchData.provider = deducedProvider;
          logger.info(`[AgentUpdateService] 🔄 Provider auto-corrigé: "${existingAgent.provider}" → "${deducedProvider}" (modèle: ${newModel})`);
        }
      }

      // Fusionner les données existantes avec les nouvelles
      const mergedData = {
        ...existingAgent,
        ...patchData,
        updated_at: new Date().toISOString()
      };

      // Mettre à jour en base
      const { data: updatedAgent, error } = await supabase
        .from('agents')
        .update(mergedData)
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (error) {
        logger.error(`[AgentUpdateService] ❌ Erreur patch agent:`, error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Invalider le cache
      this.agentConfigService.invalidateAgentCache(agentId);
      if (nameChanged && patchData.slug) {
        // Invalider aussi l'ancien slug
        this.agentConfigService.invalidateAgentCache(existingAgent.slug);
      }

      logger.dev(`[AgentUpdateService] ✅ Agent ${agentId} patché`, { 
        traceId,
        patchedFields: Object.keys(patchData)
      });

      return updatedAgent as SpecializedAgentConfig;

    } catch (error) {
      logger.error(`[AgentUpdateService] ❌ Erreur patch agent ${agentId}:`, error);
      throw error;
    }
  }
}

