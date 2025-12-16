# Liminality Provider - Integration Documentation

> **Provider Liminality pour l'API Synesia LLM Exec avec support complet des tools avancés**

---

## 📋 Vue d'ensemble

Le provider **Liminality** intègre l'API Synesia LLM Exec dans Abrégé, offrant une orchestration avancée avec support de multiples types de tools (callable, knowledge, OpenAPI, MCP) et conversion automatique des tools existants.

### ✅ Avantages de Liminality

- **Orchestration automatique** : Les tool calls multi-tours sont gérés automatiquement (config.max_loops)
- **Multi-provider** : Accès à GPT-4, Claude, Groq Llama, DeepSeek via une seule API
- **Tools avancés** : Support callable (agents Synesia), knowledge bases, OpenAPI, MCP
- **Conversion automatique** : Les tools Groq/xAI existants sont automatiquement convertis
- **Streaming SSE** : Events riches avec détails sur les tool calls
- **Reasoning natif** : Support du reasoning des modèles avancés

---

## 🏗️ Architecture

```
LiminalityProvider
├── BaseProvider (héritage)
├── LiminalityToolsAdapter (conversion tools)
│   ├── Function tools → Custom tools
│   ├── MCP tools → MCP tools Synesia
│   └── Add Synesia tools (callable, knowledge)
└── API Synesia LLM Exec
    ├── /llm-exec/round (non-streaming)
    └── /llm-exec/round/stream (SSE streaming)
```

### Fichiers créés

```
src/services/llm/
├── types/
│   └── liminalityTypes.ts              # Types TypeScript pour Liminality
├── providers/
│   ├── adapters/
│   │   └── LiminalityToolsAdapter.ts   # Adaptateur de tools
│   └── implementations/
│       ├── liminality.ts                # Provider Liminality
│       └── __tests__/
│           └── liminality.test.ts       # Tests unitaires
```

### Fichiers modifiés

- `src/services/llm/config.ts` : Configuration Liminality
- `src/config/env.server.ts` : Variables d'environnement serveur
- `env.example` : Documentation variables d'environnement
- `src/services/llm/providers/index.ts` : Export LiminalityProvider
- `src/services/llm/providerManager.ts` : Enregistrement provider
- `src/services/llm/services/SimpleOrchestrator.ts` : Support Liminality

### Fichiers supprimés

- `src/services/llm/providers/synesia.ts` : Ancien SynesiaProvider (remplacé)

---

## 🔧 Configuration

### 1. Variables d'environnement

Ajouter dans votre fichier `.env` :

```bash
# Liminality API (Synesia LLM Exec)
LIMINALITY_API_KEY=apiKey.12345.abcdef
LIMINALITY_BASE_URL=https://origins-server.up.railway.app
LIMINALITY_MODEL=gpt-4o-mini
LIMINALITY_MAX_LOOPS=10
```

### 2. Obtenir une clé API

1. Aller sur votre console Synesia
2. Naviguer vers Settings > API Keys
3. Créer une nouvelle clé API
4. Copier la clé dans `.env`

Format de la clé : `apiKey.{number}.{alphanumeric}`

### 3. Configuration dans le code

```typescript
import { LiminalityProvider } from '@/services/llm/providers';

const provider = new LiminalityProvider({
  apiKey: process.env.LIMINALITY_API_KEY,
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxLoops: 10
});
```

---

## 📚 Modèles disponibles

| Modèle | Provider sous-jacent | Use Case |
|--------|---------------------|----------|
| `gpt-4o-mini` | OpenAI | Rapide, économique, general-purpose |
| `gpt-4o` | OpenAI | Performance maximale |
| `claude-3-haiku` | Anthropic | Rapide, raisonnement |
| `claude-3-sonnet` | Anthropic | Équilibré |
| `claude-3-5-sonnet` | Anthropic | Dernière génération |
| `groq-llama-3-70b` | Groq | Open-source, rapide |
| `deepseek-chat` | DeepSeek | Reasoning avancé |

---

## 🛠️ Types de Tools Supportés

### 1. Tools Groq/xAI (Conversion Automatique)

Les tools existants au format function calls ou MCP sont automatiquement convertis :

```typescript
// Tool function (format Groq/xAI)
const functionTool = {
  type: 'function',
  function: {
    name: 'search_web',
    description: 'Recherche sur le web',
    parameters: { /* ... */ }
  }
};

// → Converti automatiquement en custom tool Synesia
```

### 2. Callable Tools (Agents Synesia)

Exécutez un agent ou pipeline Synesia existant :

