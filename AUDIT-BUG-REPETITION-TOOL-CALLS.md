# 🚨 AUDIT URGENT - BUG RÉPÉTITION TOOL CALLS

**Date:** 29 Octobre 2025  
**Sévérité:** 🔴 **CRITIQUE**  
**Impact:** Actions dupliquées (création notes en double, etc.)

---

## 🐛 SYMPTÔME

**Après des tool calls, quand l'utilisateur dit "merci", le LLM répète l'action précédente.**

Exemple:
```
User: "Crée-moi une note sur les pommes"
Assistant: [tool_call create_note] → Note créée ✅
User: "Merci"
Assistant: [tool_call create_note] → Note créée ENCORE ❌
```

---

## 🔍 CAUSE RACINE

### Problème dans `src/app/api/chat/llm/stream/route.ts`

#### 1. Flow Normal (Boucle Agentic)

```typescript
// Ligne 334: Initialisation
let currentMessages = [...messages]; // messages = historique DB

while (roundCount < maxRounds) {
  roundCount++;
  
  // ✅ Appel LLM avec currentMessages
  for await (const chunk of provider.callWithMessagesStream(currentMessages, tools)) {
    // ... accumule content et tool_calls
  }
  
  // ✅ ROUND 1: Assistant retourne tool_calls
  if (finishReason === 'tool_calls') {
    // Ligne 510: Ajouter message assistant avec tool_calls
    currentMessages.push({
      role: 'assistant',
      content: accumulatedContent || null,
      tool_calls: accumulatedToolCalls, // ⚠️ PERSISTE LES TOOL CALLS
      timestamp: new Date().toISOString()
    });
    
    // Exécuter les tools
    for (const toolCall of accumulatedToolCalls) {
      const result = await executor.executeToolCall(toolCall, userToken);
      
      // Ligne 556: Ajouter le résultat
      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: result.content,
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ ROUND 2: Relancer LLM avec tool results
    // currentMessages contient maintenant:
    // - ... historique ancien
    // - assistant { tool_calls: [...] }  ⚠️ ENCORE LÀ
    // - tool { tool_call_id, content }
    // - tool { tool_call_id, content }
    // Le LLM répond avec du texte final
    
    break; // finishReason === 'stop'
  }
}
```

#### 2. Persistance en DB

Les messages sont sauvegardés en DB via `useChatHandlers.handleComplete()`:

```typescript
// useChatHandlers.ts:141-170
const messageToAdd = {
  role: 'assistant' as const,
  content: finalContent,
  reasoning: fullReasoning,
  tool_calls: toolCalls || [],      // ⚠️ PERSISTÉ EN DB
  tool_results: toolResults || [],  // ⚠️ PERSISTÉ EN DB
  stream_timeline: cleanedTimeline,
  timestamp: new Date().toISOString()
};

await addMessage(messageToAdd, { 
  persist: true,
  updateExisting: true
});
```

**Résultat DB:**
```sql
-- Message assistant final
INSERT INTO chat_messages (role, content, tool_calls, tool_results, ...) VALUES (
  'assistant',
  'Voici votre note sur les pommes...',
  '[{"id": "call_123", "function": {"name": "create_note", "arguments": "..."}}]', -- ⚠️
  '[{"tool_call_id": "call_123", "name": "create_note", "success": true}]',
  ...
);
```

#### 3. Prochaine Requête User ("Merci")

```typescript
// ChatMessageSendingService.ts:136
const limitedHistory = this.limitHistoryForLLM(infiniteMessages, maxHistoryForLLM);

// limitHistoryForLLM() ne filtre PAS les tool_calls des anciens messages
// Elle prend juste les N derniers messages

// stream/route.ts:250
const messages: ChatMessage[] = [
  { role: 'system', content: systemMessage },
  ...history, // ⚠️ Contient le message assistant avec tool_calls
  { role: 'user', content: 'Merci' }
];

// ✅ Le LLM reçoit:
// - system
// - assistant { tool_calls: [create_note], content: "Voici votre note..." } ⚠️
// - user "Merci"

// ❌ Le LLM VOIT le tool_call create_note et pense qu'il doit l'exécuter !
```

---

## 🔥 PROBLÈME CRITIQUE

**Le LLM ne fait PAS le lien entre:**
1. Le message `assistant` avec `tool_calls` 
2. Les `tool_results` dans le même message

**Pourquoi ?**

Le format attendu par l'API est :

```json
[
  { "role": "assistant", "content": null, "tool_calls": [...] },
  { "role": "tool", "tool_call_id": "...", "content": "..." },
  { "role": "tool", "tool_call_id": "...", "content": "..." },
  { "role": "assistant", "content": "Voici le résultat..." }
]
```

**Mais on sauvegarde:**

