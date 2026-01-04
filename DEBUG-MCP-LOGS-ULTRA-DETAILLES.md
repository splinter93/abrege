# 🔥 DEBUG MCP - LOGS ULTRA DÉTAILLÉS

**Date:** 19 décembre 2025  
**Statut:** ✅ LOGS AJOUTÉS - PRÊT POUR TEST  
**Objectif:** Identifier EXACTEMENT pourquoi les tools MCP ne sont pas visibles par le modèle

---

## 🎯 PROBLÈME

L'agent Groq (GPT-OSS-20B) avec MCP configuré **ne voit aucun outil MCP**.

---

## ✅ LOGS AJOUTÉS

### 1. **AgentOrchestrator - Détails de l'agent**

**Fichier:** `src/services/llm/services/AgentOrchestrator.ts`

**Log:**
```typescript
logger.info(`[AgentOrchestrator] 🔍 DEBUG MCP - Agent details:`, {
  agentId: agentConfig?.id,
  agentSlug: agentConfig?.slug,
  agentName: agentConfig?.name,
  hasId: !!agentConfig?.id,
  idType: typeof agentConfig?.id,
  idValue: agentConfig?.id
});
```

**Ce qu'on vérifie:**
- ✅ L'agent a-t-il un ID valide ?
- ✅ L'ID est-il du bon type (string UUID) ?

---

### 2. **AgentOrchestrator - Appel buildHybridTools**

**Fichier:** `src/services/llm/services/AgentOrchestrator.ts`

**Log:**
```typescript
logger.info(`[AgentOrchestrator] 🔍 DEBUG MCP - Appel buildHybridTools avec:`, {
  agentId: agentConfig?.id || 'default',
  userToken: context.userToken ? `${context.userToken.substring(0, 20)}...` : 'none',
  openApiToolsCount: openApiTools.length
});
```

**Ce qu'on vérifie:**
- ✅ Quel `agentId` est passé à `buildHybridTools()` ?
- ✅ Si c'est `"default"`, l'ID ne passe pas correctement

---

### 3. **McpConfigService - Recherche serveurs MCP**

**Fichier:** `src/services/llm/mcpConfigService.ts`

**Log:**
```typescript
logger.info(`[McpConfigService] 🔍 Recherche serveurs MCP pour agent: ${agentId}`);
logger.info(`[McpConfigService] 🔍 Résultat requête: ${links?.length || 0} liens trouvés`);
```

**Ce qu'on vérifie:**
- ✅ L'`agentId` arrive-t-il correctement dans `getAgentMcpConfig()` ?
- ✅ Combien de serveurs MCP sont trouvés dans la DB ?

---

### 4. **GroqProvider - Tools AVANT appel API**

**Fichier:** `src/services/llm/providers/implementations/groq.ts`

**Log:**
```typescript
logger.info(`[GroqProvider] 🔥 PAYLOAD TOOLS AVANT APPEL API:`, {
  totalTools: tools.length,
  hasMcpTools,
  mcpCount: tools.filter((t) => isMcpTool(t)).length,
  functionCount: tools.filter((t) => isFunctionTool(t)).length,
  toolsDetails: tools.map((t, idx) => ({
    index: idx,
    type: (t as any).type,
    isMcp: isMcpTool(t),
    isFunction: isFunctionTool(t),
    ...(isMcpTool(t) ? {
      server_label: (t as McpTool).server_label,
      server_url: (t as McpTool).server_url,
      hasHeaders: !!(t as McpTool).headers
    } : {
      functionName: (t as any).function?.name
    })
  }))
});
```

**Ce qu'on vérifie:**
- ✅ Combien de tools au total ?
- ✅ Combien de tools MCP détectés ?
- ✅ Détails de CHAQUE tool (type, label, URL)

---

### 5. **GroqProvider - Payload Chat Completions**

**Fichier:** `src/services/llm/providers/implementations/groq.ts`

**Log:**
```typescript
logger.info(`[GroqProvider] 🔥 PAYLOAD COMPLET ENVOYÉ À GROQ:`, {
  model: payload.model,
  messagesCount: (payload.messages as any[])?.length,
  toolsCount: (payload.tools as any[])?.length,
  hasTools: !!(payload.tools as any[])?.length,
  tool_choice: payload.tool_choice,
  toolsPayload: payload.tools
});
```

**Ce qu'on vérifie:**
- ✅ Les tools sont-ils présents dans le payload final ?
- ✅ Le `tool_choice` est-il défini (devrait être `"auto"`) ?
- ✅ Le payload `tools` complet

---

### 6. **GroqProvider - Payload Responses API (MCP)**

**Fichier:** `src/services/llm/providers/implementations/groq.ts`

