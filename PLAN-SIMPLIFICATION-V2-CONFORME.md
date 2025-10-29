# 🎯 PLAN SIMPLIFICATION V2 - Conforme 300 Lignes

**Contrainte** : Chaque fichier ≤ 300 lignes (strict)  
**Objectif** : Architecture SOLIDE + Simple + Maintenable

---

## 📐 ARCHITECTURE CIBLE

### Hooks Streaming (2 fichiers au lieu de 2)

**AVANT** (problématique) :
```
useChatResponse.ts (594 lignes) ❌
useStreamingState.ts (300 lignes) ❌
→ Timeline dupliquée
→ Callbacks synchronisation
→ Workarounds useRef
```

**APRÈS** (simplifié) :
```
useChatResponse.ts (180 lignes) ✅
  ↓ Orchestration simple
  ↓ Mode classique vs streaming
  ↓ Retourne { streamTimeline, isStreaming }

useStreamingSSE.ts (280 lignes) ✅
  ↓ Logique streaming SSE
  ↓ Construction timeline
  ↓ Gestion tool calls/results
  ↓ State interne exposé

useStreamingState.ts → SUPPRIMÉ ❌
```

---

## 🔄 NOUVEAU FLOW (SIMPLE)

### Pendant Streaming

```typescript
// useChatResponse.ts
const { streamTimeline, isStreaming } = useStreamingSSE({
  onChunk, onToolResult, etc.
});

return { 
  streamTimeline,  // ✅ Directement depuis useStreamingSSE
  isStreaming,
  sendMessage 
};

// ChatFullscreenV2.tsx
const { streamTimeline, isStreaming } = useChatResponse({ useStreaming: true });

// Passe directement à ChatMessagesArea
<ChatMessagesArea 
  streamingTimeline={streamTimeline}
  isStreaming={isStreaming}
/>
```

**Bénéfices** :
- ✅ Une seule timeline
- ✅ Pas de callbacks synchronisation
- ✅ Pas de duplication
- ✅ State React natif (pas de useRef)

---

### Historique (Source of Truth = DB)

**AVANT** (fragile) :
```typescript
// ❌ infiniteMessages peut être stale
await loadInitialMessages();
await setTimeout(200); // Workaround
const history = infiniteMessages; // Peut-être stale
```

**APRÈS** (solide) :
```typescript
// ✅ Reload direct depuis DB
const history = await historyService.getRecentMessages(sessionId, 30);
// Jamais stale, toujours à jour
```

---

## 📝 ÉTAPES DÉTAILLÉES

### ÉTAPE 1 : Créer useStreamingSSE (2h)

**Fichier** : `src/hooks/useStreamingSSE.ts` (280 lignes)

**Responsabilités** :
- Consommer ReadableStream SSE
- Parser chunks (delta, tool_execution, tool_result, done)
- Construire timeline progressive
- Gérer tool calls avec success/result

**Interface** :
```typescript
interface UseStreamingSSEOptions {
  onChunk?: (content: string) => void;
  onToolExecution?: (toolCalls: ToolCall[]) => void;
  onToolResult?: (toolCallId: string, result: unknown, success: boolean) => void;
  onComplete?: (content: string, timeline: StreamTimeline) => void;
}

interface UseStreamingSSEReturn {
  streamTimeline: StreamTimelineItem[];
  isStreaming: boolean;
  consumeStream: (response: Response) => Promise<void>;
  reset: () => void;
}

function useStreamingSSE(options: UseStreamingSSEOptions): UseStreamingSSEReturn;
```

**Extraction depuis** : `useChatResponse.ts` lignes 106-363 (logique SSE)

---

### ÉTAPE 2 : Simplifier useChatResponse (1h)

**Fichier** : `src/hooks/useChatResponse.ts` (180 lignes)

**Responsabilités** :
- Orchestrer appel LLM (classique ou streaming)
- Utiliser useStreamingSSE si streaming
- Retourner timeline directement

**Interface** :
```typescript
interface UseChatResponseReturn {
  isProcessing: boolean;
  streamTimeline: StreamTimelineItem[]; // ✅ NOUVEAU
  isStreaming: boolean; // ✅ NOUVEAU
  sendMessage: (...) => Promise<void>;
  reset: () => void;
}
```

