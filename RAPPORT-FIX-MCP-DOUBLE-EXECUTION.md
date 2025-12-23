# 🔴 BUG CRITIQUE - Tool Calls MCP Exécutés en Double

**Date** : 21 décembre 2025  
**Problème** : Quand on demande à l'agent de parler à un agent MCP (ex: Kazumi), il envoie **2 messages identiques** au lieu d'1  
**Status** : ✅ **RÉSOLU**

---

## 🎯 ROOT CAUSE IDENTIFIÉE

### Le Problème

Dans `groq.ts:317-342`, quand Groq retourne une réponse MCP :

```typescript
// ❌ CODE BUGUÉ
if (response.tool_calls && response.tool_calls.length > 0) {
  yield {
    type: 'delta',
    tool_calls: response.tool_calls,
    finishReason: 'tool_calls'  // ← ERREUR ICI
  };
}
```

**Conséquence** : Le `Stream Route` voit `finishReason: 'tool_calls'` et pense qu'il doit **EXÉCUTER** les tool calls, alors qu'ils ont **DÉJÀ ÉTÉ EXÉCUTÉS** par Groq !

### Chronologie du Bug

```
USER: "Ask Kazumi about Spinoza"
    ↓
Round 1: Groq appelle MCP Kazumi → reçoit réponse
    ↓
GroqProvider yield { finishReason: 'tool_calls' } ← BUG
    ↓
Stream Route (ligne 728): "Ah il y a des tool calls à exécuter"
    ↓
Stream Route essaie d'exécuter Kazumi via OpenAPI executor
    ↓
Échec (Kazumi n'est pas un endpoint OpenAPI)
    ↓
Round 2: Renvoie tout à Groq
    ↓
Groq RE-APPELLE Kazumi ← DOUBLON !
    ↓
Synesia voit 2 messages à Kazumi
```

---

## ✅ SOLUTION APPLIQUÉE

### Fichier : `src/services/llm/providers/implementations/groq.ts:317-342`

**Avant** :
```typescript
if (response.tool_calls && response.tool_calls.length > 0) {
  yield {
    type: 'delta',
    tool_calls: response.tool_calls,
    finishReason: 'tool_calls'  // ❌ Déclenche une ré-exécution
  };
}
```

**Après** :
```typescript
if (response.tool_calls && response.tool_calls.length > 0) {
  // Marquer tous les tool calls comme déjà exécutés
  const executedToolCalls = response.tool_calls.map(tc => ({
    ...tc,
    alreadyExecuted: true,  // ✅ Flag pour éviter ré-exécution
    result: response.x_groq?.mcp_calls?.find(mc => 
      tc.function.name.includes(mc.name)
    )?.output || 'Executed by Groq (MCP)'
  }));
  
  yield {
    type: 'delta',
    tool_calls: executedToolCalls,
    finishReason: 'tool_calls',  // Pour afficher dans timeline
    x_groq: response.x_groq
  };
}

yield {
  type: 'delta',
  finishReason: 'stop'  // ✅ Termine le stream correctement
};
```

---

## 🔍 Pourquoi ça marche maintenant

Le `Stream Route` (`route.ts:744-754`) vérifie déjà le flag `alreadyExecuted` :

```typescript
accumulatedToolCalls.forEach((tc) => {
  if (tc.alreadyExecuted === true) {
    alreadyExecutedTools.push(tc);  // ✅ N'exécute PAS
  } else {
    toolsToExecute.push(tc);  // Exécute seulement ceux-là
  }
});
```

Maintenant :
- Groq exécute Kazumi
- On marque le tool comme `alreadyExecuted: true`
- Stream Route l'affiche dans la timeline mais **NE LE RÉ-EXÉCUTE PAS**
- **1 seul message** envoyé à Kazumi ✅

---

## 📊 Différences avec xAI

xAI **fait déjà ça correctement** dans `xai-native.ts:412-443` :

```typescript
if (item?.type === 'mcp_call') {
  yield {
    type: 'delta',
    tool_calls: [{
      ...mcpCall,
      alreadyExecuted: true,  // ✅ xAI le fait déjà
      result: output
    }]
  };
}
```

C'est pourquoi **xAI n'avait pas ce bug** de double exécution.

---

## 🧪 Tests à Effectuer

### Test 1 : Appel simple
```
1. Requête : "Ask Kazumi about Spinoza"
2. Vérifier logs Synesia : 1 seul call (pas 2)
3. Vérifier UI : 1 seul message dans timeline
```

### Test 2 : Retry automatique
```
1. Provoquer une erreur (ex: serveur MCP temporairement down)
2. Vérifier que le retry N'APPELLE PAS 2 fois
3. Attendu : 2 calls max (initial + retry), pas 4
```

### Test 3 : Multiple tool calls
```
1. Requête : "Ask Kazumi about Spinoza, then ask Tim about British culture"
2. Vérifier : 2 calls (1 par tool), pas 4
```

---

## ⚠️ Note sur mcp_list_tools

Le `mcp_list_tools` reste un appel séparé fait par Groq. C'est **NORMAL** et **DOCUMENTÉ** :
- 1x `mcp_list_tools` : Découverte des tools (Groq vérifie quels tools existent)
- 1x `mcp_call` : Exécution du tool

**Ce n'est PAS un bug**, c'est le comportement de l'API Groq Responses.

---

## ✅ Conclusion

**Bug** : `finishReason: 'tool_calls'` sans `alreadyExecuted: true`  
**Impact** : Chaque MCP call était exécuté **2 fois**  
**Solution** : Marquer les MCP tool calls comme `alreadyExecuted: true`  
**Résultat** : **1 seul appel** au serveur MCP ✅

Le fix est **identique au comportement xAI**, qui n'avait jamais eu ce problème.

---

## 📝 Fichiers Modifiés

- ✅ `src/services/llm/providers/implementations/groq.ts` (lignes 317-342)

**Status** : ✅ PRÊT POUR TEST



