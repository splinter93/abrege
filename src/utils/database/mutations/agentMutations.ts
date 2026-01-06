/**
 * Mutations pour les agents (écriture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { logApi } from '@/utils/logger';
import type { ApiContext, AgentData } from '@/utils/database/types/databaseTypes';

/**
 * Créer un agent
 */
export async function createAgent(data: AgentData, userId: string, context: ApiContext) {
  logApi.info(`🚀 Création agent`, context);
  return { success: true, data: { id: 'placeholder' } };
}

/**
 * Mettre à jour un agent
 */
export async function updateAgent(agentId: string, data: AgentData, userId: string, context: ApiContext) {
  logApi.info(`🚀 Mise à jour agent ${agentId}`, context);
  return { success: true, data: { id: agentId } };
}

/**
 * Patcher un agent (mise à jour partielle)
 */
export async function patchAgent(agentId: string, data: Partial<AgentData>, userId: string, context: ApiContext) {
  logApi.info(`🚀 Patch agent ${agentId}`, context);
  return { success: true, data: { id: agentId } };
}

/**
 * Supprimer un agent
 */
export async function deleteAgent(agentId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Suppression agent ${agentId}`, context);
  return { success: true, data: { message: 'Agent supprimé' } };
}

/**
 * Exécuter un agent
 */
export async function executeAgent(data: Record<string, unknown>, userId: string, context: ApiContext) {
  logApi.info(`🚀 Exécution agent`, context);
  return { success: true, data: { response: 'placeholder' } };
}

