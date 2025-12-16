# Synesia Memory API - Guide Complet

> **API de Mémoire Vectorielle pour Stockage et Recherche Sémantique**

---

## 📋 Table des Matières

- [Introduction](#introduction)
- [Concepts Clés](#concepts-clés)
- [Quick Start](#quick-start)
- [Authentification](#authentification)
- [Endpoints API](#endpoints-api)
- [Gestion des Entrées](#gestion-des-entrées)
- [Recherche Sémantique](#recherche-sémantique)
- [Chat avec RAG](#chat-avec-rag)
- [Traitement Automatique](#traitement-automatique)
- [Configuration](#configuration)
- [Exemples Complets](#exemples-complets)
- [Gestion d'Erreurs](#gestion-derreurs)
- [Bonnes Pratiques](#bonnes-pratiques)
- [Intégration Chat](#intégration-chat)

---

## 🎯 Introduction

L'API Memory de Synesia fournit un système de **mémoire vectorielle** complet pour stocker, rechercher et interagir avec des connaissances sémantiques. Elle utilise des embeddings pour permettre des recherches par similarité sémantique plutôt que par mots-clés exacts.

### Fonctionnalités Principales

- ✅ **Stockage vectoriel** : Embeddings automatiques avec modèles spécialisés
- ✅ **Recherche sémantique** : Recherche par similarité plutôt que mots-clés
- ✅ **Chat RAG** : Conversations enrichies avec le contexte mémoire
- ✅ **Traitement automatique** : Extraction d'informations via agents IA
- ✅ **Métadonnées riches** : Tags, timestamps, utilisateurs, sources
- ✅ **Streaming temps réel** : Événements SSE pour le chat
- ✅ **Pagination** : Gestion efficace de grandes quantités de données

### Cas d'Usage

- 🤖 **Mémoire conversationnelle** : Historique et contexte utilisateur
- 📚 **Base de connaissances** : Documentation, FAQ, guides
- 🔍 **Recherche intelligente** : Recherche sémantique dans des documents
- 📝 **Extraction automatique** : Traitement de textes longs
- 💬 **Chat contextuel** : Conversations avec mémoire persistante

---

## 🧠 Concepts Clés

### Mémoire (Memory)
Une mémoire est un conteneur logique pour stocker des entrées vectorielles. Elle appartient à un projet et peut être configurée avec :
- **Modèle d'embedding** : Pour convertir le texte en vecteurs
- **Index vectoriel** : Base de données pour les recherches
- **Agent de traitement** : Pour extraction automatique d'informations

### Entrée Mémoire (Memory Entry)
Chaque entrée contient :
- **Contenu** : Le texte brut à mémoriser
- **Embedding** : Vecteur numérique représentant le contenu sémantiquement
- **Métadonnées** : Informations additionnelles (utilisateur, tags, date, etc.)

### Recherche Sémantique
Au lieu de chercher des mots exacts, la recherche trouve des contenus **sémantiquement similaires** :
- "voiture rouge" peut trouver "véhicule écarlate"
- "comment coder en Python" peut trouver "guide programmation Python"

### RAG (Retrieval Augmented Generation)
Technique où :
1. On recherche les informations pertinentes dans la mémoire
2. On les injecte dans le contexte du LLM
3. Le LLM génère une réponse enrichie

---

## 🚀 Quick Start

### 1. Configuration de Base

```bash
# URL de base de l'API
BASE_URL=https://origins-server.up.railway.app

# Authentification
API_KEY=apiKey.12345.abcdef123456

# ID de votre mémoire (à créer dans Synesia)
MEMORY_ID=your_memory_uuid
```

### 2. Créer une Entrée Mémoire

```bash
curl -X POST "${BASE_URL}/memory/${MEMORY_ID}/entries" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Synesia est une plateforme IA pour créer des agents conversationnels avec des outils avancés.",
    "metadata": {
      "tags": ["synesia", "ia", "plateforme"],
      "source": "documentation",
      "user_id": "user123"
    }
  }'
```

**Réponse :**
```json
{
  "data": {
    "entry_id": "entry_uuid_123"
  },
  "error": null,
  "message": "Entry inserted"
}
```

### 3. Rechercher dans la Mémoire

```bash
curl -X POST "${BASE_URL}/memory/${MEMORY_ID}/search" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "plateforme IA",
    "top_k": 5
  }'
```

**Réponse :**
```json
{
  "data": [
    {
      "id": "entry_uuid_123",
      "value": "Synesia est une plateforme IA pour créer des agents conversationnels...",
      "created_at": "2024-12-16T10:00:00Z",
      "metadata": {
        "tags": ["synesia", "ia", "plateforme"],
        "source": "documentation"
      }
    }
  ],
  "error": null,
  "message": "Search completed"
}
```

### 4. Chat avec RAG

```bash
curl -X POST "${BASE_URL}/memory/${MEMORY_ID}/chat" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Quelles sont les fonctionnalités de Synesia ?"
      }
    ],
    "instructions": "Tu es un assistant spécialisé dans Synesia.",
    "llm_model_id": "gpt-4o-mini"
  }'
```

---

## 🔐 Authentification

L'API Memory utilise les mêmes méthodes d'authentification que l'API principale :

### API Key (Recommandé)
```bash
curl -H "x-api-key: apiKey.12345.abcdef123456" \
     https://origins-server.up.railway.app/memory/{memory_id}/entries
```

### Bearer Token
```bash
curl -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." \
     -H "x-project-id: 123e4567-e89b-12d3-a456-426614174000" \
     https://origins-server.up.railway.app/memory/{memory_id}/entries
```

---

## 📡 Endpoints API

### GET `/memory/:memory_id/entries`

Liste les entrées d'une mémoire avec pagination.

**Paramètres Query :**
- `limit` (integer, optional) : Nombre d'entrées (1-100, défaut: 50)
- `offset` (integer, optional) : Décalage pour pagination (défaut: 0)

**Exemple :**
```bash
curl "${BASE_URL}/memory/${MEMORY_ID}/entries?limit=10&offset=20" \
  -H "x-api-key: ${API_KEY}"
```

**Réponse :**
```json
{
  "data": [
    {
      "id": "entry_123",
      "created_at": "2024-12-16T10:00:00Z",
      "value": "Contenu de l'entrée...",
      "memory_id": "mem_123",
      "metadata": {
        "tags": ["tag1", "tag2"],
        "user_id": "user123"
      }
    }
  ],
  "error": null,
  "message": "Entries retrieved",
  "pagination": {
    "limit": 10,
    "offset": 20,
    "total": 150,
    "has_more": true
  }
}
```

### POST `/memory/:memory_id/entries`

Crée une nouvelle entrée mémoire.

**Body :**
```json
{
  "content": "Texte à mémoriser",
  "metadata": {
    "user_id": "user123",
    "username": "john_doe",
    "tags": ["documentation", "guide"],
    "source": "manuel_utilisateur",
    "description": "Chapitre 1 du guide",
    "operation_id": "import_docs_v1",
    "tool_call_id": "tool_456",
    "custom": {
      "category": "tutorial",
      "difficulty": "beginner"
    }
  }
}
```

**Réponse :**
```json
{
  "data": {
    "entry_id": "entry_uuid_789"
  },
  "error": null,
  "message": "Entry inserted"
}
```

### POST `/memory/:memory_id/search`

Recherche sémantique dans la mémoire.

**Body :**
```json
{
  "query": "fonctionnalités de la plateforme",
  "top_k": 5
}
```

**Paramètres :**
- `query` (string, required) : Texte de recherche
- `top_k` (integer, required) : Nombre de résultats (1-100)

**Réponse :**
```json
{
  "data": [
    {
      "id": "entry_123",
      "created_at": "2024-12-16T10:00:00Z",
      "value": "Synesia offre des agents conversationnels, des outils avancés...",
      "memory_id": "mem_123",
      "metadata": {
        "tags": ["fonctionnalités", "plateforme"],
        "source": "documentation"
      }
    }
  ],
  "error": null,
  "message": "Search completed"
}
```

### DELETE `/memory/:memory_id/entries/:entry_id`

Supprime une entrée mémoire.

**Exemple :**
```bash
curl -X DELETE "${BASE_URL}/memory/${MEMORY_ID}/entries/${ENTRY_ID}" \
  -H "x-api-key: ${API_KEY}"
```

**Réponse :**
```json
{
  "data": true,
  "error": null,
  "message": "Entry deleted"
}
```

### POST `/memory/:memory_id/process`

Traite automatiquement un texte pour en extraire des informations.

**Body :**
```json
{
  "text": "Texte long à analyser et dont extraire les informations pertinentes..."
}
```

**Réponse :**
```json
{
  "data": [
    "entry_id_1",
    "entry_id_2",
    "entry_id_3"
  ],
  "error": null,
  "message": "Text processed"
}
```

### POST `/memory/:memory_id/chat`

Chat conversationnel avec RAG (Retrieval Augmented Generation).

**Body :**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Quelle est la meilleure façon d'utiliser Synesia ?"
    }
  ],
  "instructions": "Tu es un expert Synesia. Réponds de façon claire et utile.",
  "llm_model_id": "gpt-4o-mini"
}
```

**Réponse :** Stream SSE avec événements :
```
data: {"type": "memory.search.results", "data": {"entries": [...], "count": 3}}

data: {"type": "chunk", "content": "Voici"}

data: {"type": "chunk", "content": " comment"}

data: {"type": "chunk", "content": " utiliser"}

data: {"type": "chunk", "content": " Synesia"}

data: {"type": "chunk", "content": " efficacement"}

data: {"type": "end", "usage": {"prompt_tokens": 150, "completion_tokens": 45, "total_tokens": 195}}
```

---

## 📝 Gestion des Entrées

### Création d'Entrées

Les entrées peuvent être créées manuellement ou automatiquement via le traitement.

#### Entrée Simple
```json
{
  "content": "Synesia est une plateforme puissante pour créer des agents IA.",
  "metadata": {}
}
```

#### Entrée avec Métadonnées Riches
```json
{
  "content": "Le RAG améliore les réponses des LLM en ajoutant du contexte pertinent.",
  "metadata": {
    "user_id": "user_456",
    "username": "alice_smith",
    "tags": ["rag", "llm", "context"],
    "extracted_at": "2024-12-16T14:30:00Z",
    "description": "Explication du concept RAG",
    "source": "article_tech",
    "operation_id": "import_articles_batch_001",
    "tool_call_id": "extract_content_tool_789",
    "custom": {
      "importance": "high",
      "category": "technical_concept",
      "reviewed": true
    }
  }
}
```

### Métadonnées Supportées

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `user_id` | string | ID utilisateur | `"user_123"` |
| `username` | string | Nom d'utilisateur | `"john_doe"` |
| `tags` | string[] | Tags pour recherche | `["guide", "tutorial"]` |
| `extracted_at` | datetime | Date d'extraction | `"2024-12-16T10:00:00Z"` |
| `description` | string | Description courte | `"Chapitre 1"` |
| `source` | string | Source du contenu | `"documentation"` |
| `operation_id` | string | ID d'opération batch | `"batch_001"` |
| `tool_call_id` | string | ID d'appel d'outil | `"tool_456"` |
| `custom` | object | Champs personnalisés | `{"priority": "high"}` |

### Pagination

Pour gérer de grandes quantités d'entrées :

```javascript
async function getAllEntries(memoryId, apiKey) {
  const allEntries = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await fetch(
      `${BASE_URL}/memory/${memoryId}/entries?limit=${limit}&offset=${offset}`,
      {
        headers: { 'x-api-key': apiKey }
      }
    );

    const data = await response.json();
    allEntries.push(...data.data);

    if (!data.pagination.has_more) break;
    offset += limit;
  }

  return allEntries;
}
```

---

## 🔍 Recherche Sémantique

La recherche utilise des embeddings pour trouver des contenus sémantiquement similaires.

### Recherche Basique

```json
{
  "query": "comment créer un agent",
  "top_k": 3
}
```

### Recherche Avancée

La recherche comprend automatiquement :
- **Similarité sémantique** : "voiture rouge" trouve "véhicule écarlate"
- **Contexte temporel** : Les dates sont incluses dans les résultats
- **Métadonnées** : Tags et autres champs peuvent influencer le ranking

### Optimisations de Recherche

#### Utiliser des Requêtes Précises
```json
// ✅ Bon : requête claire et spécifique
{"query": "comment configurer l'authentification OAuth", "top_k": 5}

// ❌ Mauvais : requête vague
{"query": "config", "top_k": 5}
```

#### Utiliser les Métadonnées
Filtrez avec les métadonnées après la recherche vectorielle :

```javascript
async function searchWithMetadata(query, tags = []) {
  const results = await searchMemory(query, 10);

  // Filtrage côté client
  return results.filter(entry =>
    tags.length === 0 ||
    tags.some(tag => entry.metadata.tags?.includes(tag))
  );
}
```

---

## 💬 Chat avec RAG

Le chat RAG combine recherche mémoire + génération LLM pour des réponses contextuelles.

### Flux de Fonctionnement

1. **Analyse du message utilisateur** : Extraction de la dernière question
2. **Recherche mémoire** : Trouve les 5 entrées les plus pertinentes
3. **Construction du contexte** : Formatage avec dates relatives
4. **Enrichissement du prompt** : Injection du contexte dans les instructions
5. **Streaming de la réponse** : Événements temps réel

### Format du Contexte

```
Contexte mémoire pertinente (3 entrées trouvées) :
- [il y a 2 jours (2024-12-14)] Synesia permet de créer des agents IA...
- [il y a 1 semaine (2024-12-09)] Les outils incluent des APIs externes...
- [il y a 3 mois (2024-09-16)] La plateforme supporte le streaming...
```

### Gestion du Streaming

```javascript
async function chatWithMemory(memoryId, message, instructions, modelId) {
  const response = await fetch(`${BASE_URL}/memory/${memoryId}/chat`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      instructions,
      llm_model_id: modelId
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const events = chunk.split('\n\n').filter(line => line.startsWith('data: '));

    for (const event of events) {
      const data = JSON.parse(event.replace('data: ', ''));

      switch (data.type) {
        case 'memory.search.results':
          console.log(`📚 Trouvé ${data.data.count} entrées pertinentes`);
          break;
        case 'chunk':
          process.stdout.write(data.content);
          break;
        case 'end':
          console.log(`\\n📊 Usage: ${data.usage.total_tokens} tokens`);
          break;
      }
    }
  }
}
```

### Événements SSE

| Type | Description | Données |
|------|-------------|---------|
| `memory.search.results` | Résultats de recherche | `{entries: [...], count: N}` |
| `chunk` | Morceau de réponse | `{content: "texte"}` |
| `end` | Fin de la réponse | `{usage: {...}}` |

---

## ⚙️ Traitement Automatique

Le traitement automatique utilise un agent IA pour extraire des informations pertinentes d'un texte.

### Configuration Requise

La mémoire doit avoir un `process_agent_id` configuré dans Synesia.

### Fonctionnement

1. **Exécution d'agent** : L'agent analyse le texte fourni
2. **Extraction** : L'agent retourne des informations structurées
3. **Création d'entrées** : Chaque information devient une entrée mémoire
4. **Embeddings** : Calcul automatique des vecteurs

### Exemple d'Usage

```javascript
// Traiter un article long
const result = await fetch(`${BASE_URL}/memory/${MEMORY_ID}/process`, {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: `
      Synesia est une plateforme révolutionnaire pour créer des agents IA.
      Elle offre des fonctionnalités avancées comme le RAG, les outils externes,
      et le streaming temps réel. Les utilisateurs peuvent créer des workflows
      complexes avec des intégrations à des APIs tierces.
    `
  })
});

// Résultat : tableau d'IDs d'entrées créées
console.log('Entrées créées:', result.data); // ["entry_1", "entry_2", "entry_3"]
```

---

## ⚙️ Configuration

### Configuration Mémoire

Dans Synesia, chaque mémoire peut être configurée avec :

- **Modèle d'embedding** : `text-embedding-3-small`, `text-embedding-3-large`, etc.
- **Index vectoriel** : Configuration de la base de données vectorielle
- **Agent de traitement** : Agent IA pour extraction automatique
- **Instructions de traitement** : Prompt personnalisé pour l'extraction

### Paramètres de Recherche

- **top_k** : Nombre de résultats (1-100, défaut recommandé : 5-10)
- **Seuil de similarité** : Non exposé directement (géré par l'index)

### Paramètres de Chat

- **llm_model_id** : Slug du modèle (`gpt-4o-mini`, `claude-3-haiku`, etc.)
- **instructions** : Prompt système personnalisé
- **messages** : Historique de conversation

---

## 💡 Exemples Complets

### Agent Mémoire Conversationnel

```javascript
class MemoryChatBot {
  constructor(memoryId, apiKey) {
    this.memoryId = memoryId;
    this.apiKey = apiKey;
    this.conversationHistory = [];
  }

  async sendMessage(message, instructions = "Tu es un assistant utile.") {
    // Ajouter le message utilisateur
    this.conversationHistory.push({ role: 'user', content: message });

    // Garder seulement les 10 derniers messages
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    // Chat avec RAG
    const response = await this.chatWithMemory(
      instructions,
      'gpt-4o-mini'
    );

    // Ajouter la réponse à l'historique
    this.conversationHistory.push({
      role: 'assistant',
      content: response.fullResponse
    });

    return response;
  }

  async chatWithMemory(instructions, modelId) {
    const response = await fetch(`${BASE_URL}/memory/${this.memoryId}/chat`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: this.conversationHistory,
        instructions,
        llm_model_id: modelId
      })
    });

    let fullResponse = '';
    let searchResults = null;
    let usage = null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const events = chunk.split('\n\n').filter(line => line.startsWith('data: '));

      for (const event of events) {
        const data = JSON.parse(event.replace('data: ', ''));

        if (data.type === 'memory.search.results') {
          searchResults = data.data;
        } else if (data.type === 'chunk') {
          fullResponse += data.content;
        } else if (data.type === 'end') {
          usage = data.usage;
        }
      }
    }

    return {
      fullResponse,
      searchResults,
      usage,
      conversationHistory: [...this.conversationHistory]
    };
  }

  async learnFromConversation(topic, summary) {
    // Ajouter un résumé de la conversation à la mémoire
    await fetch(`${BASE_URL}/memory/${this.memoryId}/entries`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: summary,
        metadata: {
          tags: ['conversation', topic],
          source: 'chat_learning',
          extracted_at: new Date().toISOString()
        }
      })
    });
  }
}

// Utilisation
const bot = new MemoryChatBot('memory_uuid_123', 'apiKey.xxx');

// Conversation
const response1 = await bot.sendMessage("Qu'est-ce que Synesia ?");
console.log(response1.fullResponse);

const response2 = await bot.sendMessage("Comment créer un agent ?");
console.log(response2.fullResponse);

// Apprentissage
await bot.learnFromConversation(
  'synesia_basics',
  'L\'utilisateur a demandé des informations sur Synesia et la création d\'agents.'
);
```

### Système de FAQ Automatique

```javascript
class FAQSystem {
  constructor(memoryId, apiKey) {
    this.memoryId = memoryId;
    this.apiKey = apiKey;
  }

  async addFAQ(question, answer, category = 'general') {
    const content = `Q: ${question}\\nA: ${answer}`;

    await fetch(`${BASE_URL}/memory/${this.memoryId}/entries`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        metadata: {
          tags: ['faq', category, 'question'],
          source: 'faq_system',
          custom: {
            question,
            answer,
            category
          }
        }
      })
    });
  }

  async searchFAQ(query, maxResults = 3) {
    const response = await fetch(`${BASE_URL}/memory/${this.memoryId}/search`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        top_k: maxResults
      })
    });

    const data = await response.json();
    return data.data.map(entry => ({
      question: entry.metadata.custom.question,
      answer: entry.metadata.custom.answer,
      category: entry.metadata.custom.category,
      relevance: this.calculateRelevance(query, entry.value)
    }));
  }

  calculateRelevance(query, content) {
    // Calcul simple de similarité (à améliorer)
    const queryWords = query.toLowerCase().split(' ');
    const contentWords = content.toLowerCase().split(' ');

    const matches = queryWords.filter(word =>
      contentWords.some(contentWord => contentWord.includes(word))
    );

    return matches.length / queryWords.length;
  }

  async getAnswer(query) {
    const faqs = await this.searchFAQ(query, 1);

    if (faqs.length === 0) {
      return {
        found: false,
        answer: "Désolé, je n'ai pas trouvé de réponse à votre question.",
        suggestions: []
      };
    }

    const bestMatch = faqs[0];
    return {
      found: true,
      answer: bestMatch.answer,
      category: bestMatch.category,
      confidence: bestMatch.relevance
    };
  }
}

