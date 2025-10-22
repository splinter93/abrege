# 🎯 TOOL CALLS : EXPLICATION ULTRA SIMPLE

**Pour comprendre en 5 minutes ce bordel** 🤯

---

## 🎬 LE CYCLE EN 4 ÉTAPES SIMPLES

### **1️⃣ Le LLM dit "Je vais faire X"**

```
┌─────────────────────────────────────┐
│ ASSISTANT                            │
│ "Je vais lire le fichier README.md" │
└─────────────────────────────────────┘
```

**Affichage** : Message temporaire qui se remplit progressivement (streaming)

---

### **2️⃣ Le LLM lance des tool calls**

```
┌─────────────────────────────────────┐
│ ASSISTANT                            │
│ "Je vais lire le fichier README.md" │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🔧 TOOL CALL: read_file         │ │ ← APPARAÎT
│ │ Arguments: { file: "README.md" }│ │
│ │ Status: ⏳ En cours...          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

🔄 Executing 1 tool...  ← Indicateur en dessous
```

**Affichage** : 
- Tool calls ajoutés au message temporaire
- Indicateur "Executing..." apparaît EN BAS

---

### **3️⃣ Les tools s'exécutent (backend)**

**Pendant ce temps** : L'indicateur reste affiché, les tool calls aussi

```
⏳ Backend lit le fichier...
⏳ Backend retourne le résultat...
⏳ LLM reçoit le résultat et commence le Round 2...
```

---

### **4️⃣ Le LLM répond avec le résultat**

```
┌─────────────────────────────────────┐
│ ASSISTANT                            │
│ "Voici le contenu du fichier :"     │ ← NOUVEAU texte
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ 🔧 TOOL CALL: read_file         │ │ ← TOUJOURS LÀ (avec notre fix)
│ │ Arguments: { file: "README.md" }│ │
│ │ ✅ Result: "# README\n..."      │ │ ← Résultat ajouté
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Affichage** :
- Le texte CHANGE ("Je vais..." → "Voici...")
- Les tool calls RESTENT (avec notre fix ✅)
- Le résultat apparaît dans le tool call

---

## 🎭 LES 3 "ACTEURS" QUI JOUENT

### **Acteur 1 : Message Temporaire** (Pendant le streaming)

**Rôle** : Afficher le texte qui arrive progressivement + les tool calls

**Durée de vie** :
- **Naissance** : Dès que le stream commence
- **Évolution** : Se remplit au fur et à mesure (chunks)
- **Enrichissement** : Tool calls ajoutés quand détectés
- **Transformation** : Texte remplacé au Round 2 (MAIS tool calls gardés avec notre fix ✅)
- **Mort** : Dès que le stream se termine

**Code** : `streamingMessageTemp` (état React local)

---

### **Acteur 2 : Indicateur "Executing..."** (Pendant l'exécution)

**Rôle** : Dire "je suis en train d'exécuter X tools"

**Durée de vie** :
- **Naissance** : Dès que les tool calls commencent à s'exécuter
- **Mort** : Dès que le Round 2 commence (premier chunk de réponse)

**Code** : `<StreamingIndicator>` (composant conditionnel)

---

### **Acteur 3 : Message Final** (Après le streaming)

**Rôle** : Le message définitif sauvegardé dans la base de données

**Durée de vie** :
- **Naissance** : Quand le stream se termine (`onComplete`)
- **Immortalité** : Reste pour toujours dans le store + DB

**Code** : Message dans `currentSession.thread`

**Contient** :
- `content`: "Voici le contenu du fichier..."
- `tool_calls`: [{ id, function: { name, arguments } }]
- `tool_results`: [{ tool_call_id, name, content, success }]

---

## 🎯 CE QUI ÉTAIT CASSÉ (AVANT)

### **Problème 1 : Tool Calls Perdus** ❌

```typescript
// Dans useChatResponse.ts
onComplete?.(content, reasoning, [], []); // ← Tableaux VIDES
```

**Résultat** : Le message final n'avait JAMAIS les tool_calls

**Fix** : Collecter TOUS les tool_calls dans un Map global et les passer à `onComplete`

---

### **Problème 2 : Tool Calls Disparaissent au Round 2** ❌

```typescript
// Round 2
setStreamingMessageTemp({
  role: 'assistant',
  content: chunk, // Nouveau texte
  // ❌ Pas de tool_calls ici
});
setCurrentToolCalls([]); // ❌ Clear
```

**Résultat** : Flash désagréable (tool calls disparaissent puis réapparaissent)

**Fix** : Préserver les tool_calls du message temporaire précédent

---

## ✅ CE QUI EST CORRIGÉ (MAINTENANT)

### **Fix 1 : Collection Globale** ✅

```typescript
// Dans useChatResponse.ts
const allToolCalls = new Map(); // Tous les tool calls
const allToolResults = []; // Tous les results

