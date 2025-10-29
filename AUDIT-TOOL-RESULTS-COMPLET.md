# 🔍 AUDIT COMPLET - Gestion Tool Results

**Date** : 29 Octobre 2025  
**Problèmes** : 
- Tool calls jamais validés (pas de ✓)
- Impossible de cliquer pour voir détails
- LLM fait n'importe quoi

---

## 📊 FLOW COMPLET À AUDITER

### 1. Pendant le Streaming

```
useChatResponse (streaming SSE)
  ↓ chunk.type === 'tool_result'
  ↓ allToolResults.push(toolResult)
  ↓ streamTimeline.push({ type: 'tool_result', ... })
  ↓ onToolResult(toolName, result, success, toolCallId)
  ↓
ChatFullscreenV2
  ↓ onToolResult callback
  ↓ streamingState.updateToolResult(toolCallId, result, success)
  ↓
useStreamingState.updateToolResult()
  ↓ Met à jour currentToolCalls
  ↓ Met à jour streamingTimeline (tool_execution.toolCalls[].success)
  ↓
ChatMessagesArea
  ↓ Affiche streamingState.streamingTimeline
  ↓ Filtre tool_result (virés)
  ↓
StreamTimelineRenderer
  ↓ Cherche tc.success !== undefined
  ↓ Passe à StreamingIndicator
```

### 2. Après le Streaming (sauvegarde)

```
useChatResponse
  ↓ chunk.type === 'done'
  ↓ onComplete(allContent, reasoning, allToolCalls, allToolResults, streamTimeline)
  ↓
ChatFullscreenV2.handleComplete
  ↓
useChatHandlers.handleComplete()
  ↓ cleanedTimeline = filter tool_result + enrichir tool_execution avec results
  ↓ addMessage({ stream_timeline: cleanedTimeline, tool_results })
  ↓
sessionSyncService.addMessageAndSync()
  ↓ POST /api/chat/sessions/[id]/messages/add
  ↓
HistoryManager.addMessage()
  ↓ RPC add_message_atomic (INSERT)
  ↓ UPDATE stream_timeline
  ↓ UPDATE tool_results
  ↓ SELECT * pour récupérer message complet
```

### 3. Après Refresh (reload)

```
useInfiniteMessages.loadInitialMessages()
  ↓ GET /api/chat/sessions/[id]/messages/recent
  ↓
HistoryManager.getRecentMessages()
  ↓ SELECT * FROM chat_messages
  ↓ Retourne messages avec stream_timeline, tool_results
  ↓
ChatMessage
  ↓ Détecte streamTimeline || stream_timeline
  ↓ <StreamTimelineRenderer timeline={timeline} />
  ↓
StreamTimelineRenderer
  ↓ Cherche tc.success !== undefined
  ↓ Passe à StreamingIndicator
```

---

## 🔍 POINTS À VÉRIFIER

### A. Pendant le streaming

- [ ] onToolResult est appelé ?
- [ ] updateToolResult met à jour la timeline ?
- [ ] tc.success est défini ?
- [ ] StreamTimelineRenderer reçoit la timeline à jour ?

### B. Sauvegarde en DB

- [ ] cleanedTimeline contient bien success/result dans toolCalls ?
- [ ] UPDATE stream_timeline réussit ?
- [ ] SELECT après UPDATE retourne bien stream_timeline ?

### C. Reload depuis DB

- [ ] SELECT * inclut stream_timeline ?
- [ ] stream_timeline est parsé en JSON ?
- [ ] tc.success est présent dans les toolCalls ?

### D. Affichage StreamTimelineRenderer

- [ ] tc.success !== undefined détecte bien les résultats ?
- [ ] StreamingIndicator reçoit bien success ?
- [ ] Clicks fonctionnent ?

---

## 🧪 TESTS À FAIRE

Ajouter des logs partout et tracer :

1. useChatResponse → onToolResult
2. ChatFullscreenV2 → streamingState.updateToolResult
3. useStreamingState → après update, logger tc.success
4. useChatHandlers → cleanedTimeline
5. HistoryManager → avant/après UPDATE
6. HistoryManager → après SELECT
7. StreamTimelineRenderer → tc.success pour chaque tool

---

LANCEMENT AUDIT...

