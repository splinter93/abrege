# Documentation API LLM Exec Synesia

Bienvenue dans la documentation complète de l'API LLM Execution de Synesia ! Cette API vous permet d'intégrer facilement Synesia comme provider dans vos applications, avec support complet des outils et de l'orchestration avancée.

## 📚 Fichiers de Documentation

### Documentation Principale
- **[`LLM-EXEC-API-GUIDE.md`](./LLM-EXEC-API-GUIDE.md)** - Guide complet API
  - Introduction et concepts
  - Guide Quick Start
  - Référence API complète
  - Types d'outils détaillés
  - Configuration avancée
  - Gestion d'erreurs
  - Bonnes pratiques
  - Intégration provider

### Exemples Pratiques
- **[`LLM-EXEC-INTEGRATION-EXAMPLES.ts`](./LLM-EXEC-INTEGRATION-EXAMPLES.ts)** - Exemples TypeScript
  - Client Synesia complet
  - Intégration GitHub API
  - Streaming multi-outils
  - Gestion d'erreurs robuste
  - Intégration Scrivia
  - Types TypeScript

### Tests et Validation
- **[`LLM-EXEC-API-TESTS.js`](./LLM-EXEC-API-TESTS.js)** - Suite de tests complète
  - Tests de base (chat, streaming, config)
  - Tests d'outils (callable, knowledge, OpenAPI, MCP)
  - Tests d'erreurs et edge cases
  - Tests de performance
  - Tests de charge

## 🚀 Démarrage Rapide

### 1. Obtenir une API Key

```bash
# Dans votre projet Synesia, allez dans Settings > API Keys
# Créez une nouvelle clé API
API_KEY="votre-api-key"
```

### 2. Premier Test

```bash
# Test basique
curl -X POST "https://origins-server.up.railway.app/llm-exec/round" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'
```

### 3. Test avec Outil

```bash
# Test avec outil OpenAPI
curl -X POST "https://origins-server.up.railway.app/llm-exec/round" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Liste les posts"}],
    "tools": [{
      "type": "openapi",
      "schema": {
        "openapi": "3.0.0",
        "paths": {
          "/posts": {
            "get": {"operationId": "getPosts"}
          }
        }
      },
      "base_url": "https://jsonplaceholder.typicode.com",
      "allowed_operations": ["getPosts"]
    }]
  }'
```

## 🔧 Utilisation des Fichiers

### Pour les Développeurs Scrivia

1. **Lire le guide complet** : `LLM-EXEC-API-GUIDE.md`
   - Section "Intégration Provider" pour l'architecture
   - Section "Types d'Outils" pour comprendre les possibilités

2. **Utiliser les exemples** : `LLM-EXEC-INTEGRATION-EXAMPLES.ts`
   - Classe `ScriviaSynesiaProvider` pour l'intégration
   - Méthodes `convertScriviaTools()` pour mapper vos outils

3. **Tester l'intégration** : `LLM-EXEC-API-TESTS.js`
   ```bash
   node LLM-EXEC-API-TESTS.js "votre-api-key"
   ```

### Pour les Développeurs Synesia

1. **Documentation API** : `LLM-EXEC-API-GUIDE.md`
   - Référence complète des endpoints
   - Spécifications des payloads

2. **Exemples avancés** : `LLM-EXEC-INTEGRATION-EXAMPLES.ts`
   - Patterns d'intégration complexes
   - Gestion d'erreurs avancée

## 🎯 Cas d'Usage Typiques

### Intégration Scrivia Basique

```typescript
import { ScriviaSynesiaProvider } from './LLM-EXEC-INTEGRATION-EXAMPLES.ts';

const provider = new ScriviaSynesiaProvider(process.env.SYNESIA_API_KEY!);

// Chat simple
const response = await provider.sendMessage('Hello world!');

// Avec outils Scrivia
const response = await provider.sendMessage(
  'Analyse cette API',
  [],
  [{
    type: 'api',
    name: 'Mon API',
    openapiSchema: mySchema,
    baseUrl: 'https://my-api.com'
  }]
);
```

### Test Automatisé

```bash
# Tests complets
node LLM-EXEC-API-TESTS.js "apiKey.12345.abcdef"

# Tests spécifiques (modifier le fichier)
node LLM-EXEC-API-TESTS.js "apiKey.12345.abcdef" "project-id"
```

### Debugging

```typescript
// Avec logging détaillé
const response = await client.chat(
  'gpt-4o-mini',
  messages,
  tools,
  { verbosity: 'high' }
);

console.log('Tool calls:', response.message.tool_calls);
console.log('Usage:', response.usage);
```

## 🔍 Structure des Fichiers

```
docs/
├── README-LLM-EXEC.md                    # Ce fichier
├── LLM-EXEC-API-GUIDE.md                # Guide principal
├── LLM-EXEC-INTEGRATION-EXAMPLES.ts     # Exemples code
└── LLM-EXEC-API-TESTS.js               # Tests automatisés
```

## 📞 Support

### Ressources Supplémentaires

- **Documentation Synesia** : [docs/](../)
- **Guide Développement** : [DEVELOPMENT-LOCAL.md](../DEVELOPMENT-LOCAL.md)
- **Tests Orchestration** : [TESTS-ORCHESTRATION.md](../TESTS-ORCHESTRATION.md)

### Contact

- **Issues** : [GitHub Issues](https://github.com/synesia-ai/synesia/issues)
- **Discord** : Communauté Synesia
- **Email** : support@synesia.ai

---

## 🎉 Prêt à Commencer ?

1. **Lire** : `LLM-EXEC-API-GUIDE.md` (sections 1-3)
2. **Tester** : Premier appel API
3. **Intégrer** : Utiliser `LLM-EXEC-INTEGRATION-EXAMPLES.ts`
4. **Valider** : Lancer `LLM-EXEC-API-TESTS.js`

**L'API est production-ready et supporte tous vos cas d'usage !** 🚀

*Documentation générée le : Décembre 2025*
