# Documentation API Memory Synesia

Bienvenue dans la documentation complète de l'API Memory de Synesia ! Cette API fournit un système de **mémoire vectorielle** complet pour stocker, rechercher et interagir avec des connaissances sémantiques dans vos applications de chat.

## 📋 Table des Matières

### Documentation Principale
- **[`MEMORY-API-GUIDE.md`](./MEMORY-API-GUIDE.md)** - Guide complet API
  - Introduction aux concepts de mémoire vectorielle
  - Guide Quick Start complet
  - Référence API détaillée (5 endpoints)
  - Gestion des entrées mémoire
  - Recherche sémantique avancée
  - Chat avec RAG (Retrieval Augmented Generation)
  - Traitement automatique de texte
  - Configuration et métadonnées
  - Exemples pratiques complets
  - Gestion d'erreurs et bonnes pratiques
  - Intégration dans Scrivia

### Exemples d'Intégration
- **[`MEMORY-API-INTEGRATION-EXAMPLES.ts`](./MEMORY-API-INTEGRATION-EXAMPLES.ts)** - Exemples TypeScript avancés
  - Client Synesia Memory complet
  - **5 systèmes complets** :
    - FAQ intelligent avec recherche sémantique
    - Agent de veille technologique
    - Chatbot contextuel avec mémoire persistante
    - Moteur de recommandation basé sur l'historique
    - Processeur automatique de documents
  - Types TypeScript complets
  - Patterns d'intégration production-ready

