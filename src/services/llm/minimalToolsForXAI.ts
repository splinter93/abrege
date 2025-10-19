/**
 * Tools minimaux pour xAI Grok
 * 
 * Version étendue avec 15 tools essentiels
 * Format ultra-simple, testé et validé pour xAI
 */

import type { Tool } from './types/strictTypes';

/**
 * 15 tools essentiels pour Donna/xAI
 * Format ultra-simple, garanti compatible
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
  },

  // 6. Créer un dossier
  {
    type: 'function',
    function: {
      name: 'createFolder',
      description: 'Créer un nouveau dossier dans un classeur',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du dossier'
          },
          classeur_id: {
            type: 'string',
            description: 'ID ou slug du classeur parent'
          },
          parent_folder_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel, pour sous-dossier)'
          }
        },
        required: ['name', 'classeur_id']
      }
    }
  },

  // 7. Récupérer un dossier
  {
    type: 'function',
    function: {
      name: 'getFolder',
      description: 'Récupérer les détails d\'un dossier',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier'
          }
        },
        required: ['ref']
      }
    }
  },

  // 8. Créer un classeur
  {
    type: 'function',
    function: {
      name: 'createClasseur',
      description: 'Créer un nouveau classeur',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du classeur'
          },
          description: {
            type: 'string',
            description: 'Description du classeur (optionnel)'
          },
          color: {
            type: 'string',
            description: 'Couleur du classeur en hex (ex: #FF5733)'
          }
        },
        required: ['name']
      }
    }
  },

  // 9. Récupérer un classeur
  {
    type: 'function',
    function: {
      name: 'getClasseur',
      description: 'Récupérer les détails d\'un classeur',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur'
          }
        },
        required: ['ref']
      }
    }
  },

  // 10. Supprimer une ressource
  {
    type: 'function',
    function: {
      name: 'deleteResource',
      description: 'Supprimer une ressource (note, dossier, classeur ou fichier)',
      parameters: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            description: 'Type de ressource à supprimer',
            enum: ['note', 'folder', 'classeur', 'file']
          },
          ref: {
            type: 'string',
            description: 'ID ou slug de la ressource'
          }
        },
        required: ['resource', 'ref']
      }
    }
  },

  // 11. Déplacer une note
  {
    type: 'function',
    function: {
      name: 'moveNote',
      description: 'Déplacer une note vers un autre classeur ou dossier',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note'
          },
          classeur_id: {
            type: 'string',
            description: 'ID du classeur de destination'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier de destination (optionnel)'
          }
        },
        required: ['ref', 'classeur_id']
      }
    }
  },

  // 12. Rechercher dans les fichiers
  {
    type: 'function',
    function: {
      name: 'searchFiles',
      description: 'Rechercher spécifiquement dans les fichiers uploadés',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Terme de recherche'
          },
          file_type: {
            type: 'string',
            description: 'Type de fichier à rechercher',
            enum: ['all', 'image', 'document', 'pdf', 'text']
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

  // 13. Récupérer le profil utilisateur
  {
    type: 'function',
    function: {
      name: 'getUserProfile',
      description: 'Récupérer les informations du profil utilisateur',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // 14. Lister les agents disponibles
  {
    type: 'function',
    function: {
      name: 'listAgents',
      description: 'Récupérer la liste des agents spécialisés disponibles',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // 15. Récupérer la table des matières d'une note
  {
    type: 'function',
    function: {
      name: 'getNoteTOC',
      description: 'Récupérer la table des matières structurée d\'une note',
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
  }
];

/**
 * Obtenir les tools minimaux pour xAI
 */
export function getMinimalXAITools(): Tool[] {
  return MINIMAL_XAI_TOOLS;
}

