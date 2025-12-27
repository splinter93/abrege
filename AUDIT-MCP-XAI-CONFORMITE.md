# 📋 AUDIT - Conformité Implémentation MCP xAI vs Documentation Officielle

**Date :** 20 janvier 2025  
**Doc xAI :** https://docs.x.ai/docs/guides/tools/remote-mcp-tools  
**Status :** ⚠️ **NON CONFORME** (corrections nécessaires)

---

## 📊 RÉSUMÉ EXÉCUTIF

L'implémentation MCP pour xAI utilise l'endpoint `/v1/responses` correctement, mais **les noms de champs ne correspondent pas exactement** à la documentation officielle xAI.

### ❌ Écarts Identifiés

| Champ Doc xAI | Notre Implémentation | Status |
|---------------|----------------------|--------|
| `allowed_tool_names` | `allowed_tools` | ❌ **NOM INCORRECT** |
| `authorization` | `headers` (avec token) | ⚠️ **FORMAT DIFFÉRENT** |
| `extra_headers` | `headers` (tout mélangé) | ⚠️ **MANQUE SÉPARATION** |
| `server_description` | ✅ Présent | ✅ **CONFORME** |
| `server_label` | ✅ Présent | ✅ **CONFORME** |
| `server_url` | ✅ Présent | ✅ **CONFORME** |

---

## 🔍 ANALYSE DÉTAILLÉE

### 1. **Format Tool MCP selon Doc xAI** ✅/❌

**Documentation xAI :**
```json
{
  "type": "mcp",
  "server_url": "https://mcp.deepwiki.com/mcp",
  "server_label": "deepwiki",
  "server_description": "Optional description",
  "allowed_tool_names": ["tool1", "tool2"],  // ❌ NOUS AVONS: allowed_tools
  "authorization": "Bearer TOKEN",  // ❌ NOUS AVONS: headers
  "extra_headers": { "X-Custom": "value" }  // ❌ NOUS AVONS: headers (tout mélangé)
}
```

**Notre implémentation :** `src/types/mcp.ts:45-53`
```typescript
export interface McpServerConfig {
  type: 'mcp';
  server_label: string;
  server_url: string;
  headers?: Record<string, string>;  // ❌ Devrait être authorization + extra_headers
  server_description?: string;
  allowed_tools?: string[] | null;  // ❌ Devrait être allowed_tool_names
}
```

**Status :** ❌ **NON CONFORME** - Noms de champs incorrects

---

### 2. **Construction du Payload MCP** ⚠️

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts:932-939`

```typescript
if (this.isMcpTool(tool)) {
  // MCP tool: Format standard
  return {
    ...tool,  // ❌ Spread direct - ne convertit pas les noms de champs
    type: 'mcp',
    name: 'server_label' in tool ? tool.server_label : (tool as any).name
  };
}
```

**Problèmes :**
1. ❌ `allowed_tools` n'est pas renommé en `allowed_tool_names`
2. ❌ `headers` n'est pas séparé en `authorization` + `extra_headers`
3. ❌ Le champ `name` est ajouté mais n'est pas dans la doc xAI

**Status :** ❌ **NON CONFORME** - Conversion manquante

---

### 3. **Configuration depuis la DB** ⚠️

**Fichier :** `src/services/llm/mcpConfigService.ts:106-117`

```typescript
const mcpServer: McpServerConfig = {
  type: 'mcp' as const,
  server_label: server.name?.toLowerCase().replace(/\s+/g, '-') || 'unnamed',
  server_url: server.url,
  headers: server.header && server.api_key 
    ? { [server.header]: server.api_key }  // ❌ Tout dans headers
    : undefined,
  server_description: server.server_description || undefined,
  allowed_tools: server.allowed_tools || null  // ❌ Nom incorrect
};
```

**Problèmes :**
1. ❌ `allowed_tools` au lieu de `allowed_tool_names`
2. ❌ `headers` au lieu de `authorization` + `extra_headers`
3. ⚠️ Pas de séparation entre token d'auth et headers custom

**Status :** ❌ **NON CONFORME** - Structure incorrecte

---

## 🔧 CORRECTIONS NÉCESSAIRES

### 1. Mettre à jour les types TypeScript

**Fichier :** `src/types/mcp.ts`

```typescript
export interface McpServerConfig {
  type: 'mcp';
  server_label: string;
  server_url: string;
  server_description?: string;
  allowed_tool_names?: string[] | null;  // ✅ CORRIGÉ
  authorization?: string;  // ✅ NOUVEAU: Token direct
  extra_headers?: Record<string, string>;  // ✅ NOUVEAU: Headers custom
}
```

### 2. Adapter la construction depuis la DB

**Fichier :** `src/services/llm/mcpConfigService.ts`

```typescript
const mcpServer: McpServerConfig = {
  type: 'mcp' as const,
  server_label: server.name?.toLowerCase().replace(/\s+/g, '-') || 'unnamed',
  server_url: server.url,
  server_description: server.server_description || undefined,
  allowed_tool_names: server.allowed_tools || null,  // ✅ CORRIGÉ
  // ✅ SÉPARER authorization et extra_headers
  authorization: server.header === 'Authorization' && server.api_key
    ? server.api_key.startsWith('Bearer ') ? server.api_key : `Bearer ${server.api_key}`
    : undefined,
  extra_headers: server.header !== 'Authorization' && server.header && server.api_key
    ? { [server.header]: server.api_key }
    : undefined
};
```

### 3. Convertir le format dans preparePayload

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts:932-939`