```typescript
const callableTool = {
  type: 'callable',
  callable_id: 'agent-uuid-123'
};
```

### 3. Knowledge Tools (Bases de Connaissances)

Recherche dans une base de connaissances vectorielle :

```typescript
const knowledgeTool = {
  type: 'knowledge',
  knowledge_id: 'kb-uuid-456',
  name: 'search_docs',
  description: 'Recherche dans la documentation',
  allowed_actions: ['search']
};
```

### 4. OpenAPI Tools (APIs REST)

Intégrez n'importe quelle API REST via son schéma OpenAPI :

```typescript
const openApiTool = {
  type: 'openapi',
  schema: { /* OpenAPI 3.0 schema */ },
  base_url: 'https://api.example.com',
  description: 'Example API',
  allowed_operations: ['getUsers', 'createUser'],
  security: [{
    type: 'http',
    scheme: 'bearer',
    value: 'your-token'
  }]
};
```

### 5. MCP Tools (Model Context Protocol)

Connectez à un serveur MCP :

```typescript
const mcpTool = {
  type: 'mcp',
  server_label: 'custom-mcp',
  server_url: 'https://mcp.example.com',
  allowed_tools: ['tool1', 'tool2'],
  headers: { 'Authorization': 'Bearer token' }
};
```

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Appel Simple

```typescript
import { LiminalityProvider } from '@/services/llm/providers';
import type { ChatMessage } from '@/types/chat';

const provider = new LiminalityProvider();

const messages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Explique-moi TypeScript',
    created_at: new Date().toISOString(),
    user_id: 'user-123',
    conversation_id: 'conv-456'
  }
];

const response = await provider.callWithMessages(messages, []);
console.log(response.content);
```

### Exemple 2 : Avec Tools Function (Conversion Auto)

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Obtenir la météo pour une ville',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' }
        },
        required: ['city']
      }
    }
  }
];

// Les tools sont automatiquement convertis en custom tools Synesia
const response = await provider.callWithMessages(messages, tools);
```

### Exemple 3 : Streaming avec Events Riches

```typescript
const stream = provider.callWithMessagesStream(messages, tools);

for await (const chunk of stream) {
  switch (chunk.type) {
    case 'delta':
      if (chunk.content) {
        process.stdout.write(chunk.content);
      }
      break;
    
    case 'tool_call':
      console.log('🔧 Tool call:', chunk.tool_name);
      break;
    
    case 'tool_result':
      console.log('✅ Tool result:', chunk.tool_name);
      break;
  }
}
```

### Exemple 4 : Avec Agent Template (SimpleOrchestrator)

```typescript
const agentConfig = {
  provider: 'liminality',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 8000
};

// L'orchestrateur sélectionnera automatiquement Liminality
const orchestrator = new SimpleOrchestrator();
const response = await orchestrator.processMessage(
  'Analyse cette API',
  { userToken, sessionId, agentConfig },
  history
);
```

---

## 🔌 Intégration avec Tools Synesia Avancés

### Ajouter des Callables et Knowledge Bases

```typescript
import { LiminalityToolsAdapter } from '@/services/llm/providers/adapters/LiminalityToolsAdapter';

// Convertir les tools existants
const convertedTools = LiminalityToolsAdapter.convert(existingTools);

// Ajouter des tools Synesia spécifiques
const enhancedTools = LiminalityToolsAdapter.addSynesiaTools(convertedTools, {
  callables: ['agent-takumi-uuid', 'agent-analyst-uuid'],
  knowledgeBases: [
    {
      id: 'kb-docs-uuid',
      name: 'documentation',
      description: 'Documentation technique complète'
    },
    {
      id: 'kb-company-uuid',
      name: 'company_data',
      description: 'Données internes de l\'entreprise'
    }
  ]
});

// Utiliser les tools enrichis
const response = await provider.callWithMessages(messages, enhancedTools);
```

---

## ⚙️ Configuration Avancée

### Orchestration Multi-Tours

```typescript
const provider = new LiminalityProvider({
  maxLoops: 15 // Jusqu'à 15 tool calls en chaîne
});
```

La valeur `maxLoops` définit le nombre maximum d'itérations pour l'orchestration automatique des tool calls.

### Paramètres LLM

```typescript
const provider = new LiminalityProvider({
  model: 'claude-3-5-sonnet',
  temperature: 0.3,      // Plus déterministe
  maxTokens: 4000,       // Limite de tokens
  topP: 0.9             // Nucleus sampling
});
```

### Timeout et Retry

```typescript
const provider = new LiminalityProvider({
  timeout: 180000 // 3 minutes pour les tâches longues
});
```

---

## 🚨 Migration depuis l'Ancien SynesiaProvider

### Avant (Ancien SynesiaProvider)

```typescript
import { SynesiaProvider } from '@/services/llm/providers';

