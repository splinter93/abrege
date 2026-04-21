/**
 * Service de construction des messages système pour les agents spécialisés
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import type { SpecializedAgentConfig } from '@/types/specializedAgents';

/**
 * Service de construction des messages système
 */
export class SystemMessageBuilder {
  /**
   * Construire le message système spécialisé
   */
  buildSpecializedSystemMessage(agent: SpecializedAgentConfig, input: Record<string, unknown>): string {
    let systemMessage = agent.system_instructions || agent.description || '';
    
    // Ajouter le contexte spécialisé
    if (agent.input_schema && agent.input_schema.properties) {
      systemMessage += `\n\nContexte de la tâche spécialisée:\n`;
      for (const [key] of Object.entries(agent.input_schema.properties)) {
        if (input[key] !== undefined) {
          systemMessage += `- ${key}: ${JSON.stringify(input[key])}\n`;
        }
      }
    }

    // Ajouter les instructions de formatage de sortie
    if (agent.output_schema && agent.output_schema.properties) {
      systemMessage += `\n\nFormat de réponse attendu:\n`;
      for (const [key, schema] of Object.entries(agent.output_schema.properties)) {
        systemMessage += `- ${key}: ${schema.description || 'Valeur de type ' + schema.type}\n`;
      }
    }

    return systemMessage;
  }
}