// À chaque tool call détecté
allToolCalls.set(tc.id, toolCall);

// À chaque result reçu
allToolResults.push(toolResult);

// À la fin
onComplete?.(content, reasoning, 
  Array.from(allToolCalls.values()), // ✅ Tous les tool calls
  allToolResults // ✅ Tous les results
);
```

---

### **Fix 2 : Préservation au Round 2** ✅

```typescript
// Dans ChatFullscreenV2.tsx
if (isNewRound) {
  setStreamingMessageTemp(prevMsg => ({
    role: 'assistant',
    content: chunk, // ✅ Nouveau texte
    tool_calls: prevMsg?.tool_calls // ✅ GARDER les tool calls
  }));
}
```

---

## 🎬 TIMELINE FINALE (AVEC TOUS LES FIXES)

```
T0:  User envoie "Lis README.md"
     └─> Message user ajouté au thread

T1:  Stream démarre
     └─> Message temporaire créé (vide)

T2:  Chunks arrivent
     └─> "Je vais lire..."

T3:  Tool calls détectés
     └─> Tool calls ajoutés au message temporaire
     └─> "Je vais lire..." + [🔧 Tool Call: read_file]

T4:  Exécution commence
     └─> Indicateur apparaît : "🔄 Executing 1 tool..."

T5:  Backend exécute read_file
     └─> (L'UI ne change pas, indicateur toujours là)

T6:  Tool result reçu
     └─> (L'UI ne change pas encore)

T7:  Round 2 - Nouveaux chunks
     └─> Texte remplacé : "Voici le contenu..."
     └─> Tool calls GARDÉS ✅ : [🔧 Tool Call: read_file] toujours là
     └─> Indicateur disparaît

T8:  Stream se termine
     └─> Message temporaire supprimé
     └─> onComplete appelé

T9:  Message final créé
     └─> Ajouté au store avec tool_calls + tool_results
     └─> Affiché avec [🔧 Tool Call + ✅ Result]

T10: Message persisté en DB
     └─> Reste pour toujours
```

---

## 🎨 RENDU VISUEL FINAL

### **Ce que tu vois en temps réel** :

```
1. "Je vais lire..."
   ↓ (0.2s)

2. "Je vais lire..."
   [🔧 Tool Call: read_file]
   ↓ (0.1s)

3. "Je vais lire..."
   [🔧 Tool Call: read_file]
   🔄 Executing 1 tool...
   ↓ (1s - backend exécute)

4. "Voici le contenu..."
   [🔧 Tool Call: read_file]  ← Toujours là ✅
   ↓ (0.5s - chunks arrivent)

5. "Voici le contenu du fichier :
   Lorem ipsum dolor sit amet..."
   [🔧 Tool Call: read_file
    ✅ Result: "# README\nContent..."]
   
   ✅ FINAL - Reste comme ça pour toujours
```

---

## 🧩 LES PIÈCES DU PUZZLE

### **Backend** (API)
- `/api/chat/llm/stream` : Envoie les chunks SSE
- Chunks contiennent : `content`, `tool_calls`, `tool_results`

### **Hook de Streaming** (useChatResponse.ts)
- Parse les chunks
- Collecte TOUS les tool_calls dans `allToolCalls`
- Collecte TOUS les tool_results dans `allToolResults`
- Passe tout à `onComplete` à la fin

### **Orchestrateur UI** (ChatFullscreenV2.tsx)
- Gère le message temporaire (`streamingMessageTemp`)
- Gère l'état local (`currentToolCalls`)
- Appelle `handleComplete` avec les bonnes données

### **Persistance** (useChatHandlers.ts)
- Crée le message final avec tool_calls + tool_results
- Appelle `addMessage` du store

### **Store** (useChatStore.ts)
- Ajoute le message au thread
- Spread préserve toutes les propriétés (tool_calls, tool_results)
- Persiste en DB via `sessionSyncService`

### **Affichage** (ChatMessage.tsx)
- Vérifie si `message.tool_calls` existe
- Affiche `<ToolCallMessage>` si présent
- Récupère les tool_results associés

---

## 🎯 CE QU'IL FAUT RETENIR

1. **Pendant le streaming** : Message temporaire (UI only) qui évolue
2. **Pendant l'exécution** : Indicateur "Executing..." s'affiche
3. **Après le streaming** : Message final (persistant) avec TOUT
4. **Les tool calls restent visibles** : Du début à la fin (avec nos fixes ✅)
5. **Tout est persisté en DB** : Le message final est complet

---

## 🚀 RÉSULTAT

**UX fluide et sans surprise** :
- ✅ Les tool calls apparaissent
- ✅ Ils RESTENT visibles pendant tout le cycle
- ✅ Le résultat s'ajoute à la fin
- ✅ Tout persiste après refresh

**Fini le bordel !** 🎉


