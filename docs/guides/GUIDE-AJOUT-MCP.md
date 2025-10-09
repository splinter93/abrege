# 🔧 Guide : Ajouter des Serveurs MCP aux Agents

**Date**: 2025-01-09  
**Status**: Guide Pratique

---

## 🎯 Méthode 1 : Script CLI (Recommandé)

### Installation

Aucune installation nécessaire, le script utilise les dépendances existantes.

### Commandes

```bash
# 1. Lister les serveurs MCP disponibles
ts-node scripts/configure-agent-mcp.ts list

# 2. Ajouter un serveur MCP à un agent
ts-node scripts/configure-agent-mcp.ts add <agent-slug> <server1> [server2...]

# 3. Supprimer la config MCP d'un agent
ts-node scripts/configure-agent-mcp.ts remove <agent-slug>
```

### Exemples

```bash
# Ajouter Exa (websearch) à Donna
ts-node scripts/configure-agent-mcp.ts add donna exa

# Ajouter Exa + ClickUp à Harvey
ts-node scripts/configure-agent-mcp.ts add harvey exa clickup linear

# Supprimer tous les MCP de Johnny
ts-node scripts/configure-agent-mcp.ts remove johnny
```

---

## 🎯 Méthode 2 : SQL Direct

### Template SQL

```sql
UPDATE agents 
SET mcp_config = '{
  "enabled": true,
  "servers": [
    {
      "server_label": "exa",
      "server_url": "https://api.exa.ai/mcp",
      "headers": {
        "x-api-key": "exa_sk_..."
      }
    },
    {
      "server_label": "clickup",
      "server_url": "https://api.clickup.com/api/v2/mcp",
      "headers": {
        "x-api-key": "pk_..."
      }
    }
  ],
  "hybrid_mode": true
}'::jsonb
WHERE slug = 'donna';
```

### Exemples par Service

#### 1. Exa (Websearch)
```sql
UPDATE agents SET mcp_config = '{
  "enabled": true,
  "servers": [{
    "server_label": "exa",
    "server_url": "https://api.exa.ai/mcp",
    "headers": { "x-api-key": "exa_sk_..." }
  }],
  "hybrid_mode": true
}'::jsonb WHERE slug = 'donna';
```

#### 2. ClickUp (Tasks)
```sql
UPDATE agents SET mcp_config = '{
  "enabled": true,
  "servers": [{
    "server_label": "clickup",
    "server_url": "https://api.clickup.com/api/v2/mcp",
    "headers": { "x-api-key": "pk_..." }
  }],
  "hybrid_mode": true
}'::jsonb WHERE slug = 'harvey';
```

#### 3. Multi-MCP (Exa + ClickUp + Linear)
```sql
UPDATE agents SET mcp_config = '{
  "enabled": true,
  "servers": [
    {
      "server_label": "exa",
      "server_url": "https://api.exa.ai/mcp",
      "headers": { "x-api-key": "exa_sk_..." }
    },
    {
      "server_label": "clickup",
      "server_url": "https://api.clickup.com/api/v2/mcp",
      "headers": { "x-api-key": "pk_..." }
    },
    {
      "server_label": "linear",
      "server_url": "https://api.linear.app/mcp",
      "headers": { "x-api-key": "lin_..." }
    }
  ],
  "hybrid_mode": true
}'::jsonb WHERE slug = 'donna';
```

---

## 🔑 Obtenir les API Keys

### Exa (Websearch)
1. Aller sur [exa.ai](https://exa.ai)
2. Créer un compte
3. Aller dans Settings → API Keys
4. Copier la clé `exa_sk_...`
5. Ajouter dans `.env.local` : `EXA_API_KEY=exa_sk_...`

### ClickUp
1. Aller sur [clickup.com](https://clickup.com)
2. Settings → Apps → Generate API Token
3. Copier la clé `pk_...`
4. Ajouter dans `.env.local` : `CLICKUP_API_KEY=pk_...`

### Linear
1. Aller sur [linear.app](https://linear.app)
2. Settings → API → Personal API Keys
3. Créer une nouvelle clé
4. Ajouter dans `.env.local` : `LINEAR_API_KEY=lin_...`

### Notion
1. Aller sur [notion.so](https://notion.so)
2. Settings & Members → Integrations → Develop your own integrations
3. Créer une Internal Integration
4. Copier le secret
5. Ajouter dans `.env.local` : `NOTION_API_KEY=secret_...`

---

## 📋 Serveurs MCP Disponibles

| Service | Label | Use Case | Env Var |
|---------|-------|----------|---------|
| **Exa** | `exa` | Websearch sémantique | `EXA_API_KEY` |
| **ClickUp** | `clickup` | Task management | `CLICKUP_API_KEY` |
| **Linear** | `linear` | Issue tracking | `LINEAR_API_KEY` |
| **Notion** | `notion` | Notes externes | `NOTION_API_KEY` |
| **Gmail** | `gmail` | Email | `GMAIL_API_KEY` |
| **Slack** | `slack` | Messaging | `SLACK_BOT_TOKEN` |

---

## 🧪 Vérifier la Configuration

### Via SQL
```sql
SELECT 
  slug, 
  display_name,
  mcp_config->'enabled' as mcp_enabled,
  jsonb_array_length(mcp_config->'servers') as nb_servers,
  mcp_config->'servers' as servers
FROM agents 
WHERE mcp_config IS NOT NULL;
```

### Via le Script
```bash
# Lister tous les agents avec leurs configs MCP
ts-node scripts/configure-agent-mcp.ts list
```

---

## 🎯 Workflow Complet : Exemple Donna + Exa

```bash
# 1. Obtenir l'API key Exa
# → Aller sur exa.ai, créer un compte, copier la clé

# 2. Ajouter dans .env.local
echo "EXA_API_KEY=exa_sk_..." >> .env.local

# 3. Redémarrer le serveur (pour charger la nouvelle env var)
# Ctrl+C puis npm run dev

# 4. Configurer Donna avec Exa
ts-node scripts/configure-agent-mcp.ts add donna exa

# 5. Tester dans le chat
# → "Donna, recherche les dernières infos sur GPT-5 et crée une note"
```

**Résultat attendu** :
1. Groq appelle le serveur MCP Exa → résultats de recherche
2. Groq appelle `createNote` (OpenAPI) → note créée dans Scrivia
3. Réponse : "✅ Note créée avec les dernières infos sur GPT-5"

---

## ⚠️ Notes Importantes

1. **Hybrid Mode par défaut** : Le script configure toujours `hybrid_mode: true`
   - Les agents gardent l'accès aux tools OpenAPI Scrivia
   - Les serveurs MCP sont des **ajouts**, pas des remplacements

2. **URLs MCP** : Les URLs dans le script sont des exemples
   - À vérifier/adapter selon la documentation officielle de chaque service
   - Groq pourrait aussi avoir des URLs proxy pour certains services

3. **Sécurité** : Les API keys sont stockées dans les variables d'env
   - Jamais en dur dans le code
   - Pas de commit des `.env.local`

4. **Limitations** : 
   - Pas tous les services ont des serveurs MCP publics (encore)
   - Certains nécessitent OAuth2 (plus complexe que simple API key)

---

## 🚀 Prochaines Étapes

1. Identifier les services MCP que tu veux utiliser
2. Obtenir les API keys
3. Tester avec un agent de dev
4. Si OK, déployer sur les autres agents
5. Monitorer les logs Groq

**Ready to add MCP! 🎯**

