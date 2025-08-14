import { V2DatabaseUtils } from '@/utils/v2DatabaseUtils';
import { OpenAPIToolsGenerator } from './openApiToolsGenerator';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

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
  private openApiGenerator: OpenAPIToolsGenerator | null = null;
  private openApiInitialized: boolean = false;

  constructor() {
    // Utiliser l'URL de base configurée ou l'URL par défaut
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scrivia.app';
    console.log(`[AgentApiV2Tools] 🚀 Initialisation avec baseUrl: ${this.baseUrl}`);
    this.initializeTools();
    console.log(`[AgentApiV2Tools] 🔧 Tools de base chargés: ${this.tools.size}`);
    
    // Initialiser les tools OpenAPI de manière asynchrone
    this.initializeOpenAPITools().catch(error => {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation OpenAPI:', error);
    });
    
    console.log(`[AgentApiV2Tools] ✅ Initialisation terminée, ${this.tools.size} tools chargés`);
  }

  /**
   * Initialiser les tools OpenAPI
   */
  private async initializeOpenAPITools() {
    try {
      console.log('[AgentApiV2Tools] 🔧 Initialisation des tools OpenAPI...');
      
      // Charger le schéma OpenAPI v2
      const openApiSchema = await this.loadOpenAPISchema();
      
      if (openApiSchema) {
        this.openApiGenerator = new OpenAPIToolsGenerator(openApiSchema);
        const openApiTools = this.openApiGenerator.generateToolsForFunctionCalling();
        
        console.log(`[AgentApiV2Tools] 📊 ${openApiTools.length} tools OpenAPI générés`);
        
        // Ajouter les tools OpenAPI aux tools existants
        openApiTools.forEach(tool => {
          const toolName = tool.function.name;
          if (!this.tools.has(toolName)) {
            // Créer un tool compatible avec votre système
            this.tools.set(toolName, {
              name: toolName,
              description: tool.function.description,
              parameters: tool.function.parameters,
              execute: async (params, jwtToken, userId) => {
                return await this.executeOpenAPITool(toolName, params, jwtToken, userId);
              }
            });
            console.log(`[AgentApiV2Tools] ✅ Tool OpenAPI ajouté: ${toolName}`);
          }
        });
        
        console.log(`[AgentApiV2Tools] 🎉 Tools OpenAPI intégrés avec succès`);
        this.openApiInitialized = true;
      }
    } catch (error) {
      console.error('[AgentApiV2Tools] ❌ Erreur lors de l\'initialisation OpenAPI:', error);
      this.openApiInitialized = true; // Marquer comme terminé même en cas d'erreur
    }
  }



  /**
   * Charger le schéma OpenAPI
   */
  private async loadOpenAPISchema(): Promise<any> {
    try {
      // En production, vous pourriez charger depuis une URL
      // Pour l'instant, on utilise le schéma intégré
      const schema = {
        paths: {
          '/api/v2/note/create': {
            post: {
              summary: 'Créer une nouvelle note',
              description: 'Créer une nouvelle note structurée dans un classeur spécifique',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateNotePayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/content': {
            get: {
              summary: 'Récupérer le contenu d\'une note',
              description: 'Récupérer le contenu markdown et HTML d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/add-content': {
            post: {
              summary: 'Ajouter du contenu à une note',
              description: 'Ajouter du contenu markdown à la fin d\'une note existante',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/AddContentPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/insert': {
            post: {
              summary: 'Insérer du contenu à une position spécifique',
              description: 'Insérer du contenu markdown à une position spécifique dans la note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/InsertContentPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/insights': {
            get: {
              summary: 'Récupérer les insights d\'une note',
              description: 'Récupérer les analyses et insights générés automatiquement pour une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/table-of-contents': {
            get: {
              summary: 'Récupérer la table des matières',
              description: 'Récupérer la table des matières générée automatiquement d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/statistics': {
            get: {
              summary: 'Récupérer les statistiques d\'une note',
              description: 'Récupérer les statistiques détaillées d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ]
            }
          },
          '/api/v2/note/{ref}/merge': {
            post: {
              summary: 'Fusionner des notes',
              description: 'Fusionner le contenu d\'une note avec une autre note selon une stratégie spécifique',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note source'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MergeNotePayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/note/{ref}/publish': {
            post: {
              summary: 'Publier une note',
              description: 'Changer le statut de publication d\'une note',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug de la note'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/PublishNotePayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/folder/create': {
            post: {
              summary: 'Créer un nouveau dossier',
              description: 'Créer un nouveau dossier dans un classeur spécifique',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateFolderPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/folder/{ref}/move': {
            put: {
              summary: 'Déplacer un dossier',
              description: 'Déplacer un dossier vers un autre classeur',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du dossier'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/MoveFolderPayload'
                    }
                  }
                }
              }
            }
          },
          '/api/v2/classeur/{ref}/tree': {
            get: {
              summary: 'Récupérer l\'arborescence d\'un classeur',
              description: 'Récupérer la structure complète d\'un classeur avec ses dossiers et notes',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du classeur'
                }
              ]
            }
          },
          '/api/v2/classeur/{ref}/reorder': {
            put: {
              summary: 'Réorganiser un classeur',
              description: 'Réorganiser l\'ordre des éléments dans un classeur',
              parameters: [
                {
                  name: 'ref',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'ID ou slug du classeur'
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ReorderPayload'
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            CreateNotePayload: {
              type: 'object',
              properties: {
                source_title: { type: 'string', minLength: 1, maxLength: 255 },
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' },
                markdown_content: { type: 'string' },
                header_image: { type: 'string', format: 'uri' },
                folder_id: { type: 'string', format: 'uuid' }
              },
              required: ['source_title', 'notebook_id']
            },
            AddContentPayload: {
              type: 'object',
              properties: {
                content: { type: 'string', minLength: 1 }
              },
              required: ['content']
            },
            InsertContentPayload: {
              type: 'object',
              properties: {
                content: { type: 'string', minLength: 1 },
                position: { type: 'integer', minimum: 0 }
              },
              required: ['content', 'position']
            },
            MergeNotePayload: {
              type: 'object',
              properties: {
                targetNoteId: { type: 'string', format: 'uuid' },
                mergeStrategy: { type: 'string', enum: ['append', 'prepend', 'replace'] }
              },
              required: ['targetNoteId', 'mergeStrategy']
            },
            PublishNotePayload: {
              type: 'object',
              properties: {
                ispublished: { type: 'boolean' }
              },
              required: ['ispublished']
            },
            CreateFolderPayload: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' }
              },
              required: ['name', 'notebook_id']
            },
            MoveFolderPayload: {
              type: 'object',
              properties: {
                notebook_id: { type: 'string', description: 'ID ou slug du classeur' }
              },
              required: ['notebook_id']
            },
            ReorderPayload: {
              type: 'object',
              properties: {
                itemIds: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' }
                }
              },
              required: ['itemIds']
            }
          }
        }
      };
      
      return schema;
    } catch (error) {
      console.error('[AgentApiV2Tools] ❌ Erreur lors du chargement du schéma OpenAPI:', error);
      return null;
    }
  }

  /**
   * Exécuter un tool OpenAPI
   */
  private async executeOpenAPITool(toolName: string, params: any, jwtToken: string, userId: string): Promise<any> {
    const context = { operation: `openapi_${toolName}`, component: 'AgentApiV2Tools' };
    
    try {
      console.log(`[AgentApiV2Tools] 🚀 Exécution tool OpenAPI: ${toolName}`, params);
      
      // Mapping des tools OpenAPI vers les méthodes existantes
      switch (toolName) {
        case 'get_note_content':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/content`, null, jwtToken);
          
        case 'insert_content_to_note':
          return await this.callApiV2('POST', `/api/v2/note/${params.ref}/insert`, params, jwtToken);
          
        case 'get_note_insights':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/insights`, null, jwtToken);
          
        case 'get_note_toc':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/table-of-contents`, null, jwtToken);
          
        case 'get_note_statistics':
          return await this.callApiV2('GET', `/api/v2/note/${params.ref}/statistics`, null, jwtToken);
          
        case 'merge_note':
          return await this.callApiV2('POST', `/api/v2/note/${params.ref}/merge`, params, jwtToken);
          
        case 'publish_note':
          return await this.callApiV2('POST', `/api/v2/note/${params.ref}/publish`, params, jwtToken);
          
        case 'move_folder':
          return await this.callApiV2('PUT', `/api/v2/folder/${params.ref}/move`, params, jwtToken);
          
        case 'get_notebook_tree':
          return await this.callApiV2('GET', `/api/v2/classeur/${params.ref}/tree`, null, jwtToken);
          
        case 'reorder_notebook':
          return await this.callApiV2('PUT', `/api/v2/classeur/${params.ref}/reorder`, params, jwtToken);
          
        default:
          // Pour les tools qui n'ont pas de mapping spécifique, utiliser l'API v2
          const endpoint = this.getOpenAPIEndpoint(toolName, params);
          if (endpoint) {
            return await this.callApiV2(endpoint.method, endpoint.path, params, jwtToken);
          }
          
          throw new Error(`Tool OpenAPI non supporté: ${toolName}`);
      }
    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur lors de l'exécution du tool OpenAPI ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir l'endpoint pour un tool OpenAPI
   */
  private getOpenAPIEndpoint(toolName: string, params: any): { method: string; path: string } | null {
    const endpointMappings: Record<string, { method: string; path: string }> = {
      'get_note_content': { method: 'GET', path: `/api/v2/note/${params.ref}/content` },
      'insert_content_to_note': { method: 'POST', path: `/api/v2/note/${params.ref}/insert` },
      'get_note_insights': { method: 'GET', path: `/api/v2/note/${params.ref}/insights` },
      'get_note_toc': { method: 'GET', path: `/api/v2/note/${params.ref}/table-of-contents` },
      'get_note_statistics': { method: 'GET', path: `/api/v2/note/${params.ref}/statistics` },
      'merge_note': { method: 'POST', path: `/api/v2/note/${params.ref}/merge` },
      'publish_note': { method: 'POST', path: `/api/v2/note/${params.ref}/publish` },
      'move_folder': { method: 'PUT', path: `/api/v2/folder/${params.ref}/move` },
      'get_notebook_tree': { method: 'GET', path: `/api/v2/classeur/${params.ref}/tree` },
      'reorder_notebook': { method: 'PUT', path: `/api/v2/classeur/${params.ref}/reorder` }
    };
    
    return endpointMappings[toolName] || null;
  }

  /**
   * Ajouter des tools OpenAPI manuellement
   */
  addOpenAPITools(openApiSchema: any) {
    if (!this.openApiGenerator) {
      this.openApiGenerator = new OpenAPIToolsGenerator(openApiSchema);
    }
    
    const openApiTools = this.openApiGenerator.generateToolsForFunctionCalling();
    
    openApiTools.forEach(tool => {
      const toolName = tool.function.name;
      if (!this.tools.has(toolName)) {
        this.tools.set(toolName, {
          name: toolName,
          description: tool.function.description,
          parameters: tool.function.parameters,
          execute: async (params, jwtToken, userId) => {
            return await this.executeOpenAPITool(toolName, params, jwtToken, userId);
          }
        });
        console.log(`[AgentApiV2Tools] ✅ Tool OpenAPI ajouté: ${toolName}`);
      }
    });
  }

  /**
   * Obtenir les informations de debug OpenAPI
   */
  getOpenAPIDebugInfo() {
    if (!this.openApiGenerator) {
      return { error: 'OpenAPI Generator non initialisé' };
    }
    
    return this.openApiGenerator.getDebugInfo();
  }

  private initializeTools() {
    // Tool: Créer une note
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note dans un classeur. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: source_title, notebook_id, markdown_content, folder_id. Exemple: {"source_title": "Mon titre", "notebook_id": "uuid-du-classeur"}',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note (optionnel) - utiliser EXACTEMENT ce nom'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['source_title', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        // ✅ Mapping des paramètres pour supporter Groq
        const mappedParams = {
          ...params,
          source_title: params.source_title || params.title, // Support pour 'title' (Groq)
          notebook_id: params.notebook_id || params.notebook || params.notebook_slug, // Support pour 'notebook' et 'notebook_slug' (Groq)
          markdown_content: params.markdown_content || params.content // Support pour 'content' (Groq)
        };
        
        const context = { operation: 'create_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createNote(mappedParams, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('INSERT'); } catch {}
        return res;
      }
    });

    // Tool: Mettre à jour une note
    this.tools.set('update_note', {
      name: 'update_note',
      description: 'Modifier une note existante. Tous les paramètres sont optionnels - seuls les champs fournis seront modifiés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à modifier (obligatoire)'
          },
          source_title: {
            type: 'string',
            description: 'Nouveau titre de la note (optionnel)'
          },
          markdown_content: {
            type: 'string',
            description: 'Nouveau contenu markdown (optionnel)'
          },
          description: {
            type: 'string',
            description: 'Nouvelle description de la note (optionnel)'
          },
          notebook_id: {
            type: 'string',
            description: 'Nouveau classeur parent (optionnel)'
          },
          folder_id: {
            type: 'string',
            description: 'Nouveau dossier parent (optionnel, null pour dossier racine)'
          },
          header_image: {
            type: 'string',
            description: 'Nouvelle image de header (URL ou chemin, optionnel, null pour supprimer)'
          },
          header_image_offset: {
            type: 'number',
            description: 'Nouveau décalage vertical de l\'image de header en pixels (optionnel)'
          },
          header_image_blur: {
            type: 'number',
            description: 'Nouveau niveau de flou de l\'image de header (0-100, optionnel)'
          },
          header_image_overlay: {
            type: 'number',
            description: 'Nouveau niveau d\'overlay sombre sur l\'image (0-100, optionnel)'
          },
          header_title_in_image: {
            type: 'boolean',
            description: 'Afficher le titre dans l\'image de header (optionnel)'
          },
          wide_mode: {
            type: 'boolean',
            description: 'Mode large pour l\'affichage de la note (optionnel)'
          },
          font_family: {
            type: 'string',
            description: 'Nouvelle famille de police (optionnel)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const ref = params.ref || params.id || params.note_id || params.slug;
        if (!ref) {
          return { success: false, error: 'ref (ou id/note_id/slug) est requis' };
        }
        const { ref: _ignore, id: _id, note_id: _noteId, slug: _slug, ...data } = params;
        const context = { operation: 'update_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.updateNote(ref, data, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
      }
    });

    // Tool: Ajouter du contenu à une note
    this.tools.set('add_content_to_note', {
      name: 'add_content_to_note',
      description: 'Ajouter du texte à la fin d\'une note. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: ref, content. Exemple: {"ref": "uuid-de-la-note", "content": "Nouveau contenu à ajouter"}',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          content: {
            type: 'string',
            description: 'Contenu à ajouter à la fin (obligatoire) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['ref', 'content']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, content } = params;
        const context = { operation: 'add_content_to_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.addContentToNote(ref, content, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
      }
    });

    // Tool: Déplacer une note
    this.tools.set('move_note', {
      name: 'move_note',
      description: 'Déplacer une note vers un autre dossier. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note à déplacer (obligatoire)'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier de destination (obligatoire)'
          }
        },
        required: ['ref', 'folder_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, folder_id } = params;
        const context = { operation: 'move_note', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.moveNote(ref, folder_id, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
      }
    });

    // Tool: Supprimer une note
    this.tools.set('delete_note', {
      name: 'delete_note',
      description: 'Supprimer définitivement une note. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
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
        const res = await V2DatabaseUtils.deleteNote(ref, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('DELETE'); } catch {}
        return res;
      }
    });

    // Tool: Créer un dossier
    this.tools.set('create_folder', {
      name: 'create_folder',
      description: 'Créer un nouveau dossier. ATTENTION: Utiliser EXACTEMENT les noms de paramètres suivants: name, notebook_id, parent_id. Exemple: {"name": "Mon dossier", "notebook_id": "uuid-du-classeur"}',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du dossier (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          notebook_id: {
            type: 'string',
            description: 'ID du classeur où créer le dossier (obligatoire) - utiliser EXACTEMENT ce nom'
          },
          parent_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['name', 'notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_folder', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createFolder(params, userId, context);
        try { await clientPollingTrigger.triggerFoldersPolling('INSERT'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.updateFolder(ref, data, userId, context);
        try { await clientPollingTrigger.triggerFoldersPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.deleteFolder(ref, userId, context);
        try { await clientPollingTrigger.triggerFoldersPolling('DELETE'); } catch {}
        return res;
      }
    });

    // Tool: Créer un classeur
    this.tools.set('create_notebook', {
      name: 'create_notebook',
      description: 'Créer un nouveau classeur. IMPORTANT: Fournir UN SEUL objet JSON avec les paramètres suivants.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nom du classeur (obligatoire)'
          },
          description: {
            type: 'string',
            description: 'Description du classeur (optionnel)'
          },
          icon: {
            type: 'string',
            description: 'Icône du classeur (optionnel)'
          }
        },
        required: ['name']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'create_notebook', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.createClasseur(params, userId, context);
        try { await clientPollingTrigger.triggerClasseursPolling('INSERT'); } catch {}
        return res;
      }
    });

    // Tool: Lister tous les classeurs
    this.tools.set('get_notebooks', {
      name: 'get_notebooks',
      description: 'Récupérer la liste des classeurs. IMPORTANT: Cette fonction ne prend aucun paramètre, mais vous devez toujours fournir un objet JSON vide {} comme arguments.',
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

    // Tool: Récupérer l'arborescence d'un classeur
    this.tools.set('get_notebook_tree', {
      name: 'get_notebook_tree',
      description: 'Récupérer l\'arborescence complète d\'un classeur avec tous ses dossiers et notes.',
      parameters: {
        type: 'object',
        properties: {
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur (obligatoire) - utiliser EXACTEMENT ce nom'
          }
        },
        required: ['notebook_id']
      },
      execute: async (params, jwtToken, userId) => {
        const context = { operation: 'get_notebook_tree', component: 'AgentApiV2Tools' };
        try {
          const notebookId = params.notebook_id;
          if (!notebookId) {
            return { success: false, error: 'notebook_id est requis' };
          }
          return await V2DatabaseUtils.getClasseurTree(notebookId, userId, context);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
          return { 
            success: false, 
            error: `Échec de la récupération de l'arbre: ${errorMessage}` 
          };
        }
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
        const res = await V2DatabaseUtils.insertContentToNote(ref, content, position, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.addContentToSection(ref, sectionId, content, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.clearSection(ref, sectionId, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.eraseSection(ref, sectionId, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.publishNote(ref, ispublished, userId, context);
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
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
        const res = await V2DatabaseUtils.reorderClasseurs(classeurs, userId, context);
        try { await clientPollingTrigger.triggerClasseursPolling('UPDATE'); } catch {}
        return res;
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

    // Tool: Récupérer le contenu d'une note
    this.tools.set('get_note_content', {
      name: 'get_note_content',
      description: 'Récupérer le contenu complet d\'une note (titre, contenu markdown, métadonnées).',
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

    // Tool: Récupérer les métadonnées d'une note
    this.tools.set('get_note_metadata', {
      name: 'get_note_metadata',
      description: 'Récupérer les métadonnées d\'une note (titre, dates, statistiques, etc.) sans le contenu.',
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
        const context = { operation: 'get_note_metadata', component: 'AgentApiV2Tools' };
        // Utiliser getNoteContent et extraire les métadonnées
        const result = await V2DatabaseUtils.getNoteContent(ref, userId, context);
        if (result.success && result.note) {
          const { markdown_content, ...metadata } = result.note;
          return { success: true, metadata };
        }
        return result;
      }
    });

    // Tool: Récupérer les insights d'une note
    this.tools.set('get_note_insights', {
      name: 'get_note_insights',
      description: 'Récupérer les insights et analyses d\'une note.',
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
        const context = { operation: 'get_note_insights', component: 'AgentApiV2Tools' };
        // Utiliser getNoteContent pour l'instant (insights à implémenter plus tard)
        return await V2DatabaseUtils.getNoteContent(ref, userId, context);
      }
    });

    // Tool: Fusionner des notes
    this.tools.set('merge_note', {
      name: 'merge_note',
      description: 'Fusionner le contenu d\'une note avec une autre note selon une stratégie spécifique.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug de la note source à fusionner (obligatoire)'
          },
          targetNoteId: {
            type: 'string',
            description: 'ID de la note cible qui recevra le contenu (obligatoire)'
          },
          mergeStrategy: {
            type: 'string',
            enum: ['append', 'prepend', 'replace'],
            description: 'Stratégie de fusion : append (ajouter à la fin), prepend (ajouter au début), replace (remplacer)'
          }
        },
        required: ['ref', 'targetNoteId', 'mergeStrategy']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, targetNoteId, mergeStrategy } = params;
        const context = { operation: 'merge_note', component: 'AgentApiV2Tools' };
        // Utiliser l'API HTTP pour l'instant (mergeNote à implémenter dans V2DatabaseUtils plus tard)
        const response = await fetch(`/api/v2/note/${ref}/merge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetNoteId, mergeStrategy })
        });
        const res = await response.json();
        try { await clientPollingTrigger.triggerArticlesPolling('UPDATE'); } catch {}
        return res;
      }
    });

    // Tool: Mettre à jour un classeur
    this.tools.set('update_notebook', {
      name: 'update_notebook',
      description: 'Modifier les propriétés d\'un classeur existant (nom, description, icône, position). Seuls les champs fournis seront modifiés.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du classeur à modifier (obligatoire)'
          },
          name: {
            type: 'string',
            description: 'Nouveau nom du classeur (optionnel)'
          },
          description: {
            type: 'string',
            description: 'Nouvelle description (optionnel)'
          },
          icon: {
            type: 'string',
            description: 'Nouvelle icône/emoji (optionnel)'
          },
          position: {
            type: 'number',
            description: 'Nouvelle position (optionnel)'
          }
        },
        required: ['ref']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, ...updateData } = params;
        const context = { operation: 'update_notebook', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.updateClasseur(ref, updateData, userId, context);
        try { await clientPollingTrigger.triggerClasseursPolling('UPDATE'); } catch {}
        return res;
      }
    });

    // Tool: Supprimer un classeur
    this.tools.set('delete_notebook', {
      name: 'delete_notebook',
      description: 'Supprimer définitivement un classeur vide (sans dossiers ni notes). Cette action est irréversible.',
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
        const res = await V2DatabaseUtils.deleteClasseur(ref, userId, context);
        try { await clientPollingTrigger.triggerClasseursPolling('DELETE'); } catch {}
        return res;
      }
    });

    // Tool: Déplacer un dossier
    this.tools.set('move_folder', {
      name: 'move_folder',
      description: 'Déplacer un dossier vers un nouveau parent. Évite les boucles hiérarchiques.',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'ID ou slug du dossier à déplacer (obligatoire)'
          },
          target_parent_id: {
            type: 'string',
            description: 'ID du nouveau dossier parent (null pour dossier racine)'
          }
        },
        required: ['ref', 'target_parent_id']
      },
      execute: async (params, jwtToken, userId) => {
        const { ref, target_parent_id } = params;
        const context = { operation: 'move_folder', component: 'AgentApiV2Tools' };
        const res = await V2DatabaseUtils.moveFolder(ref, target_parent_id, userId, context);
        try { await clientPollingTrigger.triggerFoldersPolling('UPDATE'); } catch {}
        return res;
      }
    });
  }

  /**
   * Appeler l'API v2 directement
   */
  private async callApiV2(method: string, endpoint: string, data: any, jwtToken: string) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        'Authorization': `Bearer ${jwtToken}`
      };

      const config: RequestInit = {
        method,
        headers,
        ...(method !== 'GET' && { body: JSON.stringify(data) })
      };

      // Logs épurés pour le debug des tool calls
      console.log(`[AgentApiV2Tools] 🔧 ${method} ${endpoint}`);
      if (Object.keys(data || {}).length > 0) {
        console.log(`[AgentApiV2Tools] 📦 Payload:`, data);
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log(`[AgentApiV2Tools] ✅ Réponse:`, result);
      return result;

    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur:`, error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des outils disponibles pour function calling
   */
  getToolsForFunctionCalling(capabilities?: string[]): any[] {
    // 🔍 DEBUG: Vérifier l'état des tools
    console.log(`[AgentApiV2Tools] 🔍 État des tools:`, {
      totalTools: this.tools.size,
      toolNames: Array.from(this.tools.keys()),
      hasOpenApiGenerator: !!this.openApiGenerator
    });
    
    const allTools = Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
    
    console.log(`[AgentApiV2Tools] 🔧 Tools mappés: ${allTools.length}`);
    
    // 🔧 CORRECTION: Vérification robuste du type de capabilities
    if (capabilities === undefined || capabilities === null || !Array.isArray(capabilities)) {
      console.log(`[AgentApiV2Tools] 🔧 Pas de capacités valides (${typeof capabilities}), retour de tous les tools: ${allTools.length}`);
      return allTools;
    }
    
    // Capabilities vide : exposer tous les outils (pas de restriction)
    if (capabilities.length === 0) {
      console.log(`[AgentApiV2Tools] 🔧 Capabilities vide, exposition de tous les tools: ${allTools.length}`);
      return allTools;
    }
    
    // 🔧 CORRECTION: Gestion intelligente des capacités
    // Si les capacités contiennent des mots-clés spéciaux, exposer tous les tools
    const specialCapabilities = ['function_calls', 'streaming', 'all', 'full_access'];
    const hasSpecialCapability = capabilities.some(cap => specialCapabilities.includes(cap));
    
    if (hasSpecialCapability) {
      console.log(`[AgentApiV2Tools] 🔧 Capacité spéciale détectée (${capabilities.join(', ')}), exposition de tous les tools: ${allTools.length}`);
      return allTools;
    }
    
    // Sinon, filtrer selon les noms d'outils demandés
    const filteredTools = allTools.filter(tool => capabilities.includes(tool.function.name));
    console.log(`[AgentApiV2Tools] 🔧 Tools filtrés selon capacités: ${filteredTools.length}/${allTools.length}`);
    return filteredTools;
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

      console.log(`[AgentApiV2Tools] 🚀 Tool: ${toolName}`);
      console.log(`[AgentApiV2Tools] 📦 Paramètres:`, parameters);

      // Récupérer le userId à partir du JWT token
      const userId = await this.getUserIdFromToken(jwtToken);

      const result = await tool.execute(parameters, jwtToken, userId);
      
      const duration = Date.now() - startTime;
      console.log(`[AgentApiV2Tools] ✅ ${toolName} (${duration}ms)`, { duration });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[AgentApiV2Tools] ❌ ${toolName} échoué (${duration}ms):`, { error: errorMessage });
      
      // ✅ CORRECTION: Retourner l'erreur au lieu de la relancer
      return { 
        success: false, 
        error: `Échec de l'exécution de ${toolName}: ${errorMessage}` 
      };
    }
  }

  // Cache du userId avec TTL de 5 minutes
  private userIdCache = new Map<string, { userId: string; expiresAt: number }>();

  /**
   * Extraire le userId à partir du JWT token avec cache
   */
  private async getUserIdFromToken(jwtToken: string): Promise<string> {
    try {
      // Vérifier le cache d'abord
      const cached = this.userIdCache.get(jwtToken);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.userId;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(jwtToken);
      
      if (error || !user) {
        throw new Error('Token invalide ou expiré');
      }
      
      // Mettre en cache avec TTL de 5 minutes
      this.userIdCache.set(jwtToken, {
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000
      });
      
      return user.id;
    } catch (error) {
      console.error(`[AgentApiV2Tools] ❌ Erreur extraction userId:`, error);
      throw new Error('Impossible d\'extraire l\'utilisateur du token');
    }
  }

  /**
   * Obtenir la liste des noms d'outils disponibles
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Attendre que l'initialisation soit complète
   */
  async waitForInitialization(): Promise<void> {
    // Attendre que l'initialisation OpenAPI soit terminée
    let attempts = 0;
    const maxAttempts = 50; // 5 secondes max (50 * 100ms)
    
    while (!this.openApiInitialized && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.openApiInitialized) {
      console.warn('[AgentApiV2Tools] ⚠️ Timeout d\'attente de l\'initialisation OpenAPI');
    } else {
      console.log(`[AgentApiV2Tools] ✅ Initialisation OpenAPI terminée après ${attempts * 100}ms`);
    }
  }
}

// Instance singleton
export const agentApiV2Tools = new AgentApiV2Tools(); 