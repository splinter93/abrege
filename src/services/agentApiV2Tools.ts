import { simpleLogger as logger } from '@/utils/logger';
import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';

export interface ApiV2Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  execute: (params: any, jwtToken: string, userId: string) => Promise<any>;
}

export class AgentApiV2Tools {
  private tools: Map<string, ApiV2Tool> = new Map();
  private baseUrl: string;

  constructor() {
    // Utiliser l'URL de base configurée ou l'URL par défaut
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scrivia.app';
    this.initializeTools();
  }

  private initializeTools() {
    // Tool: Créer une note
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note structurée dans un classeur spécifique (par ID ou slug), avec un titre obligatoire, un contenu markdown optionnel, et un dossier parent facultatif. La note sera automatiquement positionnée dans l\'ordre du classeur.',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note (obligatoire, max 255 caractères)'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note (optionnel, sera ajouté au début)'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur où créer la note (obligatoire)'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier où créer la note (optionnel, null pour la racine)'
          }
        },
        required: ['source_title', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.createNote(params, userId, context);
      }
    });

    // Tool: Mettre à jour une note
    this.tools.set('update_note', {
      name: 'update_note',
      description: 'Modifier une note existante identifiée par son ID ou slug, pour changer son titre, contenu markdown, description ou dossier parent (sans écraser les autres champs non spécifiés). Les champs non fournis restent inchangés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à modifier (obligatoire)'
          },
          source_title: {
            type: 'string',
            description: 'Nouveau titre de la note (optionnel, max 255 caractères)'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown (optionnel, remplace tout le contenu)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...data } = params;
        const context = { operation: 'update_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.updateNote(ref, data, userId, context);
      }
    });

    // Tool: Ajouter du contenu à une note
    this.tools.set('add_content_to_note', {
      name: 'add_content_to_note',
      description: 'Ajouter du texte markdown à la fin du contenu d\'une note existante, sans remplacer le contenu existant. Le nouveau contenu sera concaténé après le contenu actuel.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown à ajouter à la fin (obligatoire)'
          }
        },
        required: ['ref', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content } = params;
        const context = { operation: 'add_content_to_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.addContentToNote(ref, content, userId, context);
      }
    });

    // Tool: Déplacer une note
    this.tools.set('move_note', {
      name: 'move_note',
      description: 'Déplacer une note d\'un dossier vers un autre dossier spécifique, ou la sortir d\'un dossier vers la racine du classeur. La note conserve son contenu et ses métadonnées.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à déplacer (obligatoire)'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier de destination (obligatoire, null pour la racine)'
          }
        },
        required: ['ref', 'folder_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, folder_id } = params;
        const context = { operation: 'move_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.moveNote(ref, folder_id, userId, context);
      }
    });

    // Tool: Supprimer une note
    this.tools.set('delete_note', {
      name: 'delete_note',
      description: 'Supprimer définitivement une note et tout son contenu de la base de données. Cette action est irréversible et ne peut pas être annulée. La note disparaîtra de tous les classeurs et dossiers.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.deleteNote(ref, userId, context);
      }
    });

    // Tool: Créer un dossier
    this.tools.set('create_folder', {
      name: 'create_folder',
      description: 'Créer un nouveau dossier avec un nom obligatoire dans un classeur spécifique, avec dossier parent optionnel. Le dossier sera automatiquement positionné dans l\'ordre du classeur ou du dossier parent.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du dossier (obligatoire, max 255 caractères)'
          },
          notebook_id: {
            type: 'string',
            description: 'ID du classeur où créer le dossier (obligatoire)'
          },
          parent_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel, null pour la racine du classeur)'
          }
        },
        required: ['name', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_folder', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.createFolder(params, userId, context);
      }
    });

    // Tool: Mettre à jour un dossier
    this.tools.set('update_folder', {
      name: 'update_folder',
      description: 'Modifier le nom ou le dossier parent d\'un dossier existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le déplacement vers un nouveau parent réorganise la hiérarchie.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à modifier (obligatoire)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du dossier (optionnel, max 255 caractères)'
          },
          parent_id: {
            type: 'string',
            description: 'ID du nouveau dossier parent (optionnel, null pour la racine)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...data } = params;
        const context = { operation: 'update_folder', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.updateFolder(ref, data, userId, context);
      }
    });

    // Tool: Supprimer un dossier
    this.tools.set('delete_folder', {
      name: 'delete_folder',
      description: 'Supprimer définitivement un dossier vide (sans sous-dossiers ni notes) de la base de données. Cette action est irréversible. Les dossiers contenant des éléments ne peuvent pas être supprimés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_folder', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.deleteFolder(ref, userId, context);
      }
    });

    // Tool: Créer un classeur
    this.tools.set('create_notebook', {
      name: 'create_notebook',
      description: 'Créer un nouveau classeur avec un nom obligatoire, description et icône optionnelles. Le classeur sera automatiquement positionné à la fin de la liste des classeurs de l\'utilisateur.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du classeur (obligatoire, max 255 caractères)'
          },
          description: {
            type: 'string',
            description: 'Description du classeur (optionnel, max 500 caractères)'
          },
          icon: {
            type: 'string',
            description: 'Icône du classeur (optionnel, emoji ou nom d\'icône)'
          }
        },
        required: ['name']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_notebook', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.createClasseur(params, userId, context);
      }
    });

    // Tool: Mettre à jour un classeur
    this.tools.set('update_notebook', {
      name: 'update_notebook',
      description: 'Modifier le nom, description ou icône d\'un classeur existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le nom et la description peuvent être modifiés indépendamment.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur à modifier (obligatoire)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du classeur (optionnel, max 255 caractères)'
          },
          description: {
            type: 'string',
            description: 'Nouvelle description du classeur (optionnel, max 500 caractères)'
          },
          icon: {
            type: 'string',
            description: 'Nouvelle icône du classeur (optionnel, emoji ou nom d\'icône)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...data } = params;
        const context = { operation: 'update_notebook', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.updateClasseur(ref, data, userId, context);
      }
    });

    // Tool: Supprimer un classeur
    this.tools.set('delete_notebook', {
      name: 'delete_notebook',
      description: 'Supprimer définitivement un classeur et tout son contenu (dossiers et notes) de la base de données. Cette action est irréversible et supprime toutes les données associées au classeur.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur à supprimer (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'delete_notebook', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.deleteClasseur(ref, userId, context);
      }
    });

    // Tool: Récupérer le contenu d'une note
    this.tools.set('get_note_content', {
      name: 'get_note_content',
      description: 'Récupérer le contenu markdown et HTML d\'une note, avec toutes ses métadonnées (titre, image d\'en-tête, dates de création/modification, visibilité). Permet d\'analyser le contenu existant avant modification.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_content', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getNoteContent(ref, userId, context);
      }
    });

    // Tool: Récupérer l'arbre d'un classeur spécifique
    this.tools.set('get_tree', {
      name: 'get_tree',
      description: 'Récupérer l\'arborescence complète d\'un classeur : dossiers, sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure avant d\'ajouter ou déplacer des éléments.',
      parameters: {
        type: 'object',
        properties: {
          notebook_id: {
            type: 'string',
            description: 'ID du classeur (obligatoire)'
          }
        },
        required: ['notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { notebook_id } = params;
        const context = { operation: 'get_tree', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getClasseurTree(notebook_id, userId, context);
      }
    });

    // Tool: Lister tous les classeurs
    this.tools.set('get_notebooks', {
      name: 'get_notebooks',
      description: 'Récupérer la liste complète des classeurs de l\'utilisateur avec leurs métadonnées (nom, description, icône, position). Permet de choisir le bon classeur avant de créer des notes ou dossiers.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'get_notebooks', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getClasseurs(userId, context);
      }
    });

    // Tool: Insérer du contenu à une position spécifique
    this.tools.set('insert_content_to_note', {
      name: 'insert_content_to_note',
      description: 'Insérer du contenu markdown à une position spécifique dans une note existante, sans remplacer le contenu existant. Le nouveau contenu sera inséré à l\'index spécifié.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown à insérer (obligatoire)'
          },
          position: {
            type: 'number',
            description: 'Position d\'insertion (0 = début, obligatoire)'
          }
        },
        required: ['ref', 'content', 'position']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content, position } = params;
        const context = { operation: 'insert_content_to_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.insertContentToNote(ref, content, position, userId, context);
      }
    });

    // Tool: Ajouter du contenu à une section spécifique
    this.tools.set('add_content_to_section', {
      name: 'add_content_to_section',
      description: 'Ajouter du contenu markdown à une section spécifique d\'une note (basée sur les titres markdown). Le contenu sera ajouté à la fin de la section existante.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section (obligatoire)'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown à ajouter à la section (obligatoire)'
          }
        },
        required: ['ref', 'sectionId', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId, content } = params;
        const context = { operation: 'add_content_to_section', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.addContentToSection(ref, sectionId, content, userId, context);
      }
    });

    // Tool: Vider une section
    this.tools.set('clear_section', {
      name: 'clear_section',
      description: 'Vider le contenu d\'une section spécifique d\'une note (basée sur les titres markdown). La section reste mais son contenu est supprimé.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section à vider (obligatoire)'
          }
        },
        required: ['ref', 'sectionId']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId } = params;
        const context = { operation: 'clear_section', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.clearSection(ref, sectionId, userId, context);
      }
    });

    // Tool: Supprimer une section
    this.tools.set('erase_section', {
      name: 'erase_section',
      description: 'Supprimer complètement une section et son contenu d\'une note (basée sur les titres markdown). La section et tout son contenu disparaissent.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          sectionId: {
            type: 'string',
            description: 'ID ou titre de la section à supprimer (obligatoire)'
          }
        },
        required: ['ref', 'sectionId']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, sectionId } = params;
        const context = { operation: 'erase_section', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.eraseSection(ref, sectionId, userId, context);
      }
    });

    // Tool: Récupérer la table des matières
    this.tools.set('get_table_of_contents', {
      name: 'get_table_of_contents',
      description: 'Récupérer la table des matières d\'une note basée sur les titres markdown. Permet d\'analyser la structure d\'une note avant modification.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_table_of_contents', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getTableOfContents(ref, userId, context);
      }
    });

    // Tool: Récupérer les statistiques d'une note
    this.tools.set('get_note_statistics', {
      name: 'get_note_statistics',
      description: 'Récupérer les statistiques détaillées d\'une note (nombre de caractères, mots, lignes, sections). Permet d\'analyser la complexité d\'une note.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_note_statistics', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getNoteStatistics(ref, userId, context);
      }
    });

    // Tool: Publier une note
    this.tools.set('publish_note', {
      name: 'publish_note',
      description: 'Changer la visibilité d\'une note (public/private) et générer une URL publique. Permet de rendre une note accessible publiquement.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire)'
          },
          ispublished: {
            type: 'boolean',
            description: 'Statut de publication (true = public, false = privé, obligatoire)'
          }
        },
        required: ['ref', 'ispublished']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ispublished } = params;
        const context = { operation: 'publish_note', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.publishNote(ref, ispublished, userId, context);
      }
    });

    // Tool: Récupérer l'arborescence d'un dossier
    this.tools.set('get_folder_tree', {
      name: 'get_folder_tree',
      description: 'Récupérer l\'arborescence complète d\'un dossier : sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure d\'un dossier.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier (obligatoire)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        const context = { operation: 'get_folder_tree', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.getFolderTree(ref, userId, context);
      }
    });

    // Tool: Réorganiser les classeurs
    this.tools.set('reorder_notebooks', {
      name: 'reorder_notebooks',
      description: 'Réorganiser l\'ordre des classeurs de l\'utilisateur selon une nouvelle séquence spécifiée. Permet de personnaliser l\'ordre d\'affichage.',
      parameters: {
        type: 'object',
        properties: {
          classeurs: {
            type: 'array',
            description: 'Liste des classeurs avec leurs nouvelles positions (obligatoire)',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'ID du classeur'
                },
                position: {
                  type: 'number',
                  description: 'Nouvelle position (0 = premier)'
                }
              },
              required: ['id', 'position']
            }
          }
        },
        required: ['classeurs']
      },
      execute: async (params, jwtToken, userId) => {
        const { classeurs } = params;
        const context = { operation: 'reorder_notebooks', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.reorderClasseurs(classeurs, userId, context);
      }
    });

    // Tool: Générer un slug
    this.tools.set('generate_slug', {
      name: 'generate_slug',
      description: 'Générer un slug unique basé sur un texte pour les notes, classeurs ou dossiers. Permet de créer des identifiants URL-friendly.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Texte à partir duquel générer le slug (obligatoire)'
          },
          type: {
            type: 'string',
            description: 'Type d\'élément (note, classeur, folder, obligatoire)',
            enum: ['note', 'classeur', 'folder']
          }
        },
        required: ['text', 'type']
      },
      execute: async (params, jwtToken, userId) => {
        const { text, type } = params;
        const context = { operation: 'generate_slug', component: 'AgentApiV2Tools' };
        return await V2DatabaseUtils.generateSlug(text, type, userId, context);
      }
    });
  }

  /**
   * Appeler l'API v2 de Scrivia (pour les endpoints qui ne sont pas encore refactorisés)
   */
  private async callApiV2(method: string, endpoint: string, data: any, jwtToken: string) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'Authorization': `Bearer ${jwtToken}` // jwtToken est le token JWT
      };

      const config: RequestInit = {
        method,
        headers,
        ...(method !== 'GET' && { body: JSON.stringify(data) })
      };

      logger.dev(`[AgentApiV2Tools] 🌐 Appel API: ${method} ${url}`);
      logger.dev(`[AgentApiV2Tools] 📤 Données:`, data);
      logger.dev(`[AgentApiV2Tools] 🔑 Token JWT (début):`, jwtToken.substring(0, 20) + "...");
      logger.dev(`[AgentApiV2Tools] 🔑 Headers (sans token):`, { ...headers, Authorization: 'Bearer ***' });

      const response = await fetch(url, config);
      logger.dev(`[AgentApiV2Tools] 📥 Status:`, response.status);
      logger.dev(`[AgentApiV2Tools] 📥 Headers:`, Object.fromEntries(response.headers.entries()));
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${result.error || 'Unknown error'}`);
      }

      logger.dev(`[AgentApiV2Tools] ✅ Réponse:`, result);
      return result;

    } catch (error) {
      logger.error(`[AgentApiV2Tools] ❌ Erreur:`, error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des outils disponibles pour function calling
   */
  getToolsForFunctionCalling(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Exécuter un outil par son nom
   */
  async executeTool(toolName: string, parameters: any, jwtToken: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      logger.dev(`[AgentApiV2Tools] 🔧 Exécution tool: ${toolName}`);
      logger.dev(`[AgentApiV2Tools] 📦 Paramètres:`, parameters);

      // Récupérer le userId à partir du JWT token
      const userId = await this.getUserIdFromToken(jwtToken);
      logger.dev(`[AgentApiV2Tools] 👤 User ID extrait:`, userId);

      const result = await tool.execute(parameters, jwtToken, userId);
      
      const duration = Date.now() - startTime;
      logger.dev(`[AgentApiV2Tools] ✅ Tool ${toolName} exécuté en ${duration}ms`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[AgentApiV2Tools] ❌ Tool ${toolName} échoué après ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Extraire le userId à partir du JWT token
   */
  private async getUserIdFromToken(jwtToken: string): Promise<string> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { user }, error } = await supabase.auth.getUser(jwtToken);
      
      if (error || !user) {
        throw new Error('Token invalide ou expiré');
      }
      
      return user.id;
    } catch (error) {
      logger.error(`[AgentApiV2Tools] ❌ Erreur extraction userId:`, error);
      throw new Error('Impossible d\'extraire l\'utilisateur du token');
    }
  }

  /**
   * Obtenir la liste des noms d'outils disponibles
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Instance singleton
export const agentApiV2Tools = new AgentApiV2Tools(); 