# 🎬 CYCLE DE VIE COMPLET DES TOOL CALLS DANS L'UI

**Date**: 21 octobre 2025  
**Objectif**: Mettre à plat TOUS les éléments UI et leur timing

---

## 🎯 LE PROBLÈME : PLUSIEURS ÉLÉMENTS QUI SE CHEVAUCHENT

Actuellement, il y a **TROP d'éléments** qui apparaissent/disparaissent pendant le cycle :

1. **Message temporaire streaming** (streamingMessageTemp)
2. **Tool calls visuels** (ToolCallMessage component)
3. **Indicateur "Executing..."** (StreamingIndicator)
4. **Message final persistant** (dans le store)
5. **État local** (currentToolCalls)

**Résultat** : Confusion totale sur ce qui est affiché, quand, et pourquoi ça disparaît ou reste.

---

## 📊 TIMELINE COMPLÈTE (SECONDE PAR SECONDE)

### **T0 : User envoie "Lis le fichier README.md"**

```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘
```

**État de l'UI** :
- Message user ajouté au thread
- Aucun message assistant encore

---

### **T1 : Stream démarre (onStreamStart)**

**Code exécuté** :
```typescript
onStreamStart: () => {
  setIsStreaming(true);
  setStreamingContent('');
  setStreamingState('thinking');
  
  // ✅ Création message temporaire (UI only, PAS dans le store)
  const tempMessage: ChatMessageType = {
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString()
  };
  setStreamingMessageTemp(tempMessage);
}
```

**État de l'UI** :
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT (temporaire, vide)        │
│ [Indicateur de chargement...]       │
└─────────────────────────────────────┘
```

**Dans le store** : Aucun message assistant encore

---

### **T2-T5 : Chunks de texte arrivent (onStreamChunk)**

**Code exécuté** :
```typescript
onStreamChunk: (chunk: string) => {
  // Accumulation du contenu
  setStreamingContent(prev => {
    const newContent = prev + chunk;
    
    // ✅ Mise à jour du message temporaire
    setStreamingMessageTemp({
      role: 'assistant',
      content: newContent,
      timestamp: new Date().toISOString()
    });
    
    return newContent;
  });
}
```

**État de l'UI** (progressif) :
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT (temporaire)               │
│ "Je vais lire le fichier..."        │  ← Texte qui s'accumule
└─────────────────────────────────────┘
```

**Dans le store** : Toujours aucun message assistant

---

### **T6 : Tool calls détectés (onToolCalls)**

**Code exécuté** :
```typescript
onToolCalls: (toolCalls, toolName) => {
  // ✅ Stockage local pour affichage
  setCurrentToolCalls(convertedToolCalls);
  
  // Le message temporaire est MIS À JOUR avec les tool_calls
  // (Ceci se passe dans onToolExecution plus tard)
}
```

**État de l'UI** : **INCHANGÉ POUR L'INSTANT**

Le message temporaire affiche toujours juste le texte.

---

### **T7 : Début d'exécution (onToolExecution)**

**Code exécuté** :
```typescript
onToolExecution: (toolCount: number) => {
  setStreamingState('executing');
  setExecutingToolCount(toolCount);
  
  // ✅ IMPORTANT : Injection des tool_calls dans le message temporaire
  setStreamingMessageTemp(prev => prev ? {
    ...prev,
    tool_calls: currentToolCalls  // ← ICI les tool calls sont ajoutés
  } : null);
  
  // Flag pour remplacer le content au prochain chunk
  setShouldResetNextChunk(true);
}
```

**État de l'UI** : **CHANGEMENT MAJEUR**
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT (temporaire)               │
│ "Je vais lire le fichier..."        │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🔧 TOOL CALL: read_file         │ │  ← NOUVEAU composant ToolCallMessage
│ │ Arguments: { file: "README.md" }│ │
│ │ Status: ⏳ Pending              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔄 Executing 1 tool...              │  ← StreamingIndicator (après le message)
└─────────────────────────────────────┘
```

**Dans le store** : Toujours aucun message assistant (tout est temporaire)

---

### **T8 : Tool s'exécute (backend)**

**Logs backend** :
```
[Orchestrator] Exécution de read_file...
[ToolExecutor] Lecture de /README.md...
[ToolExecutor] ✅ Succès : 1234 caractères lus
```

**État de l'UI** : **INCHANGÉ**

Le StreamingIndicator continue d'afficher "Executing 1 tool..."

---

### **T9 : Tool result reçu (onToolResult)**

**Code exécuté** :
```typescript
onToolResult: (toolName, result, success, toolCallId) => {
  logger.dev(`✅ Tool result reçu: ${toolName}`);
  // Pas de changement UI ici
  // Le result sera utilisé par le LLM pour le prochain round
}
```

**État de l'UI** : **INCHANGÉ**

Toujours le même affichage avec "Executing 1 tool..."

---

### **T10 : Nouveau round - Chunks arrivent (onStreamChunk)**

**Code exécuté** :
```typescript
onStreamChunk: (chunk: string) => {
  // ✅ shouldResetNextChunk = true (activé dans onToolExecution)
  const isNewRound = shouldResetNextChunk;
  
  if (isNewRound) {
    // ✅ REMPLACER le content (nouveau round)
    setStreamingContent(chunk);
    setStreamingMessageTemp({
      role: 'assistant',
      content: chunk, // ← NOUVEAU contenu (remplace l'ancien)
      timestamp: new Date().toISOString()
      // ⚠️ PAS de tool_calls ici (ils sont cleared)
    });
    setCurrentToolCalls([]); // ✅ Clear
    setShouldResetNextChunk(false);
  }
}
```

**État de l'UI** : **CHANGEMENT MAJEUR #2**
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT (temporaire)               │
│ "Voici le contenu du fichier..."    │  ← NOUVEAU texte (remplace l'ancien)
│                                      │
│ ❌ Les tool calls ont DISPARU       │  ← PROBLÈME : on les a cleared
└─────────────────────────────────────┘

❌ StreamingIndicator a disparu         ← streamingState = 'responding'
```

