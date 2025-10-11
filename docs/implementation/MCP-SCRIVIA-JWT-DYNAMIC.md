# Serveur MCP Scrivia avec JWT Dynamique

**Date**: 2025-10-11  
**Statut**: ✅ Implémenté et testé

## 📋 Objectif

Ajouter le serveur MCP Scrivia à la configuration des agents avec injection dynamique du JWT de l'utilisateur authentifié pour l'authentification.

## 🎯 Architecture

### 1. Serveur MCP Scrivia

Le serveur MCP Scrivia a été ajouté dans la table `mcp_servers` avec la configuration suivante :

```sql
INSERT INTO mcp_servers (
  user_id,
  name,
  description,
  url,
  header,
  api_key,
  config,
  is_active
) VALUES (
  '8e7eea0b-9545-46fe-be3a-7a89f9261724',
  'Scrivia API',
  'API Scrivia pour accéder aux notes, classeurs, dossiers et agents - utilise le JWT de l''utilisateur authentifié',
  'https://factoria-nine.vercel.app/api/mcp/servers/c8d47664-01bf-44a5-a189-05842dd641f5',
  'Authorization',
  '{{USER_JWT}}',
  '{}',
  true
);
```

**Caractéristiques clés** :
- **URL** : `https://factoria-nine.vercel.app/api/mcp/servers/c8d47664-01bf-44a5-a189-05842dd641f5`
- **Header** : `Authorization` (standard pour les JWT)
- **API Key** : `{{USER_JWT}}` (placeholder qui sera remplacé dynamiquement)
- **Config** : `{}` (configuration vide par défaut)

### 2. Injection Dynamique du JWT

Le service `McpConfigService` a été modifié pour gérer l'injection dynamique du JWT :

**Fichier** : `src/services/llm/mcpConfigService.ts`

```typescript
async buildHybridTools(
  agentId: string,
  userToken: string, // ✅ Renommé de userId à userToken pour clarté
  openApiTools: Array<{ type: 'function'; function: { name: string; description: string; parameters: any } }>
): Promise<Array<
  | { type: 'function'; function: { name: string; description: string; parameters: any } }
  | McpServerConfig
>> {
  const mcpConfig = await this.getAgentMcpConfig(agentId);
  
  if (!mcpConfig || !mcpConfig.enabled || mcpConfig.servers.length === 0) {
    return openApiTools;
  }

  // ✅ Injecter le JWT de l'utilisateur dans les serveurs qui utilisent {{USER_JWT}}
  const mcpServers = mcpConfig.servers.map(server => {
    if (server.headers) {
      const processedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(server.headers)) {
        // Remplacer {{USER_JWT}} par le vrai JWT de l'utilisateur
        if (value === '{{USER_JWT}}' && userToken) {
          processedHeaders[key] = `Bearer ${userToken}`;
          logger.dev(`[McpConfigService] 🔑 JWT injecté pour serveur: ${server.server_label}`);
        } else {
          processedHeaders[key] = value;
        }
      }
      return {
        ...server,
        headers: processedHeaders
      };
    }
    return server;
  });
  
  return [...openApiTools, ...mcpServers];
}
```

### 3. Flux d'Authentification

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Requête Chat/Agent avec JWT utilisateur                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Orchestrator récupère context.userToken (JWT)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. buildHybridTools(agentId, userToken, openApiTools)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Pour chaque serveur MCP:                                     │
│    - Si api_key = "{{USER_JWT}}"                               │
│    - Remplacer par "Bearer {userToken}"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Groq reçoit les serveurs MCP avec JWT réel injecté          │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Sécurité

### Avantages du Système JWT Dynamique

1. **Pas de stockage de JWT en DB** : Le JWT n'est jamais stocké en clair dans la base de données
2. **JWT toujours à jour** : Utilise le JWT actuel de la session utilisateur
3. **Isolation des utilisateurs** : Chaque utilisateur utilise son propre JWT
4. **Révocation immédiate** : Si le JWT expire ou est révoqué, l'accès est immédiatement bloqué

### Pattern `{{USER_JWT}}`

Le pattern `{{USER_JWT}}` permet de :
- Identifier clairement qu'un serveur MCP nécessite le JWT de l'utilisateur
- Éviter de stocker des credentials sensibles en base de données
- Supporter d'autres patterns similaires à l'avenir (ex: `{{USER_API_KEY}}`)

