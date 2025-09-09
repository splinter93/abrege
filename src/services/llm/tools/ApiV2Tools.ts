/**
 * Définitions de tools TypeScript strictes pour l'API V2
 * Parfaitement fidèles aux endpoints, zéro any
 */

import { ToolDefinition } from '../types/apiV2Types';

/**
 * Collection complète des tools API V2
 * Chaque tool correspond exactement à un endpoint
 */
export const API_V2_TOOLS: ToolDefinition[] = [
  // ============================================================================
  // TOOLS POUR LES NOTES
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'createNote',
      description: 'Créer une nouvelle note dans un classeur spécifique',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note',
            maxLength: 255
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur parent'
          },
          folder_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID du dossier parent (optionnel)'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note (optionnel)'
          },
          header_image: {
            type: 'string',
            description: 'URL de l\'image d\'en-tête (optionnel)'
          }
        },
        required: ['source_title', 'notebook_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getNote',
      description: 'Récupérer une note par son ID ou slug avec toutes ses métadonnées',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          fields: {
            type: 'string',
            enum: ['all', 'content', 'metadata'],
            description: 'Champs à récupérer (all, content, metadata)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'updateNote',
      description: 'Mettre à jour une note existante avec de nouveaux contenus et métadonnées',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          source_title: {
            type: 'string',
            maxLength: 255,
            description: 'Nouveau titre de la note'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown'
          },
          html_content: {
            type: 'string',
            description: 'Nouveau contenu HTML'
          },
          header_image: {
            type: 'string',
            description: 'URL de l\'image d\'en-tête'
          },
          folder_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID du dossier parent'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'moveNote',
      description: 'Déplacer une note vers un autre dossier ou classeur',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          folder_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID du dossier de destination'
          },
          classeur_id: {
            type: 'string',
            description: 'ID ou slug du classeur de destination'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'insertNoteContent',
      description: 'Insérer du contenu dans une note à une position spécifique',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          content: {
            type: 'string',
            description: 'Contenu à insérer'
          },
          position: {
            type: 'string',
            enum: ['start', 'end'],
            description: 'Position d\'insertion (start, end, ou index numérique)'
          }
        },
        required: ['ref', 'content']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'applyContentOperations',
      description: 'Appliquer des opérations de contenu sur une note avec ciblage précis',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          ops: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID unique de l\'opération'
                },
                action: {
                  type: 'string',
                  enum: ['insert', 'replace', 'delete', 'upsert_section'],
                  description: 'Action à effectuer'
                },
                target: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['heading', 'regex', 'position', 'anchor'],
                      description: 'Type de ciblage'
                    },
                    heading: {
                      type: 'object',
                      properties: {
                        path: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Chemin vers le heading'
                        },
                        level: {
                          type: 'number',
                          minimum: 1,
                          maximum: 6,
                          description: 'Niveau du heading'
                        },
                        heading_id: {
                          type: 'string',
                          description: 'ID du heading'
                        }
                      }
                    },
                    regex: {
                      type: 'object',
                      properties: {
                        pattern: {
                          type: 'string',
                          description: 'Pattern regex'
                        },
                        flags: {
                          type: 'string',
                          description: 'Flags regex'
                        },
                        nth: {
                          type: 'number',
                          description: 'Occurrence à cibler'
                        }
                      }
                    },
                    position: {
                      type: 'object',
                      properties: {
                        mode: {
                          type: 'string',
                          enum: ['offset', 'start', 'end'],
                          description: 'Mode de position'
                        },
                        offset: {
                          type: 'number',
                          description: 'Offset de position'
                        }
                      }
                    },
                    anchor: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          enum: ['doc_start', 'doc_end', 'after_toc', 'before_first_heading'],
                          description: 'Nom de l\'ancre'
                        }
                      }
                    }
                  },
                  required: ['type']
                },
                where: {
                  type: 'string',
                  enum: ['before', 'after', 'inside_start', 'inside_end', 'at', 'replace_match'],
                  description: 'Position relative à la cible'
                },
                content: {
                  type: 'string',
                  description: 'Contenu à insérer/remplacer'
                },
                options: {
                  type: 'object',
                  properties: {
                    ensure_heading: {
                      type: 'boolean',
                      description: 'S\'assurer qu\'un heading existe'
                    },
                    surround_with_blank_lines: {
                      type: 'number',
                      minimum: 0,
                      maximum: 3,
                      description: 'Lignes vides autour'
                    },
                    dedent: {
                      type: 'boolean',
                      description: 'Déduire l\'indentation'
                    }
                  }
                }
              },
              required: ['id', 'action', 'target', 'where']
            },
            description: 'Liste des opérations à appliquer'
          },
          dry_run: {
            type: 'boolean',
            description: 'Simuler les opérations sans les appliquer',
            default: true
          },
          transaction: {
            type: 'string',
            enum: ['all_or_nothing', 'best_effort'],
            description: 'Mode de transaction',
            default: 'all_or_nothing'
          },
          conflict_strategy: {
            type: 'string',
            enum: ['fail', 'skip'],
            description: 'Stratégie en cas de conflit',
            default: 'fail'
          },
          return: {
            type: 'string',
            enum: ['content', 'diff', 'none'],
            description: 'Type de retour',
            default: 'diff'
          }
        },
        required: ['ref', 'ops']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getNoteTOC',
      description: 'Récupérer la table des matières d\'une note',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getNoteShareSettings',
      description: 'Récupérer les paramètres de partage d\'une note',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'updateNoteShareSettings',
      description: 'Mettre à jour les paramètres de partage d\'une note',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence de la note (UUID ou slug)'
          },
          visibility: {
            type: 'string',
            enum: ['private', 'public', 'unlisted'],
            description: 'Visibilité de la note'
          },
          allow_edit: {
            type: 'boolean',
            description: 'Autoriser l\'édition par d\'autres utilisateurs'
          },
          allow_comments: {
            type: 'boolean',
            description: 'Autoriser les commentaires'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getRecentNotes',
      description: 'Récupérer les notes récemment modifiées',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Nombre maximum de notes à récupérer (défaut: 50)'
          }
        },
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LES CLASSEURS
  // ============================================================================

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
            description: 'Nom du classeur',
            maxLength: 255
          },
          description: {
            type: 'string',
            description: 'Description du classeur (optionnel)'
          },
          emoji: {
            type: 'string',
            description: 'Emoji pour le classeur (optionnel)'
          }
        },
        required: ['name']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getClasseur',
      description: 'Récupérer un classeur par son ID ou slug',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du classeur (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'updateClasseur',
      description: 'Mettre à jour un classeur existant',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du classeur (UUID ou slug)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du classeur',
            maxLength: 255
          },
          description: {
            type: 'string',
            description: 'Nouvelle description du classeur'
          },
          emoji: {
            type: 'string',
            description: 'Nouvel emoji pour le classeur'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getClasseurTree',
      description: 'Récupérer l\'arborescence complète d\'un classeur (dossiers et notes)',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du classeur (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'listClasseurs',
      description: 'Lister tous les classeurs de l\'utilisateur',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getClasseursWithContent',
      description: 'Récupérer tous les classeurs avec leur contenu complet',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LES DOSSIERS
  // ============================================================================

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
            description: 'Nom du dossier',
            maxLength: 255
          },
          classeur_id: {
            type: 'string',
            description: 'ID ou slug du classeur parent'
          },
          parent_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID du dossier parent (optionnel)'
          },
          position: {
            type: 'number',
            description: 'Position du dossier (optionnel)'
          }
        },
        required: ['name', 'classeur_id']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getFolder',
      description: 'Récupérer un dossier par son ID ou slug',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du dossier (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'updateFolder',
      description: 'Mettre à jour un dossier existant',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du dossier (UUID ou slug)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du dossier',
            maxLength: 255
          },
          position: {
            type: 'number',
            description: 'Nouvelle position du dossier'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'moveFolder',
      description: 'Déplacer un dossier vers un autre classeur ou dossier parent',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du dossier (UUID ou slug)'
          },
          classeur_id: {
            type: 'string',
            description: 'ID ou slug du classeur de destination'
          },
          parent_id: {
            type: 'string',
            format: 'uuid',
            description: 'ID du dossier parent de destination'
          },
          position: {
            type: 'number',
            description: 'Nouvelle position du dossier'
          }
        },
        required: ['ref']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getFolderTree',
      description: 'Récupérer l\'arborescence complète d\'un dossier',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'Référence du dossier (UUID ou slug)'
          }
        },
        required: ['ref']
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LA RECHERCHE
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'searchContent',
      description: 'Rechercher du contenu dans les notes, dossiers et classeurs',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Terme de recherche'
          },
          type: {
            type: 'string',
            enum: ['all', 'notes', 'folders', 'classeurs'],
            description: 'Type de contenu à rechercher'
          },
          classeur_id: {
            type: 'string',
            description: 'Limiter la recherche à un classeur spécifique'
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum de résultats (défaut: 20)'
          }
        },
        required: ['q']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'searchFiles',
      description: 'Rechercher des fichiers par nom, type, taille, etc.',
      parameters: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Terme de recherche dans le nom ou la description'
          },
          type: {
            type: 'string',
            description: 'Type de fichier (pdf, image, csv, etc.)'
          },
          created_from: {
            type: 'string',
            format: 'date-time',
            description: 'Date de création minimum'
          },
          created_to: {
            type: 'string',
            format: 'date-time',
            description: 'Date de création maximum'
          },
          min_size: {
            type: 'number',
            description: 'Taille minimum en octets'
          },
          max_size: {
            type: 'number',
            description: 'Taille maximum en octets'
          },
          sort_by: {
            type: 'string',
            description: 'Champ de tri (created_at, updated_at, size, filename)'
          },
          sort_order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Ordre de tri'
          },
          limit: {
            type: 'number',
            description: 'Nombre maximum de résultats (défaut: 20)'
          },
          offset: {
            type: 'number',
            description: 'Décalage pour la pagination (défaut: 0)'
          }
        },
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LES STATISTIQUES
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'getStats',
      description: 'Récupérer les statistiques de l\'utilisateur (nombre de notes, classeurs, etc.)',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LE PROFIL UTILISATEUR
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'getUserProfile',
      description: 'Récupérer le profil de l\'utilisateur connecté',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LA CORBEILLE
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'getTrash',
      description: 'Récupérer les éléments dans la corbeille',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'restoreFromTrash',
      description: 'Restaurer un élément depuis la corbeille',
      parameters: {
        type: 'object',
        properties: {
          item_id: {
            type: 'string',
            description: 'ID de l\'élément à restaurer'
          },
          item_type: {
            type: 'string',
            enum: ['note', 'folder', 'classeur'],
            description: 'Type de l\'élément à restaurer'
          }
        },
        required: ['item_id', 'item_type']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'purgeTrash',
      description: 'Vider définitivement la corbeille',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LA SUPPRESSION
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'deleteResource',
      description: 'Supprimer une ressource (note, dossier ou classeur)',
      parameters: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            enum: ['note', 'folder', 'classeur'],
            description: 'Type de ressource à supprimer'
          },
          ref: {
            type: 'string',
            description: 'Référence de la ressource (UUID ou slug)'
          }
        },
        required: ['resource', 'ref']
      }
    }
  },

  // ============================================================================
  // TOOLS POUR LES AGENTS SPÉCIALISÉS
  // ============================================================================

  {
    type: 'function',
    function: {
      name: 'listAgents',
      description: 'Lister tous les agents spécialisés disponibles',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'createAgent',
      description: 'Créer un nouvel agent spécialisé',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom de l\'agent'
          },
          description: {
            type: 'string',
            description: 'Description de l\'agent'
          },
          model: {
            type: 'string',
            description: 'Modèle LLM à utiliser'
          },
          provider: {
            type: 'string',
            description: 'Fournisseur LLM'
          },
          capabilities: {
            type: 'array',
            description: 'Capacités de l\'agent',
            items: {
              type: 'string'
            }
          },
          temperature: {
            type: 'number',
            description: 'Température du modèle (0-1)'
          },
          max_tokens: {
            type: 'number',
            description: 'Nombre maximum de tokens'
          }
        },
        required: ['name', 'description', 'model', 'provider']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'getAgent',
      description: 'Récupérer un agent spécialisé par son ID',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'ID de l\'agent'
          }
        },
        required: ['agentId']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'executeAgent',
      description: 'Exécuter un agent spécialisé avec un message',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'ID de l\'agent à exécuter'
          },
          message: {
            type: 'string',
            description: 'Message à envoyer à l\'agent'
          },
          context: {
            type: 'object',
            description: 'Contexte additionnel (optionnel)'
          }
        },
        required: ['agentId', 'message']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'reorderClasseurs',
      description: 'Réorganiser l\'ordre des classeurs',
      parameters: {
        type: 'object',
        properties: {
          classeurIds: {
            type: 'array',
            description: 'Liste des IDs de classeurs dans le nouvel ordre',
            items: {
              type: 'string'
            }
          }
        },
        required: ['classeurIds']
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'listTools',
      description: 'Lister tous les outils disponibles',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },

  {
    type: 'function',
    function: {
      name: 'debugInfo',
      description: 'Récupérer des informations de debug sur le système',
      parameters: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['basic', 'detailed', 'full'],
            description: 'Niveau de détail des informations'
          }
        },
        required: []
      }
    }
  }
];

/**
 * Fonction utilitaire pour récupérer les tools par nom
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return API_V2_TOOLS.find(tool => tool.function.name === name);
}

/**
 * Fonction utilitaire pour récupérer tous les noms de tools
 */
export function getAllToolNames(): string[] {
  return API_V2_TOOLS.map(tool => tool.function.name);
}

/**
 * Fonction utilitaire pour vérifier si un tool existe
 */
export function toolExists(name: string): boolean {
  return API_V2_TOOLS.some(tool => tool.function.name === name);
}