**Problème actuel** : Les tool calls disparaissent au Round 2 !

---

### **T11 : Stream se termine (onStreamEnd)**

**Code exécuté** :
```typescript
onStreamEnd: () => {
  setIsStreaming(false);
  setStreamingState('idle');
  setStreamingMessageTemp(null); // ✅ Clear le message temporaire
  setStreamingContent('');
  
  setTimeout(() => {
    setCurrentToolCalls([]); // Clear après un délai
  }, 0);
}
```

**État de l'UI** : **LE MESSAGE TEMPORAIRE DISPARAÎT**
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

❌ Plus de message temporaire
⏳ En attente du message final...
```

---

### **T12 : Message final ajouté (onComplete → handleComplete → addMessage)**

**Code exécuté** :
```typescript
onComplete: (fullContent, fullReasoning, toolCalls, toolResults) => {
  // ✅ Après notre fix, toolCalls et toolResults sont COMPLETS
  handleComplete(fullContent, fullReasoning, convertedToolCalls, convertedToolResults);
}

// Dans useChatHandlers.ts
handleComplete: async (fullContent, fullReasoning, toolCalls, toolResults) => {
  const messageToAdd = {
    role: 'assistant',
    content: fullContent, // "Voici le contenu du fichier..."
    reasoning: fullReasoning,
    tool_calls: toolCalls, // ✅ [{ id, type, function: { name, arguments } }]
    tool_results: toolResults, // ✅ [{ tool_call_id, name, content, success }]
    timestamp: new Date().toISOString()
  };
  
  // ✅ Ajout au store (avec updateExisting pour remplacer un éventuel message temporaire)
  await addMessage(messageToAdd, { persist: true, updateExisting: true });
}
```

**État de l'UI** : **MESSAGE FINAL PERSISTANT**
```
┌─────────────────────────────────────┐
│ USER MESSAGE                         │
│ "Lis le fichier README.md"          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ASSISTANT (persistant, dans le store)│
│ "Voici le contenu du fichier..."    │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🔧 TOOL CALL: read_file         │ │  ← ToolCallMessage de nouveau visible
│ │ Arguments: { file: "README.md" }│ │
│ │ ✅ Result: "# README\n..."      │ │  ← Avec le résultat
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Dans le store** : Message assistant complet avec tool_calls et tool_results

---

## 🎭 LES 3 "ACTEURS" DE L'UI

### **1. Message Temporaire (streamingMessageTemp)**

**Rôle** : Afficher le contenu en cours de streaming (UI only)

**Cycle de vie** :
- **Créé** : `onStreamStart`
- **Mis à jour** : `onStreamChunk` (accumulation du content)
- **Enrichi** : `onToolExecution` (ajout des tool_calls)
- **Remplacé** : `onStreamChunk` après tool execution (nouveau round, tool_calls cleared)
- **Détruit** : `onStreamEnd`

**Problème actuel** : Les tool_calls sont cleared au Round 2 (ligne 143 de ChatFullscreenV2.tsx)

---

### **2. Indicateur de Streaming (StreamingIndicator)**

**Rôle** : Afficher "Executing X tools..." pendant l'exécution

**Cycle de vie** :
- **Créé** : `onToolExecution` (streamingState = 'executing')
- **Affiché** : Pendant que les tools s'exécutent
- **Détruit** : Dès que le premier chunk du Round 2 arrive (streamingState = 'responding')

**Code d'affichage** :
```typescript
{isStreaming && streamingState === 'executing' && (
  <StreamingIndicator 
    state={streamingState}
    toolCount={executingToolCount}
    currentTool={currentToolName}
    roundNumber={currentRound}
  />
)}
```

---

### **3. Message Final Persistant (dans le store)**

**Rôle** : Message définitif avec tous les détails (content + tool_calls + tool_results)

**Cycle de vie** :
- **Créé** : `onComplete` → `handleComplete` → `addMessage`
- **Affiché** : Dès qu'il est ajouté au store
- **Persiste** : Toujours (même après refresh)