// Utilisation
const faq = new FAQSystem('faq_memory_uuid', 'apiKey.xxx');

// Ajouter des FAQs
await faq.addFAQ(
  "Comment créer un compte ?",
  "Allez sur la page d'inscription et remplissez le formulaire.",
  'account'
);

await faq.addFAQ(
  "Quels sont les tarifs ?",
  "Nous proposons trois plans : Gratuit, Pro (9.99€/mois), Entreprise (sur devis).",
  'pricing'
);

// Recherche
const answer = await faq.getAnswer("comment m'inscrire");
console.log(answer.answer); // "Allez sur la page d'inscription..."
```

---

## 🚨 Gestion d'Erreurs

### Codes d'Erreur HTTP

- `400 Bad Request` : Paramètres invalides ou mémoire mal configurée
- `401 Unauthorized` : Authentification échouée
- `403 Forbidden` : Accès refusé au projet/mémoire
- `404 Not Found` : Mémoire ou entrée introuvable
- `500 Internal Server Error` : Erreur serveur

### Erreurs Spécifiques

#### Configuration Manquante
```json
{
  "error": "Memory embedding_model_id is not configured. Please set an embedding model.",
  "statusCode": 400
}
```

#### Agent Non Configuré
```json
{
  "error": "Memory process_agent_id is not configured. Please link an agent to this memory for processing.",
  "statusCode": 400
}
```

#### Quota Dépassé
```json
{
  "error": "Embedding API quota exceeded",
  "statusCode": 429
}
```

### Gestion en Streaming

```javascript
// Gestion des erreurs en streaming
data: {"type": "error", "error": {"message": "Memory search failed", "code": "SEARCH_ERROR"}}
```

---

## 🎯 Bonnes Pratiques

### 1. Contenu des Entrées

- **Taille optimale** : 100-1000 caractères par entrée
- **Contenu atomique** : Une idée/concept par entrée
- **Métadonnées riches** : Utilisez tous les champs disponibles
- **Format structuré** : Q: question A: réponse pour les FAQ

### 2. Organisation

- **Mémoires séparées** : Une mémoire par domaine/contexte
- **Tags consistants** : Nomenclature uniforme pour les tags
- **Métadonnées structurées** : Utilisez `custom` pour vos besoins spécifiques

### 3. Recherche

- **Requêtes précises** : Plus la requête est claire, meilleurs sont les résultats
- **top_k adapté** : 3-5 pour les chats, 10-20 pour l'exploration
- **Filtrage post-recherche** : Utilisez les métadonnées pour affiner

### 4. Performance

- **Batch processing** : Traitez plusieurs documents ensemble
- **Cache intelligent** : Les embeddings sont coûteux, évitez les recalculs
- **Pagination** : Utilisez limit/offset pour les grandes listes
- **Streaming** : Préférez le chat streaming pour l'UX

### 5. Maintenance

- **Nettoyage régulier** : Supprimez les entrées obsolètes
- **Mise à jour** : Les entrées peuvent être modifiées (recalcul d'embedding)
- **Monitoring** : Surveillez l'usage et les performances
- **Backup** : Les données vectorielles sont critiques

---

## 🔌 Intégration Chat Scrivia

### 1. Architecture Proposée

```
Scrivia Chat UI
    ↓
