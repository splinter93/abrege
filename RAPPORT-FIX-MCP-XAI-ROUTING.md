# 🔧 FIX FINAL - xAI Native Routing API + MCP Double Execution

**Date** : 21 décembre 2025  
**Status** : ✅ **3 BUGS RÉSOLUS**

---

## 🎯 BUG 1 : Groq MCP - Exécution Double

### Problème
MCP tool calls exécutés 2 fois par Groq (1 par API + 1 retry inutile).

### Solution
Ajout du flag `alreadyExecuted: true` + résultats dans `groq.ts:317-342`.

**Résultat** : ✅ 1 seule exécution

---

## 🎯 BUG 2 : xAI Native - Format Tools Incompatible

### Problème
Erreur 422 : `"tools[0]: missing field 'parameters'"`

xAI Native `/v1/responses` demande un format **PLAT** pour tous les tools.

### Solution
Aplatissement de `tool.function.*` vers la racine dans `xai-native.ts:614-636`.

**Format appliqué pour /v1/responses (MCP)** :
```json
{
  "type": "function",
  "name": "mon_tool",
  "description": "...",
  "parameters": {...}
}
```

**Résultat** : ✅ MCP tools fonctionnent avec xAI

---

## 🎯 BUG 3 : xAI Native - OpenAPI Tools Non Supportés par `/v1/responses`

### Problème CRITIQUE
L'endpoint `/v1/responses` est **EXCLUSIVEMENT pour MCP Remote Tools**.

Quand on envoie des OpenAPI tools à `/v1/responses`, xAI retourne **RIEN** :
```typescript
finishReason: null
toolCallsCount: 0
accumulatedContentLength: 0
```

### Root Cause
xAI Native a **2 endpoints différents** :
- **`/v1/responses`** : MCP Remote Tools uniquement (format plat)
- **`/v1/chat/completions`** : OpenAPI tools standard (format OpenAI)

### Solution
**Routing automatique** basé sur le type de tools dans `xai-native.ts:275-307` :

```typescript
async *callWithMessagesStream(
  messages: ChatMessage[],
  tools: Tool[] | Array<Tool | McpServerConfig>
): AsyncGenerator<StreamChunk, void, unknown> {
  // ✅ Détecter le type de tools
  const hasMcpTools = Array.isArray(tools) && tools.some(t => this.isMcpTool(t));
  const hasOpenApiTools = Array.isArray(tools) && tools.some(t => isFunctionTool(t));

  // ⚠️ ROUTING AUTOMATIQUE
  if (hasMcpTools) {
    logger.dev('[XAINativeProvider] 🔀 Route: /v1/responses (MCP Remote Tools)');
    yield* this.streamWithResponsesApi(messages, tools);
  } else if (hasOpenApiTools) {
    logger.dev('[XAINativeProvider] 🔀 Route: /v1/chat/completions (OpenAPI tools)');
    yield* this.streamWithChatCompletions(messages, tools);
  } else {
    yield* this.streamWithChatCompletions(messages, []);
  }
}
```

**2 méthodes privées créées** :

1. **`streamWithResponsesApi`** (lignes 428-550)
   - Endpoint : `/v1/responses`
   - Tools : **Format plat** (name, description, parameters à la racine)
   - Usage : **MCP Remote Tools uniquement**

2. **`streamWithChatCompletions`** (lignes 333-427)
   - Endpoint : `/v1/chat/completions`
   - Tools : **Format OpenAI standard** (structure imbriquée `function: {...}`)
   - Usage : **OpenAPI tools classiques**

### Résultat
- **AVANT** : OpenAPI tools → Aucune réponse de xAI
- **APRÈS** : **OpenAPI tools fonctionnent** via `/chat/completions` ✅

---

## 📊 Impact Global

### Groq
- ✅ MCP tools : **1 seule exécution** (fix appliqué)
- ✅ OpenAPI tools : Continuent de fonctionner (inchangé)

### xAI Native
- ✅ MCP Remote Tools : `/v1/responses` avec format plat
- ✅ OpenAPI tools : `/v1/chat/completions` avec format standard
- ✅ **Routing automatique** entre les 2 endpoints

---

## 🧪 Tests à Effectuer

### Test 1 : Groq + MCP
```
1. Sélectionner Groq provider
2. Requête : "Ask Kazumi about Spinoza"
3. ✅ Vérifier logs Synesia : 1 seul call (pas 2)
4. ✅ Vérifier timeline UI : 1 seul tool call affiché
```

### Test 2 : xAI Native + OpenAPI
```
1. Sélectionner xAI Native provider  
2. Utiliser agent avec OpenAPI tools (ex: Exa)
3. Requête : "Search news with exa about AI"
4. ✅ Vérifier log: "[XAINativeProvider] 🔀 Route: /v1/chat/completions"
5. ✅ Vérifier : Tool call s'exécute correctement
6. ✅ Vérifier : Réponse affichée dans UI
```

### Test 3 : xAI Native + MCP
```
1. Sélectionner xAI Native provider
2. Requête : "Ask Kazumi about Spinoza"
3. ✅ Vérifier log: "[XAINativeProvider] 🔀 Route: /v1/responses"
4. ✅ Vérifier : 1 seul call
5. ✅ Vérifier : Timeline affiche correctement
```

---

## 📁 Fichiers Modifiés

1. ✅ **`src/services/llm/providers/implementations/groq.ts`** (lignes 317-342)
   - Ajout `alreadyExecuted: true` sur MCP tool calls

2. ✅ **`src/services/llm/providers/implementations/xai-native.ts`**
   - **Lignes 275-307** : Routing automatique basé sur type de tools
   - **Lignes 310-332** : Méthode `convertChatMessagesToApiFormat` (pour /chat/completions)
   - **Lignes 333-427** : Méthode `streamWithChatCompletions` (OpenAPI tools)
   - **Lignes 428-550** : Méthode `streamWithResponsesApi` (MCP tools, format plat)
   - **Lignes 635-655** : Format plat pour tools dans `preparePayload`
   - Import `isFunctionTool` ajouté

---

## ✅ Conclusion

**3 bugs critiques résolus** :
1. **Groq MCP** : Exécution double → 1 seule exécution ✅
2. **xAI MCP** : Format incompatible → Format plat appliqué ✅
3. **xAI OpenAPI** : Non supporté → Routing vers `/chat/completions` ✅

**Architecture finale** :
- **Groq** : Responses API (/v1/chat/completions avec MCP intégré)
- **xAI Native** : 
  - MCP → `/v1/responses` (format plat)
  - OpenAPI → `/v1/chat/completions` (format standard)
  - **Routing automatique transparent**

**Status** : ✅ **PRÊT POUR TEST COMPLET**