```json
[
  { 
    "role": "assistant", 
    "content": "Voici le résultat...",
    "tool_calls": [...],        // ⚠️ ENCORE LÀ
    "tool_results": [...]       // ⚠️ JSONB séparé
  }
]
```

**Quand ce message est rechargé et converti pour l'API:**

```typescript
// xai.ts:656-681
if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
  messageObj.tool_calls = msg.tool_calls as ToolCall[]; // ⚠️ RÉINJECTÉ
}

// 671-681: Transformer tool_results en messages tool séparés
if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
  for (const result of msg.tool_results) {
    messages.push({
      role: 'tool',
      tool_call_id: result.tool_call_id,
      name: result.name,
      content: result.content,
    });
  }
}
```

**Résultat envoyé au LLM:**

```json
[
  { "role": "system", "content": "..." },
  { 
    "role": "assistant", 
    "content": "Voici le résultat...",
    "tool_calls": [{"id": "call_123", ...}] // ⚠️ LE LLM PENSE QU'IL DOIT L'EXÉCUTER
  },
  { "role": "tool", "tool_call_id": "call_123", "content": "..." }, // Tool result
  { "role": "user", "content": "Merci" }
]
```

**Le LLM raisonne:**
- "Je vois un message assistant avec tool_calls"
- "Il y a des tool results qui suivent"
- "Mais l'utilisateur me parle encore, donc je dois exécuter ces tools à nouveau"

---

## 🎯 SOLUTIONS

### Solution 1: NE PAS Persister `tool_calls` sur Message Final ✅ RECOMMANDÉ

**Rationale:**
- Le message assistant FINAL (après relance) ne devrait PAS contenir `tool_calls`
- Les tool_calls ont déjà été exécutés et leurs résultats intégrés
- Seul `tool_results` (en JSONB) doit être conservé pour référence

**Implémentation:**

```typescript
// useChatHandlers.ts:141-170
const messageToAdd = {
  role: 'assistant' as const,
  content: finalContent,
  reasoning: fullReasoning,
  // ❌ NE PAS persister tool_calls sur message final
  tool_calls: undefined, // ou ne pas inclure la propriété
  tool_results: toolResults || [], // ✅ Garder pour référence
  stream_timeline: cleanedTimeline,
  timestamp: new Date().toISOString()
};
```

**Avantages:**
- ✅ Simple
- ✅ Pas d'impact sur historique
- ✅ Les tool_results restent visibles pour l'UI

**Inconvénients:**
- ⚠️ Perte de traçabilité (quels tool_calls ont été faits)
- → Mitigé par `tool_results` qui contient déjà cette info

### Solution 2: Filtrer `tool_calls` lors du Chargement Historique

**Implémentation:**

```typescript
// HistoryManager.ts:341 (filterForLLM)
private filterForLLM(messages: ChatMessage[], config: HistoryConfig): ChatMessage[] {
  return messages.map(msg => {
    // Si message assistant avec tool_calls ET tool_results
    // → Supprimer tool_calls (déjà résolus)
    if (
      msg.role === 'assistant' && 
      msg.tool_calls && 
      msg.tool_calls.length > 0 &&
      msg.tool_results && 
      msg.tool_results.length > 0
    ) {
      return {
        ...msg,
        tool_calls: undefined // ✅ Filtrer tool_calls résolus
      };
    }
    return msg;
  });
}
```

**Avantages:**
- ✅ Conserve historique complet en DB
- ✅ Filtre intelligent au moment de l'usage

**Inconvénients:**
- ⚠️ Plus complexe
- ⚠️ Risque d'oublier le filtre ailleurs

### Solution 3: Marker les Tool Calls Comme "Resolved"

**Implémentation:**

```typescript
// types/chat.ts
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  resolved?: boolean; // ✅ NOUVEAU
}

// xai.ts:656-681
if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
  // ✅ Filtrer les tool_calls résolus
  const unresolvedToolCalls = msg.tool_calls.filter(tc => !tc.resolved);
  
  if (unresolvedToolCalls.length > 0) {
    messageObj.tool_calls = unresolvedToolCalls as ToolCall[];
  }
}
```

**Avantages:**
- ✅ Traçabilité complète
- ✅ Filtre automatique

**Inconvénients:**
- ⚠️ Complexité accrue
- ⚠️ Modification du type ToolCall

---

## 🚀 CORRECTION IMMÉDIATE (Solution 1)

### Fichiers à Modifier

#### 1. `src/hooks/useChatHandlers.ts`

```typescript
// Ligne 141-170
const messageToAdd = {
  role: 'assistant' as const,
  content: finalContent,
  reasoning: fullReasoning,
  
  // ✅ FIX: NE PAS persister tool_calls si déjà résolus
  // Les tool_results suffisent pour la traçabilité
  tool_calls: undefined,
  
  tool_results: toolResults || [],
  stream_timeline: cleanedTimeline,
  timestamp: new Date().toISOString()
};
```

