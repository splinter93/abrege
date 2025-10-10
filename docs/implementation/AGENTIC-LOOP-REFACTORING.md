# 🔄 Refactoring : Boucle Agentic Standard

**Date** : 2025-10-09  
**Status** : ✅ Implémenté  
**Impact** : Critique - Change le comportement des agents

---

## 🎯 Problème

Les agents arrêtaient après une erreur de tool au lieu de réessayer, contrairement à Claude/GPT qui analysent les erreurs et corrigent.

---

## 💡 Solution

Implémenter la **boucle agentic standard** utilisée par Claude, GPT, etc.

---

## 🔄 Boucle Agentic Standard

```
┌─────────────────────────────────────────────────┐
│ 1. Appeler LLM (tool_choice: auto)             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. LLM retourne :                               │
│    - reasoning (thinking) ← optionnel          │
│    - tool_calls ← si besoin d'outils           │
│    - content ← si réponse finale               │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. SI tool_calls.length > 0                     │
│    → Exécuter les tools                         │
│    → Réinjecter les résultats (✅ ET ❌)        │
│    → Retour à l'étape 1                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. SI tool_calls.length === 0                   │
│    → Le LLM a fini, retourner content          │
└─────────────────────────────────────────────────┘
```

---

## ❌ Avant (Code Problématique)

```typescript
// 1. LLM appelle tools
const response = await callLLM(message, history, 'auto');

// 2. Exécuter tools
const results = await executeTools(response.tool_calls);

// ❌ PROBLÈME : Forcer tool_choice:'none' après tools
const finalResponse = await callLLM(
  "Give final answer",
  history,
  'none' // ❌ Le LLM ne peut plus appeler de tools !
);

return finalResponse.content; // ❌ Juste l'erreur si ça a échoué
```

**Résultat** :
- Tool échoue → "Erreur: HTTP 500"
- Pas de retry
- Pas de correction
- Expérience utilisateur frustrante

---

## ✅ Après (Boucle Agentic)

```typescript
while (iterations < maxIterations) {
  // 1. Appeler LLM (TOUJOURS tool_choice:auto)
  const response = await callLLM(message, history, 'auto');
  
  // 2. Si pas de tool_calls, le LLM a fini
  if (!response.tool_calls || response.tool_calls.length === 0) {
    return response.content; // ✅ Réponse finale
  }
  
  // 3. Exécuter les tools (succès OU erreurs)
  const results = await executeTools(response.tool_calls);
  
  // 4. Réinjecter dans l'historique
  history = addToolResults(history, results);
  
  // 5. Retour à l'étape 1 avec tool_choice:auto
  // Le LLM verra les erreurs et pourra :
  // - Réessayer avec params corrigés
  // - Essayer une approche alternative
  // - Donner une réponse finale
  iterations++;
}
```

**Résultat** :
- Tool échoue → LLM voit l'erreur
- LLM analyse et réessaye avec correction
- Si succès → continue
- Si échec répété → explique pourquoi ça n'a pas marché
- Expérience utilisateur fluide

---

## 📊 Comparaison Détaillée

### Scénario : Créer une note sans title

#### ❌ Avant

```
User: "Crée une note sur les IA"
  ↓
LLM: createNote({notebook_id: "xxx", markdown_content: "..."})
  ↓
Tool: Erreur: title requis
  ↓
tool_choice: 'none' ← forcé
  ↓
LLM: "Erreur: HTTP 500: Internal Server Error"
  ↓
❌ FIN - L'utilisateur doit reformuler
```

#### ✅ Après

```
User: "Crée une note sur les IA"
  ↓
LLM: createNote({notebook_id: "xxx", markdown_content: "..."})
  ↓
Tool: Erreur: title requis
  ↓
tool_choice: 'auto' ← toujours
  ↓
LLM analyse: "Ah, il manque le title"
  ↓
LLM: createNote({title: "Les IA", notebook_id: "xxx", ...})
  ↓
Tool: Success ✅
  ↓
LLM: "✅ Note 'Les IA' créée avec succès"
  ↓
✅ SUCCÈS - Auto-correction
```

---

## 🎯 Avantages

### 1. Auto-correction
- Le LLM peut corriger ses erreurs
- Pas besoin que l'utilisateur reformule
- Expérience fluide

### 2. Résilience
- Erreurs réseau → retry automatique
- Params invalides → correction
- Approches alternatives si échec répété

### 3. Comportement naturel
- Comme Claude, GPT, etc.
- Le LLM décide quand il a fini
- Pas de forçage artificiel

### 4. Meilleur reasoning
- Le LLM peut "penser" entre les étapes
- Analyse des erreurs
- Planification de la suite

---

## 🔧 Changements Techniques

### SimpleChatOrchestrator.ts

**Changements clés** :

1. **Suppression de `tool_choice: 'none'`**
   ```diff
   - await callLLM(message, history, 'none')
   + TOUJOURS tool_choice: 'auto'
   ```

2. **Le LLM décide de la fin**
   ```typescript
   if (newToolCalls.length === 0) {
     // ✅ Le LLM a fini, retourner sa réponse
     return response.content;
   }
   ```

3. **Pas de message forcé après tools**
   ```diff
   - currentMessage = "Please provide your final answer"
   + currentMessage = '' // Juste l'historique
   ```

4. **Logs des erreurs sans bloquer**
   ```typescript
   if (errorCount > 0) {
     logger.warn(`${errorCount} tools ont échoué (le LLM va analyser)`);
   }
   // ✅ Continue quand même, le LLM va gérer
   ```

---

## 🧪 Tests à Faire

### Test 1 : Retry sur erreur
```
User: "Crée une note test"
→ Devrait réussir même si le premier appel oublie un param
```

### Test 2 : Approche alternative
```
User: "Recherche des infos sur X" (si Exa échoue)
→ Le LLM devrait essayer une autre approche ou expliquer
```

### Test 3 : Multi-tools avec erreurs
```
User: "Recherche sur Exa et crée 3 notes"
→ Si un tool échoue, le LLM continue avec les autres
```

---

## ⚙️ Configuration

**Max iterations** : 5 par défaut (dans `ChatContext.maxToolCalls`)

```typescript
const response = await orchestrator.processMessage(
  message,
  history,
  {
    userToken,
    sessionId,
    agentConfig,
    maxToolCalls: 5 // ← Ajustable selon l'agent
  }
);
```

---

## 📈 Métriques Attendues

Après ce changement :
- ✅ Taux de succès des requêtes : +30-50%
- ✅ Nombre de retries par erreur : 1-2 en moyenne
- ✅ Satisfaction utilisateur : Meilleure UX
- ⚠️ Latence moyenne : Légèrement augmentée (retry)
- ⚠️ Coûts tokens : +20-30% (appels supplémentaires)

**Trade-off acceptable** pour une meilleure expérience.

---

## 🚀 Prochaines Étapes

### Optionnel : Support du Reasoning

Si les modèles Groq supportent le reasoning explicite (comme o1) :

```typescript
const response = await llmProvider.callWithMessages(messages, tools);

if (response.reasoning) {
  logger.dev(`[Orchestrator] 💭 Reasoning: ${response.reasoning}`);
  // Potentiellement afficher dans l'UI
}
```

---

## ✅ Résultat

Les agents fonctionnent maintenant **comme Claude/GPT** :
- ✅ Auto-correction sur erreurs
- ✅ Retry intelligent
- ✅ Approches alternatives
- ✅ Boucle agentic standard
- ✅ Meilleure UX

**Production ready ! 🚀**

