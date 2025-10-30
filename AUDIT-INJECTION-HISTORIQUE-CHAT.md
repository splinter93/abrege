# 📊 AUDIT : Mécanismes d'injection historique chat

**Date :** 30 octobre 2025  
**Objectif :** Fiabilité et fluidité  
**Constat :** Fonctionne mais saccadé

---

## 🔍 ANALYSE DÉTAILLÉE

### 1️⃣ POINT D'INJECTION #1 : Envoi message utilisateur

**Fichier :** `src/hooks/chat/useChatMessageActions.ts`  
**Lignes :** 117-241

#### Flow actuel

```typescript
┌─ onBeforeSend() appelé (ligne 137-139)
│  └─ streamingState.reset()
│  └─ logger.dev('Timeline reset, historique complet')
│
├─ chatMessageSendingService.prepare() (ligne 144-158)
│  └─ Validation session/agent
│  └─ Création tempMessage
│  └─ Construction limitedHistory
│  └─ Récupération token
│
├─ addInfiniteMessage(tempMessage) (ligne 168) ⚠️ RE-RENDER #1
│  └─ setMessages(prev => [...prev, message])
│  └─ Provoque recalcul displayMessages (useMemo)
│  └─ ChatMessagesArea re-render
│
├─ sessionSyncService.addMessageAndSync() (ligne 182-208)
│  └─ NON-BLOQUANT (background)
│  └─ .then() pour update is_empty si 1er message
│  └─ .catch() logging erreur
│
└─ sendMessageFn() (ligne 222)
   └─ Appel LLM via useChatResponse
```

#### ⚠️ PROBLÈMES IDENTIFIÉS

1. **Re-render synchrone non optimisé**
   - `addInfiniteMessage` force re-render immédiat
   - Pas de batching avec React.startTransition
   - Bloque le thread principal

2. **Sauvegarde asynchrone non attendue**
   - Le message est affiché AVANT d'être sauvegardé
   - Si échec sauvegarde, l'UI ne le reflète pas
   - Risque d'incohérence UI ↔ DB

3. **onBeforeSend fait trop peu**
   - Ne fait que `streamingState.reset()`
   - Commentaire dit "historique complet dans infiniteMessages"
   - Mais ne vérifie pas effectivement

---

### 2️⃣ POINT D'INJECTION #2 : Fin streaming assistant

**Fichier :** `src/components/chat/ChatFullscreenV2.tsx`  
**Lignes :** 105-126

#### Flow actuel

```typescript
┌─ onComplete(fullContent, reasoning, toolCalls, toolResults, streamTimeline)
│
├─ Créer assistantMessage (ligne 109-117)
│  └─ id: `msg-${Date.now()}-assistant`
│  └─ role: 'assistant'
│  └─ content: fullContent
│  └─ reasoning: fullReasoning
│  └─ tool_results: toolResults || []
│  └─ stream_timeline: streamTimeline
│  └─ timestamp: new Date().toISOString()
│
├─ addInfiniteMessage(assistantMessage) (ligne 119) ⚠️ RE-RENDER #2
│  └─ setMessages(prev => [...prev, assistantMessage])
│  └─ Provoque recalcul displayMessages
│  └─ ChatMessagesArea re-render
│
├─ logger.dev('Message assistant ajouté') (ligne 121)
│
└─ streamingState.endStreaming() (ligne 124) ⚠️ RE-RENDER #3
   └─ setIsStreaming(false)
   └─ setStreamingState('idle')
   └─ Provoque AUTRE re-render de ChatMessagesArea
```

#### ⚠️ PROBLÈMES CRITIQUES

1. **2 re-renders consécutifs NON batchés**
   ```
   addInfiniteMessage → re-render #1
   endStreaming → re-render #2
   ```
   - React 18 batch automatiquement dans event handlers
   - MAIS PAS dans callbacks async (onComplete)
   - Donc 2 renders distincts = saccade visible

