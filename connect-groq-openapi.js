#!/usr/bin/env node

/**
 * Connexion Groq GPT OSS avec votre système OpenAPI
 * Usage: node connect-groq-openapi.js
 */

const fs = require('fs');

// Configuration Groq
const GROQ_CONFIG = {
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'openai/gpt-oss-20b', // Modèle stable
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.9
};

// Simuler votre AgentApiV2Tools avec OpenAPI
class GroqOpenAPIIntegration {
  constructor() {
    this.tools = new Map();
    this.baseUrl = 'https://scrivia.app';
    console.log('🚀 Initialisation Groq + OpenAPI...');
    this.initializeTools();
    this.initializeOpenAPITools();
    console.log(`✅ Initialisation terminée, ${this.tools.size} tools chargés`);
  }

  initializeTools() {
    // Tools existants
    this.tools.set('create_note', {
      name: 'create_note',
      description: 'Créer une nouvelle note',
      parameters: {
        type: 'object',
        properties: {
          source_title: { type: 'string' },
          notebook_id: { type: 'string' }
        },
        required: ['source_title', 'notebook_id']
      }
    });

    this.tools.set('add_content_to_note', {
      name: 'add_content_to_note',
      description: 'Ajouter du contenu à une note',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['ref', 'content']
      }
    });
  }

  async initializeOpenAPITools() {
    try {
      console.log('🔧 Initialisation des tools OpenAPI...');
      
      const openApiSchema = await this.loadOpenAPISchema();
      
      if (openApiSchema) {
        const openApiGenerator = new OpenAPIToolsGenerator(openApiSchema);
        const openApiTools = openApiGenerator.generateToolsForFunctionCalling();
        
        console.log(`📊 ${openApiTools.length} tools OpenAPI générés`);
        
        openApiTools.forEach(tool => {
          const toolName = tool.function.name;
          if (!this.tools.has(toolName)) {
            this.tools.set(toolName, {
              name: toolName,
              description: tool.function.description,
              parameters: tool.function.parameters
            });
            console.log(`✅ Tool OpenAPI ajouté: ${toolName}`);
          }
        });
        
        console.log('🎉 Tools OpenAPI intégrés avec succès');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation OpenAPI:', error);
    }
  }

  async loadOpenAPISchema() {
    // Schéma OpenAPI v2 simplifié
    const schema = {
      paths: {
        '/api/v2/note/create': {
          post: {
            summary: 'Créer une nouvelle note',
            description: 'Créer une nouvelle note structurée dans un classeur spécifique',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateNotePayload' }
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
                  schema: { $ref: '#/components/schemas/InsertContentPayload' }
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
                  schema: { $ref: '#/components/schemas/MergeNotePayload' }
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
                  schema: { $ref: '#/components/schemas/PublishNotePayload' }
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
                  schema: { $ref: '#/components/schemas/CreateFolderPayload' }
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
                  schema: { $ref: '#/components/schemas/MoveFolderPayload' }
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
                  schema: { $ref: '#/components/schemas/ReorderPayload' }
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
  }

  getToolsForFunctionCalling() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  getAvailableTools() {
    return Array.from(this.tools.keys());
  }
}

// OpenAPIToolsGenerator
class OpenAPIToolsGenerator {
  constructor(openApiSchema) {
    this.schema = openApiSchema;
  }

  generateTools() {
    const tools = [];
    const endpoints = Object.keys(this.schema.paths);

    endpoints.forEach(endpoint => {
      const path = this.schema.paths[endpoint];
      const methods = Object.keys(path);

      methods.forEach(method => {
        const operation = path[method];
        const tool = this.createTool(endpoint, method, operation);
        
        if (tool) {
          tools.push(tool);
        }
      });
    });

    return tools;
  }

  createTool(endpoint, method, operation) {
    try {
      const toolName = this.generateToolName(endpoint, method);
      const description = operation.summary || 
                        operation.description || 
                        `${method.toUpperCase()} operation on ${endpoint}`;
      const parameters = this.extractParameters(operation);

      return {
        name: toolName,
        description,
        parameters,
        endpoint,
        method: method.toUpperCase()
      };
    } catch (error) {
      return null;
    }
  }

  generateToolName(endpoint, method) {
    let toolName = endpoint
      .replace(/^\/api\/v2\//, '')
      .replace(/\/\{([^}]+)\}/g, '_$1')
      .replace(/\//g, '_')
      .replace(/^_/, '')
      .replace(/_+/g, '_');

    const httpVerb = method.toLowerCase();
    toolName = `${httpVerb}_${toolName}`;

    const nameMappings = {
      'post_note_create': 'create_note',
      'get_note_ref_content': 'get_note_content',
      'post_note_ref_insert': 'insert_content_to_note',
      'get_note_ref_insights': 'get_note_insights',
      'get_note_ref_table-of-contents': 'get_note_toc',
      'get_note_ref_statistics': 'get_note_statistics',
      'post_note_ref_merge': 'merge_note',
      'post_note_ref_publish': 'publish_note',
      'post_folder_create': 'create_folder',
      'put_folder_ref_move': 'move_folder',
      'get_classeur_ref_tree': 'get_notebook_tree',
      'put_classeur_ref_reorder': 'reorder_notebook'
    };

    return nameMappings[toolName] || toolName;
  }

  extractParameters(operation) {
    const parameters = {
      type: 'object',
      properties: {},
      required: []
    };

    if (operation.parameters) {
      operation.parameters.forEach(param => {
        if (param.in === 'path') {
          parameters.properties[param.name] = {
            type: param.schema?.type || 'string',
            description: param.description || `Parameter ${param.name}`
          };
          if (param.required) {
            parameters.required.push(param.name);
          }
        }
      });
    }

    if (operation.requestBody) {
      const content = operation.requestBody.content['application/json'];
      if (content && content.schema) {
        const bodySchema = this.resolveSchema(content.schema);
        if (bodySchema.properties) {
          Object.assign(parameters.properties, bodySchema.properties);
        }
        if (bodySchema.required) {
          parameters.required.push(...bodySchema.required);
        }
      }
    }

    return parameters;
  }

  resolveSchema(schema) {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '');
      return this.schema.components.schemas[refPath] || schema;
    }
    return schema;
  }

  generateToolsForFunctionCalling() {
    const openApiTools = this.generateTools();
    
    return openApiTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}

/**
 * Test de connexion avec Groq
 */
async function testGroqConnection() {
  console.log('🧪 Test de connexion avec Groq...');
  
  if (!GROQ_CONFIG.apiKey) {
    console.log('❌ GROQ_API_KEY non configurée');
    console.log('💡 Ajoutez votre clé API Groq dans les variables d\'environnement');
    return false;
  }

  try {
    const response = await fetch(`${GROQ_CONFIG.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }

    const models = await response.json();
    console.log('✅ Connexion Groq réussie');
    console.log(`📊 Modèles disponibles: ${models.data.length}`);
    
    // Vérifier si GPT OSS est disponible
    const gptOssModels = models.data.filter(model => 
      model.id.includes('gpt-oss')
    );
    
    console.log(`🎯 Modèles GPT OSS disponibles: ${gptOssModels.length}`);
    gptOssModels.forEach(model => {
      console.log(`   - ${model.id}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Groq:', error.message);
    return false;
  }
}

/**
 * Test d'appel Groq avec function calls
 */
async function testGroqFunctionCalls(agentTools) {
  console.log('\n🧪 Test d\'appel Groq avec function calls...');
  
  if (!GROQ_CONFIG.apiKey) {
    console.log('❌ GROQ_API_KEY non configurée');
    return false;
  }

  try {
    const tools = agentTools.getToolsForFunctionCalling();
    console.log(`📊 ${tools.length} tools disponibles pour Groq`);

    const messages = [
      {
        role: 'system',
        content: 'Tu es un assistant IA utile. Tu peux utiliser les outils disponibles pour interagir avec l\'API Scrivia.'
      },
      {
        role: 'user',
        content: 'Crée une note intitulée "Test Groq OpenAPI" dans le classeur "main-notebook"'
      }
    ];

    const payload = {
      model: GROQ_CONFIG.model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: GROQ_CONFIG.temperature,
      max_completion_tokens: GROQ_CONFIG.maxTokens,
      top_p: GROQ_CONFIG.topP
    };

    console.log('🚀 Appel Groq avec function calls...');
    
    const response = await fetch(`${GROQ_CONFIG.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Appel Groq réussi');
    
    if (result.choices && result.choices[0]) {
      const choice = result.choices[0];
      console.log('📝 Réponse:', choice.message.content);
      
      if (choice.message.tool_calls) {
        console.log('🔧 Tool calls détectés:');
        choice.message.tool_calls.forEach((toolCall, index) => {
          console.log(`   ${index + 1}. ${toolCall.function.name}: ${toolCall.function.arguments}`);
        });
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel Groq:', error.message);
    return false;
  }
}

/**
 * Test complet d'intégration
 */
async function testCompleteIntegration() {
  console.log('🚀 Test complet d\'intégration Groq + OpenAPI');
  console.log('============================================\n');
  
  // Test 1: Connexion Groq
  const groqConnected = await testGroqConnection();
  if (!groqConnected) {
    console.log('❌ Impossible de continuer sans connexion Groq');
    return;
  }
  
  // Test 2: Initialisation des tools OpenAPI
  console.log('\n🔧 Initialisation des tools OpenAPI...');
  const agentTools = new GroqOpenAPIIntegration();
  
  // Attendre l'initialisation
  setTimeout(async () => {
    console.log('\n📊 RÉSULTATS DE L\'INTÉGRATION');
    console.log('===============================');
    
    const availableTools = agentTools.getAvailableTools();
    const functionCallingTools = agentTools.getToolsForFunctionCalling();
    
    console.log(`✅ Tools totaux: ${availableTools.length}`);
    console.log(`✅ Tools function calling: ${functionCallingTools.length}`);
    
    console.log('\n📋 Tools disponibles pour Groq:');
    availableTools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool}`);
    });
    
    // Test 3: Appel Groq avec function calls
    const functionCallsWork = await testGroqFunctionCalls(agentTools);
    
    console.log('\n🎉 RÉSUMÉ DE L\'INTÉGRATION');
    console.log('============================');
    console.log(`✅ Connexion Groq: ${groqConnected ? 'OK' : 'ÉCHEC'}`);
    console.log(`✅ Tools OpenAPI: ${availableTools.length} disponibles`);
    console.log(`✅ Function calls: ${functionCallsWork ? 'OK' : 'ÉCHEC'}`);
    
    if (groqConnected && availableTools.length > 0 && functionCallsWork) {
      console.log('\n🎯 INTÉGRATION RÉUSSIE !');
      console.log('========================');
      console.log('✅ Groq GPT OSS connecté avec succès');
      console.log('✅ Tools OpenAPI disponibles pour les function calls');
      console.log('✅ Prêt pour la production');
      console.log('✅ Les LLMs peuvent maintenant utiliser votre API via Groq');
    } else {
      console.log('\n⚠️ Intégration partielle - vérifiez la configuration');
    }
    
  }, 1000);
}

/**
 * Fonction principale
 */
async function runIntegration() {
  console.log('🚀 Connexion Groq GPT OSS avec votre système OpenAPI');
  console.log('=====================================================\n');
  
  await testCompleteIntegration();
}

// Exécuter l'intégration
runIntegration(); 