# 🚀 Quick Start : Serveur MCP Scrivia

Guide rapide pour utiliser le serveur MCP Scrivia avec injection dynamique du JWT utilisateur.

## ✅ Installation Automatique

Le serveur MCP Scrivia a été automatiquement ajouté à votre base de données avec les paramètres suivants :

```yaml
Nom: Scrivia API
URL: https://factoria-nine.vercel.app/api/mcp/servers/c8d47664-01bf-44a5-a189-05842dd641f5
Authentification: JWT dynamique ({{USER_JWT}})
Header: Authorization
Statut: Actif ✅
```

## 🔗 Lier le Serveur MCP à un Agent

### Méthode 1 : Via Script (Recommandé)

```bash
# Lister tous les agents disponibles
npx tsx scripts/link-scrivia-mcp-to-agent.ts list

# Lier le serveur MCP Scrivia à un agent (par slug)
npx tsx scripts/link-scrivia-mcp-to-agent.ts link research-agent

# Lier avec une priorité spécifique (0 = plus haute priorité)
npx tsx scripts/link-scrivia-mcp-to-agent.ts link research-agent 0

# Lier par ID d'agent
npx tsx scripts/link-scrivia-mcp-to-agent.ts link abc123-def456-ghi789
```

### Méthode 2 : Via SQL Direct

```sql
-- 1. Trouver l'ID du serveur MCP Scrivia
SELECT id, name FROM mcp_servers WHERE name = 'Scrivia API';

-- 2. Trouver l'ID de votre agent
SELECT id, name, slug FROM agents WHERE slug = 'votre-agent' OR name = 'Votre Agent';

-- 3. Créer la liaison
INSERT INTO agent_mcp_servers (agent_id, mcp_server_id, priority, is_active)
VALUES (
  'VOTRE_AGENT_ID',
  'ID_DU_SERVEUR_MCP_SCRIVIA',
  0,  -- Priorité (0 = plus haute)
  true
);
```

## 🎯 Fonctionnement

### Architecture

```
Utilisateur authentifié (JWT)
         │
         ▼
    Agent LLM
         │
         ▼
  MCP Config Service
  (Injection JWT dynamique)
         │
         ▼
  Serveur MCP Scrivia
  (Authorization: Bearer {JWT})
         │
         ▼
    API Scrivia v2
```

### Injection Automatique du JWT

Le système remplace automatiquement `{{USER_JWT}}` par le JWT de l'utilisateur authentifié :

**Avant** (en base de données) :
```json
{
  "header": "Authorization",
  "api_key": "{{USER_JWT}}"
}
```

