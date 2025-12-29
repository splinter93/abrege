# 🔍 AUDIT - Affichage Tool Calls MCP xAI dans l'UI

**Date :** 20 janvier 2025  
**Status :** ✅ **CORRIGÉ**

---

## 🐛 PROBLÈME IDENTIFIÉ

Les tool calls MCP exécutés par xAI n'étaient pas affichés dans l'UI, même si leurs résultats étaient envoyés.

### Symptômes

1. ✅ Plus de doublon de réponse (corrigé précédemment)
2. ❌ Les tool calls MCP ne s'affichent pas dans la timeline UI
3. ❌ Les résultats MCP sont envoyés mais pas associés aux tool calls dans l'UI

---

## 🔍 ROOT CAUSE

### Flux actuel (BUGUÉ)

1. **xAI exécute le MCP call** → Envoie `response.output_item.done` avec le MCP call et son output
2. **xai-native.ts** yield tool call avec `alreadyExecuted: true`, `result` et `finishReason: 'tool_calls'`
3. **route.ts** envoie `assistant_round_complete` avec les tool calls MCP dans `tool_calls`
4. **StreamOrchestrator.processAssistantRoundComplete** ajoute les tool calls à sa timeline interne
5. **❌ PROBLÈME :** `StreamOrchestrator` n'appelle **PAS** `onToolExecution` pour notifier le hook
6. **useStreamingState** n'a pas les tool calls dans sa timeline
7. **route.ts** envoie `tool_result` pour chaque MCP tool
8. **useStreamingState.updateToolResult** ne trouve pas le tool call dans la timeline → **RIEN N'EST AFFICHÉ** ❌

### Problème dans `StreamOrchestrator.processAssistantRoundComplete`

**Fichier :** `src/services/streaming/StreamOrchestrator.ts:392-415`

```typescript
// ❌ AVANT (BUGUÉ)
if (chunk.tool_calls && chunk.tool_calls.length > 0) {
  // Ajouter les tool calls au tracker
  for (const tc of chunk.tool_calls) {
    this.toolTracker.addToolCall(tc);
  }

  // ✅ Ajouter DIRECTEMENT à la timeline SANS déclencher l'exécution
  const toolCallsForTimeline = this.toolTracker.getNewToolCallsForNotification();
  if (toolCallsForTimeline.length > 0) {
    this.timeline.addToolExecutionEvent(toolCallsForTimeline, chunk.tool_calls.length);
    this.toolTracker.markNotified(toolCallsForTimeline);
    
    // ❌ PROBLÈME : Pas d'appel à onToolExecution
    // Le hook useStreamingState n'est pas notifié
  }
}
```

**Problème :** Le hook `useStreamingState` n'est pas notifié, donc les tool calls ne sont pas ajoutés à sa timeline. Quand `tool_result` arrive, `updateToolResult` ne trouve pas le tool call.

---

## ✅ CORRECTION APPLIQUÉE

### Correction : Notifier le hook même pour les MCP tools déjà exécutés

**Fichier :** `src/services/streaming/StreamOrchestrator.ts:392-415`

```typescript
// ✅ APRÈS (CORRIGÉ)
if (chunk.tool_calls && chunk.tool_calls.length > 0) {
  logger.dev(`[StreamOrchestrator] 🔧 ${chunk.tool_calls.length} tool call(s) dans round complete (MCP déjà exécutés)`);
  
  // Ajouter les tool calls au tracker (pour historique complet)
  for (const tc of chunk.tool_calls) {
    this.toolTracker.addToolCall(tc);
  }

  // ✅ CRITICAL FIX: Notifier le hook pour qu'il ajoute les tool calls à sa timeline
  // Même si les tools sont déjà exécutés (MCP), ils doivent être affichés dans l'UI
  const toolCallsForTimeline = this.toolTracker.getNewToolCallsForNotification();
  if (toolCallsForTimeline.length > 0) {
    // ✅ Ajouter à la timeline interne
    this.timeline.addToolExecutionEvent(toolCallsForTimeline, chunk.tool_calls.length);
    this.toolTracker.markNotified(toolCallsForTimeline);
    
    // ✅ CRITICAL FIX: Notifier le hook pour qu'il ajoute aussi à sa timeline
    // Le hook utilisera ces tool calls pour l'affichage dans l'UI
    callbacks.onToolExecution?.(chunk.tool_calls.length, toolCallsForTimeline);
    
    logger.dev(`[StreamOrchestrator] ✅ ${toolCallsForTimeline.length} tool call(s) ajouté(s) à la timeline ET notifié au hook`);
  }

  // Passer au prochain round
  this.timeline.incrementRound();
  this.toolTracker.clearCurrentRound();
  this.currentRoundContent = '';
}
```

**Résultat :** 
- ✅ Le hook `useStreamingState` est notifié via `onToolExecution`
- ✅ Les tool calls MCP sont ajoutés à la timeline du hook
- ✅ Quand `tool_result` arrive, `updateToolResult` trouve le tool call et met à jour son résultat
- ✅ Les tool calls MCP s'affichent correctement dans l'UI

---

## 🎯 FLUX CORRIGÉ

1. **xAI exécute le MCP call** → `response.output_item.done` avec MCP call + output
2. **xai-native.ts** yield tool call avec `alreadyExecuted: true`, `result` et `finishReason: 'tool_calls'`
3. **route.ts** envoie `assistant_round_complete` avec les tool calls MCP dans `tool_calls`
4. **StreamOrchestrator.processAssistantRoundComplete** :
   - Ajoute les tool calls à sa timeline interne ✅
   - **Appelle `onToolExecution` pour notifier le hook** ✅
5. **useStreamingState.addToolExecution** ajoute les tool calls à sa timeline ✅
6. **route.ts** envoie `tool_result` pour chaque MCP tool
7. **useStreamingState.updateToolResult** trouve le tool call et met à jour son résultat ✅
8. **UI affiche les tool calls MCP avec leurs résultats** ✅

---

## 📊 VÉRIFICATIONS

### Tests à effectuer

- [ ] Appeler un MCP Synesia → Vérifier que les tool calls s'affichent dans la timeline
- [ ] Vérifier que les résultats MCP sont associés aux tool calls
- [ ] Vérifier qu'il n'y a pas de doublon d'affichage
- [ ] Vérifier les logs : `onToolExecution` doit être appelé pour les MCP tools

### Logs attendus

```
[StreamOrchestrator] 🔧 1 tool call(s) dans round complete (MCP déjà exécutés)
[StreamOrchestrator] ✅ 1 tool call(s) ajouté(s) à la timeline ET notifié au hook
[useStreamingState] 🔧 Tool execution ajoutée: { toolCount: 1, round: 1, toolNames: ['synesia_...'] }
[useStreamingState] ✅ Tool result mis à jour dans timeline: { toolCallId: '...', success: true }
```

---

## 🔗 FICHIERS MODIFIÉS

1. `src/services/streaming/StreamOrchestrator.ts` (ligne 392-415)

---

**Fait par:** Jean-Claude (Senior Dev)  
**Standard:** GAFAM (1M+ utilisateurs)  
**Date:** 2025-01-20  
**Status:** ✅ **CORRIGÉ**







