# Synesia LLM Execution API - Guide Complet

> **API pour l'exécution d'agents IA avec support complet des outils, streaming et orchestration avancée**

---

## 📋 Table des Matières

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Authentification](#authentification)
- [Endpoints API](#endpoints-api)
- [Types d'Outils](#types-doutils)
- [Configuration](#configuration)
- [Exemples Complets](#exemples-complets)
- [Gestion d'Erreurs](#gestion-derreurs)
- [Bonnes Pratiques](#bonnes-pratiques)
- [Intégration Provider](#intégration-provider)

---

## 🎯 Introduction

L'API LLM Execution de Synesia permet d'exécuter des conversations avec des modèles d'IA tout en bénéficiant d'une **orchestration complète des outils**. Contrairement aux APIs LLM classiques, cette API supporte :

- ✅ **Tools calls avancés** : Callable, MCP, Knowledge, OpenAPI, Code Interpreter, etc.
- ✅ **Orchestration multi-tours** : Gestion automatique des appels d'outils et du reasoning
- ✅ **Streaming temps réel** : Événements détaillés pendant l'exécution
- ✅ **Injection d'outils externes** : Utilisez vos propres APIs et serveurs MCP
- ✅ **Gestion des connaissances** : Recherche vectorielle dans vos bases de données
- ✅ **Sécurité intégrée** : Authentification et autorisations par projet

### Cas d'Usage

- 🤖 **Agent conversationnel** : Chatbots avec outils personnalisés
- 🔧 **Assistant développeur** : Intégration d'outils de développement
- 📊 **Agent data** : Analyse et traitement de données
- 🎨 **Agent créatif** : Génération avec outils spécialisés
- 🔍 **Agent recherche** : Investigation avec sources multiples

---

## 🚀 Quick Start

### 1. Configuration de Base

```bash
# URL de base de l'API
BASE_URL=https://origins-server.up.railway.app

# Authentification (choisissez une méthode)
API_KEY=apiKey.12345.abcdef123456
# OU
BEARER_TOKEN=your_jwt_token
PROJECT_ID=your_project_uuid
```

### 2. Premier Appel Simple

```bash
curl -X POST "${BASE_URL}/llm-exec/round" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Bonjour, qui es-tu ?"
      }
    ]
  }'
```

**Réponse :**
```json
{
  "message": {
    "role": "assistant",
    "content": "Bonjour ! Je suis un assistant IA alimenté par Synesia. Comment puis-je vous aider ?"
  },
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 23,
    "total_tokens": 38
  },
  "finish_reason": "stop"
}
```

### 3. Appel avec Outil Knowledge

```bash
curl -X POST "${BASE_URL}/llm-exec/round" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Quelles sont les fonctionnalités de Synesia ?"
      }
    ],
    "tools": [
      {
        "type": "knowledge",
        "knowledge_id": "docs-knowledge-id",
        "name": "search_docs",
        "description": "Recherche dans la documentation",
        "allowed_actions": ["search"]
      }
    ]
  }'
```

### 4. Appel en Streaming

```bash
curl -X POST "${BASE_URL}/llm-exec/round/stream" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {
        "role": "user",
        "content": "Explique-moi React en détail"
      }
    ]
  }'
```

---

## 🔐 Authentification

L'API supporte trois méthodes d'authentification :

### Méthode 1 : API Key (Recommandée)

```bash
curl -H "x-api-key: apiKey.12345.abcdef123456" \
     -H "Content-Type: application/json" \
     https://origins-server.up.railway.app/llm-exec/round
```

**Format** : `apiKey.{number}.{alphanumeric}`

### Méthode 2 : Bearer Token (pour applications web)

```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     -H "x-project-id: 123e4567-e89b-12d3-a456-426614174000" \
     -H "Content-Type: application/json" \
     https://origins-server.up.railway.app/llm-exec/round
```

### Méthode 3 : Entity Token (pour services internes)

```bash
curl -H "Authorization: Entity eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     -H "Content-Type: application/json" \
     https://origins-server.up.railway.app/llm-exec/round
```

---

## 📡 Endpoints API

### POST `/llm-exec/round`

Exécute une conversation LLM avec retour synchrone.

**Paramètres :**
- `model` (string, required) : Slug du modèle (`gpt-4o-mini`, `claude-3-haiku`, etc.)
- `messages` (array, required) : Historique de conversation
- `llmConfig` (object, optional) : Configuration du modèle
- `config` (object, optional) : Configuration d'orchestration
- `tools` (array, optional) : Liste d'outils disponibles
- `instructions` (string, optional) : Instructions système supplémentaires
- `thread_id` (string, optional) : ID de thread pour la continuité

**Réponse :**
```json
{
  "message": {
    "role": "assistant",
    "content": "Réponse du modèle",
    "tool_calls": [...]
  },
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  },
  "finish_reason": "stop"
}
```

### POST `/llm-exec/round/stream`

Exécute une conversation LLM avec streaming temps réel.

**Réponse :** Stream d'événements SSE (Server-Sent Events)

```
data: {"type": "start", "message": {...}}

data: {"type": "chunk", "content": "Bonjour"}

data: {"type": "tool_call", "tool_name": "search_docs", "args": {...}}

data: {"type": "tool_result", "tool_name": "search_docs", "result": {...}}

data: {"type": "end", "usage": {...}}
```

---

## 🛠️ Types d'Outils

L'API supporte de nombreux types d'outils pour étendre les capacités de vos agents.

### 1. Outil Callable (Agent Synesia)

Exécute un agent ou pipeline Synesia existant.

```json
{
  "type": "callable",
  "callable_id": "agent-uuid-ou-slug"
}
```

**Exemple complet :**
```json
{
  "type": "callable",
  "callable_id": "2af9889f-eea8-47d2-aa8e-185e2ee79309"
}
```

### 2. Outil Knowledge (Base de Connaissances)

Recherche dans une base de connaissances vectorielle.

```json
{
  "type": "knowledge",
  "knowledge_id": "knowledge-uuid",
  "name": "search_docs",
  "description": "Recherche dans la documentation",
  "allowed_actions": ["search"]
}
```

**Actions disponibles :**
- `"search"` : Recherche sémantique

**Exemple complet :**
```json
{
  "type": "knowledge",
  "knowledge_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "search_docs",
  "description": "Recherche dans la documentation Synesia",
  "allowed_actions": ["search"]
}
```

### 3. Outil MCP (Model Context Protocol)

Connecte à un serveur MCP externe.

```json
{
  "type": "mcp",
  "server_label": "mon-serveur-mcp",
  "server_url": "https://mon-serveur-mcp.com",
  "allowed_tools": ["tool1", "tool2"],
  "require_approval": "never",
  "headers": {
    "Authorization": "Bearer token123",
    "X-API-Key": "api-key-456"
  }
}
```

**Options d'approbation :**
- `"always"` : Demande toujours une approbation
- `"never"` : Jamais d'approbation
- `"auto"` : Approbation automatique

**Exemple complet :**
```json
{
  "type": "mcp",
  "server_label": "github-integration",
  "server_url": "https://github-mcp.scrivia.com",
  "allowed_tools": ["search_issues", "create_pr"],
  "require_approval": "auto",
  "headers": {
    "Authorization": "Bearer ghp_1234567890abcdef",
    "Accept": "application/vnd.github.v3+json"
  }
}
```

### 4. Outil OpenAPI

Intègre n'importe quelle API REST via sa spécification OpenAPI.

```json
{
  "type": "openapi",
  "schema": {
    "openapi": "3.0.0",
    "info": {"title": "Mon API", "version": "1.0.0"},
    "servers": [{"url": "https://api.mon-service.com"}],
    "paths": {
      "/users": {
        "get": {
          "summary": "Lister les utilisateurs",
          "responses": {
            "200": {
              "description": "Liste des utilisateurs",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "array",
                    "items": {"type": "object"}
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "base_url": "https://api.mon-service.com",
  "description": "API Utilisateurs",
  "allowed_operations": ["getUsers"],
  "flatten": false,
  "security": [
    {
      "type": "http",
      "scheme": "bearer",
      "value": "mon-bearer-token"
    }
  ]
}
```

**Sécurité supportée :**
- `apiKey` : Clé API
- `http` : Basic/Bearer auth
- `oauth2` : OAuth 2.0
- `openIdConnect` : OpenID Connect

**Exemple Stripe API :**
```json
{
  "type": "openapi",
  "schema": {
    "openapi": "3.0.0",
    "info": {"title": "Stripe API", "version": "2020-08-27"},
    "servers": [{"url": "https://api.stripe.com"}],
    "security": [{"bearerAuth": []}],
    "paths": {
      "/v1/customers": {
        "get": {
          "operationId": "listCustomers",
          "summary": "List customers",
          "parameters": [
            {"name": "limit", "in": "query", "schema": {"type": "integer"}}
          ]
        },
        "post": {
          "operationId": "createCustomer",
          "summary": "Create customer",
          "requestBody": {
            "content": {
              "application/x-www-form-urlencoded": {
                "schema": {"$ref": "#/components/schemas/customer"}
              }
            }
          }
        }
      }
    },
    "components": {
      "securitySchemes": {
        "bearerAuth": {"type": "http", "scheme": "bearer"}
      },
      "schemas": {
        "customer": {
          "type": "object",
          "properties": {
            "email": {"type": "string"},
            "name": {"type": "string"}
          }
        }
      }
    }
  },
  "base_url": "https://api.stripe.com",
  "description": "Stripe",
  "allowed_operations": ["listCustomers", "createCustomer"],
  "flatten": true,
  "security": [
    {
      "type": "http",
      "scheme": "bearer",
      "value": "sk_test_1234567890abcdef"
    }
  ]
}
```

### 5. Outil Kit (Groupement d'Outils)

Regroupe plusieurs outils sous un même namespace.

```json
{
  "type": "kit",
  "name": "development_tools",
  "description": "Outils de développement",
  "tools": [
    {
      "type": "openapi",
      "schema": {/* schéma GitHub API */},
      "description": "GitHub"
    },
    {
      "type": "mcp",
      "server_url": "https://vscode-mcp.com",
      "server_label": "vscode"
    }
  ]
}
```

### 6. Outil Code Interpreter

Exécute du code Python dans un environnement sécurisé.

```json
{
  "type": "code_interpreter"
}
```

### 7. Outil Image Generation

Génère des images via DALL-E, Stable Diffusion, etc.

```json
{
  "type": "image_generation"
}
```

### 8. Outil Web Search

Effectue des recherches web en temps réel.

```json
{
  "type": "websearch"
}
```

### 9. Outil Custom

Définit un outil personnalisé avec fonction d'exécution.

```json
{
  "type": "custom",
  "name": "mon_outil",
  "description": "Description de mon outil",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Paramètre de recherche"
      }
    },
    "required": ["query"]
  }
}
```

---

## ⚙️ Configuration

### Configuration LLM (`llmConfig`)

```json
{
  "temperature": 0.7,
  "top_p": 0.9,
  "max_completion_tokens": 1000,
  "presence_penalty": 0.0,
  "frequency_penalty": 0.0,
  "seed": 42,
  "verbosity": "medium"
}
```

### Configuration d'Orchestration (`config`)

```json
{
  "max_loops": 10,
  "timeout_ms": 30000
}
```

### Messages

Format standard OpenAI :

```json
{
  "role": "user|assistant|system|tool_request|tool_response",
  "content": "Contenu du message",
  "name": "nom_optionnel",
  "reasoning": "raisonnement_du_modèle",
  "tool_calls": [
    {
      "id": "call_123",
      "name": "nom_outil",
      "arguments": {"param": "valeur"}
    }
  ]
}
```

---

## 💡 Exemples Complets

### Agent avec Recherche Documentaire

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant spécialisé en Synesia."
    },
    {
      "role": "user",
      "content": "Comment créer un nouvel agent dans Synesia ?"
    }
  ],
  "tools": [
    {
      "type": "knowledge",
      "knowledge_id": "docs-uuid",
      "name": "search_docs",
      "description": "Recherche dans la documentation",
      "allowed_actions": ["search"]
    }
  ],
  "llmConfig": {
    "temperature": 0.3,
    "max_completion_tokens": 500
  },
  "config": {
    "max_loops": 5
  }
}
```

### Agent avec API Externe (GitHub)

```json
{
  "model": "claude-3-haiku",
  "messages": [
    {
      "role": "user",
      "content": "Vérifie le statut de la PR #123 dans mon repo"
    }
  ],
  "tools": [
    {
      "type": "openapi",
      "schema": {
        "openapi": "3.0.0",
        "info": {"title": "GitHub API"},
        "servers": [{"url": "https://api.github.com"}],
        "paths": {
          "/repos/{owner}/{repo}/pulls/{pull_number}": {
            "get": {
              "operationId": "getPullRequest",
              "parameters": [
                {"name": "owner", "in": "path", "required": true},
                {"name": "repo", "in": "path", "required": true},
                {"name": "pull_number", "in": "path", "required": true}
              ]
            }
          }
        }
      },
      "base_url": "https://api.github.com",
      "description": "GitHub",
      "allowed_operations": ["getPullRequest"],
      "security": [
        {
          "type": "http",
          "scheme": "bearer",
          "value": "ghp_your_github_token"
        }
      ]
    }
  ]
}
```

### Agent Multi-Outils avec Streaming

```javascript
const response = await fetch('https://origins-server.up.railway.app/llm-exec/round/stream', {
  method: 'POST',
  headers: {
    'x-api-key': 'apiKey.12345.abcdef',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: 'Analyse cette entreprise et génère un rapport'
    }],
    tools: [
      {
        type: 'websearch',
        // Recherche web automatique
      },
      {
        type: 'code_interpreter'
        // Analyse de données
      },
      {
        type: 'image_generation'
        // Génération de graphiques
      }
    ],
    llmConfig: {
      temperature: 0.5,
      max_completion_tokens: 2000
    }
  })
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const events = new TextDecoder().decode(value)
    .split('\\n\\n')
    .filter(line => line.startsWith('data: '));

  for (const event of events) {
    const data = JSON.parse(event.replace('data: ', ''));
    console.log('Event:', data.type, data);
  }
}
```

---

## 🚨 Gestion d'Erreurs

### Codes d'Erreur HTTP

- `400 Bad Request` : Paramètres invalides
- `401 Unauthorized` : Authentification échouée
- `403 Forbidden` : Permissions insuffisantes
- `404 Not Found` : Ressource introuvable
- `429 Too Many Requests` : Rate limit dépassé
- `500 Internal Server Error` : Erreur serveur

### Erreurs Spécifiques

```json
{
  "error": "Invalid authorization format. Must start with Bearer or Entity",
  "statusCode": 401
}
```

```json
{
  "error": "This model does not support tools",
  "statusCode": 400
}
```

```json
{
  "error": "API key not found for provider OpenAI",
  "statusCode": 400
}
```

### Gestion en Streaming

```javascript
// En cas d'erreur pendant le streaming
data: {"type": "error", "error": {"message": "Tool execution failed", "code": "TOOL_ERROR"}}
```

---

## 🎯 Bonnes Pratiques

### 1. Gestion des Tokens

- Définissez `max_completion_tokens` pour contrôler les coûts
- Utilisez `temperature` basse (0.1-0.3) pour les tâches déterministes
- Utilisez `temperature` haute (0.7-0.9) pour les tâches créatives

### 2. Orchestration

- Limitez `max_loops` à 5-10 pour éviter les boucles infinies
- Utilisez `thread_id` pour maintenir le contexte
- Filtrez `allowed_operations` pour les APIs OpenAPI

### 3. Sécurité

- Stockez les tokens dans des variables d'environnement
- Utilisez des headers d'autorisation appropriés
- Validez toujours les réponses d'outils externes

### 4. Performance

- Préférez le streaming pour les réponses longues
- Cachez les schémas OpenAPI volumineux
- Utilisez `flatten: true` pour les APIs simples

### 5. Debugging

- Activez les logs détaillés en développement
- Surveillez la consommation de tokens
- Testez les outils individuellement avant l'intégration

---

## 🔌 Intégration Provider dans Scrivia

### 1. Configuration du Provider

```javascript
// Dans la configuration Scrivia
const synesiaProvider = {
  name: 'Synesia',
  baseUrl: 'https://origins-server.up.railway.app',
  endpoints: {
    chat: '/llm-exec/round',
    stream: '/llm-exec/round/stream'
  },
  auth: {
    type: 'api-key',
    header: 'x-api-key',
    value: process.env.SYNESIA_API_KEY
  }
};
```

### 2. Mapping des Modèles

```javascript
// Liste des modèles disponibles
const availableModels = [
  { id: 'gpt-4o-mini', name: 'GPT-4 Mini', provider: 'Synesia' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Synesia' },
  { id: 'groq-llama-3-8b', name: 'Llama 3 8B', provider: 'Synesia' }
];
```

### 3. Gestion des Outils

```javascript
// Injection d'outils depuis Scrivia
function createSynesiaTools(scriviaTools) {
  return scriviaTools.map(tool => {
    switch (tool.type) {
      case 'openapi':
        return {
          type: 'openapi',
          schema: tool.schema,
          base_url: tool.baseUrl,
          description: tool.name,
          allowed_operations: tool.allowedOperations,
          security: tool.auth
        };

      case 'mcp':
        return {
          type: 'mcp',
          server_label: tool.name,
          server_url: tool.endpoint,
          allowed_tools: tool.allowedTools,
          headers: tool.headers
        };

      default:
        return tool;
    }
  });
}
```

### 4. Gestion du Streaming

```javascript
class SynesiaChatProvider {
  async *streamChat(messages, tools = []) {
    const response = await fetch(`${this.baseUrl}/llm-exec/round/stream`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        model: this.selectedModel,
        messages,
        tools: createSynesiaTools(tools),
        llmConfig: this.llmConfig
      })
    });

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const events = new TextDecoder().decode(value)
        .split('\\n\\n')
        .filter(line => line.startsWith('data: '));

      for (const event of events) {
        const data = JSON.parse(event.replace('data: ', ''));
        yield this.mapSynesiaEvent(data);
      }
    }
  }

  mapSynesiaEvent(event) {
    switch (event.type) {
      case 'chunk':
        return { type: 'content', content: event.content };
      case 'tool_call':
        return { type: 'tool_start', tool: event.tool_name };
      case 'tool_result':
        return { type: 'tool_result', result: event.result };
      case 'end':
        return { type: 'done', usage: event.usage };
      default:
        return event;
    }
  }
}
```

### 5. Gestion d'Erreurs Robuste

```javascript
class SynesiaErrorHandler {
  static handleError(error) {
    if (error.statusCode === 401) {
      throw new AuthenticationError('API key invalide');
    }

    if (error.statusCode === 429) {
      throw new RateLimitError('Trop de requêtes');
    }

    if (error.message?.includes('model not found')) {
      throw new ModelNotFoundError(error.message);
    }

    throw new ProviderError(`Erreur Synesia: ${error.message}`);
  }
}
```

### 6. Tests d'Intégration

```javascript
describe('Synesia Provider', () => {
  test('should handle basic chat', async () => {
    const provider = new SynesiaChatProvider();
    const response = await provider.chat([
      { role: 'user', content: 'Hello' }
    ]);

    expect(response.content).toBeDefined();
    expect(response.usage).toBeDefined();
  });

  test('should inject OpenAPI tools', async () => {
    const tools = [{
      type: 'openapi',
      name: 'GitHub API',
      schema: githubSchema,
      baseUrl: 'https://api.github.com'
    }];

    const response = await provider.chat([
      { role: 'user', content: 'Check my PRs' }
    ], tools);

    expect(response.toolCalls).toBeDefined();
  });
});
```

---

## 📞 Support et Ressources

### Documentation Supplémentaire

- [Architecture Synesia](../ARCHITECTURE-ORCHESTRATEUR-CRITIQUE.md)
- [Guide Développement](../DEVELOPMENT-LOCAL.md)
- [Tests Orchestration](../TESTS-ORCHESTRATION.md)

### Contact

- **Issues** : [GitHub Issues](https://github.com/synesia-ai/synesia/issues)
- **Discord** : [Synesia Community](https://discord.gg/synesia)
- **Email** : support@synesia.ai

---

*Dernière mise à jour : Décembre 2025*