**Après** (à l'exécution) :
```json
{
  "header": "Authorization",
  "api_key": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 📋 Capacités du Serveur MCP Scrivia

Une fois lié à un agent, le serveur MCP Scrivia donne accès à toutes les fonctionnalités de l'API Scrivia :

### 🗂️ Gestion des Notes
- ✅ Créer des notes
- ✅ Lire des notes (par ID ou slug)
- ✅ Mettre à jour des notes
- ✅ Supprimer des notes
- ✅ Déplacer des notes
- ✅ Appliquer des opérations de contenu chirurgicales

### 📚 Gestion des Classeurs
- ✅ Lister les classeurs
- ✅ Créer des classeurs
- ✅ Mettre à jour des classeurs
- ✅ Récupérer l'arbre complet d'un classeur

### 📁 Gestion des Dossiers
- ✅ Créer des dossiers
- ✅ Mettre à jour des dossiers
- ✅ Déplacer des dossiers
- ✅ Récupérer l'arbre d'un dossier

### 🔍 Recherche
- ✅ Rechercher dans les notes
- ✅ Rechercher dans les fichiers
- ✅ Recherche par classeur

### 🤖 Agents Spécialisés
- ✅ Lister les agents disponibles
- ✅ Créer des agents
- ✅ Mettre à jour des agents
- ✅ Exécuter des agents

### 👤 Profil Utilisateur
- ✅ Récupérer le profil utilisateur

## 🧪 Tester l'Installation

```bash
# Exécuter le script de test
npx tsx scripts/test-mcp-scrivia.ts
```

Le test vérifie :
- ✅ Configuration MCP pour un agent
- ✅ Construction des tools hybrides
- ✅ Injection du JWT dans les headers
- ✅ Format correct de l'Authorization header

## 🔐 Sécurité

### Avantages du JWT Dynamique

1. **Pas de stockage sensible** : Le JWT n'est jamais stocké en base de données
2. **Isolation utilisateur** : Chaque utilisateur utilise son propre JWT
3. **Révocation immédiate** : L'expiration du JWT bloque immédiatement l'accès
4. **Audit trail** : Tous les appels API sont tracés avec le JWT de l'utilisateur

### Pattern `{{USER_JWT}}`

Le pattern `{{USER_JWT}}` :
- Est remplacé automatiquement à chaque exécution
- Utilise le JWT de la session active de l'utilisateur
- Évite les problèmes d'expiration de token
- Supporte la révocation instantanée

## 📊 Monitoring

### Logs de Debug

Le système génère des logs détaillés :

```typescript
// JWT injecté avec succès
[McpConfigService] 🔑 JWT injecté pour serveur: scrivia-api

// Mode hybride activé
[McpConfigService] 🔀 Mode hybride: 30 OpenAPI (Scrivia) + 1 MCP (Factoria)

// Mode OpenAPI pur
[McpConfigService] 📦 Mode OpenAPI pur: 30 tools
```

### Vérifier les Liaisons

```bash
# Lister tous les agents avec leurs serveurs MCP
npx tsx scripts/link-scrivia-mcp-to-agent.ts list
```

```sql
-- Voir toutes les liaisons actives
SELECT 
  a.name as agent_name,
  m.name as mcp_server_name,
  ams.priority,
  ams.is_active
FROM agent_mcp_servers ams
JOIN agents a ON a.id = ams.agent_id
JOIN mcp_servers m ON m.id = ams.mcp_server_id
WHERE ams.is_active = true
ORDER BY a.name, ams.priority;
```

## 🔧 Troubleshooting

### Le serveur MCP n'est pas trouvé

```bash
# Vérifier que le serveur existe
SELECT * FROM mcp_servers WHERE name = 'Scrivia API';

# Si absent, recréer le serveur (voir documentation complète)
```

### L'agent n'utilise pas le serveur MCP

```bash
# Vérifier la liaison
SELECT * FROM agent_mcp_servers 
WHERE agent_id = 'VOTRE_AGENT_ID'
  AND is_active = true;

# Vérifier que l'agent est actif
SELECT id, name, is_active FROM agents 
WHERE id = 'VOTRE_AGENT_ID';
```

### Erreur d'authentification

- Vérifier que le JWT de l'utilisateur est valide et non expiré
- Vérifier que le serveur MCP a bien `api_key = '{{USER_JWT}}'`
- Vérifier les logs du serveur pour voir si le JWT est injecté

```typescript
// Activer les logs de debug
process.env.DEBUG = 'mcp:*';
```

## 📚 Documentation Complète

Pour plus de détails, consultez :

- **Documentation complète** : `/docs/implementation/MCP-SCRIVIA-JWT-DYNAMIC.md`
- **Architecture MCP** : `/docs/implementation/MCP-TOOLS-INTEGRATION.md`
- **API Scrivia v2** : `/docs/api/LISTE-ENDPOINTS-API-V2-COMPLETE.md`

## 🎯 Exemples d'Utilisation

### Exemple 1 : Agent de Recherche

Lier le serveur MCP Scrivia à un agent de recherche pour qu'il puisse créer des notes à partir de recherches web :

```bash
npx tsx scripts/link-scrivia-mcp-to-agent.ts link research-agent
```

L'agent pourra maintenant :
1. Faire des recherches web (via autre MCP comme Exa)
2. Créer des notes avec les résultats
3. Organiser les notes dans des classeurs
4. Ajouter des tags et descriptions

### Exemple 2 : Agent d'Organisation

Lier à un agent spécialisé dans l'organisation du contenu :

```bash
npx tsx scripts/link-scrivia-mcp-to-agent.ts link organizer-agent
```

L'agent pourra :
1. Analyser la structure des classeurs
2. Réorganiser les notes
3. Créer des dossiers thématiques
4. Générer des tables des matières

### Exemple 3 : Agent de Résumé

Lier à un agent qui crée des résumés :

```bash
npx tsx scripts/link-scrivia-mcp-to-agent.ts link summary-agent
```

L'agent pourra :
1. Lire plusieurs notes
2. Générer un résumé consolidé
3. Créer une nouvelle note avec le résumé
4. Lier automatiquement aux notes sources

## ✅ Checklist de Validation

Avant de considérer l'installation complète :

- [x] Serveur MCP Scrivia présent dans `mcp_servers`
- [ ] Au moins un agent lié au serveur MCP Scrivia
- [ ] Test d'exécution réussi (script de test)
- [ ] Logs de debug confirmant l'injection du JWT
- [ ] Premier appel API réussi via MCP

## 🎉 Félicitations !

Votre serveur MCP Scrivia est maintenant configuré et prêt à l'emploi avec injection automatique du JWT utilisateur !

Pour toute question ou problème, consultez la documentation complète ou vérifiez les logs de debug.

---

**Créé le** : 2025-10-11  
**Status** : ✅ Production Ready  
**Version** : 1.0.0