### Tests et Validation
- **[`MEMORY-API-TESTS.js`](./MEMORY-API-TESTS.js)** - Suite de tests automatisés
  - **15 tests complets** couvrant tous les aspects
  - Tests de base (CRUD d'entrées)
  - Tests de recherche et pagination
  - Tests de chat RAG avec streaming
  - Tests de traitement automatique
  - Tests d'erreurs et edge cases
  - Tests de performance et charge
  - Runner de test automatisé avec métriques

## 🚀 Démarrage Rapide

### 1. Prérequis

- **Mémoire configurée** dans Synesia (avec modèle d'embedding et index)
- **API Key** valide
- **Memory ID** de votre mémoire

### 2. Premier Test

```bash
# Variables d'environnement
MEMORY_ID="your_memory_uuid"
API_KEY="apiKey.12345.abcdef"

# Créer une entrée
curl -X POST "https://origins-server.up.railway.app/memory/${MEMORY_ID}/entries" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Synesia est une plateforme IA puissante.",
    "metadata": {
      "tags": ["synesia", "ia"],
      "source": "test"
    }
  }'
```

### 3. Recherche Sémantique

```bash
# Attendre l'indexation (2-3 secondes)
sleep 3

# Rechercher
curl -X POST "https://origins-server.up.railway.app/memory/${MEMORY_ID}/search" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "plateforme IA",
    "top_k": 3
  }'
```

### 4. Chat avec RAG

```bash
# Chat conversationnel avec contexte mémoire
curl -X POST "https://origins-server.up.railway.app/memory/${MEMORY_ID}/chat" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Quelles sont les fonctionnalités de Synesia ?"}
    ],
    "instructions": "Tu es un expert Synesia.",
    "llm_model_id": "gpt-4o-mini"
  }'
```

## 🔧 Utilisation des Fichiers

### Pour les Développeurs Scrivia

1. **Lire le guide complet** : `MEMORY-API-GUIDE.md`
   - Section "Concepts Clés" pour comprendre la mémoire vectorielle
   - Section "Endpoints API" pour la référence complète
   - Section "Intégration Chat" pour l'implémentation Scrivia

2. **Utiliser les exemples** : `MEMORY-API-INTEGRATION-EXAMPLES.ts`
   - `SynesiaMemoryClient` : Client de base complet
   - `IntelligentFAQSystem` : Système de FAQ intelligent
   - `ContextualChatbot` : Chatbot avec mémoire persistante
   - Adaptable à vos besoins

3. **Tester l'intégration** : `MEMORY-API-TESTS.js`
   ```bash
   node MEMORY-API-TESTS.js "apiKey.12345.abcdef" "mem_abc123"
   ```

### Pour les Développeurs Synesia

1. **Documentation API** : `MEMORY-API-GUIDE.md`
   - Spécifications complètes des 5 endpoints
   - Gestion d'erreurs et validation
   - Bonnes pratiques de performance

2. **Exemples avancés** : `MEMORY-API-INTEGRATION-EXAMPLES.ts`
   - Patterns d'intégration complexes
   - Gestion d'erreurs robuste
   - Optimisations de performance

## 🎯 Cas d'Usage Typiques

### Base de Connaissances
```typescript
// Indexer la documentation
await memoryClient.createEntry(
  "Synesia permet de créer des agents IA avec des outils avancés...",
  { tags: ["docs", "synesia"], source: "documentation" }
);

// Recherche intelligente
const results = await memoryClient.search("agents IA", 5);
```

### Chat Contextuel
```typescript
// Mémoriser les conversations
await memoryClient.createEntry(
  `User: ${userMessage}\nAssistant: ${assistantResponse}`,
  { user_id: userId, tags: ["conversation"] }
);

// Chat avec historique
const response = await memoryClient.chat(messages, instructions, model);
```

### FAQ Automatique
```typescript
const faqSystem = new IntelligentFAQSystem(memoryClient);

await faqSystem.addFAQ(
  "Comment créer un compte ?",
  "Allez sur la page d'inscription...",
  "account"
);

const answer = await faqSystem.getAnswer("comment m'inscrire ?");
```

## 📊 Endpoints Disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/memory/:id/entries` | GET | Lister les entrées (pagination) |
| `/memory/:id/entries` | POST | Créer une entrée |
| `/memory/:id/search` | POST | Recherche sémantique |
| `/memory/:id/process` | POST | Traitement automatique |
| `/memory/:id/chat` | POST | Chat avec RAG (streaming) |
| `/memory/:id/entries/:id` | DELETE | Supprimer une entrée |

## 🔍 Fonctionnalités Clés

### Mémoire Vectorielle
- **Embeddings automatiques** : Text → Vecteurs numériques
- **Recherche sémantique** : Similarité plutôt que mots-clés
- **Index vectoriel** : Recherche rapide dans millions d'entrées

### Chat RAG
- **Recherche contextuelle** : Trouve les infos pertinentes
- **Injection automatique** : Enrichit le prompt du LLM
- **Streaming temps réel** : Événements SSE détaillés

### Métadonnées Riches
```json
{
  "user_id": "user123",
  "tags": ["faq", "account"],
  "source": "documentation",
  "custom": {
    "importance": "high",
    "category": "technical"
  }
}
```

## 🚨 Points d'Attention

### Configuration Requise
- **Modèle d'embedding** configuré dans la mémoire
- **Index vectoriel** actif
- **Agent de traitement** (optionnel, pour le traitement automatique)

### Performance
- **Indexation** : 2-3 secondes après création d'entrée
- **Recherche** : ~100-500ms pour la plupart des cas
- **Chat RAG** : Recherche + LLM (~1-3 secondes)

### Limitations
- **Taille d'entrée** : ~50KB maximum recommandé
- **Recherche** : top_k ≤ 100 résultats
- **Streaming** : Connection persistante requise

## 🧪 Tests Recommandés

### Tests de Base
```bash
# Tests complets automatisés
node MEMORY-API-TESTS.js "your-api-key" "your-memory-id"
```

### Tests Fonctionnels
```javascript
// Vérifier la création
const entryId = await createEntry("Test content");
console.log("✅ Création OK:", entryId);

// Vérifier la recherche
await new Promise(resolve => setTimeout(resolve, 3000)); // Indexation
const results = await search("Test content");
console.log("✅ Recherche OK:", results.length, "résultats");

// Vérifier le chat
const response = await chatWithMemory("Bonjour");
console.log("✅ Chat OK:", response.length, "caractères");
```

## 📞 Support

### Ressources Supplémentaires

- **API LLM Exec** : [`LLM-EXEC-API-GUIDE.md`](../LLM-EXEC-API-GUIDE.md)
- **Guide Développement** : [DEVELOPMENT-LOCAL.md](../DEVELOPMENT-LOCAL.md)
- **OpenAPI Schema** : `openapi-schemas/memory.json`

### Contact

- **Issues** : [GitHub Issues](https://github.com/synesia-ai/synesia/issues)
- **Discord** : Communauté Synesia
- **Email** : support@synesia.ai

---

## 🎉 Prêt à Commencer ?

1. **Lire** : `MEMORY-API-GUIDE.md` (sections 1-4)
2. **Tester** : Premier appel API (création + recherche)
3. **Intégrer** : Utiliser `MEMORY-API-INTEGRATION-EXAMPLES.ts`
4. **Valider** : Lancer `MEMORY-API-TESTS.js`

**L'API Memory est production-ready et offre des capacités de recherche sémantique avancées !** 🚀

*Documentation générée le : Décembre 2025*