2. **Transition brutale streaming → DB**
   ```
   Avant: Message streaming visible (streamingContent)
   Après: Message streaming DISPARU
           Message DB APPARU instantanément
   ```
   - Pas de fade out/in
   - Pas de délai pour transition fluide
   - L'utilisateur voit un "flash"

3. **displayMessages recalculé 2 fois**
   ```typescript
   useMemo(() => {
     // Filter + slice logic
   }, [infiniteMessages, animations.displayedSessionId, currentSession?.id, editingMessage])
   ```
   - Ligne 325-351
   - Dépend de `infiniteMessages` qui change
   - Recalculé à chaque ajout de message
   - Peut être coûteux si 50+ messages

---

### 3️⃣ SYSTÈME AFFICHAGE : displayMessages

**Fichier :** `src/components/chat/ChatFullscreenV2.tsx`  
**Lignes :** 324-351

#### Calcul actuel

```typescript
const displayMessages = useMemo(() => {
  // Guard: session mismatch
  if (animations.displayedSessionId !== currentSession?.id) return [];
  
  // Guard: no messages
  if (infiniteMessages.length === 0) return [];
  
  // Filtrage
  let filtered = infiniteMessages.filter(msg => {
    if (msg.role === 'user') return true;
    if (msg.role === 'assistant' && msg.content) return true;
    if (msg.role === 'tool') return true;
    if (isEmptyAnalysisMessage(msg)) return false;
    return true;
  });
  
  // Edition: masquer message édité + suivants
  if (editingMessage) {
    const editedMsgIndex = filtered.findIndex(msg =>
      msg.id === editingMessage.messageId ||
      (msg.timestamp && editingMessage.messageId.includes(new Date(msg.timestamp).getTime().toString()))
    );
    
    if (editedMsgIndex !== -1) {
      filtered = filtered.slice(0, editedMsgIndex);
    }
  }
  
  return filtered;
}, [infiniteMessages, animations.displayedSessionId, currentSession?.id, editingMessage]);
```

#### ⚠️ INEFFICACITÉS

1. **Dépendances multiples**
   - `infiniteMessages` : change à CHAQUE message ajouté
   - `animations.displayedSessionId` : change au changement session
   - `editingMessage` : change en mode édition
   - Recalcul fréquent

2. **Filter + findIndex non optimisés**
   - Filter parcourt TOUS les messages
   - findIndex parcourt TOUS les filtered
   - O(2n) à chaque recalcul

3. **Pas de mémoïsation granulaire**
   - Un seul useMemo pour tout le calcul
   - Pourrait être split : filtering + editing

---

## 🎯 CAUSES RACINES DES SACCADES

### Cause #1 : Multiple re-renders non batchés

```
User send → addInfiniteMessage → RENDER
         ↓
Streaming end → addInfiniteMessage → RENDER
              ↓
              endStreaming() → RENDER
```

**Impact :** 3 renders pour 1 message complet (user + assistant)

### Cause #2 : Transition brutale streaming → DB

```
[Streaming visible] → [FLASH] → [DB visible]
```

**Impact :** L'utilisateur voit un "pop" ou "flash" désagréable

### Cause #3 : displayMessages recalculé trop souvent

```
infiniteMessages change → useMemo recalcule → filter tous messages → findIndex
```

**Impact :** CPU spike sur chaque message, particulièrement avec historique long

---

## ✅ SOLUTIONS PROPOSÉES

### Solution #1 : Batcher les state updates

**Utiliser `React.startTransition`** pour rendre les updates non-bloquants

```typescript
import { startTransition } from 'react';

// Dans handleComplete
startTransition(() => {
  addInfiniteMessage(assistantMessage);
  streamingState.endStreaming();
});
```

**Avantages :**
- 1 seul render au lieu de 2
- Updates groupées
- Pas de saccade

### Solution #2 : Transition fade streaming → DB

**Ajouter un délai de 300ms avec fade**

