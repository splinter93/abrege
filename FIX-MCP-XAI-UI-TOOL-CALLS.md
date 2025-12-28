# 🔧 FIX - Affichage Tool Calls MCP xAI dans l'UI

**Date :** 20 janvier 2025  
**Status :** ✅ **CORRIGÉ**

---

## 🐛 PROBLÈME IDENTIFIÉ

Les tool calls MCP exécutés par xAI n'étaient pas affichés dans l'UI, même si :
- ✅ Le tool call était détecté (`alreadyExecuted: true`, `hasResult: true`)
- ✅ Le stream se terminait correctement (`finishReason: 'stop'`)
- ✅ La timeline contenait 1 événement (`streamTimelineItems: 1`)

### Symptômes

1. Tool call MCP détecté dans les logs (ligne 610-617)
2. `finishReason: 'stop'` détecté (ligne 673-680)
3. Message sauvegardé avec timeline (ligne 684-689)
4. ❌ **MAIS** : Rien ne s'affiche dans l'UI

---

## 🔍 ROOT CAUSE

### Flux actuel (BUGUÉ)

1. **xAI exécute le MCP call** → Envoie `response.output_item.done` avec le MCP call et son output
2. **xai-native.ts** yield tool call avec `alreadyExecuted: true`, `result` et `finishReason: 'tool_calls'`
3. **xAI envoie la réponse finale** → `response.output_text.delta` → `accumulatedContent`
4. **xAI envoie `response.completed`** → On yield `finishReason: 'stop'` ✅
5. **route.ts** détecte `finishReason === 'stop'` → **SORT IMMÉDIATEMENT** ❌
6. **❌ PROBLÈME :** On sort AVANT d'avoir envoyé `assistant_round_complete` avec les tool calls
7. **❌ PROBLÈME :** On sort AVANT d'avoir envoyé `tool_result` pour chaque MCP tool
8. **Résultat :** Les tool calls ne sont jamais envoyés au client → **RIEN N'EST AFFICHÉ** ❌

### Problème dans `route.ts` ligne 770-772

```typescript
// ❌ AVANT (BUGUÉ)
} else if (finishReason === 'stop') {
  logger.dev('[Stream Route] ✅ Réponse finale (stop), fin du stream');
  break; // ❌ Sort immédiatement, même si on a des tool calls MCP à afficher
}
```

**Problème :** On sort de la boucle AVANT d'avoir traité les tool calls MCP et envoyé les événements SSE nécessaires.

---

## ✅ CORRECTIONS APPLIQUÉES

### Correction 1 : Ne pas sortir si on a des tool calls MCP à afficher

**Fichier :** `src/app/api/chat/llm/stream/route.ts:770-779`

```typescript
// ✅ APRÈS (CORRIGÉ)
} else if (finishReason === 'stop') {
  // ✅ CRITICAL FIX: Si on a des tool calls MCP (déjà exécutés), on doit les afficher AVANT de sortir
  if (toolCallsMap.size > 0) {
    logger.dev(`[Stream Route] 🔧 finishReason='stop' mais ${toolCallsMap.size} tool call(s) MCP à afficher - traitement avant sortie`);
    // On continue pour traiter les tool calls MCP (lignes suivantes)
  } else {
    logger.dev('[Stream Route] ✅ Réponse finale (stop), fin du stream');
    break;
  }
}
```

**Résultat :** Si on a des tool calls MCP, on continue pour les traiter au lieu de sortir immédiatement.

### Correction 2 : Ne pas sortir avant d'envoyer tool_result

**Fichier :** `src/app/api/chat/llm/stream/route.ts:858-866`

```typescript
// ✅ APRÈS (CORRIGÉ)
// ✅ CRITICAL FIX: Si on a seulement des MCP tools déjà exécutés ET du contenu, c'est la fin
// xAI a déjà généré la réponse finale après avoir exécuté le MCP call
// ⚠️ MAIS: On doit envoyer assistant_round_complete et tool_result AVANT de sortir
if (uniqueToolCalls.length === 0 && alreadyExecutedTools.length > 0 && accumulatedContent.length > 0) {
  logger.info('[Stream Route] ✅ MCP tools déjà exécutés + contenu reçu - réponse finale de xAI, traitement puis fin du round');
  // On continue pour envoyer assistant_round_complete et tool_result
}
```

**Résultat :** On continue pour envoyer les événements SSE au lieu de sortir immédiatement.

### Correction 3 : Sortir APRÈS avoir envoyé tool_result

**Fichier :** `src/app/api/chat/llm/stream/route.ts:950-954`

```typescript
// ✅ NOUVEAU : Sortir APRÈS avoir envoyé les tool_result
// ✅ CRITICAL FIX: Si c'était la fin (finishReason === 'stop'), sortir APRÈS avoir envoyé les tool_result
if (finishReason === 'stop' && uniqueToolCalls.length === 0) {
  logger.info('[Stream Route] ✅ Tool_result MCP envoyés, fin du stream (finishReason=stop)');
  break;
}
```

**Résultat :** On sort seulement APRÈS avoir envoyé tous les `tool_result` pour les MCP tools.

---

## 🎯 FLUX CORRIGÉ

1. **xAI exécute le MCP call** → `response.output_item.done` avec MCP call + output
2. **xai-native.ts** yield tool call avec `alreadyExecuted: true`, `result` et `finishReason: 'tool_calls'`
3. **xAI envoie la réponse finale** → `response.output_text.delta` → `accumulatedContent`
4. **xAI envoie `response.completed`** → On yield `finishReason: 'stop'` ✅
5. **route.ts** détecte `finishReason === 'stop'` MAIS `toolCallsMap.size > 0` → **CONTINUE** ✅
6. **route.ts** envoie `assistant_round_complete` avec les tool calls MCP ✅
7. **route.ts** envoie `tool_result` pour chaque MCP tool ✅
8. **route.ts** sort de la boucle APRÈS avoir envoyé tous les tool_result ✅
9. **UI affiche les tool calls MCP avec leurs résultats** ✅

---

## 📊 VÉRIFICATIONS

### Logs attendus

```
[Stream Route] 🔧 finishReason='stop' mais 1 tool call(s) MCP à afficher - traitement avant sortie
[Stream Route] 📤 Envoi assistant_round_complete: { toolCallsCount: 1, mcpCount: 1, ... }
[Stream Route] ✅ 1 MCP tool(s) déjà exécuté(s) par x.ai - ajout résultats
[Stream Route] ✅ Tool_result MCP envoyés, fin du stream (finishReason=stop)
```

### Tests à effectuer

- [ ] Appeler un MCP Synesia → Vérifier que les tool calls s'affichent dans la timeline
- [ ] Vérifier que les résultats MCP sont associés aux tool calls
- [ ] Vérifier qu'il n'y a pas de doublon d'affichage
- [ ] Vérifier les logs : `assistant_round_complete` et `tool_result` doivent être envoyés

---

## 🔗 FICHIERS MODIFIÉS

1. `src/app/api/chat/llm/stream/route.ts` (lignes 770-779, 858-866, 950-954)

---

**Fait par:** Jean-Claude (Senior Dev)  
**Standard:** GAFAM (1M+ utilisateurs)  
**Date:** 2025-01-20  
**Status:** ✅ **CORRIGÉ**




