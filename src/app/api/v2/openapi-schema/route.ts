/**
 * Génération dynamique du schéma OpenAPI pour l'API v2
 * Inclut les agents spécialisés et tous les endpoints existants
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { logApi } from '@/utils/logger';

// Types pour la génération OpenAPI
interface SpecializedAgent {
  slug: string;
  display_name?: string;
  description?: string;
  model: string;
  input_schema?: unknown;
  output_schema?: unknown;
}

interface OpenAPIEndpoint {
  post?: {
    summary: string;
    description: string;
    tags: string[];
    security: Array<{ [key: string]: string[] }>;
    requestBody: {
      required: boolean;
      content: {
        'application/json': {
          schema: unknown;
        };
      };
    };
    responses: Record<string, {
      description: string;
      content?: {
        'application/json': {
          schema: unknown;
        };
      };
    }>;
  };
  get?: {
    summary: string;
    description: string;
    tags: string[];
    responses: Record<string, {
      description: string;
      content: {
        'application/json': {
          schema: unknown;
        };
      };
    }>;
  };
}

interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, OpenAPIEndpoint>;
  tags: Array<{
    name: string;
    description: string;
  }>;
}

// Instance du manager pour les agents spécialisés
const agentManager = new SpecializedAgentManager();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const context = {
    operation: 'v2_openapi_schema_generation',
    component: 'API_V2_OPENAPI'
  };

  logApi.info('🚀 Génération du schéma OpenAPI v2', context);

  try {
    // 1. Récupérer les agents spécialisés
    const specializedAgents = await agentManager.listSpecializedAgents();

    // 2. Générer les endpoints pour les agents spécialisés
    const agentEndpoints = generateAgentEndpoints(specializedAgents);

    // 3. Construire le schéma OpenAPI complet
    const openApiSchema = {
      openapi: '3.0.0',
      info: {
        title: 'Abrège API v2 - Agents Spécialisés',
        version: '2.0.0',
        description: 'API complète pour Abrège avec agents spécialisés et fonctionnalités existantes',
        contact: {
          name: 'Abrège API Support',
          email: 'support@abrege.com'
        }
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          description: 'Serveur de production'
        }
      ],
      paths: {
        // Endpoints existants (à compléter avec les vrais endpoints)
        ...getExistingEndpoints(),
        // Endpoints des agents spécialisés
        ...agentEndpoints
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Error message' },
              code: { type: 'string', example: 'ERROR_CODE' },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  executionTime: { type: 'number', example: 150 }
                }
              }
            }
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              metadata: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string', format: 'date-time' },
                  executionTime: { type: 'number', example: 150 }
                }
              }
            }
          }
        }
      },
      tags: [
        {
          name: 'Agents Spécialisés',
          description: 'Endpoints pour les agents IA spécialisés'
        },
        {
          name: 'Notes',
          description: 'Gestion des notes et contenu'
        },
        {
          name: 'Classeurs',
          description: 'Gestion des classeurs et organisation'
        },
        {
          name: 'Fichiers',
          description: 'Gestion des fichiers et uploads'
        },
        {
          name: 'Recherche',
          description: 'Recherche et filtrage de contenu'
        }
      ]
    };

    const generationTime = Date.now() - startTime;
    logApi.info(`✅ Schéma OpenAPI généré avec succès`, { 
      ...context, 
      generationTime,
      agentCount: specializedAgents.length,
      totalEndpoints: Object.keys(openApiSchema.paths).length
    });

    return NextResponse.json(openApiSchema);

  } catch (error) {
    const generationTime = Date.now() - startTime;
    logApi.error(`❌ Erreur génération schéma OpenAPI:`, { 
      ...context, 
      generationTime,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la génération du schéma OpenAPI',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * Générer les endpoints pour les agents spécialisés
 */