```typescript
// Dans handleComplete
const assistantMessage = { ... };

// 1. Fade out streaming (300ms)
streamingState.setFading(true);

// 2. Attendre transition
await new Promise(resolve => setTimeout(resolve, 300));

// 3. Swap + fade in
startTransition(() => {
  addInfiniteMessage(assistantMessage);
  streamingState.endStreaming();
  streamingState.setFading(false);
});
```

**CSS associé :**
```css
.streaming-message.fading {
  opacity: 0;
  transition: opacity 300ms ease-out;
}
```

**Avantages :**
- Transition fluide
- Pas de flash
- UX professionnelle

### Solution #3 : Optimiser addInfiniteMessage

**Rendre l'ajout non-bloquant**

```typescript
// Dans useInfiniteMessages.ts
const addMessage = useCallback((message: ChatMessage) => {
  startTransition(() => {
    setMessages(prev => [...prev, message]);
  });
}, []);
```

**Avantages :**
- UI reste réactive
- Ajout en background
- Pas de freeze

### Solution #4 : Optimiser displayMessages

**Split en 2 useMemos + early return**

```typescript
// 1. Messages filtrés (change rarement)
const filteredMessages = useMemo(() => {
  if (!currentSession?.id) return [];
  if (infiniteMessages.length === 0) return [];
  
  return infiniteMessages.filter(msg => {
    if (msg.role === 'user') return true;
    if (msg.role === 'assistant' && msg.content) return true;
    if (msg.role === 'tool') return true;
    if (isEmptyAnalysisMessage(msg)) return false;
    return true;
  });
}, [infiniteMessages, currentSession?.id]);

// 2. Messages affichés (avec édition)
const displayMessages = useMemo(() => {
  if (!editingMessage) return filteredMessages;
  
  const editedMsgIndex = filteredMessages.findIndex(...);
  return editedMsgIndex !== -1 
    ? filteredMessages.slice(0, editedMsgIndex)
    : filteredMessages;
}, [filteredMessages, editingMessage]);
```

**Avantages :**
- Mémoïsation granulaire
- Recalcul partiel uniquement
- Meilleure performance

---

## 📊 MÉTRIQUES ATTENDUES

### Avant optimisation

| Métrique | Valeur | Impact |
|----------|--------|--------|
| Re-renders par message | 3 | ⚠️ Élevé |
| Délai visible (flash) | 0ms | ⚠️ Brutal |
| CPU spike displayMessages | Oui | ⚠️ Coûteux |
| Batching state updates | Non | ⚠️ Saccades |

### Après optimisation

| Métrique | Valeur | Impact |
|----------|--------|--------|
| Re-renders par message | 1 | ✅ Optimal |
| Délai visible (fade) | 300ms | ✅ Fluide |
| CPU spike displayMessages | Non | ✅ Optimisé |
| Batching state updates | Oui | ✅ Lisse |

**Amélioration attendue :**
- **-66% de re-renders** (3 → 1)
- **+300ms de transition** (brutale → fade)
- **-50% CPU sur displayMessages** (filter optimisé)

---

## 🚀 IMPLÉMENTATION

### Ordre d'exécution recommandé

1. **Solution #3** (addInfiniteMessage) - Impact immédiat, risque faible
2. **Solution #1** (batching handleComplete) - Impact majeur, risque moyen
3. **Solution #2** (fade transition) - Impact UX, risque faible
4. **Solution #4** (displayMessages) - Impact performance, risque faible

### Tests requis

- ✅ TypeScript (read_lints) sur tous fichiers modifiés
- ✅ Test manuel : envoyer 10 messages successifs
- ✅ Test manuel : éditer un message
- ✅ Test manuel : changement session rapide
- ✅ Test performance : 50+ messages dans historique

---

## 📝 CONCLUSION

**État actuel :** 3 re-renders par message, transition brutale, saccades visibles

**État cible :** 1 re-render par message, transition fade 300ms, fluidité optimale

**Complexité :** Moyenne (modifications ciblées, risque contrôlé)

**Durée estimée :** 30-45 minutes (4 solutions + tests)

---

**Prêt à implémenter ?** 🚀

