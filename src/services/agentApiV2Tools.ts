import { simpleLogger as logger } from '@/utils/logger';
import { createNoteDirect, createFolderDirect, getNotebooksDirect, getNotebookTreeDirect } from './apiV2Direct';

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
    // En développement, utiliser une URL relative pour éviter les appels externes
    if (process.env.NODE_ENV === 'development') {
      this.baseUrl = '';
    } else {
      this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scrivia.app';
    }
    this.initializeTools();
  }

  private initializeTools() {
    // Tool: Créer une note
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note dans Scrivia',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note (optionnel)'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur où créer la note'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier où créer la note (optionnel)'
          }
        },
        required: ['source_title', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        return await createNoteDirect(params, userId);
      }
    });

    // Tool: Mettre à jour une note
    this.tools.set('update_note', {
      name: 'update_note',
      description: 'Mettre à jour une note existante',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à modifier'
          },
          source_title: {
            type: 'string',
            description: 'Nouveau titre de la note'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...data } = params;
        return await this.callApiV2('PUT', `/api/v2/note/${ref}/update`, data, jwtToken);
      }
    });

    // Tool: Ajouter du contenu à une note
    this.tools.set('add_content_to_note', {
      name: 'add_content_to_note',
      description: 'Ajouter du contenu à une note existante',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note'
          },
          content: {
            type: 'string',
            description: 'Contenu à ajouter'
          }
        },
        required: ['ref', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content } = params;
        return await this.callApiV2('POST', `/api/v2/note/${ref}/add-content`, { content }, jwtToken);
      }
    });

    // Tool: Déplacer une note
    this.tools.set('move_note', {
      name: 'move_note',
      description: 'Déplacer une note vers un autre dossier',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à déplacer'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier de destination'
          }
        },
        required: ['ref', 'folder_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, folder_id } = params;
        return await this.callApiV2('PUT', `/api/v2/note/${ref}/move`, { folder_id }, jwtToken);
      }
    });

    // Tool: Supprimer une note
    this.tools.set('delete_note', {
      name: 'delete_note',
      description: 'Supprimer une note',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à supprimer'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        return await this.callApiV2('DELETE', `/api/v2/note/${ref}/delete`, {}, jwtToken);
      }
    });

    // Tool: Créer un dossier
    this.tools.set('create_folder', {
      name: 'create_folder',
      description: 'Créer un nouveau dossier',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du dossier'
          },
          notebook_id: {
            type: 'string',
            description: 'ID du classeur où créer le dossier'
          },
          parent_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel)'
          }
        },
        required: ['name', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        return await createFolderDirect(params, userId);
      }
    });

    // Tool: Récupérer le contenu d'une note
    this.tools.set('get_note_content', {
      name: 'get_note_content',
      description: 'Récupérer le contenu d\'une note',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref } = params;
        return await this.callApiV2('GET', `/api/v2/note/${ref}/content`, {}, jwtToken);
      }
    });

    // Tool: Récupérer l'arbre d'un classeur spécifique
    this.tools.set('get_tree', {
      name: 'get_tree',
      description: 'Récupérer la structure d\'un classeur spécifique',
      parameters: {
        type: 'object',
        properties: {
          notebook_id: {
            type: 'string',
            description: 'ID du classeur'
          }
        },
        required: ['notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { notebook_id } = params;
        return await getNotebookTreeDirect(notebook_id, userId);
      }
    });

    // Tool: Lister tous les classeurs
    this.tools.set('get_notebooks', {
      name: 'get_notebooks',
      description: 'Lister tous les classeurs de l\'utilisateur',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      execute: async (params, jwtToken, userId) => {
        return await getNotebooksDirect(userId);
      }
    });
  }

  /**
   * Appeler l'API v2 de Scrivia
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