function generateAgentEndpoints(agents: Array<{ slug: string; display_name?: string; description?: string; model: string; input_schema?: unknown; output_schema?: unknown }>): Record<string, unknown> {
  const endpoints: Record<string, unknown> = {};

  agents.forEach(agent => {
    if (!agent.slug) return;

    // Vérifier si c'est un modèle Llama 4
    const isLlama4 = agent.model && agent.model.includes('llama-4');
    const endpointPath = `/api/v2/agents/${agent.slug}`;
    
    endpoints[endpointPath] = {
      post: {
        summary: agent.display_name || agent.name,
        description: agent.description || `Agent spécialisé: ${agent.slug}`,
        tags: ['Agents Spécialisés'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: agent.input_schema || {
                type: 'object',
                properties: {
                  input: { 
                    type: 'string', 
                    description: 'Données d\'entrée pour l\'agent' 
                  }
                },
                required: ['input']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Réponse de l\'agent spécialisé',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Success' },
                    {
                      type: 'object',
                      properties: agent.output_schema?.properties || {
                        result: { 
                          type: 'string', 
                          description: 'Résultat de l\'agent' 
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'Erreur de validation des paramètres',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Non authentifié',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'Agent non trouvé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '500': {
            description: 'Erreur interne du serveur',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      get: {
        summary: `Informations sur ${agent.display_name || agent.slug}`,
        description: `Récupère les informations et le schéma de l'agent ${agent.slug}`,
        tags: ['Agents Spécialisés'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        responses: {
          '200': {
            description: 'Informations de l\'agent',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Success' },
                    {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: agent.display_name },
                        slug: { type: 'string', example: agent.slug },
                        description: { type: 'string', example: agent.description },
                        model: { type: 'string', example: agent.model },
                        provider: { type: 'string', example: agent.provider },
                        input_schema: { type: 'object' },
                        output_schema: { type: 'object' },
                        is_active: { type: 'boolean', example: agent.is_active },
                        is_chat_agent: { type: 'boolean', example: agent.is_chat_agent },
                        is_endpoint_agent: { type: 'boolean', example: agent.is_endpoint_agent },
                        capabilities: { 
                          type: 'array', 
                          items: { type: 'string' },
                          example: agent.capabilities 
                        },
                        api_v2_capabilities: { 
                          type: 'array', 
                          items: { type: 'string' },
                          example: agent.api_v2_capabilities 
                        },
                        temperature: { type: 'number', example: agent.temperature },
                        max_tokens: { type: 'number', example: agent.max_tokens },
                        priority: { type: 'number', example: agent.priority }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': {
            description: 'Non authentifié',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'Agent non trouvé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '500': {
            description: 'Erreur interne du serveur',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      head: {
        summary: `Vérifier l'existence de ${agent.display_name || agent.slug}`,
        description: `Vérifie si l'agent ${agent.slug} existe et retourne ses métadonnées dans les headers`,
        tags: ['Agents Spécialisés'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        responses: {
          '200': {
            description: 'Agent existe',
    headers: {
              'X-Agent-Name': {
                schema: { type: 'string' },
                description: 'Nom de l\'agent'
              },
              'X-Agent-Model': {
                schema: { type: 'string' },
                description: 'Modèle LLM utilisé'
              },
              'X-Agent-Provider': {
                schema: { type: 'string' },
                description: 'Fournisseur LLM'
              },
              'X-Agent-Active': {
                schema: { type: 'boolean' },
                description: 'Agent actif'
              },
              'X-Agent-Chat': {
                schema: { type: 'boolean' },
                description: 'Visible dans le chat'
              },
              'X-Agent-Endpoint': {
                schema: { type: 'boolean' },
                description: 'A un endpoint dédié'
              }
            }
          },
          '401': {
            description: 'Non authentifié'
          },
          '404': {
            description: 'Agent non trouvé'
          },
          '500': {
            description: 'Erreur interne du serveur'
          }
        }
      }
    };
  });

  return endpoints;
}

/**
 * Récupérer les endpoints existants de l'API v2
 */
function getExistingEndpoints(): Record<string, unknown> {
  return {
    '/api/v2/search': {
      get: {
        summary: 'Recherche de contenu',
        description: 'Recherche dans les notes, classeurs et fichiers',
        tags: ['Recherche'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Terme de recherche'
          },
          {
            name: 'classeur_id',
            in: 'query',
            schema: { type: 'string' },
            description: 'ID du classeur à rechercher'
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'notes', 'classeurs', 'files'] },
            description: 'Type de contenu à rechercher'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Nombre maximum de résultats'
          }
        ],
        responses: {
          '200': {
            description: 'Résultats de recherche',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Success' },
                    {
                      type: 'object',
                      properties: {
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              content: { type: 'string' },
                              type: { type: 'string' },
                              score: { type: 'number' }
                            }
                          }
                        },
                        total: { type: 'integer' },
                        query: { type: 'string' }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/me': {
      get: {
        summary: 'Profil utilisateur',
        description: 'Récupère les informations du profil utilisateur',
        tags: ['Utilisateur'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        responses: {
          '200': {
            description: 'Profil utilisateur',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Success' },
                    {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/v2/note/{ref}/content:apply': {
      post: {
        summary: 'Appliquer des opérations de contenu',
        description: 'Applique des opérations de contenu sur une note (insert, replace, delete, upsert_section)',
        tags: ['Notes'],
        security: [
          { BearerAuth: [] },
          { ApiKeyAuth: [] }
        ],
        parameters: [
          {
            name: 'ref',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Référence de la note (UUID ou slug)'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ops: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'ID unique de l\'opération' },
                        action: { 
                          type: 'string', 
                          enum: ['insert', 'replace', 'delete', 'upsert_section'],
                          description: 'Type d\'opération à effectuer'
                        },
                        target: {
                          type: 'object',
                          properties: {
                            type: { 
                              type: 'string', 
                              enum: ['heading', 'regex', 'position', 'anchor'],
                              description: 'Type de cible'
                            },
                            heading: {
                              type: 'object',
                              properties: {
                                path: { 
                                  type: 'array', 
                                  items: { type: 'string' },
                                  description: 'Chemin du heading (ex: ["API", "Endpoints"])'
                                },
                                level: { 
                                  type: 'integer', 
                                  minimum: 1, 
                                  maximum: 6,
                                  description: 'Niveau du heading (1-6)'
                                },
                                heading_id: { 
                                  type: 'string',
                                  description: 'ID du heading (slug)'
                                }
                              }
                            },
                            regex: {
                              type: 'object',
                              properties: {
                                pattern: { 
                                  type: 'string', 
                                  maxLength: 1000,
                                  description: 'Pattern regex'
                                },
                                flags: { 
                                  type: 'string', 
                                  maxLength: 10,
                                  description: 'Flags regex (g, i, m, etc.)'
                                },
                                nth: { 
                                  type: 'integer',
                                  description: 'Nième correspondance à cibler'
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
                                  type: 'integer', 
                                  minimum: 0,
                                  description: 'Offset en caractères'
                                }
                              }
                            },
                            anchor: {
                              type: 'object',
                              properties: {
                                name: { 
                                  type: 'string', 
                                  enum: ['doc_start', 'doc_end', 'after_toc', 'before_first_heading'],
                                  description: 'Nom de l\'ancre sémantique'
                                }
                              }
                            }
                          }
                        },
                        where: { 
                          type: 'string', 
                          enum: ['before', 'after', 'inside_start', 'inside_end', 'at', 'replace_match'],
                          description: 'Position relative à la cible'
                        },
                        content: { 
                          type: 'string', 
                          maxLength: 100000,
                          description: 'Contenu à insérer/remplacer'
                        },
                        options: {
                          type: 'object',
                          properties: {
                            ensure_heading: { type: 'boolean' },
                            surround_with_blank_lines: { 
                              type: 'integer', 
                              minimum: 0, 
                              maximum: 3 
                            },
                            dedent: { type: 'boolean' }
                          }
                        }
                      },
                      required: ['id', 'action', 'target', 'where']
                    },
                    minItems: 1,
                    maxItems: 50
                  },
                  dry_run: { 
                    type: 'boolean', 
                    default: true,
                    description: 'Mode simulation (ne sauvegarde pas)'
                  },
                  transaction: { 
                    type: 'string', 
                    enum: ['all_or_nothing', 'best_effort'],
                    default: 'all_or_nothing',
                    description: 'Mode de transaction'
                  },
                  conflict_strategy: { 
                    type: 'string', 
                    enum: ['fail', 'skip'],
                    default: 'fail',
                    description: 'Stratégie en cas de conflit'
                  },
                  return: { 
                    type: 'string', 
                    enum: ['content', 'diff', 'none'],
                    default: 'diff',
                    description: 'Type de retour'
                  },
                  idempotency_key: { 
                    type: 'string', 
                    format: 'uuid',
                    description: 'Clé d\'idempotence'
                  }
                },
                required: ['ops']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Opérations appliquées avec succès',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Success' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            note_id: { type: 'string', format: 'uuid' },
                            ops_results: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  status: { 
                                    type: 'string', 
                                    enum: ['applied', 'skipped', 'failed'] 
                                  },
                                  matches: { type: 'integer' },
                                  range_before: {
                                    type: 'object',
                                    properties: {
                                      start: { type: 'integer' },
                                      end: { type: 'integer' }
                                    }
                                  },
                                  range_after: {
                                    type: 'object',
                                    properties: {
                                      start: { type: 'integer' },
                                      end: { type: 'integer' }
                                    }
                                  },
                                  preview: { type: 'string' },
                                  error: { type: 'string' }
                                }
                              }
                            },
                            etag: { type: 'string' },
                            diff: { type: 'string' },
                            content: { type: 'string' }
                          }
                        },
                        meta: {
                          type: 'object',
                          properties: {
                            dry_run: { type: 'boolean' },
                            char_diff: {
                              type: 'object',
                              properties: {
                                added: { type: 'integer' },
                                removed: { type: 'integer' }
                              }
                            },
                            execution_time: { type: 'integer' }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': {
            description: 'Erreur de validation ou regex',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { 
                          type: 'string',
                          enum: ['REGEX_COMPILE_ERROR', 'REGEX_TIMEOUT', 'INVALID_OPERATION']
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': {
            description: 'Note non trouvée',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { type: 'string', enum: ['TARGET_NOT_FOUND'] }
                      }
                    }
                  ]
                }
              }
            }
          },
          '408': {
            description: 'Timeout regex',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { type: 'string', enum: ['REGEX_TIMEOUT'] }
                      }
                    }
                  ]
                }
              }
            }
          },
          '409': {
            description: 'Correspondance ambiguë',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { type: 'string', enum: ['AMBIGUOUS_MATCH'] }
                      }
                    }
                  ]
                }
              }
            }
          },
          '412': {
            description: 'Version obsolète (ETag)',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { type: 'string', enum: ['PRECONDITION_FAILED'] }
                      }
                    }
                  ]
                }
              }
            }
          },
          '413': {
            description: 'Contenu trop volumineux',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Error' },
                    {
                      type: 'object',
                      properties: {
                        code: { type: 'string', enum: ['CONTENT_TOO_LARGE'] }
                      }
                    }
                  ]
                }
              }
            }
          },
          '422': {
            description: 'Erreur de validation des paramètres',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '500': {
            description: 'Erreur interne du serveur',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
    // Ajouter d'autres endpoints existants ici...
  };
}