## 📊 Utilisation

### Lier le Serveur MCP Scrivia à un Agent

```sql
-- Récupérer l'ID du serveur MCP Scrivia
SELECT id, name FROM mcp_servers WHERE name = 'Scrivia API';

-- Lier à un agent (remplacer {agent_id} et {mcp_server_id})
INSERT INTO agent_mcp_servers (
  agent_id,
  mcp_server_id,
  priority,
  is_active
) VALUES (
  '{agent_id}',
  '{mcp_server_id}', -- ID du serveur Scrivia API
  0, -- Priorité haute
  true
);
```

### Vérifier la Configuration

```typescript
import { mcpConfigService } from '@/services/llm/mcpConfigService';

const agentId = 'votre-agent-id';
const userToken = 'jwt-de-l-utilisateur';
const openApiTools = await getOpenAPIV2Tools();

const hybridTools = await mcpConfigService.buildHybridTools(
  agentId,
  userToken,
  openApiTools
);

// Vérifier les serveurs MCP
const mcpServers = hybridTools.filter(t => t.type === 'mcp');
console.log('Serveurs MCP:', mcpServers);
```

## 🧪 Tests

Un script de test a été créé pour vérifier l'injection du JWT :

**Fichier** : `scripts/test-mcp-scrivia.ts`

```bash
# Exécuter le test
npx tsx scripts/test-mcp-scrivia.ts
```

Le test vérifie :
- ✅ La récupération de la configuration MCP pour un agent
- ✅ La construction des tools hybrides (OpenAPI + MCP)
- ✅ L'injection du JWT dans les headers du serveur Scrivia
- ✅ Le format correct du header Authorization : `Bearer {JWT}`

## 📝 Logs de Débogage

Le système log les événements suivants :

```typescript
// Quand le JWT est injecté
[McpConfigService] 🔑 JWT injecté pour serveur: scrivia-api

// Mode hybride activé
[McpConfigService] 🔀 Mode hybride: 30 OpenAPI (Scrivia) + 1 MCP (Factoria)

// Mode OpenAPI pur (pas de MCP)
[McpConfigService] 📦 Mode OpenAPI pur: 30 tools
```

## 🔄 Compatibilité

### Serveurs MCP avec Clés API Fixes

Les serveurs MCP existants (Exa, ClickUp, Tavily, etc.) continuent de fonctionner normalement avec leurs clés API fixes stockées en base de données.

### Serveurs MCP avec JWT Dynamique

Le pattern `{{USER_JWT}}` est traité spécialement et remplacé au moment de l'exécution. Cela permet de supporter :

1. **API Scrivia** : Utilise le JWT de l'utilisateur pour accéder à ses propres données
2. **Futurs services OAuth** : Peut être étendu à d'autres patterns comme `{{USER_OAUTH_TOKEN}}`

## 🎯 Prochaines Étapes

### Extensions Possibles

1. **Support d'autres patterns** :
   - `{{USER_API_KEY}}` : Pour injecter une API key spécifique de l'utilisateur
   - `{{OAUTH_TOKEN}}` : Pour les services OAuth
   - `{{SERVICE_KEY}}` : Pour des clés de service partagées

2. **Cache de JWT** :
   - Mettre en cache le JWT décodé pour éviter la validation répétée
   - Invalider le cache à l'expiration du JWT

3. **Monitoring** :
   - Tracer les appels aux serveurs MCP avec JWT injecté
   - Alertes en cas d'échec d'authentification

## ✅ Checklist de Validation

- [x] Serveur MCP Scrivia ajouté dans la table `mcp_servers`
- [x] Configuration avec `{{USER_JWT}}` comme api_key
- [x] Modification de `mcpConfigService.ts` pour injection dynamique
- [x] Paramètre renommé de `userId` à `userToken` pour clarté
- [x] Logs de débogage ajoutés
- [x] Script de test créé
- [x] Documentation complète
- [x] Aucune erreur de linting

## 📚 Références

- **Spec MCP Groq** : https://console.groq.com/docs/mcp
- **Architecture MCP** : `/docs/implementation/MCP-TOOLS-INTEGRATION.md`
- **Service MCP** : `/src/services/llm/mcpConfigService.ts`
- **Types MCP** : `/src/types/mcp.ts`

---

**Implémenté par** : Assistant AI  
**Validé le** : 2025-10-11  
**Status** : ✅ Production Ready