**Rendu** :
```typescript
// Dans ChatMessage.tsx
{role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
  <ToolCallMessage
    toolCalls={message.tool_calls}
    toolResults={getToolResultsForAssistant() || []}
  />
)}
```

---

## 🐛 PROBLÈME ACTUEL IDENTIFIÉ

### **Au Round 2, les Tool Calls Disparaissent Temporairement**

**Lieu** : `ChatFullscreenV2.tsx` lignes 134-145

```typescript
if (isNewRound) {
  setStreamingContent(chunk);
  setStreamingMessageTemp({
    role: 'assistant',
    content: chunk,
    timestamp: new Date().toISOString()
    // ❌ Pas de tool_calls ici
  });
  setCurrentToolCalls([]); // ❌ Clear les tool calls
  setShouldResetNextChunk(false);
}
```

**Impact visuel** :
1. User voit : "Je vais lire..." + ToolCallMessage avec tool calls
2. Tool s'exécute : "Executing 1 tool..."
3. Round 2 commence : **Les tool calls DISPARAISSENT** (cleared)
4. Message final arrive : Les tool calls **RÉAPPARAISSENT**

**Résultat** : Effet de "flash" désagréable

---

## ✅ SOLUTION PROPOSÉE

### **Option 1 : Garder les Tool Calls au Round 2** (Recommandé)

Ne pas clear les tool_calls dans le message temporaire au Round 2 :

```typescript
if (isNewRound) {
  setStreamingContent(chunk);
  setStreamingMessageTemp(prev => ({
    role: 'assistant',
    content: chunk, // ✅ Nouveau contenu
    timestamp: new Date().toISOString(),
    tool_calls: prev?.tool_calls // ✅ GARDER les tool calls du round précédent
  }));
  // ❌ NE PAS clear currentToolCalls ici
  setShouldResetNextChunk(false);
}
```

**Avantage** : Les tool calls restent visibles pendant tout le cycle

**Rendu visuel** :
```
Round 1: "Je vais lire..." + [Tool Call: read_file]
         ↓
Executing: "Je vais lire..." + [Tool Call: read_file] + "🔄 Executing..."
         ↓
Round 2: "Voici le contenu..." + [Tool Call: read_file] ← ✅ Toujours là
         ↓
Final: "Voici le contenu..." + [Tool Call: read_file] + [Result]
```

---

### **Option 2 : Deux Messages Distincts** (Complexe)

Créer 2 messages distincts :
1. Message Round 1 avec tool_calls (figé)
2. Message Round 2 avec la réponse (nouveau)

**Avantage** : Séparation claire des rounds

**Inconvénient** : Plus complexe, nécessite de gérer 2 messages temporaires

---

## 🎯 RECOMMANDATION

**Implémenter l'Option 1** : Garder les tool_calls visibles pendant tout le cycle.

**Changements à faire** :
1. Dans `onStreamChunk` (Round 2) : Préserver `tool_calls` du message temporaire précédent
2. Clear `currentToolCalls` seulement dans `onStreamEnd` (déjà fait)

**Code à modifier** :
```typescript
// ChatFullscreenV2.tsx ligne 136-145
if (isNewRound) {
  setStreamingContent(chunk);
  setStreamingMessageTemp(prevMsg => {
    // ✅ Type guard pour accéder à tool_calls
    const existingToolCalls = (prevMsg && prevMsg.role === 'assistant' && 'tool_calls' in prevMsg) 
      ? prevMsg.tool_calls 
      : undefined;
    
    return {
      role: 'assistant',
      content: chunk, // Nouveau contenu (Round 2)
      timestamp: new Date().toISOString(),
      tool_calls: existingToolCalls // ✅ GARDER les tool_calls
    };
  });
  // Ne pas clear currentToolCalls ici
  setShouldResetNextChunk(false);
}
```

---

## 📊 TIMELINE CORRIGÉE (AVEC FIX)

```
T0:  User message
T1:  Stream start → Message temporaire vide
T2:  Chunks → "Je vais lire..."
T6:  Tool calls détectés
T7:  Tool execution → Message temporaire + [Tool Calls] + Indicator
T8:  Backend exécute
T9:  Tool result reçu
T10: Round 2 chunks → "Voici le contenu..." + [Tool Calls toujours là] ✅
T11: Stream end → Message temporaire supprimé
T12: Message final → "Voici le contenu..." + [Tool Calls] + [Results] ✅
```

**Résultat** : Les tool calls restent visibles du début à la fin, sans disparaître.

---

## 🎬 RÉSUMÉ VISUEL FINAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    CYCLE COMPLET DES TOOL CALLS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User: "Lis README.md"                                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [ROUND 1] "Je vais lire..."                              │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ 🔧 Tool Call: read_file (Pending)                    │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│  [🔄 Executing 1 tool...]                                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [ROUND 2] "Voici le contenu..."                          │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ 🔧 Tool Call: read_file ✅ (toujours visible)        │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [FINAL] "Voici le contenu..."                            │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ 🔧 Tool Call: read_file                              │ │  │
│  │ │ ✅ Result: "# README\n..."                           │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

**Voilà, tout est à plat et clair !** 🎯


