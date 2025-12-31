/**
 * Construction des messages système pour les agents
 * Extrait de SpecializedAgentManager pour respecter limite 300 lignes
 */

import type { SpecializedAgentConfig } from '@/types/specializedAgents';

export class SystemMessageBuilder {
  /**
   * Construire le message système spécialisé
   */
  static build(agent: SpecializedAgentConfig, input: Record<string, unknown>): string {
    let systemMessage = agent.system_instructions || agent.description || '';
    
    // Ajouter les instructions pour l'utilisation des tools
    systemMessage += `\n\n🔧 OUTILS DISPONIBLES :
Tu as accès à des outils pour interagir avec le système. Utilise-les quand c'est nécessaire pour répondre aux demandes de l'utilisateur.

Outils disponibles :
- get_note : Récupérer une note par ID ou slug
- update_note : Mettre à jour une note existante
- search_notes : Rechercher des notes par contenu
- list_notes : Lister toutes les notes de l'utilisateur
- create_note : Créer une nouvelle note
- delete_note : Supprimer une note
- list_classeurs : Lister les classeurs
- get_classeur : Récupérer un classeur
- create_classeur : Créer un classeur
- update_classeur : Mettre à jour un classeur
- delete_classeur : Supprimer un classeur
- list_dossiers : Lister les dossiers
- get_dossier : Récupérer un dossier
- create_dossier : Créer un dossier
- update_dossier : Mettre à jour un dossier
- delete_dossier : Supprimer un dossier

Instructions importantes :
1. Utilise les outils quand l'utilisateur demande des informations ou des actions sur ses données
2. Appelle les outils en premier pour récupérer les informations nécessaires
3. Puis fournis une réponse basée sur les résultats des outils
4. Si un outil échoue, essaie une approche alternative ou explique le problème`;
    
    // Ajouter le contexte spécialisé
    if (agent.input_schema && agent.input_schema.properties) {
      systemMessage += `\n\nContexte de la tâche spécialisée:\n`;
      for (const [key, schema] of Object.entries(agent.input_schema.properties)) {
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

