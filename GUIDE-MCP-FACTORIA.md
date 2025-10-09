# 🏭 Guide : Lier des Serveurs MCP Factoria aux Agents

**Date**: 2025-01-09  
**Status**: Production Ready

---

## 🎯 Concept

Tu as **Factoria** (ton usine à MCP). Tu veux que tes agents puissent utiliser ces serveurs MCP.

**Architecture** :
```
agents <── agent_mcp_servers ──> mcp_servers (Factoria)
```

**Mode hybride** :
- 📦 OpenAPI v2 : Pour accéder aux données Scrivia (notes, classeurs)
- 🏭 MCP Factoria : Pour tes serveurs MCP personnalisés

---

## ⚡ Usage Ultra-Rapide

```bash
# 1. Lister tes serveurs MCP Factoria
npm run mcp:list

# 2. Copier l'ID du serveur que tu veux
# Exemple: c8d47664-01bf-44a5-a189-05842dd641f5

# 3. Lier le serveur à un agent
npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5

# 4. Vérifier que ça marche
tsx scripts/configure-agent-mcp.ts show donna
```

---

## 📋 Commandes Disponibles

### Lister les serveurs MCP
```bash
npm run mcp:list
```

**Résultat** :
```
📋 Serveurs MCP Factoria disponibles:

✅ Scrivia API V2 (ID: c8d47664...)
   Description: MCP Server for Scrivia API V2
   URL: https://factoria-nine.vercel.app/api/mcp/servers/c8d47664...
   Tools: 30
```

### Lier un serveur MCP à un agent
```bash
npm run mcp:add <agent-slug> <mcp-server-id-1> [mcp-server-id-2...]
```

**Exemples** :
```bash
# Lier 1 serveur
npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5

# Lier plusieurs serveurs
npm run mcp:add harvey <id-exa> <id-clickup> <id-notion>
```

### Afficher les MCP d'un agent
```bash
tsx scripts/configure-agent-mcp.ts show <agent-slug>
```

**Résultat** :
```
📊 Serveurs MCP de l'agent "donna":

✅ Scrivia API V2 (Priority: 0)
   URL: https://factoria-nine.vercel.app/api/mcp/servers/c8d47664...
   Tools: 30
```

### Supprimer tous les MCP d'un agent
```bash
npm run mcp:remove <agent-slug>
```

---

## 🔧 Architecture Technique

### Tables

```sql
-- Table des serveurs MCP (Factoria)
mcp_servers (
  id,
  name,
  deployment_url,
  config JSONB, -- { apiKey: "...", ... }
  status
)

-- Table de liaison many-to-many
agent_mcp_servers (
  agent_id,
  mcp_server_id,
  is_active,
  priority
)

-- Table des agents
agents (
  id,
  slug,
  mcp_config JSONB -- DEPRECATED, on utilise agent_mcp_servers maintenant
)
```

### Flux

```typescript
// 1. L'orchestrateur récupère la config MCP de l'agent
const mcpConfig = await mcpConfigService.getAgentMcpConfig(agentId);

// 2. McpConfigService lit depuis agent_mcp_servers + mcp_servers
const { data: links } = await supabase
  .from('agent_mcp_servers')
  .select('mcp_servers(name, deployment_url, config)')
  .eq('agent_id', agentId);

// 3. Construction des tools pour Groq
const tools = [
  // OpenAPI tools (Scrivia)
  { type: 'function', function: { name: 'createNote', ... } },
  // ... 42 tools OpenAPI
  
  // Serveurs MCP (Factoria)
  { 
    type: 'mcp',
    server_label: 'scrivia-api-v2',
    server_url: 'https://factoria-nine.vercel.app/api/mcp/servers/c8d47664...',
    headers: { 'x-api-key': '...' }
  }
];

// 4. Groq reçoit les tools hybrides
```

---

## 🎯 Exemples Concrets

### Exemple 1 : Donna avec Scrivia MCP

```bash
# 1. Lister les serveurs
npm run mcp:list

# 2. Lier Scrivia à Donna
npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5

# 3. Tester
# → Dans le chat : "Donna, crée une note test"
```