#### 2. `src/services/llm/providers/implementations/xai.ts`

**Ajouter une validation de sécurité:**

```typescript
// Ligne 656-670
if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
  // ✅ SÉCURITÉ: Ne réinjecter tool_calls QUE si pas de tool_results
  // Si tool_results présents → tool_calls déjà résolus
  if (!msg.tool_results || msg.tool_results.length === 0) {
    messageObj.tool_calls = msg.tool_calls as ToolCall[];
  } else {
    logger.warn(`[XAIProvider] ⚠️ Skipping tool_calls (already resolved with ${msg.tool_results.length} results)`);
  }
}
```

#### 3. `src/services/llm/providers/implementations/groq.ts`

**Même validation:**

```typescript
// Ligne 417-419
if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
  // ✅ SÉCURITÉ: Ne réinjecter tool_calls QUE si pas de tool_results
  if (!msg.tool_results || msg.tool_results.length === 0) {
    messageObj.tool_calls = msg.tool_calls as ToolCall[];
  } else {
    logger.warn(`[GroqProvider] ⚠️ Skipping tool_calls (already resolved)`);
  }
}
```

---

## 🧪 TESTS DE VALIDATION

### Test 1: Tool Call Simple

```
User: "Crée une note sur les pommes"
Assistant: [tool_call create_note] → Note créée
Assistant: "Votre note a été créée avec succès !"
User: "Merci"
Assistant: "De rien !" (PAS de nouveau tool_call) ✅
```

### Test 2: Tool Calls Multiples

```
User: "Crée 3 notes: pommes, bananes, oranges"
Assistant: [tool_call create_note] x3 → 3 notes créées
Assistant: "Vos 3 notes ont été créées !"
User: "Parfait, merci"
Assistant: "Content de vous aider !" (PAS de répétition) ✅
```

### Test 3: Édition + Tool Call

```
User: "Crée une note pommes"
Assistant: [tool_call] → Note créée
User: [édite message] "Non, plutôt sur les poires"
Assistant: [tool_call] → Note poires créée (1 seule fois) ✅
```

---

## 📊 IMPACT

### Avant Fix

```
Messages DB après "Crée note pommes":
┌─────────────────────────────────────────────────────────┐
│ assistant                                               │
│ content: "Note créée"                                   │
│ tool_calls: [{id: "call_123", name: "create_note"}]    │ ⚠️
│ tool_results: [{tool_call_id: "call_123", success: T}] │
└─────────────────────────────────────────────────────────┘

Next request ("Merci"):
→ LLM voit tool_calls
→ Exécute create_note ENCORE
→ Note dupliquée ❌
```

### Après Fix

```
Messages DB après "Crée note pommes":
┌─────────────────────────────────────────────────────────┐
│ assistant                                               │
│ content: "Note créée"                                   │
│ tool_calls: undefined                                   │ ✅
│ tool_results: [{tool_call_id: "call_123", success: T}] │
└─────────────────────────────────────────────────────────┘

Next request ("Merci"):
→ LLM ne voit PAS de tool_calls
→ Répond normalement
→ Pas de doublon ✅
```

---

## ⚠️ MIGRATION DONNÉES EXISTANTES

**Optionnel:** Nettoyer les messages existants en DB

```sql
-- Supprimer tool_calls des messages avec tool_results
UPDATE chat_messages
SET tool_calls = NULL
WHERE role = 'assistant'
  AND tool_calls IS NOT NULL
  AND tool_results IS NOT NULL
  AND jsonb_array_length(tool_results) > 0;
```

**Note:** Pas obligatoire si Solution 1 + validation providers sont implémentées.

---

## 🎯 PRIORITÉ

**CRITIQUE** 🔴

**À faire IMMÉDIATEMENT:**
1. Implémenter Solution 1 (useChatHandlers)
2. Ajouter validations providers (xai.ts, groq.ts)
3. Tester les 3 scénarios
4. Déployer en urgence

**Temps estimé:** 30 minutes  
**Risque:** FAIBLE (fix défensif)

---

## 📝 CONCLUSION

Le bug est causé par la **persistance des `tool_calls` sur le message assistant final**.

Quand cet historique est rechargé, le LLM voit les `tool_calls` et pense qu'ils sont encore en attente d'exécution.

**Fix:** Supprimer `tool_calls` du message final (garder seulement `tool_results`).

**Alternative défensive:** Filtrer `tool_calls` si `tool_results` présents dans les providers.

---

**Auteur:** Jean-Claude (Senior Dev)  
**Date:** 29 Octobre 2025  
**Sévérité:** CRITIQUE  
**Status:** FIX PRÊT

