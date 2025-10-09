# 🌐 Exemples d'Intégrations MCP pour Agents

**Date**: 2025-01-09  
**Status**: Guide

---

## 🎯 Principe

Les agents peuvent utiliser des **serveurs MCP externes** pour étendre leurs capacités :
- 🔍 **Websearch** : Exa, Perplexity
- ✅ **Task Management** : ClickUp, Linear, Jira
- 📝 **Notes** : Notion (externe)
- 📧 **Email** : Gmail, Outlook
- 🗂️ **Storage** : Google Drive, Dropbox

**Architecture** : OpenAPI v2 (Scrivia) + MCP (externes)

---

## 1. 🔍 Exa (Websearch)

### Configuration Agent

```sql
UPDATE agents 
SET mcp_config = '{
  "enabled": true,
  "servers": [{
    "server_label": "exa",
    "server_url": "https://api.exa.ai/mcp",
    "headers": {
      "x-api-key": "exa_sk_..."
    }
  }],
  "hybrid_mode": true
}'::jsonb
WHERE slug = 'donna';
```

### Résultat

```json
{
  "tools": [
    { "type": "function", "function": { "name": "createNote" } },
    { "type": "function", "function": { "name": "searchNotes" } },
    // ... tous les outils Scrivia
    
    {
      "type": "mcp",
      "server_label": "exa",
      "server_url": "https://api.exa.ai/mcp",
      "headers": { "x-api-key": "exa_..." }
    }
  ]
}
```

### Cas d'Usage

**User** : "Recherche les dernières infos sur GPT-5 et crée une note de synthèse"

**Flow** :
1. Groq appelle `exa/search` → résultats websearch
2. Groq appelle `createNote` → note créée dans Scrivia
3. Réponse : "✅ J'ai créé la note 'GPT-5 - Synthèse' avec les dernières infos"

---

## 2. ✅ ClickUp (Task Management)

### Configuration Agent

```sql
UPDATE agents 
SET mcp_config = '{
  "enabled": true,
  "servers": [{
    "server_label": "clickup",
    "server_url": "https://api.clickup.com/mcp",
    "headers": {
      "authorization": "Bearer pk_..."
    }
  }],
  "hybrid_mode": true
}'::jsonb
WHERE slug = 'harvey';
```

### Cas d'Usage

**User** : "Crée une task ClickUp pour chaque tâche dans ma note 'Roadmap Q1'"

**Flow** :
1. Groq appelle `getNote(slug='roadmap-q1')` → contenu de la note
2. Groq parse les tâches
3. Pour chaque tâche : Groq appelle `clickup/createTask`
4. Réponse : "✅ 5 tasks créées dans ClickUp depuis la note Roadmap Q1"

---

## 3. 📝 Notion (externe)

### Configuration Agent

```sql
UPDATE agents 
SET mcp_config = '{
  "enabled": true,
  "servers": [{
    "server_label": "notion",
    "server_url": "https://api.notion.com/mcp",
    "headers": {
      "authorization": "Bearer secret_..."
    }
  }],
  "hybrid_mode": true
}'::jsonb
WHERE slug = 'donna';
```

### Cas d'Usage

**User** : "Importe mes pages Notion 'Marketing' dans un nouveau classeur Scrivia"

**Flow** :
1. Groq appelle `notion/queryDatabase` → pages Notion
2. Groq appelle `createClasseur(name='Marketing')` → classeur Scrivia
3. Pour chaque page : Groq appelle `createNote` → notes dans Scrivia
4. Réponse : "✅ 12 pages importées depuis Notion dans le classeur Marketing"

---

## 4. 🔀 Multi-MCP (Exa + ClickUp)

### Configuration Agent

```sql
UPDATE agents 
SET mcp_config = '{
  "enabled": true,
  "servers": [
    {
      "server_label": "exa",
      "server_url": "https://api.exa.ai/mcp",
      "headers": { "x-api-key": "exa_..." }
    },
    {
      "server_label": "clickup",
      "server_url": "https://api.clickup.com/mcp",
      "headers": { "authorization": "Bearer pk_..." }
    }
  ],
  "hybrid_mode": true
}'::jsonb
WHERE slug = 'donna';
```

### Cas d'Usage

**User** : "Recherche des articles sur Next.js 15 et crée une task ClickUp 'Migrer vers Next.js 15' avec les liens"

**Flow** :
1. Groq appelle `exa/search("Next.js 15")` → articles
2. Groq appelle `clickup/createTask` avec les liens → task créée
3. Réponse : "✅ Task créée dans ClickUp avec 8 articles de référence"

---

## 📋 Liste des MCP Populaires

| Service | MCP URL | Headers | Use Case |
|---------|---------|---------|----------|
| **Exa** | `api.exa.ai/mcp` | `x-api-key` | Websearch sémantique |
| **ClickUp** | `api.clickup.com/mcp` | `authorization` | Task management |
| **Notion** | `api.notion.com/mcp` | `authorization` | Notes externes |
| **Linear** | `api.linear.app/mcp` | `authorization` | Issue tracking |
| **Jira** | `jira.atlassian.com/mcp` | `authorization` | Project management |
| **Gmail** | `gmail.googleapis.com/mcp` | `authorization` | Email |
| **Google Drive** | `drive.googleapis.com/mcp` | `authorization` | Storage |
| **Slack** | `slack.com/api/mcp` | `authorization` | Messaging |

---

## 🧪 Template de Test

```typescript
// Service pour tester une config MCP
import { mcpConfigService } from '@/services/llm/mcpConfigService';

const testMcpConfig = mcpConfigService.createExternalMcpConfig([
  {
    label: 'exa',
    url: 'https://api.exa.ai/mcp',
    apiKey: process.env.EXA_API_KEY
  },
  {
    label: 'clickup',
    url: 'https://api.clickup.com/mcp',
    apiKey: process.env.CLICKUP_API_KEY
  }
]);

console.log('MCP Config:', testMcpConfig);
// {
//   enabled: true,
//   servers: [
//     { server_label: 'exa', server_url: '...', headers: {...} },
//     { server_label: 'clickup', server_url: '...', headers: {...} }
//   ],
//   hybrid_mode: true
// }
```

---

## 🚀 Workflow Recommandé

1. **Choisir le service** : Exa, ClickUp, Notion, etc.
2. **Obtenir l'API key** : Depuis le service externe
3. **Trouver l'URL MCP** : Documentation du service
4. **Configurer l'agent** : `UPDATE agents SET mcp_config = ...`
5. **Tester** : Envoyer un message à l'agent
6. **Monitorer** : Vérifier les logs Groq

---

**Ready to integrate! 🎯**

