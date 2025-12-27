{
  "openapi": "3.1.0",
  "info": {
    "title": "Factoria Hybrid PDF Parser API",
    "version": "1.1.0",
    "description": "Parser hybride combinant `pdf-parse` (texte/metadata) et `PDFPlumber` (tableaux structurés). Accessible via la route Next.js `/api/pdf/hybrid-parse-v4` ou directement via le microservice Railway."
  },
  "servers": [
    {
      "url": "https://factoria-nine.vercel.app",
      "description": "Proxy Next.js (recommandé pour clients externes)"
    },
    {
      "url": "https://hybrid-parser.up.railway.app",
      "description": "Microservice Railway (accès direct interne)"
    }
  ],
  "security": [],
  "paths": {
    "/api/pdf/hybrid-parse-v4": {
      "get": {
        "tags": [
          "Health"
        ],
        "summary": "Vérifier l'état du parser hybride",
        "description": "Retourne l'état du proxy et des services downstream (pdf-parse & PDFPlumber).",
        "operationId": "getHybridParserHealth",
        "responses": {
          "200": {
            "description": "Succès (healthy ou degraded)",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ProxyHealthResponse"
                }
              }
            }
          },
          "502": {
            "description": "Proxy indisponible / Downstream KO",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "PDF Parsing"
        ],
        "summary": "Parser un PDF avec l'approche hybride V4",
        "description": "Transmet un PDF au microservice hybride qui combine `pdf-parse` (texte propre, colonnes, metadata) et `PDFPlumber` (tableaux JSON).",
        "operationId": "parseHybridPdfV4",
        "parameters": [
          {
            "name": "result_type",
            "in": "query",
            "description": "Format principal retourné (`markdown`, `text` ou `json`).",
            "schema": {
            "type": "string",
              "enum": [
                "markdown",
                "text",
                "json"
              ],
              "default": "markdown"
            }
          },
          {
            "name": "split_by_page",
            "in": "query",
            "description": "Retourner un tableau `pages[]` pour le RAG ou non.",
            "schema": {
              "type": "boolean",
              "default": false
            }
          },
          {
            "name": "preset",
            "in": "query",
            "description": "Preset métier pour ajuster les heuristiques.",
            "schema": {
            "type": "string",
              "enum": [
                "default",
                "insurance",
                "invoice",
                "contract",
                "scientific"
              ],
              "default": "default"
            }
          },
          {
            "name": "include_tables",
            "in": "query",
            "description": "Inclure ou non les tableaux JSON dans la réponse.",
            "schema": {
            "type": "boolean",
              "default": true
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary",
                    "description": "PDF à parser (50MB recommandé max)."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Parsing réussi",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ParseSuccessResponse"
                },
                "example": {
                  "requestId": "d127418e-99d5-446a-8e2f-523689bee398",
                  "success": true,
                  "data": {
                    "fullText": "…",
                    "fullMarkdown": "…",
                    "tables": [
                      [
                        [
                          "Garantie",
                          "Franchise",
                          "Plafond",
                          "Prime Annuelle"
                        ],
                        [
                          "Vol Basique",
                          "150€",
                          "2 000€",
                          "120€"
                        ]
                      ]
                    ],
                    "metadata": {
                      "title": "(anonymous)",
                      "producer": "ReportLab PDF Library - www.reportlab.com"
                    },
                    "stats": {
                      "totalPages": 1,
                      "wordCount": 60,
                      "tableCount": 1,
                      "processingTime": 398,
                      "resultType": "markdown",
                      "splitByPage": false,
                      "preset": "default"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Paramètres invalides ou fichier manquant",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                },
                "examples": {
                  "missing_file": {
                    "value": {
                      "success": false,
                      "error": "No file provided. Please upload a PDF file."
                    }
                  },
                  "invalid_result_type": {
                    "value": {
                      "success": false,
                      "error": "Invalid result_type. Must be one of: markdown, text, json"
                    }
                  }
                }
              }
            }
          },
          "502": {
            "description": "Un des services downstream est indisponible",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                },
                "example": {
                  "success": false,
                  "error": "fetch failed",
                  "requestId": "xxx"
            }
          }
        }
      },
          "500": {
            "description": "Erreur interne",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "TableCell": {
        "type": "string",
        "nullable": true
      },
      "TableRow": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/TableCell"
        }
      },
      "TableData": {
        "type": "array",
        "description": "Tableau extrait via PDFPlumber (array de rows).",
        "items": {
          "$ref": "#/components/schemas/TableRow"
        }
      },
      "PageResult": {
        "type": "object",
        "properties": {
          "pageNumber": {
            "type": "integer"
          },
          "text": {
            "type": "string"
          },
          "markdown": {
            "type": "string"
          },
          "tables": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TableData"
            }
          },
          "metadata": {
            "type": "object",
            "properties": {
              "wordCount": {
                "type": "integer"
              },
              "readingTime": {
                "type": "integer",
                "description": "Minutes estimées (200 mots/min)."
              }
            }
          }
        }
      },
      "Stats": {
        "type": "object",
        "properties": {
          "totalPages": {
            "type": "integer"
          },
          "totalLength": {
            "type": "integer",
            "description": "Longueur du texte en caractères."
          },
          "wordCount": {
            "type": "integer"
          },
          "tableCount": {
            "type": "integer"
          },
          "processingTime": {
            "type": "integer",
            "description": "Temps total en ms."
          },
          "resultType": {
            "type": "string",
            "enum": [
              "markdown",
              "text",
              "json"
            ]
          },
          "splitByPage": {
            "type": "boolean"
          },
          "preset": {
            "type": "string"
          }
        }
      },
      "ParseData": {
        "type": "object",
        "properties": {
          "pages": {
            "type": "array",
            "description": "Présent seulement si `split_by_page=true`.",
            "items": {
              "$ref": "#/components/schemas/PageResult"
            }
          },
          "fullText": {
            "type": "string"
          },
          "fullMarkdown": {
            "type": "string",
            "description": "Markdown final avec insertion des tableaux."
          },
          "tables": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TableData"
            }
          },
          "metadata": {
            "type": "object",
            "properties": {},
            "additionalProperties": true,
            "description": "Métadonnées du PDF (title, producer, etc.)"
          },
          "stats": {
            "$ref": "#/components/schemas/Stats"
          }
        }
      },
      "ParseSuccessResponse": {
        "type": "object",
        "required": [
          "success",
          "data"
        ],
        "properties": {
          "requestId": {
            "type": "string",
            "description": "ID de traçabilité (UUID)."
          },
          "success": {
            "type": "boolean",
            "const": true
          },
          "data": {
            "$ref": "#/components/schemas/ParseData"
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "const": false
          },
          "error": {
            "type": "string"
          },
          "requestId": {
            "type": "string",
            "nullable": true
          }
        }
      },
      "ProxyHealthResponse": {
                  "type": "object",
                  "properties": {
                    "service": {
                      "type": "string",
            "example": "Hybrid PDF Parser V4"
                    },
          "upstream": {
            "type": "object",
            "properties": {
                    "status": {
                      "type": "string",
                "enum": [
                  "healthy",
                  "degraded"
                ]
              },
              "services": {
                "type": "object",
                "properties": {
                  "pdfParse": {
                    "type": "boolean"
                  },
                  "pdfPlumber": {
                    "type": "boolean"
                  }
                }
              },
              "version": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "PDF Parsing",
      "description": "Endpoints de parsing hybride (texte + tableaux)."
    },
    {
      "name": "Health",
      "description": "Surveillance du service et de ses dépendances."
    }
  ]
}