**Code simplifié** :
```typescript
export function useChatResponse(options) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ Hook streaming (si activé)
  const streamingSSE = useStreamingSSE({
    onChunk: options.onStreamChunk,
    onToolExecution: options.onToolExecution,
    onToolResult: options.onToolResult,
    onComplete: (content, timeline) => {
      options.onComplete(content, '', [], [], timeline);
    }
  });
  
  const sendMessage = async (...) => {
    if (options.useStreaming) {
      const response = await fetch('/api/chat/llm/stream', ...);
      await streamingSSE.consumeStream(response);
    } else {
      // Mode classique
    }
  };
  
  return {
    isProcessing,
    streamTimeline: streamingSSE.streamTimeline, // ✅ Direct
    isStreaming: streamingSSE.isStreaming,
    sendMessage,
    reset: streamingSSE.reset
  };
}
```

---

### ÉTAPE 3 : Supprimer useStreamingState (30min)

**Fichier** : `src/hooks/chat/useStreamingState.ts` → SUPPRIMER

**Remplacer par** : Direct depuis `useChatResponse`

**ChatFullscreenV2.tsx** :
```typescript
// ❌ AVANT
const streamingState = useStreamingState();
const { sendMessage } = useChatResponse({
  onStreamChunk: streamingState.updateContent,
  onToolExecution: streamingState.addToolExecution,
  onToolResult: streamingState.updateToolResult,
});

// ✅ APRÈS
const { sendMessage, streamTimeline, isStreaming } = useChatResponse({
  useStreaming: true
});
```

---

### ÉTAPE 4 : Virer setTimeout (1h)

**Fichier** : `src/hooks/chat/useChatMessageActions.ts`

**AVANT** (fragile) :
```typescript
await onBeforeSend(); // loadInitialMessages
await setTimeout(200); // Wait state update
await setTimeout(50); // Wait again
const history = infiniteMessages; // Peut être stale
```

**APRÈS** (solide) :
```typescript
// ✅ Reload direct depuis DB dans prepare()
const prepareResult = await sendingService.prepare({
  sessionId,
  reloadHistoryFromDB: true // Force reload
});
// prepareResult.limitedHistory = fraîchement chargé depuis DB
```

**ChatMessageSendingService.prepare()** :
```typescript
async prepare(options) {
  let history = options.infiniteMessages;
  
  // ✅ Si demandé, reload depuis DB (source of truth)
  if (options.reloadHistory) {
    const { historyManager } = await import('@/services/chat/HistoryManager');
    const fresh = await historyManager.getRecentMessages(sessionId, 30);
    history = fresh.messages;
  }
  
  return { limitedHistory: history };
}
```

---

## 📊 ESTIMATION

| Étape | Durée | Fichiers | Lignes |
|-------|-------|----------|--------|
| **1. useStreamingSSE** | 2h | +1 nouveau | 280L |
| **2. Simplifier useChatResponse** | 1h | Refactor | 594→180L |
| **3. Supprimer useStreamingState** | 30min | -1 fichier | -300L |
| **4. Virer setTimeout** | 1h | Refactor | +50L service |
| **5. ChatFullscreenV2** | 30min | Refactor | -50L |
| **6. Tests manuels** | 1h | - | - |
| **TOTAL** | **6h** | | |

---

## ✅ RÉSULTAT FINAL

### Fichiers

```
AVANT SIMPLIFICATION:
- useChatResponse.ts (594L)
- useStreamingState.ts (300L)
- useChatMessageActions.ts (350L)
= 1244 lignes, architecture complexe

APRÈS SIMPLIFICATION:
- useChatResponse.ts (180L) ✅
- useStreamingSSE.ts (280L) ✅ NOUVEAU
- useChatMessageActions.ts (300L) ✅ 
= 760 lignes, architecture simple
```

### Métriques

| Critère | Score |
|---------|-------|
| **Simplicité** | 9/10 ✅ |
| **Robustesse** | 9/10 ✅ |
| **Maintenabilité** | 9/10 ✅ |
| **Conformité guide** | 10/10 ✅ |

### Garanties

✅ Chaque fichier ≤ 300 lignes  
✅ Timeline unique (pas de duplication)  
✅ Zéro setTimeout workaround  
✅ Source of truth = DB  
✅ Flow linéaire (pas de callback hell)

---

## 🚀 DÉMARRAGE

**Je commence maintenant avec cette nouvelle approche ?**

Ça respecte le guide (300L) et élimine tous les workarounds.