const provider = new SynesiaProvider();
const response = await provider.call(message, context, history);
// → Retournait juste un string
```

### Après (LiminalityProvider)

```typescript
import { LiminalityProvider } from '@/services/llm/providers';

const provider = new LiminalityProvider();
const response = await provider.callWithMessages(messages, tools);
// → Retourne LLMResponse avec content, tool_calls, usage, reasoning
```

### Différences Clés

| Aspect | Ancien Synesia | Liminality |
|--------|---------------|------------|
| **API** | `/execution?wait=true` | `/llm-exec/round[/stream]` |
| **Format** | Callable spécifique | Format OpenAI universel |
| **Tools** | Aucun | Callable, knowledge, OpenAPI, MCP, etc. |
| **Streaming** | Non | Oui (SSE) |
| **Orchestration** | Manuelle | Automatique |
| **Reasoning** | Non | Oui |

---

## 🧪 Tests

### Tests Unitaires

```bash
npm run test src/services/llm/providers/implementations/__tests__/liminality.test.ts
```

### Tests Manuels

1. **Test simple** : Appel sans tools
2. **Test tools** : Conversion function → custom
3. **Test MCP** : Passthrough MCP tools
4. **Test streaming** : Events SSE
5. **Test orchestration** : max_loops

---

## 🎯 Bonnes Pratiques

### 1. Gestion des Tokens

```typescript
// Limiter les tokens pour contrôler les coûts
const provider = new LiminalityProvider({
  maxTokens: 2000 // Limite stricte
});
```

### 2. Température selon le Use Case

```typescript
// Tâches déterministes (code, analyse)
const deterministicProvider = new LiminalityProvider({
  temperature: 0.1
});

// Tâches créatives (brainstorming, rédaction)
const creativeProvider = new LiminalityProvider({
  temperature: 0.9
});
```

### 3. Orchestration Intelligente

```typescript
// Tâches simples : peu d'itérations
const simpleProvider = new LiminalityProvider({
  maxLoops: 3
});

// Tâches complexes : plus d'itérations
const complexProvider = new LiminalityProvider({
  maxLoops: 20
});
```

### 4. Logging et Debugging

```typescript
import { simpleLogger as logger } from '@/utils/logger';

// Les logs Liminality utilisent le prefix [LiminalityProvider]
logger.dev('[LiminalityProvider] 🚀 Starting call...');
```

---

## 🐛 Troubleshooting

### Erreur : "Liminality provider non configuré"

**Cause** : API key manquante ou invalide

**Solution** :
```bash
# Vérifier .env
echo $LIMINALITY_API_KEY

# Format attendu : apiKey.{number}.{alphanumeric}
LIMINALITY_API_KEY=apiKey.12345.abcdef123456
```

### Erreur : "API error: 401"

**Cause** : Clé API invalide ou expirée

**Solution** : Régénérer une nouvelle clé dans la console Synesia

### Erreur : "API error: 429"

**Cause** : Rate limit dépassé

**Solution** : Implémenter un retry avec backoff exponential

### Tools non exécutés

**Cause** : Conversion ou validation échouée

**Solution** : Vérifier les logs `[LiminalityToolsAdapter]` pour voir les warnings

---

## 📞 Support et Ressources

### Documentation Complémentaire

- [Guide Synesia LLM Exec API](../../Synesia Docs/LLM-EXEC-API-GUIDE.md)
- [Exemples d'Intégration](../../Synesia Docs/LLM-EXEC-INTEGRATION-EXAMPLES.ts)
- [Tests API](../../Synesia Docs/LLM-EXEC-API-TESTS.js)

### Contact

- **Issues** : GitHub Issues du projet
- **Support Synesia** : support@synesia.ai

---

## 📝 Changelog

### Version 1.0.0 (Décembre 2025)

- ✅ Implémentation complète du provider Liminality
- ✅ Support tous les types de tools Synesia
- ✅ Conversion automatique tools Groq/xAI
- ✅ Streaming SSE avec events riches
- ✅ Orchestration automatique multi-tours
- ✅ Tests unitaires complets
- ✅ Documentation complète
- ✅ Migration depuis ancien SynesiaProvider

---

*Dernière mise à jour : Décembre 2025*