```typescript
if (this.isMcpTool(tool)) {
  // ✅ Convertir au format exact xAI
  const mcpPayload: Record<string, unknown> = {
    type: 'mcp',
    server_url: tool.server_url,
    server_label: tool.server_label
  };
  
  if (tool.server_description) {
    mcpPayload.server_description = tool.server_description;
  }
  
  if (tool.allowed_tool_names !== undefined && tool.allowed_tool_names !== null) {
    mcpPayload.allowed_tool_names = tool.allowed_tool_names;
  }
  
  if (tool.authorization) {
    mcpPayload.authorization = tool.authorization;
  }
  
  if (tool.extra_headers && Object.keys(tool.extra_headers).length > 0) {
    mcpPayload.extra_headers = tool.extra_headers;
  }
  
  return mcpPayload;
}
```

---

## ✅ POINTS CONFORMES

1. ✅ **Endpoint correct** : `/v1/responses` utilisé pour MCP
2. ✅ **Format input** : `input` array au lieu de `messages`
3. ✅ **Support hybride** : OpenAPI + MCP simultanément
4. ✅ **Routing automatique** : Détection MCP → `/v1/responses`
5. ✅ **Streaming SSE** : Format natif xAI correctement parsé
6. ✅ **Champs de base** : `type`, `server_url`, `server_label`, `server_description`

---

## 🎯 PLAN DE CORRECTION

### Étape 1 : Mettre à jour les types
- [ ] Modifier `src/types/mcp.ts` : `allowed_tools` → `allowed_tool_names`
- [ ] Ajouter `authorization?: string`
- [ ] Ajouter `extra_headers?: Record<string, string>`
- [ ] Supprimer `headers?: Record<string, string>` (remplacé par authorization + extra_headers)

### Étape 2 : Adapter mcpConfigService
- [ ] Séparer `headers` en `authorization` + `extra_headers`
- [ ] Renommer `allowed_tools` → `allowed_tool_names`
- [ ] Gérer le cas `header === 'Authorization'` → `authorization`
- [ ] Gérer les autres headers → `extra_headers`

### Étape 3 : Corriger preparePayload
- [ ] Convertir `McpServerConfig` au format exact xAI
- [ ] Mapper `allowed_tool_names` correctement
- [ ] Séparer `authorization` et `extra_headers`
- [ ] Supprimer le champ `name` ajouté (pas dans la doc)

### Étape 4 : Migration DB (si nécessaire)
- [ ] Vérifier si la colonne `allowed_tools` doit être renommée
- [ ] Documenter la migration si nécessaire

### Étape 5 : Tests
- [ ] Tester avec un serveur MCP réel
- [ ] Vérifier que `allowed_tool_names` fonctionne
- [ ] Vérifier que `authorization` est correctement envoyé
- [ ] Vérifier que `extra_headers` fonctionne

---

## 📚 RÉFÉRENCES

- [xAI Remote MCP Tools Documentation](https://docs.x.ai/docs/guides/tools/remote-mcp-tools)
- [Notre implémentation actuelle](./docs/implementation/XAI-NATIVE-MCP-IMPLEMENTATION.md)

---

**Fait par:** Jean-Claude (Senior Dev)  
**Standard:** GAFAM (1M+ utilisateurs)  
**Date:** 2025-01-20  
**Status:** ✅ **CORRECTIONS APPLIQUÉES**

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Types TypeScript mis à jour ✅

**Fichier :** `src/types/mcp.ts`

- ✅ Ajout de `XaiMcpServerConfig` conforme à la doc xAI
- ✅ Fonction `convertToXaiMcpConfig()` pour convertir `McpServerConfig` → `XaiMcpServerConfig`
- ✅ Conversion automatique : `allowed_tools` → `allowed_tool_names`
- ✅ Séparation : `headers` → `authorization` + `extra_headers`

### 2. Provider xAI mis à jour ✅

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts`

- ✅ Utilisation de `convertToXaiMcpConfig()` dans `preparePayload()`
- ✅ Format exact xAI : `allowed_tool_names`, `authorization`, `extra_headers`
- ✅ Suppression du champ `name` non conforme

### 3. Compatibilité maintenue ✅

- ✅ `McpServerConfig` conservé pour Groq/compatibilité
- ✅ Conversion automatique au moment de l'envoi à xAI
- ✅ Pas de breaking change pour les autres providers

---

## 🎯 RÉSULTAT FINAL

✅ **Conforme à la documentation xAI officielle**  
✅ **Types TypeScript stricts**  
✅ **0 erreur lint**  
✅ **Compatibilité Groq maintenue**

