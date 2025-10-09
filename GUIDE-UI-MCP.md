# 🎨 Guide UI : Gérer les Serveurs MCP dans le Chat

**Date**: 2025-01-09  
**Status**: Production Ready

---

## 🎯 Workflow Ultra-Simple

### 1️⃣ Créer un serveur MCP dans Factoria

**Dans Factoria** (Supabase ou UI Factoria) :
```sql
-- Exemple : Serveur MCP pour Exa (websearch)
INSERT INTO mcp_servers (
  user_id,
  schema_id,
  name,
  description,
  deployment_url,
  status
) VALUES (
  '<ton-user-id>',
  '<schema-id-exa>',
  'Exa Websearch',
  'Recherche web sémantique avancée',
  'https://api.exa.ai/mcp',
  'deployed'
);
```

Ou directement dans l'UI Factoria (si elle existe).

---

### 2️⃣ Lier le MCP à un Agent (via UI Chat)

1. **Ouvre le chat** dans Scrivia
2. **Clique sur 🏭** à côté de l'agent (ex: Donna)
3. **Modal s'ouvre** avec :
   - Serveurs MCP actifs (déjà liés)
   - Serveurs MCP Factoria disponibles
4. **Clique "Lier"** sur le serveur que tu veux
5. **C'est fait !** ✅

---

## 📸 Screenshots (concept)

### Sidebar avec bouton MCP
```
┌─────────────────────────────┐
│  🔍 Rechercher              │
├─────────────────────────────┤
│  Agents                     │
│  ┌─────────────────────┐   │
│  │ 🤖 Donna         🏭 │ ← Clique ici
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 📝 Johnny        🏭 │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

### Modal MCP Manager
```
┌─────────────────────────────────────────┐
│  🏭 Serveurs MCP - Donna           ×    │
├─────────────────────────────────────────┤
│  ✅ Serveurs MCP actifs (1)             │
│  ┌─────────────────────────────────┐   │
│  │ Scrivia API V2         [Délier] │   │
│  │ 30 tools • Priority: 0           │   │
│  └─────────────────────────────────┘   │
│                                          │
│  📋 Serveurs MCP Factoria (3)           │
│  ┌─────────────────────────────────┐   │
│  │ Scrivia API V2       ✓ Lié      │   │
│  │ MCP Server for Scrivia API V2    │   │
│  │ 30 tools • deployed              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Exa Websearch         [Lier]    │   │
│  │ Recherche web sémantique         │   │
│  │ 15 tools • deployed              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ ClickUp Tasks         [Lier]    │   │
│  │ Gestion de tâches               │   │
│  │ 25 tools • deployed              │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  💡 Mode hybride : L'agent garde        │
│     toujours accès aux tools OpenAPI    │
│  🔧 Les MCP sont des ajouts            │
└─────────────────────────────────────────┘
```

---

## 🔧 Architecture Backend

### Tables
```
agents
  ↓ (many-to-many)
agent_mcp_servers (table de liaison)
  ↓
mcp_servers (Factoria)
```

### API Endpoints
- `GET /api/mcp/list` → Liste les serveurs MCP Factoria
- `GET /api/agents/:id/mcp` → Liste les MCP liés à un agent
- `POST /api/agents/:id/mcp` → Lie un serveur MCP
- `DELETE /api/agents/:id/mcp/:linkId` → Supprime une liaison

---

## 🎯 Cas d'Usage Réels

### Cas 1 : Ajouter Exa à Donna

**Étapes** :
1. Dans Factoria, crée un serveur MCP "Exa Websearch"
   - URL : `https://api.exa.ai/mcp`
   - Headers : `{ "x-api-key": "exa_..." }`
   - Status : `deployed`

2. Dans le chat Scrivia :
   - Clique sur 🏭 à côté de Donna
   - Clique "Lier" sur "Exa Websearch"
   - Modal se ferme

3. Teste :
   ```
   User: Donna, recherche les dernières infos sur GPT-5
   ```

**Résultat** :
- Groq appelle le serveur MCP Exa
- Résultats de recherche retournés
- Donna répond avec les infos trouvées

---

### Cas 2 : Donna avec Multi-MCP

**Dans le modal** :
1. Lie "Exa Websearch"
2. Lie "ClickUp Tasks"
3. Lie "Notion"

**Résultat** :
- Donna peut chercher sur le web (Exa)
- Donna peut créer des tasks ClickUp
- Donna peut lire/écrire dans Notion
- **ET** elle garde l'accès à Scrivia (notes, classeurs)

---

## 📋 Payload Groq Résultant

```json
{
  "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
  "messages": [...],
  "tools": [
    // OpenAPI v2 (Scrivia - toujours présent)
    { "type": "function", "function": { "name": "createNote", ... } },
    { "type": "function", "function": { "name": "searchNotes", ... } },
    // ... 42 tools OpenAPI
    
    // MCP Factoria (liés via UI)
    {
      "type": "mcp",
      "server_label": "scrivia-api-v2",
      "server_url": "https://factoria.../mcp/servers/...",
      "headers": { "x-api-key": "..." }
    },
    {
      "type": "mcp",
      "server_label": "exa-websearch",
      "server_url": "https://api.exa.ai/mcp",
      "headers": { "x-api-key": "exa_..." }
    },
    {
      "type": "mcp",
      "server_label": "clickup-tasks",
      "server_url": "https://api.clickup.com/mcp",
      "headers": { "x-api-key": "pk_..." }
    }
  ]
}
```

---

## 🚀 Avantages

| Avant | Après |
|-------|-------|
| Commandes CLI npm | Clic dans l'UI |
| Copier/coller des IDs | Liste visuelle |
| Éditer du SQL | Bouton "Lier" |
| Redémarrer le serveur | Temps réel ✅ |

---

## 🧪 Tester

1. **Redémarre le serveur** :
   ```bash
   npm run dev
   ```

2. **Ouvre le chat**

3. **Clique sur 🏭** à côté de Donna

4. **Tu devrais voir** :
   - ✅ Serveurs MCP actifs (vide si aucun lié)
   - 📋 Serveurs MCP Factoria disponibles (liste tes MCP)

5. **Clique "Lier"** sur un serveur

6. **Vérifie** : Il apparaît maintenant dans "Serveurs MCP actifs"

---

## 📝 Notes

- **Mode hybride automatique** : Les agents gardent toujours OpenAPI
- **Temps réel** : Les modifications sont immédiates
- **Sécurité** : Les liaisons sont par agent (pas globales)
- **Factoria** : Tous tes MCP dans une seule usine

---

**Ready to test! 🏭**