**Résultat** :
- Groq voit le serveur MCP Scrivia dans tools[]
- Groq peut appeler `createNote` via MCP **OU** via OpenAPI
- Mode hybride = 2 façons d'accéder aux mêmes données

### Exemple 2 : Harvey avec Multi-MCP

```bash
# 1. Dans Factoria, créer des serveurs MCP pour Exa, ClickUp
# 2. Récupérer leurs IDs
# 3. Lier à Harvey

npm run mcp:add harvey <id-exa> <id-clickup> <id-notion>

# 4. Vérifier
tsx scripts/configure-agent-mcp.ts show harvey
```

**Résultat** :
```
📊 Serveurs MCP de l'agent "harvey":

✅ Exa (Priority: 0)
   URL: https://...
   Tools: 15

✅ ClickUp (Priority: 1)
   URL: https://...
   Tools: 25

✅ Notion (Priority: 2)
   URL: https://...
   Tools: 30
```

---

## 🏗️ Payload Groq Résultant

```json
{
  "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
  "messages": [...],
  "tools": [
    // OpenAPI v2 (Scrivia)
    { "type": "function", "function": { "name": "createNote", ... } },
    { "type": "function", "function": { "name": "searchNotes", ... } },
    // ... 42 tools OpenAPI
    
    // MCP Factoria
    {
      "type": "mcp",
      "server_label": "scrivia-api-v2",
      "server_url": "https://factoria-nine.vercel.app/api/mcp/servers/c8d47664...",
      "headers": { "x-api-key": "scrivia_..." }
    },
    {
      "type": "mcp",
      "server_label": "exa",
      "server_url": "https://factoria-nine.vercel.app/api/mcp/servers/<id-exa>",
      "headers": { "x-api-key": "exa_..." }
    }
  ]
}
```

---

## 📊 SQL Utiles

### Lister tous les agents avec leurs MCP
```sql
SELECT 
  a.slug,
  a.display_name,
  COUNT(ams.id) as nb_mcp_servers,
  ARRAY_AGG(m.name ORDER BY ams.priority) as mcp_servers
FROM agents a
LEFT JOIN agent_mcp_servers ams ON ams.agent_id = a.id AND ams.is_active = true
LEFT JOIN mcp_servers m ON m.id = ams.mcp_server_id
GROUP BY a.id, a.slug, a.display_name
HAVING COUNT(ams.id) > 0;
```

### Lier manuellement un serveur MCP
```sql
INSERT INTO agent_mcp_servers (agent_id, mcp_server_id, is_active, priority)
VALUES (
  (SELECT id FROM agents WHERE slug = 'donna'),
  'c8d47664-01bf-44a5-a189-05842dd641f5',
  true,
  0
)
ON CONFLICT (agent_id, mcp_server_id) DO UPDATE
SET is_active = true, priority = 0;
```

### Supprimer une liaison
```sql
DELETE FROM agent_mcp_servers 
WHERE agent_id = (SELECT id FROM agents WHERE slug = 'donna')
  AND mcp_server_id = 'c8d47664-01bf-44a5-a189-05842dd641f5';
```

---

## ✅ Avantages de cette Architecture

1. **Flexibilité** : Lie/délie des serveurs MCP sans toucher au code
2. **Factoria centralisé** : Tous tes MCP dans une seule usine
3. **Many-to-many** : Un agent peut avoir plusieurs MCP, un MCP peut être utilisé par plusieurs agents
4. **Priority** : Contrôle l'ordre d'exécution des serveurs MCP
5. **Toggle** : Active/désactive un MCP sans le supprimer (`is_active`)

---

## 🚀 Workflow Production

1. **Créer un serveur MCP dans Factoria** (tu as déjà ça)
2. **Copier l'ID du serveur** (depuis Factoria UI)
3. **Lier à un agent** :
   ```bash
   npm run mcp:add donna <mcp-server-id>
   ```
4. **Tester dans le chat**
5. **Monitorer les logs Groq**

---

**Ready! 🏭**

