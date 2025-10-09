# 🚀 Guide Ultra-Rapide : Ajouter des MCP aux Agents

## TL;DR

```bash
# 1. Lister les serveurs MCP disponibles
npm run mcp:list

# 2. Ajouter Exa (websearch) à Donna
npm run mcp:add donna exa

# 3. Tester dans le chat
# → "Donna, recherche les dernières infos sur GPT-5 et crée une note"
```

---

## 📋 Serveurs MCP Disponibles

| Service | Label | Ce qu'il fait | API Key |
|---------|-------|---------------|---------|
| **Exa** | `exa` | 🔍 Websearch sémantique | [exa.ai](https://exa.ai) |
| **ClickUp** | `clickup` | ✅ Gestion de tâches | [clickup.com](https://clickup.com/settings/apps) |
| **Linear** | `linear` | 🎯 Issue tracking | [linear.app](https://linear.app/settings/api) |
| **Notion** | `notion` | 📝 Notes externes | [notion.so](https://notion.so/my-integrations) |
| **Gmail** | `gmail` | 📧 Email | Google Cloud Console |
| **Slack** | `slack` | 💬 Messaging | [api.slack.com](https://api.slack.com/apps) |

---

## ⚡ Commandes Rapides

```bash
# Ajouter 1 serveur
npm run mcp:add donna exa

# Ajouter plusieurs serveurs
npm run mcp:add harvey exa clickup linear

# Supprimer tous les MCP d'un agent
npm run mcp:remove johnny
```

---

## 🔑 Obtenir une API Key (Exemple Exa)

1. Va sur [exa.ai](https://exa.ai)
2. Crée un compte
3. Va dans **Settings → API Keys**
4. Copie la clé `exa_sk_...`
5. Ajoute dans `.env.local` :
   ```bash
   EXA_API_KEY=exa_sk_...
   ```
6. Redémarre le serveur : `npm run dev`

---

## ✅ Tester

```bash
# 1. Configure Donna avec Exa
npm run mcp:add donna exa

# 2. Va dans le chat et teste:
"Donna, recherche les dernières infos sur Next.js 15 et crée une note de synthèse"
```

**Ce qui se passe** :
1. Groq appelle le serveur MCP Exa → résultats de recherche
2. Groq appelle `createNote` (OpenAPI Scrivia) → note créée
3. Réponse : "✅ Note créée avec les dernières infos sur Next.js 15"

---

## 📊 Vérifier la Config

```sql
-- Via Supabase SQL Editor
SELECT 
  slug, 
  display_name,
  mcp_config->'enabled' as mcp_enabled,
  jsonb_array_length(mcp_config->'servers') as nb_servers
FROM agents 
WHERE mcp_config IS NOT NULL;
```

---

## ⚠️ Notes

- **Hybrid Mode** : Les agents gardent toujours l'accès aux tools OpenAPI Scrivia
- **URLs MCP** : Les URLs sont des exemples (à vérifier avec la doc officielle)
- **Sécurité** : API keys dans `.env.local`, jamais commitées

---

**C'est tout ! 🎯**

Pour plus de détails : `docs/guides/GUIDE-AJOUT-MCP.md`

