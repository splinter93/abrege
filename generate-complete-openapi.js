{
    "openapi": "3.1.0",
    "info": {
      "title": "API V2 Abrège - Complète",
      "description": "API V2 moderne et robuste pour la gestion de notes, classeurs, dossiers et agents spécialisés avec support LLM. Authentification par clé API uniquement.",
      "version": "2.0.0",
      "contact": {
        "name": "Support Abrège",
        "email": "support@scrivia.app",
        "url": "https://docs.scrivia.app"
      },
      "license": {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
      }
    },
    "servers": [
      {
        "url": "https://scrivia.app/api/v2",
        "description": "Production"
      }
    ],
    "security": [
      {
        "ApiKeyAuth": []
      }
    ],
    "paths": {
      "/note/{ref}": {
        "get": {
          "operationId": "getNote",
          "summary": "Récupérer une note",
          "description": "Récupère une note par son ID ou slug avec toutes ses métadonnées",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Note récupérée avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Note"}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "404": {
              "description": "Note non trouvée",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Error"}
                }
              }
            }
          }
        }
      },
      "/note/create": {
        "post": {
          "operationId": "createNote",
          "summary": "Créer une nouvelle note",
          "description": "Créer une nouvelle note structurée dans un classeur spécifique",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_title": {
                      "type": "string",
                      "maxLength": 255,
                      "description": "Titre de la note"
                    },
                    "classeur_id": {
                      "type": "string",
                      "format": "uuid",
                      "description": "ID du classeur parent"
                    },
                    "folder_id": {
                      "type": "string",
                      "format": "uuid",
                      "description": "ID du dossier parent (optionnel)"
                    },
                    "content": {
                      "type": "string",
                      "description": "Contenu markdown de la note"
                    },
                    "visibility": {
                      "type": "string",
                      "enum": ["private", "public", "link-private", "link-public"],
                      "default": "private",
                      "description": "Visibilité de la note"
                    }
                  },
                  "required": ["source_title", "classeur_id"]
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Note créée avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Note"}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Données invalides",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Error"}
                }
              }
            }
          }
        }
      },
      "/note/{ref}/update": {
        "put": {
          "operationId": "updateNote",
          "summary": "Mettre à jour une note",
          "description": "Met à jour le contenu et les métadonnées d'une note existante",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "source_title": {"type": "string", "maxLength": 255},
                    "content": {"type": "string"},
                    "visibility": {
                      "type": "string",
                      "enum": ["private", "public", "link-private", "link-public"]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Note mise à jour avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Note"}
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
      "/note/recent": {
        "get": {
          "operationId": "getRecentNotes",
          "summary": "Notes récentes",
          "description": "Récupère les notes récemment modifiées de l'utilisateur",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "limit",
              "in": "query",
              "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
              "description": "Nombre maximum de notes à retourner"
            }
          ],
          "responses": {
            "200": {
              "description": "Liste des notes récentes",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Note"}
                          }
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
      "/note/{ref}/content:apply": {
        "post": {
          "operationId": "applyContentOperations",
          "summary": "Appliquer des opérations de contenu",
          "description": "Applique des opérations de contenu sur une note (insert, replace, delete, upsert_section) avec précision chirurgicale",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ops": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {"type": "string", "description": "ID unique de l'opération"},
                          "action": {
                            "type": "string",
                            "enum": ["insert", "replace", "delete", "upsert_section"],
                            "description": "Type d'opération à effectuer"
                          },
                          "target": {
                            "type": "object",
                            "properties": {
                              "type": {
                                "type": "string",
                                "enum": ["heading", "regex", "position", "anchor"],
                                "description": "Type de cible"
                              },
                              "heading": {
                                "type": "object",
                                "properties": {
                                  "path": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Chemin du heading (ex: [\"API\", \"Endpoints\"])"
                                  },
                                  "level": {
                                    "type": "integer",
                                    "minimum": 1,
                                    "maximum": 6,
                                    "description": "Niveau du heading (1-6)"
                                  },
                                  "heading_id": {
                                    "type": "string",
                                    "description": "ID du heading (slug)"
                                  }
                                }
                              },
                              "regex": {
                                "type": "object",
                                "properties": {
                                  "pattern": {
                                    "type": "string",
                                    "maxLength": 1000,
                                    "description": "Pattern regex"
                                  },
                                  "flags": {
                                    "type": "string",
                                    "maxLength": 10,
                                    "description": "Flags regex (g, i, m, etc.)"
                                  },
                                  "nth": {
                                    "type": "integer",
                                    "description": "Nième correspondance à cibler"
                                  }
                                }
                              },
                              "position": {
                                "type": "object",
                                "properties": {
                                  "mode": {
                                    "type": "string",
                                    "enum": ["offset", "start", "end"],
                                    "description": "Mode de position"
                                  },
                                  "offset": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "description": "Offset en caractères"
                                  }
                                }
                              },
                              "anchor": {
                                "type": "object",
                                "properties": {
                                  "name": {
                                    "type": "string",
                                    "enum": ["doc_start", "doc_end", "after_toc", "before_first_heading"],
                                    "description": "Nom de l'ancre sémantique"
                                  }
                                }
                              }
                            }
                          },
                          "where": {
                            "type": "string",
                            "enum": ["before", "after", "inside_start", "inside_end", "at", "replace_match"],
                            "description": "Position relative à la cible"
                          },
                          "content": {
                            "type": "string",
                            "maxLength": 100000,
                            "description": "Contenu à insérer/remplacer"
                          },
                          "options": {
                            "type": "object",
                            "properties": {
                              "ensure_heading": {"type": "boolean"},
                              "surround_with_blank_lines": {
                                "type": "integer",
                                "minimum": 0,
                                "maximum": 3
                              },
                              "dedent": {"type": "boolean"}
                            }
                          }
                        },
                        "required": ["id", "action", "target", "where"]
                      },
                      "minItems": 1,
                      "maxItems": 50
                    },
                    "dry_run": {
                      "type": "boolean",
                      "default": true,
                      "description": "Mode simulation (ne sauvegarde pas)"
                    },
                    "transaction": {
                      "type": "string",
                      "enum": ["all_or_nothing", "best_effort"],
                      "default": "all_or_nothing",
                      "description": "Mode de transaction"
                    },
                    "conflict_strategy": {
                      "type": "string",
                      "enum": ["fail", "skip"],
                      "default": "fail",
                      "description": "Stratégie en cas de conflit"
                    },
                    "return": {
                      "type": "string",
                      "enum": ["content", "diff", "none"],
                      "default": "diff",
                      "description": "Type de retour"
                    },
                    "idempotency_key": {
                      "type": "string",
                      "format": "uuid",
                      "description": "Clé d'idempotence"
                    }
                  },
                  "required": ["ops"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Opérations appliquées avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "note_id": {"type": "string", "format": "uuid"},
                              "ops_results": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {"type": "string"},
                                    "status": {
                                      "type": "string",
                                      "enum": ["applied", "skipped", "failed"]
                                    },
                                    "matches": {"type": "integer"},
                                    "range_before": {
                                      "type": "object",
                                      "properties": {
                                        "start": {"type": "integer"},
                                        "end": {"type": "integer"}
                                      }
                                    },
                                    "range_after": {
                                      "type": "object",
                                      "properties": {
                                        "start": {"type": "integer"},
                                        "end": {"type": "integer"}
                                      }
                                    },
                                    "preview": {"type": "string"},
                                    "error": {"type": "string"}
                                  }
                                }
                              },
                              "etag": {"type": "string"},
                              "diff": {"type": "string"},
                              "content": {"type": "string"}
                            }
                          },
                          "meta": {
                            "type": "object",
                            "properties": {
                              "dry_run": {"type": "boolean"},
                              "char_diff": {
                                "type": "object",
                                "properties": {
                                  "added": {"type": "integer"},
                                  "removed": {"type": "integer"}
                                }
                              },
                              "execution_time": {"type": "integer"}
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Erreur de validation ou regex",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {
                            "type": "string",
                            "enum": ["REGEX_COMPILE_ERROR", "REGEX_TIMEOUT", "INVALID_OPERATION"]
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "404": {
              "description": "Note non trouvée",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {"type": "string", "enum": ["TARGET_NOT_FOUND"]}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "412": {
              "description": "Version obsolète (ETag)",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {"type": "string", "enum": ["PRECONDITION_FAILED"]}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "422": {
              "description": "Erreur de validation des paramètres",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Error"}
                }
              }
            }
          }
        }
      },
      "/agents": {
        "get": {
          "operationId": "listAgents",
          "summary": "Liste des agents",
          "description": "Récupère la liste des agents spécialisés disponibles",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Liste des agents",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Agent"}
                          }
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
      "/agents/{agentId}": {
        "get": {
          "operationId": "getAgent",
          "summary": "Récupérer un agent",
          "description": "Récupère les détails d'un agent spécialisé",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "responses": {
            "200": {
              "description": "Agent récupéré avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Agent"}
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "post": {
          "operationId": "executeAgentById",
          "summary": "Exécuter un agent par ID",
          "description": "Exécute un agent spécialisé par son ID",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "input": {"type": "string", "description": "Message d'entrée"},
                    "options": {
                      "type": "object",
                      "properties": {
                        "temperature": {"type": "number", "minimum": 0, "maximum": 2},
                        "max_tokens": {"type": "integer", "minimum": 1, "maximum": 10000},
                        "stream": {"type": "boolean"}
                      }
                    }
                  },
                  "required": ["input"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Agent exécuté avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "agent_id": {"type": "string"},
                              "response": {"type": "string"},
                              "execution_time": {"type": "integer"}
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "put": {
          "operationId": "updateAgent",
          "summary": "Mettre à jour un agent",
          "description": "Met à jour les propriétés d'un agent spécialisé",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "description": {"type": "string", "maxLength": 1000},
                    "is_active": {"type": "boolean"},
                    "config": {"type": "object"}
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Agent mis à jour avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Agent"}
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "patch": {
          "operationId": "patchAgent",
          "summary": "Mise à jour partielle d'un agent",
          "description": "Met à jour partiellement les propriétés d'un agent",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "description": {"type": "string", "maxLength": 1000},
                    "is_active": {"type": "boolean"},
                    "config": {"type": "object"}
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Agent mis à jour avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Agent"}
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        "delete": {
          "operationId": "deleteAgent",
          "summary": "Supprimer un agent",
          "description": "Supprime un agent spécialisé",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "responses": {
            "200": {
              "description": "Agent supprimé avec succès",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Success"}
                }
              }
            }
          }
        },
        "head": {
          "operationId": "checkAgent",
          "summary": "Vérifier l'existence d'un agent",
          "description": "Vérifie si un agent existe et est actif",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "agentId",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "ID de l'agent"
            }
          ],
          "responses": {
            "200": {
              "description": "Agent existe et est actif"
            },
            "404": {
              "description": "Agent non trouvé"
            }
          }
        }
      },
      "/agents/execute": {
        "post": {
          "operationId": "executeAgent",
          "summary": "Exécuter un agent universel",
          "description": "Endpoint universel pour exécuter n'importe quel agent spécialisé avec une interface simple",
          "tags": ["Agents Spécialisés"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "ref": {
                      "type": "string",
                      "description": "Référence de l'agent (ID ou slug)",
                      "example": "johnny"
                    },
                    "input": {
                      "type": "string",
                      "description": "Message d'entrée pour l'agent",
                      "example": "Analyse cette note"
                    },
                    "options": {
                      "type": "object",
                      "properties": {
                        "temperature": {
                          "type": "number",
                          "minimum": 0,
                          "maximum": 2,
                          "description": "Température de génération (0-2)"
                        },
                        "max_tokens": {
                          "type": "integer",
                          "minimum": 1,
                          "maximum": 10000,
                          "description": "Nombre maximum de tokens"
                        },
                        "stream": {
                          "type": "boolean",
                          "description": "Activer le streaming"
                        }
                      }
                    }
                  },
                  "required": ["ref", "input"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Agent exécuté avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "ref": {"type": "string", "example": "johnny"},
                              "agent_name": {"type": "string", "example": "Johnny Query"},
                              "agent_id": {"type": "string", "format": "uuid"},
                              "response": {"type": "string", "description": "Réponse de l'agent"},
                              "execution_time": {"type": "integer", "description": "Temps d'exécution en ms"},
                              "model_used": {"type": "string", "example": "meta-llama/llama-4-scout-17b-16e-instruct"},
                              "provider": {"type": "string", "example": "groq"}
                            }
                          },
                          "meta": {
                            "type": "object",
                            "properties": {
                              "timestamp": {"type": "string", "format": "date-time"},
                              "agent_slug": {"type": "string"},
                              "agent_type": {"type": "string", "enum": ["chat", "endpoint"]},
                              "input_length": {"type": "integer"},
                              "response_length": {"type": "integer"}
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "400": {
              "description": "Agent inactif ou paramètres invalides",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {"type": "string", "enum": ["AGENT_INACTIVE", "INVALID_INPUT"]}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "404": {
              "description": "Agent non trouvé",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {"type": "string", "enum": ["AGENT_NOT_FOUND"]}
                        }
                      }
                    ]
                  }
                }
              }
            },
            "422": {
              "description": "Erreur de validation des paramètres",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Error"}
                }
              }
            },
            "500": {
              "description": "Erreur d'exécution de l'agent",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Error"},
                      {
                        "type": "object",
                        "properties": {
                          "code": {"type": "string", "enum": ["EXECUTION_FAILED"]}
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
      "/search": {
        "get": {
          "operationId": "searchContent",
          "summary": "Recherche de contenu",
          "description": "Recherche dans les notes, classeurs et fichiers",
          "tags": ["Recherche"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "q",
              "in": "query",
              "required": true,
              "schema": {"type": "string"},
              "description": "Terme de recherche"
            },
            {
              "name": "classeur_id",
              "in": "query",
              "schema": {"type": "string"},
              "description": "ID du classeur à rechercher"
            },
            {
              "name": "type",
              "in": "query",
              "schema": {"type": "string", "enum": ["all", "notes", "classeurs", "files"]},
              "description": "Type de contenu à rechercher"
            },
            {
              "name": "limit",
              "in": "query",
              "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
              "description": "Nombre maximum de résultats"
            }
          ],
          "responses": {
            "200": {
              "description": "Résultats de recherche",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "results": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "content": {"type": "string"},
                                "type": {"type": "string"},
                                "score": {"type": "number"}
                              }
                            }
                          },
                          "total": {"type": "integer"},
                          "query": {"type": "string"}
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
      "/files/search": {
        "get": {
          "operationId": "searchFiles",
          "summary": "Recherche de fichiers",
          "description": "Recherche spécifiquement dans les fichiers uploadés",
          "tags": ["Recherche"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "q",
              "in": "query",
              "required": true,
              "schema": {"type": "string"},
              "description": "Terme de recherche"
            },
            {
              "name": "classeur_id",
              "in": "query",
              "schema": {"type": "string"},
              "description": "ID du classeur à rechercher"
            },
            {
              "name": "file_type",
              "in": "query",
              "schema": {"type": "string", "enum": ["all", "image", "document", "pdf", "text"]},
              "description": "Type de fichier à rechercher"
            },
            {
              "name": "limit",
              "in": "query",
              "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20},
              "description": "Nombre maximum de résultats"
            }
          ],
          "responses": {
            "200": {
              "description": "Résultats de recherche de fichiers",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "id": {"type": "string"},
                                "filename": {"type": "string"},
                                "file_type": {"type": "string"},
                                "size": {"type": "integer"},
                                "url": {"type": "string"},
                                "classeur_id": {"type": "string"},
                                "created_at": {"type": "string", "format": "date-time"}
                              }
                            }
                          },
                          "total": {"type": "integer"},
                          "query": {"type": "string"}
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
      "/stats": {
        "get": {
          "operationId": "getStats",
          "summary": "Statistiques",
          "description": "Récupère les statistiques de l'utilisateur et de la plateforme",
          "tags": ["Utilisateur"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Statistiques récupérées",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "notes_count": {"type": "integer"},
                              "classeurs_count": {"type": "integer"},
                              "folders_count": {"type": "integer"},
                              "files_count": {"type": "integer"},
                              "storage_used": {"type": "integer", "description": "Stockage utilisé en bytes"},
                              "storage_limit": {"type": "integer", "description": "Limite de stockage en bytes"}
                            }
                          }
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
      "/tools": {
        "get": {
          "operationId": "getTools",
          "summary": "Outils disponibles",
          "description": "Récupère la liste des outils et fonctionnalités disponibles",
          "tags": ["Utilisateur"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Liste des outils",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "category": {"type": "string"},
                                "available": {"type": "boolean"}
                              }
                            }
                          }
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
      "/delete/{resource}/{ref}": {
        "delete": {
          "operationId": "deleteResource",
          "summary": "Suppression unifiée",
          "description": "Supprime une ressource (note, dossier, classeur, fichier) de manière unifiée",
          "tags": ["Utilitaires"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "resource",
              "in": "path",
              "required": true,
              "schema": {"type": "string", "enum": ["note", "folder", "classeur", "file"]},
              "description": "Type de ressource à supprimer"
            },
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la ressource (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Ressource supprimée avec succès",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Success"}
                }
              }
            }
          }
        }
      },
      "/trash": {
        "get": {
          "operationId": "getTrash",
          "summary": "Contenu de la corbeille",
          "description": "Récupère le contenu de la corbeille de l'utilisateur",
          "tags": ["Corbeille"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Contenu de la corbeille",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "notes": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Note"}
                              },
                              "folders": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Folder"}
                              },
                              "classeurs": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Classeur"}
                              },
                              "files": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "id": {"type": "string"},
                                    "filename": {"type": "string"},
                                    "deleted_at": {"type": "string", "format": "date-time"}
                                  }
                                }
                              }
                            }
                          }
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
      "/trash/restore": {
        "post": {
          "operationId": "restoreFromTrash",
          "summary": "Restaurer un élément",
          "description": "Restaure un élément depuis la corbeille",
          "tags": ["Corbeille"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resource_type": {
                      "type": "string",
                      "enum": ["note", "folder", "classeur", "file"],
                      "description": "Type de ressource à restaurer"
                    },
                    "resource_id": {
                      "type": "string",
                      "description": "ID de la ressource à restaurer"
                    }
                  },
                  "required": ["resource_type", "resource_id"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Élément restauré avec succès",
              "content": {
                "application/json": {
                  "schema": {"$ref": "#/components/schemas/Success"}
                }
              }
            }
          }
        }
      },
      "/trash/purge": {
        "post": {
          "operationId": "purgeTrash",
          "summary": "Vider la corbeille",
          "description": "Supprime définitivement tous les éléments de la corbeille",
          "tags": ["Corbeille"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Corbeille vidée avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "deleted_count": {"type": "integer"},
                              "freed_space": {"type": "integer", "description": "Espace libéré en bytes"}
                            }
                          }
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
      "/me": {
        "get": {
          "operationId": "getUserProfile",
          "summary": "Profil utilisateur",
          "description": "Récupère les informations du profil utilisateur",
          "tags": ["Utilisateur"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Profil utilisateur",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "id": {"type": "string"},
                              "email": {"type": "string"},
                              "name": {"type": "string"},
                              "created_at": {"type": "string", "format": "date-time"},
                              "updated_at": {"type": "string", "format": "date-time"}
                            }
                          }
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
      "/note/{ref}/insert-content": {
        "post": {
          "operationId": "insertNoteContent",
          "summary": "Insérer du contenu dans une note",
          "description": "Insère du contenu à une position spécifique dans une note",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "content": {"type": "string", "description": "Contenu à insérer"},
                    "position": {"type": "integer", "description": "Position d'insertion"},
                    "where": {
                      "type": "string",
                      "enum": ["before", "after", "replace"],
                      "default": "after"
                    }
                  },
                  "required": ["content"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Contenu inséré avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Note"}
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
      "/note/{ref}/table-of-contents": {
        "get": {
          "operationId": "getNoteTOC",
          "summary": "Table des matières d'une note",
          "description": "Récupère la table des matières structurée d'une note",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Table des matières récupérée",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "level": {"type": "integer"},
                                "title": {"type": "string"},
                                "id": {"type": "string"},
                                "position": {"type": "integer"}
                              }
                            }
                          }
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
      "/note/{ref}/share": {
        "post": {
          "operationId": "shareNote",
          "summary": "Partager une note",
          "description": "Génère un lien de partage pour une note",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "visibility": {
                      "type": "string",
                      "enum": ["public", "link-private", "link-public"],
                      "default": "link-public"
                    },
                    "expires_at": {
                      "type": "string",
                      "format": "date-time",
                      "description": "Date d'expiration du lien (optionnel)"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Note partagée avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "public_url": {"type": "string"},
                              "share_token": {"type": "string"},
                              "expires_at": {"type": "string", "format": "date-time"}
                            }
                          }
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
      "/note/{ref}/move": {
        "post": {
          "operationId": "moveNote",
          "summary": "Déplacer une note",
          "description": "Déplace une note vers un autre classeur ou dossier",
          "tags": ["Notes"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence de la note (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "classeur_id": {"type": "string", "format": "uuid"},
                    "folder_id": {"type": "string", "format": "uuid"},
                    "position": {"type": "integer", "description": "Nouvelle position"}
                  },
                  "required": ["classeur_id"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Note déplacée avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Note"}
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
      "/folder/{ref}": {
        "get": {
          "operationId": "getFolder",
          "summary": "Récupérer un dossier",
          "description": "Récupère un dossier par son ID ou slug",
          "tags": ["Dossiers"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du dossier (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Dossier récupéré avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Folder"}
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
      "/folder/create": {
        "post": {
          "operationId": "createFolder",
          "summary": "Créer un dossier",
          "description": "Crée un nouveau dossier dans un classeur",
          "tags": ["Dossiers"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "classeur_id": {"type": "string", "format": "uuid"},
                    "parent_folder_id": {"type": "string", "format": "uuid"},
                    "position": {"type": "integer"}
                  },
                  "required": ["name", "classeur_id"]
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Dossier créé avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Folder"}
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
      "/folder/{ref}/update": {
        "put": {
          "operationId": "updateFolder",
          "summary": "Mettre à jour un dossier",
          "description": "Met à jour les propriétés d'un dossier",
          "tags": ["Dossiers"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du dossier (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "position": {"type": "integer"}
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Dossier mis à jour avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Folder"}
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
      "/folder/{ref}/tree": {
        "get": {
          "operationId": "getFolderTree",
          "summary": "Arbre d'un dossier",
          "description": "Récupère l'arbre complet d'un dossier avec ses sous-dossiers et notes",
          "tags": ["Dossiers"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du dossier (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Arbre du dossier récupéré",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "folder": {"$ref": "#/components/schemas/Folder"},
                              "subfolders": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Folder"}
                              },
                              "notes": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Note"}
                              }
                            }
                          }
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
      "/folder/{ref}/move": {
        "post": {
          "operationId": "moveFolder",
          "summary": "Déplacer un dossier",
          "description": "Déplace un dossier vers un autre classeur ou dossier parent",
          "tags": ["Dossiers"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du dossier (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "classeur_id": {"type": "string", "format": "uuid"},
                    "parent_folder_id": {"type": "string", "format": "uuid"},
                    "position": {"type": "integer"}
                  },
                  "required": ["classeur_id"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Dossier déplacé avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Folder"}
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
      "/classeurs": {
        "get": {
          "operationId": "listClasseurs",
          "summary": "Liste des classeurs",
          "description": "Récupère la liste des classeurs de l'utilisateur",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Liste des classeurs",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Classeur"}
                          }
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
      "/classeurs/with-content": {
        "get": {
          "operationId": "listClasseursWithContent",
          "summary": "Classeurs avec contenu",
          "description": "Récupère les classeurs avec leur contenu complet",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "responses": {
            "200": {
              "description": "Classeurs avec contenu",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {
                              "allOf": [
                                {"$ref": "#/components/schemas/Classeur"},
                                {
                                  "type": "object",
                                  "properties": {
                                    "folders": {
                                      "type": "array",
                                      "items": {"$ref": "#/components/schemas/Folder"}
                                    },
                                    "notes": {
                                      "type": "array",
                                      "items": {"$ref": "#/components/schemas/Note"}
                                    }
                                  }
                                }
                              ]
                            }
                          }
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
      "/classeur/create": {
        "post": {
          "operationId": "createClasseur",
          "summary": "Créer un classeur",
          "description": "Crée un nouveau classeur pour l'utilisateur",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "description": {"type": "string", "maxLength": 1000},
                    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
                    "position": {"type": "integer"}
                  },
                  "required": ["name"]
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Classeur créé avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Classeur"}
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
      "/classeur/{ref}": {
        "get": {
          "operationId": "getClasseur",
          "summary": "Récupérer un classeur",
          "description": "Récupère un classeur par son ID ou slug",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du classeur (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Classeur récupéré avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Classeur"}
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
      "/classeur/{ref}/update": {
        "put": {
          "operationId": "updateClasseur",
          "summary": "Mettre à jour un classeur",
          "description": "Met à jour les propriétés d'un classeur",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du classeur (UUID ou slug)"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "maxLength": 255},
                    "description": {"type": "string", "maxLength": 1000},
                    "color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
                    "position": {"type": "integer"}
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Classeur mis à jour avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {"$ref": "#/components/schemas/Classeur"}
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
      "/classeur/{ref}/tree": {
        "get": {
          "operationId": "getClasseurTree",
          "summary": "Arbre d'un classeur",
          "description": "Récupère l'arbre complet d'un classeur avec ses dossiers et notes",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "parameters": [
            {
              "name": "ref",
              "in": "path",
              "required": true,
              "schema": {"type": "string"},
              "description": "Référence du classeur (UUID ou slug)"
            }
          ],
          "responses": {
            "200": {
              "description": "Arbre du classeur récupéré",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "object",
                            "properties": {
                              "classeur": {"$ref": "#/components/schemas/Classeur"},
                              "folders": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Folder"}
                              },
                              "notes": {
                                "type": "array",
                                "items": {"$ref": "#/components/schemas/Note"}
                              }
                            }
                          }
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
      "/classeur/reorder": {
        "post": {
          "operationId": "reorderClasseurs",
          "summary": "Réorganiser les classeurs",
          "description": "Réorganise l'ordre des classeurs de l'utilisateur",
          "tags": ["Classeurs"],
          "security": [{"ApiKeyAuth": []}],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "classeur_orders": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "classeur_id": {"type": "string", "format": "uuid"},
                          "position": {"type": "integer"}
                        },
                        "required": ["classeur_id", "position"]
                      }
                    }
                  },
                  "required": ["classeur_orders"]
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Classeurs réorganisés avec succès",
              "content": {
                "application/json": {
                  "schema": {
                    "allOf": [
                      {"$ref": "#/components/schemas/Success"},
                      {
                        "type": "object",
                        "properties": {
                          "data": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/Classeur"}
                          }
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
      "/openapi-schema": {
        "get": {
          "operationId": "getOpenAPISchema",
          "summary": "Schéma OpenAPI",
          "description": "Récupère le schéma OpenAPI complet de l'API",
          "tags": ["Documentation"],
          "responses": {
            "200": {
              "description": "Schéma OpenAPI",
              "content": {
                "application/json": {
                  "schema": {"type": "object"}
                }
              }
            }
          }
        }
      }
    },
    "components": {
      "securitySchemes": {
        "ApiKeyAuth": {
          "type": "apiKey",
          "in": "header",
          "name": "X-API-Key",
          "description": "Clé API d'Abrège"
        }
      },
      "schemas": {
        "Success": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean",
              "example": true
            },
            "message": {
              "type": "string",
              "description": "Message de succès optionnel"
            },
            "metadata": {
              "type": "object",
              "properties": {
                "timestamp": {"type": "string", "format": "date-time"},
                "executionTime": {"type": "number"}
              }
            }
          },
          "required": ["success"]
        },
        "Error": {
          "type": "object",
          "properties": {
            "success": {
              "type": "boolean",
              "example": false
            },
            "error": {
              "type": "string",
              "description": "Message d'erreur descriptif"
            },
            "code": {
              "type": "string",
              "description": "Code d'erreur spécifique"
            },
            "details": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Détails des erreurs de validation"
            },
            "metadata": {
              "type": "object",
              "properties": {
                "timestamp": {"type": "string", "format": "date-time"},
                "executionTime": {"type": "number"},
                "requestId": {"type": "string"}
              }
            }
          },
          "required": ["success", "error"]
        },
        "Note": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID unique de la note"
            },
            "source_title": {
              "type": "string",
              "maxLength": 255,
              "description": "Titre de la note"
            },
            "slug": {
              "type": "string",
              "description": "Slug unique de la note"
            },
            "content": {
              "type": "string",
              "description": "Contenu markdown de la note"
            },
            "html_content": {
              "type": "string",
              "description": "Contenu HTML généré"
            },
            "visibility": {
              "type": "string",
              "enum": ["private", "public", "link-private", "link-public"],
              "description": "Visibilité de la note"
            },
            "public_url": {
              "type": "string",
              "description": "URL publique de la note"
            },
            "classeur_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID du classeur parent"
            },
            "folder_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID du dossier parent"
            },
            "position": {
              "type": "integer",
              "description": "Position dans le classeur"
            },
            "created_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de création"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de dernière modification"
            },
            "etag": {
              "type": "string",
              "description": "ETag pour la gestion de version"
            }
          },
          "required": ["id", "source_title", "content"]
        },
        "Folder": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID unique du dossier"
            },
            "name": {
              "type": "string",
              "maxLength": 255,
              "description": "Nom du dossier"
            },
            "slug": {
              "type": "string",
              "description": "Slug unique du dossier"
            },
            "classeur_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID du classeur parent"
            },
            "parent_folder_id": {
              "type": "string",
              "format": "uuid",
              "description": "ID du dossier parent (optionnel)"
            },
            "position": {
              "type": "integer",
              "description": "Position dans le classeur"
            },
            "created_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de création"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de dernière modification"
            }
          },
          "required": ["id", "name", "classeur_id"]
        },
        "Classeur": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID unique du classeur"
            },
            "name": {
              "type": "string",
              "maxLength": 255,
              "description": "Nom du classeur"
            },
            "slug": {
              "type": "string",
              "description": "Slug unique du classeur"
            },
            "description": {
              "type": "string",
              "maxLength": 1000,
              "description": "Description du classeur"
            },
            "color": {
              "type": "string",
              "pattern": "^#[0-9A-Fa-f]{6}$",
              "description": "Couleur du classeur (hex)"
            },
            "position": {
              "type": "integer",
              "description": "Position dans la liste des classeurs"
            },
            "created_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de création"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de dernière modification"
            }
          },
          "required": ["id", "name"]
        },
        "Agent": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "format": "uuid",
              "description": "ID unique de l'agent"
            },
            "name": {
              "type": "string",
              "maxLength": 255,
              "description": "Nom de l'agent"
            },
            "slug": {
              "type": "string",
              "description": "Slug unique de l'agent"
            },
            "description": {
              "type": "string",
              "maxLength": 1000,
              "description": "Description de l'agent"
            },
            "is_active": {
              "type": "boolean",
              "description": "Statut actif de l'agent"
            },
            "agent_type": {
              "type": "string",
              "enum": ["chat", "endpoint"],
              "description": "Type d'agent"
            },
            "config": {
              "type": "object",
              "description": "Configuration de l'agent"
            },
            "created_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de création"
            },
            "updated_at": {
              "type": "string",
              "format": "date-time",
              "description": "Date de dernière modification"
            }
          },
          "required": ["id", "name", "is_active"]
        }
      }
    },
    "tags": [
      {
        "name": "Notes",
        "description": "Gestion des notes et contenu"
      },
      {
        "name": "Dossiers",
        "description": "Gestion des dossiers"
      },
      {
        "name": "Classeurs",
        "description": "Gestion des classeurs et organisation"
      },
      {
        "name": "Agents Spécialisés",
        "description": "Endpoints pour les agents IA spécialisés"
      },
      {
        "name": "Recherche",
        "description": "Recherche et filtrage de contenu"
      },
      {
        "name": "Corbeille",
        "description": "Gestion de la corbeille"
      },
      {
        "name": "Utilisateur",
        "description": "Gestion du profil utilisateur"
      },
      {
        "name": "Utilitaires",
        "description": "Outils et utilitaires"
      },
      {
        "name": "Documentation",
        "description": "Documentation et métadonnées de l'API"
      }
    ]
  }
  