MemoryChatProvider (Scrivia)
    ↓
Synesia Memory API
    ↓
├── Vector Search (embeddings)
├── LLM Chat (RAG)
└── Entry Management
```

### 2. Provider Scrivia

```typescript
interface MemoryProvider {
  // Gestion des entrées
  addEntry(content: string, metadata?: any): Promise<string>;
  search(query: string, topK?: number): Promise<MemoryEntry[]>;

  // Chat avec RAG
  chat(
    messages: ChatMessage[],
    instructions?: string,
    model?: string
  ): AsyncGenerator<ChatEvent>;

  // Traitement automatique
  processText(text: string): Promise<string[]>;
}

class ScriviaMemoryProvider implements MemoryProvider {
  constructor(
    private memoryId: string,
    private apiKey: string,
    private baseUrl: string = 'https://origins-server.up.railway.app'
  ) {}

  private async apiCall(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Memory API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  async addEntry(content: string, metadata: any = {}): Promise<string> {
    const response = await this.apiCall(
      `/memory/${this.memoryId}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ content, metadata })
      }
    );

    return response.data.entry_id;
  }

  async search(query: string, topK: number = 5): Promise<MemoryEntry[]> {
    const response = await this.apiCall(
      `/memory/${this.memoryId}/search`,
      {
        method: 'POST',
        body: JSON.stringify({ query, top_k: topK })
      }
    );

    return response.data;
  }

  async *chat(
    messages: ChatMessage[],
    instructions: string = "Tu es un assistant utile.",
    model: string = "gpt-4o-mini"
  ): AsyncGenerator<ChatEvent> {
    const response = await fetch(
      `${this.baseUrl}/memory/${this.memoryId}/chat`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          instructions,
          llm_model_id: model
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Chat API error: ${error.error || response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const events = chunk.split('\n\n').filter(line => line.startsWith('data: '));

      for (const event of events) {
        try {
          const data = JSON.parse(event.replace('data: ', ''));
          yield this.mapEvent(data);
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }
  }

  private mapEvent(data: any): ChatEvent {
    switch (data.type) {
      case 'memory.search.results':
        return {
          type: 'memory_results',
          entries: data.data.entries,
          count: data.data.count
        };
      case 'chunk':
        return {
          type: 'content',
          content: data.content
        };
      case 'end':
        return {
          type: 'done',
          usage: data.usage
        };
      default:
        return data;
    }
  }

  async processText(text: string): Promise<string[]> {
    const response = await this.apiCall(
      `/memory/${this.memoryId}/process`,
      {
        method: 'POST',
        body: JSON.stringify({ text })
      }
    );

    return response.data;
  }
}
```

### 3. Intégration dans le Chat Scrivia

```typescript
class ScriviaChatWithMemory {
  constructor(
    private memoryProvider: ScriviaMemoryProvider,
    private ui: ChatUI
  ) {}

  async sendMessage(message: string) {
    // Afficher le message utilisateur
    this.ui.addMessage('user', message);

    // Démarrer la réponse
    this.ui.startTyping();

    try {
      // Chat avec RAG
      const events = this.memoryProvider.chat([
        { role: 'user', content: message }
      ]);

      let fullResponse = '';
      let memoryResults = null;

      for await (const event of events) {
        switch (event.type) {
          case 'memory_results':
            // Afficher les sources mémoire
            this.ui.showMemorySources(event.entries);
            memoryResults = event.entries;
            break;

          case 'content':
            // Accumuler et afficher le contenu
            fullResponse += event.content;
            this.ui.updateResponse(fullResponse);
            break;

          case 'done':
            // Finaliser la réponse
            this.ui.finishResponse(fullResponse, event.usage);

            // Optionnellement apprendre de la conversation
            if (this.shouldLearnFromConversation(message, fullResponse)) {
              await this.memoryProvider.addEntry(
                `Conversation: ${message} → ${fullResponse}`,
                {
                  tags: ['conversation', 'learning'],
                  source: 'chat_interaction',
                  custom: {
                    user_message: message,
                    assistant_response: fullResponse,
                    memory_used: memoryResults?.length || 0
                  }
                }
              );
            }
            break;
        }
      }

    } catch (error) {
      this.ui.showError('Erreur lors de la génération de réponse');
      console.error('Chat error:', error);
    } finally {
      this.ui.stopTyping();
    }
  }

  private shouldLearnFromConversation(userMsg: string, assistantResponse: string): boolean {
    // Logique pour décider si la conversation est intéressante à mémoriser
    // Par exemple : réponses longues, questions techniques, etc.
    return assistantResponse.length > 200 ||
           userMsg.includes('?') ||
           assistantResponse.includes('Voici comment');
  }
}
```

### 4. Interface Utilisateur Mémoire

```typescript
interface ChatUI {
  addMessage(role: 'user' | 'assistant', content: string): void;
  startTyping(): void;
  stopTyping(): void;
  updateResponse(content: string): void;
  finishResponse(content: string, usage?: any): void;
  showError(message: string): void;
  showMemorySources(entries: MemoryEntry[]): void;
}

// Implémentation React
class ReactChatUI implements ChatUI {
  // ... implémentation React ...
  showMemorySources(entries: MemoryEntry[]) {
    // Afficher les sources dans une sidebar
    this.setState({
      memorySources: entries.map(entry => ({
        content: entry.value,
        date: formatRelativeDate(entry.created_at),
        tags: entry.metadata.tags || []
      }))
    });
  }
}
```

### 5. Gestion des Performances

```typescript
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(key: string) {
    const item = this.cache.get(key);
    if (!item || Date.now() - item.timestamp > this.TTL) {
      return null;
    }
    return item.data;
  }

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Cache intelligent pour les recherches fréquentes
  async cachedSearch(provider: ScriviaMemoryProvider, query: string, topK = 5) {
    const key = `search:${query}:${topK}`;

    let results = this.get(key);
    if (!results) {
      results = await provider.search(query, topK);
      this.set(key, results);
    }

    return results;
  }
}
```

---

## 📞 Support et Ressources

### Documentation Supplémentaire

- [API LLM Exec](../LLM-EXEC-API-GUIDE.md) - API principale pour les agents
- [Guide Développement](../DEVELOPMENT-LOCAL.md) - Configuration locale
- [Tests Orchestration](../TESTS-ORCHESTRATION.md) - Tests avancés

### Ressources

- **OpenAPI Schema** : `openapi-schemas/memory.json`
- **Exemples Code** : `docs/MEMORY-API-INTEGRATION-EXAMPLES.ts`
- **Tests** : `docs/MEMORY-API-TESTS.js`

### Contact

- **Issues** : [GitHub Issues](https://github.com/synesia-ai/synesia/issues)
- **Discord** : Communauté Synesia
- **Email** : support@synesia.ai

---

*Documentation générée le : Décembre 2025*
