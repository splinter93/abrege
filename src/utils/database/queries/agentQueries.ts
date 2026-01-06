/**
 * Queries pour les agents (lecture uniquement)
 * Extrait de V2DatabaseUtils pour respecter limite 300 lignes
 */

import { logApi } from '@/utils/logger';
import type { ApiContext } from '@/utils/database/types/databaseTypes';

/**
 * Lister les agents d'un utilisateur
 */
export async function listAgents(userId: string, context: ApiContext) {
  logApi.info(`🚀 Liste agents ${userId}`, context);
  return { success: true, data: [] };
}

/**
 * Récupérer un agent par ID
 */
export async function getAgent(agentId: string, userId: string, context: ApiContext) {
  logApi.info(`🚀 Récupération agent ${agentId}`, context);
  return { success: true, data: { id: agentId } };
}

