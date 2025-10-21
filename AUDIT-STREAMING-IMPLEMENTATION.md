# Audit Streaming Implementation - Oct 21, 2025

## 📊 Score Global : 7/10

### ✅ Points Forts (Ce qui marche)

#### 1. Architecture Backend (8/10)
- ✅ Route SSE propre (`/api/chat/llm/stream`)
- ✅ XAIProvider avec AsyncGenerator
- ✅ Boucle agentic multi-turn (max 5 rounds)
- ✅ Gestion finish_reason correcte (`stop`, `tool_calls`, `length`)
- ✅ Chargement tools OpenAPI + MCP
- ✅ Chargement agent depuis table `agents` (3 fallbacks)
- ✅ SystemMessageBuilder avec contexte UI
- ✅ Pas de TODO, pas de `any[]`, pas d'erreurs linter
- ✅ Error handling avec try/catch partout

**Problèmes** :
- ⚠️ Tool executor créé à chaque loop (devrait être réutilisé)
- ⚠️ Accumulation progressive des tool_calls peut causer doublons si chunks malformés

#### 2. Architecture Frontend (7/10)
- ✅ useChatResponse avec flag `useStreaming`
- ✅ Déduplication tool calls par ID (Map)
- ✅ Gestion événements SSE (start, delta, tool_execution, tool_result, done)
- ✅ Callbacks pour UI (onStreamChunk, onToolExecution, etc.)
- ✅ Compatibilité mode classique maintenue

**Problèmes** :
- ❌ CRITIQUE : `currentRoundContent` pas réinitialisé correctement entre rounds
- ❌ Accumulation texte Round 1 + Round 2 dans certains cas
- ⚠️ shouldReplaceContentRef peut être désynchronisé
- ⚠️ streamingState closure problem (état pas à jour dans setStreamingContent)

#### 3. UX & UI (6/10)
- ✅ Affichage progressif token par token
- ✅ Scroll auto fluide avec requestAnimationFrame
- ✅ StreamingIndicator avec états visuels
- ✅ Dark mode support
- ✅ skipToolCallPersistence pour éviter doublons

**Problèmes** :
- ❌ Ordre messages chaotique (Round 1 + Round 2 parfois mélangés)
- ❌ Message temporaire disparaît/réapparaît
- ⚠️ Indicateur trop rapide (visible < 1s)
- ⚠️ Pas de feedback pendant exécution longue (>2s)

#### 4. Prompt Engineering (7/10)
- ✅ Instructions "Expliquer avant tool call"
- ✅ Instructions gestion erreurs
- ✅ Interdiction XML
- ✅ Ajouté à la fin (pas écrase instructions agent)

**Problèmes** :
- ⚠️ LLM n'obéit pas toujours (hallucination XML après erreurs)
- ⚠️ Pas de few-shot examples concrets

---

## ❌ Problèmes Critiques Identifiés

### 1. **Accumulation Texte Entre Rounds** (CRITIQUE)
**Symptôme** : "Je vais... J'ai trouvé..." au lieu de juste "J'ai trouvé..."

**Cause** :
- `setStreamingContent(prev => prev + chunk)` accumule TOUJOURS
- `shouldReplaceContentRef` n'est pas fiable (closure)
- État `streamingState` pas à jour dans la closure de `setStreamingContent`

**Solution proposée** :
```typescript
// Au lieu de useRef, utiliser un state dédié
const [shouldResetContent, setShouldResetContent] = useState(false);

// Dans onToolExecution
setShouldResetContent(true);

// Dans onStreamChunk
setStreamingContent(prev => {
  if (shouldResetContent) {
    setShouldResetContent(false);
    return chunk; // REMPLACER
  }
  return prev + chunk; // ACCUMULER
});
```

### 2. **Tool Executor Inefficace** (MOYEN)
**Problème** : Créé à chaque itération de la boucle tool execution
```typescript
for (const toolCall of accumulatedToolCalls) {
  const toolExecutor = new ApiV2ToolExecutor(); // ❌ Recréé à chaque fois
}
```

**Solution** : Créer une fois avant la boucle

### 3. **Pas de Timeout sur Stream** (MOYEN)
**Problème** : Si xAI ne répond jamais, le stream reste ouvert indéfiniment

**Solution** : AbortController avec timeout 60s

### 4. **XML Hallucination** (MINEUR)
**Problème** : LLM écrit `<xai:function_call>` après erreurs

**Cause** : Confusion après erreurs tool
**Solution** : Renforcer prompt avec exemples négatifs

---

## 🔍 Comparaison Système Ancien vs Nouveau

### Ancien (Route classique `/api/chat/llm`)
- ✅ Robuste et testé
- ✅ Pas d'accumulation texte
- ✅ Ordre messages correct
- ❌ Pas de streaming
- ❌ UX moins fluide

### Nouveau (Route streaming `/api/chat/llm/stream`)
- ✅ Streaming SSE fonctionnel
- ✅ Affichage progressif
- ✅ UI think-aloud
- ❌ Accumulation texte entre rounds
- ❌ Ordre messages chaotique
- ❌ Plus complexe (462 lignes vs 374)

**Verdict** : Le nouveau est **plus ambitieux** mais **moins stable** que l'ancien.

---

## 🎯 Recommandations

### Option A : Fixes Minimaux (2h)
1. Fix accumulation texte avec state au lieu de ref
2. Timeout sur stream
3. Tool executor réutilisé

**Résultat** : Système robuste à 8/10

### Option B : Abandon Streaming (1h)
1. Désactiver `useStreaming: false`
2. Garder route classique
3. Supprimer indicateurs UI

**Résultat** : Retour système stable à 9/10, perte streaming

### Option C : Refonte Streaming (8h)
1. Réimplémenter avec approche différente
2. State machine strict pour rounds
3. Tests complets

**Résultat** : Système parfait à 10/10

---

## 💡 Mon Avis Honnête

Le streaming **fonctionne** mais il est **fragile**. Les problèmes :
- Accumulation texte (reproductible)
- Ordre messages (cosmétique mais gênant)
- Complexité accrue (maintenabilité)

**Si c'était mon projet** :
- Je garderais le streaming pour l'UX
- Je ferais **Option A** (fixes minimaux 2h)
- Je vivrais avec les imperfections mineures

**Ou sinon** :
- Retour à l'ancien système (stable)
- On garde le code streaming pour plus tard

**Ton call** : Tu veux qu'on fixe les problèmes critiques (Option A), qu'on abandonne le streaming (Option B), ou tu es OK avec l'état actuel ?

