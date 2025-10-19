/**
 * Tools minimaux pour xAI Grok
 * 
 * Version simplifiée avec seulement les 5 tools essentiels
 * Garantit 100% de compatibilité xAI
 */

import type { Tool } from './types/strictTypes';

/**
 * 5 tools essentiels pour Donna/xAI
 * Format ultra-simple, testé et validé
 */
export const MINIMAL_XAI_TOOLS: Tool[] = [
  // 1. Créer une note
  {
    type: 'function',
    function: {
      name: 'createNote',
      description: 'Créer une nouvelle note dans un classeur',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel)'
          }
        },
        required: ['source_title', 'notebook_id']
      }
    }
  },

  // 2. Rechercher dans les notes
  {
    type: 'function',
    function: {
      name: 'searchContent',
      description: 'Rechercher dans les notes, classeurs et fichiers',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Terme de recherche'
          },
          type: {
            type: 'string',
            description: 'Type de contenu à rechercher',
            enum: ['all', 'notes', 'classeurs', 'files']
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum de résultats'
          }
        },
        required: ['q']
      }
    }
  },

  // 3. Lister les classeurs
  {
    type: 'function',
    function: {
      name: 'listClasseurs',
      description: 'Récupérer la liste des classeurs de l\'utilisateur',
      parameters: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'ID de l\'utilisateur (optionnel, auto-détecté)'
          }
        }
      }
    }
  },

  // 4. Récupérer une note
  {
    type: 'function',
    function: {
      name: 'getNote',
      description: 'Récupérer une note par son ID ou slug',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note'
          }
        },
        required: ['ref']
      }
    }
  },

  // 5. Mettre à jour une note
  {
    type: 'function',
    function: {
      name: 'updateNote',
      description: 'Mettre à jour le contenu d\'une note existante',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note'
          },
          source_title: {
            type: 'string',
            description: 'Nouveau titre (optionnel)'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown (optionnel)'
          }
        },
        required: ['ref']
      }
    }
  }
];

/**
 * Obtenir les tools minimaux pour xAI
 */
export function getMinimalXAITools(): Tool[] {
  return MINIMAL_XAI_TOOLS;
}