**Log:**
```typescript
logger.info('[GroqProvider] 🔥 PAYLOAD RESPONSES API COMPLET:', {
  model: payload.model,
  toolsCount: tools.length,
  mcpTools: tools.filter((t) => isMcpTool(t)).map((t) => ({
    type: (t as McpTool).type,
    label: (t as McpTool).server_label,
    url: (t as McpTool).server_url,
    hasHeaders: !!(t as McpTool).headers
  })),
  fullToolsPayload: JSON.stringify(tools, null, 2)
});
```

**Ce qu'on vérifie:**
- ✅ Les MCP tools sont-ils dans le payload Responses API ?
- ✅ Le format est-il correct (type: "mcp", server_label, server_url) ?
- ✅ Le payload complet JSON

---

## 🧪 TEST À FAIRE MAINTENANT

### Endpoint

```bash
POST /agents/{slug}/execute
```

### Payload

```json
{
  "input": {
    "query": "Liste tous les outils disponibles"
  }
}
```

### Commande cURL

```bash
curl -X POST "https://api.abrege.co/agents/josselin/execute" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "query": "Quels outils as-tu à disposition ?"
    }
  }'
```

---

## 📊 ANALYSE DES LOGS ATTENDUS

### Scénario 1: Agent ID ne passe pas

**Logs:**
```
[AgentOrchestrator] 🔍 DEBUG MCP - Agent details: {
  agentId: undefined,
  agentSlug: "josselin",
  hasId: false
}

[AgentOrchestrator] 🔍 DEBUG MCP - Appel buildHybridTools avec: {
  agentId: "default"
}

[McpConfigService] 🔍 Recherche serveurs MCP pour agent: default
[McpConfigService] 🔍 Résultat requête: 0 liens trouvés
```

**Diagnostic:** L'agent.id ne passe pas de `SpecializedAgentManager` à `AgentOrchestrator`

**Solution:** Vérifier `agentConfigWithTools` dans `executeNormalMode()`

---

### Scénario 2: DB ne retourne rien

**Logs:**
```
[AgentOrchestrator] 🔍 DEBUG MCP - Agent details: {
  agentId: "948b4187-31e0-4070-a0aa-2fa7350e034c",
  hasId: true
}

[McpConfigService] 🔍 Recherche serveurs MCP pour agent: 948b4187-...
[McpConfigService] 🔍 Résultat requête: 0 liens trouvés
```

**Diagnostic:** La requête DB ne trouve aucun lien `agent_mcp_servers`

**Solution:** Vérifier que `is_active = true` sur les deux tables, ou que le lien existe bien

---

### Scénario 3: Tools MCP non détectés

**Logs:**
```
[McpConfigService] 🔍 Résultat requête: 1 liens trouvés

[GroqProvider] 🔥 PAYLOAD TOOLS AVANT APPEL API: {
  totalTools: 15,
  mcpCount: 0,
  functionCount: 15
}
```

**Diagnostic:** Les serveurs MCP ne sont PAS convertis en format `McpTool`

**Solution:** Vérifier la logique de conversion dans `McpConfigService.getAgentMcpConfig()`

---

### Scénario 4: Tools MCP présents mais pas envoyés à Groq

**Logs:**
```
[GroqProvider] 🔥 PAYLOAD TOOLS AVANT APPEL API: {
  totalTools: 16,
  mcpCount: 1
}

[GroqProvider] 🔥 PAYLOAD RESPONSES API COMPLET: {
  toolsCount: 0  ❌
}
```

**Diagnostic:** Les tools MCP sont perdus entre `callWithMessages()` et `callWithResponsesApi()`

**Solution:** Vérifier que `tools` est bien passé en paramètre

---

### Scénario 5: Groq API rejette le payload

**Logs:**
```
[GroqProvider] 🔥 PAYLOAD RESPONSES API COMPLET: {
  toolsCount: 1,
  fullToolsPayload: "[{\"type\":\"mcp\",\"server_label\":\"synesia\",\"server_url\":\"https://...\"}]"
}

[GroqProvider] ❌ Erreur Responses API: {
  status: 400,
  error: "Invalid tools format"
}
```

**Diagnostic:** Le format des tools MCP est incorrect

**Solution:** Vérifier la structure `McpServerConfig` vs spéc Groq

---

## 🎯 RÉSUMÉ

**Fichiers modifiés:**
1. ✅ `src/services/llm/services/AgentOrchestrator.ts` - 2 logs détaillés
2. ✅ `src/services/llm/mcpConfigService.ts` - 2 logs détaillés
3. ✅ `src/services/llm/providers/implementations/groq.ts` - 3 logs ultra détaillés

**Prochaine étape:**
1. Exécuter l'agent avec MCP
2. Lire les logs dans le terminal
3. Identifier le scénario qui correspond
4. Appliquer la solution

**Temps estimé:** 5-10 minutes pour identifier le problème exact

---

**Version:** 1.0  
**Auteur:** Jean-Claude (AI)  
**Status:** PRÊT POUR DEBUG 🔥















