# AUDIT - CHARGEMENT CONVERSATIONS CHAT

**Date :** 5 novembre 2025  
**Symptômes rapportés :**
1. Click sur conversation → Ne charge pas (obligé de cliquer sur une autre puis revenir)
2. Ouverture avec agent favori → Ne charge pas la nouvelle session

---

## 🔍 ANALYSE ARCHITECTURE

### Flow de navigation conversation

```
User click conversation
  → handleSelectSession(session)
    → setCurrentSession(session)  [SYNCHRONE]
      → useEffect [sessionId] détecte changement
        → clearMessages()
        → loadInitialMessages()
          → Fetch /api/chat/sessions/{id}/messages/recent
            → setMessages(result)
            → isInitializedRef.current = true
```

### Flow création session avec agent

```
User click agent
  → handleSelectAgent(agent)
    → if (isCreatingSession) return  [PROTECTION RACE]
    → setIsCreatingSession(true)
    → createSession(name, agentId)
      → sessionSyncService.createSessionAndSync()
        → Fetch POST /api/chat/sessions
        → set({ currentSession: newSession })
          → useEffect [sessionId] détecte changement
            → loadInitialMessages()
```

---

## 🔴 PROBLÈMES IDENTIFIÉS

### 1. Race condition sur chargement messages

**Fichier :** `src/hooks/useInfiniteMessages.ts` (ligne 252-256)

**Code problématique :**
```typescript
useEffect(() => {
  if (sessionId && enabled && !isInitializedRef.current) {
    loadInitialMessages();
  }
}, [sessionId, enabled, loadInitialMessages]);
```

**Problème :**
- ✅ Charge messages si `!isInitializedRef.current`
- ❌ Si chargement ÉCHOUE, `isInitializedRef` reste `false`
- ❌ MAIS le `useEffect` ne retry PAS car `sessionId` n'a pas changé
- ❌ User obligé de cliquer autre conversation puis revenir pour trigger le `useEffect`

**Impact :** 🔴 CRITIQUE  
**Probabilité :** MOYENNE (erreur réseau, timeout)

**Solution requise :**
```typescript
useEffect(() => {
  // ✅ Reset isInitializedRef quand sessionId change
  isInitializedRef.current = false;
  
  if (sessionId && enabled) {
    loadInitialMessages();
  }
}, [sessionId, enabled, loadInitialMessages]);
```

---

### 2. Pas de retry automatique sur échec

**Fichier :** `src/hooks/useInfiniteMessages.ts` (ligne 119-126)

**Code problématique :**
```typescript
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
  setError(errorMessage);
  logger.error('[useInfiniteMessages] ❌ Erreur chargement initial:', err);
} finally {
  setIsLoading(false);
  loadingRef.current = false;
}
// ❌ Pas de retry automatique
```

**Problème :**
- Si fetch échoue (réseau, timeout, 500), l'erreur est logged
- MAIS aucun retry automatique
- User doit manuellement changer de conversation pour retry

**Impact :** 🔴 CRITIQUE  
**Solutions possibles :**

**Option A : Retry automatique (3 tentatives) :**
```typescript
const MAX_RETRIES = 3;
let retryCount = 0;

const loadWithRetry = async () => {
  try {
    await loadInitialMessages();
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.warn(`[useInfiniteMessages] 🔁 Retry ${retryCount}/${MAX_RETRIES}`);
      setTimeout(() => loadWithRetry(), 1000 * retryCount); // Backoff exponentiel
    } else {
      setError('Impossible de charger les messages après 3 tentatives');
    }
  }
};
```

**Option B : Bouton retry manuel :**
```typescript
// Afficher UI d'erreur avec bouton "Réessayer"
if (error) {
  return <ErrorRetry error={error} onRetry={loadInitialMessages} />;
}
```

---

### 3. clearMessages() dans cleanup peut causer flicker

**Fichier :** `src/hooks/useInfiniteMessages.ts` (ligne 261-267)

**Code problématique :**
```typescript
useEffect(() => {
  return () => {
    if (sessionId) {
      clearMessages(); // ❌ Clear au unmount du hook
    }
  };
}, [sessionId, clearMessages]);
```

**Problème :**
- Quand `sessionId` change, le cleanup s'exécute
- `clearMessages()` vide l'affichage
- PUIS le nouveau `loadInitialMessages()` charge
- → **FLICKER** : écran vide pendant le chargement

**Impact :** 🟡 MOYEN (UX)

**Solution :**
```typescript
// Déplacer clearMessages AVANT le loadInitialMessages
useEffect(() => {
  if (sessionId && enabled) {
    clearMessages(); // ✅ Clear AVANT de charger
    loadInitialMessages();
  }
}, [sessionId, enabled]);
```

---

### 4. Pas de timeout sur fetch messages

**Fichier :** `src/hooks/useInfiniteMessages.ts` (ligne 90-97)

**Code problématique :**
```typescript
const response = await fetch(
  `/api/chat/sessions/${sessionId}/messages/recent?limit=${initialLimit}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
// ❌ Pas de timeout → Peut freeze indéfiniment
```

**Impact :** 🟡 MOYEN  
**Probabilité :** FAIBLE (API rapide en général)

**Solution :**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
  const response = await fetch(url, {
    headers: { ... },
    signal: controller.signal
  });
  clearTimeout(timeoutId);
} catch (err) {
  if (err.name === 'AbortError') {
    throw new Error('Timeout: Chargement trop long');
  }
  throw err;
}
```

---

### 5. setCurrentSession synchrone sans validation

**Fichier :** `src/store/useChatStore.ts` (ligne 59-62)

**Code problématique :**
```typescript
setCurrentSession: (session: ChatSession | null) => set({ 
  currentSession: session,
  agentNotFound: false
}),
```

**Problème :**
- Changement de session IMMÉDIAT (synchrone)
- Pas de vérification si session existe en DB
- Pas de loading state pendant chargement messages

**Impact :** 🟡 MOYEN

**Solution :**
```typescript
setCurrentSession: async (session: ChatSession | null) => {
  // ✅ Validation existence session
  if (session) {
    const exists = await sessionSyncService.sessionExists(session.id);
    if (!exists) {
      logger.error('[ChatStore] Session introuvable:', session.id);
      set({ error: 'Conversation introuvable' });
      return;
    }
  }
  
  set({ 
    currentSession: session,
    agentNotFound: false,
    loading: true // ✅ Loading pendant chargement messages
  });
};
```

---

### 6. Création session agent - Pas de feedback visuel

**Fichier :** `src/components/chat/SidebarUltraClean.tsx` (ligne 68-101)

**Code actuel :**
```typescript
const handleSelectAgent = async (agent: Agent) => {
  if (isCreatingSession) return; // ✅ Protection race OK
  
  setIsCreatingSession(true);
  
  try {
    const newSession = await createSession('Nouvelle conversation', agent.id);
    // ...
  } finally {
    setIsCreatingSession(false);
  }
};
```

**Problème :**
- `isCreatingSession` bloque les clics ✅
- MAIS aucun feedback visuel (spinner, disabled state)
- User ne sait pas si son clic a marché
- Peut cliquer plusieurs fois sans comprendre

**Impact :** 🟡 MOYEN (UX)

**Solution :**
```typescript
// Dans le JSX
<button
  onClick={() => handleSelectAgent(agent)}
  disabled={isCreatingSession}
  className={`agent-item ${isCreatingSession ? 'creating' : ''}`}
>
  {isCreatingSession ? (
    <><Spinner size="sm" /> Création...</>
  ) : (
    <>{agent.display_name}</>
  )}
</button>
```

---

### 7. Messages cleanup trop agressif

**Fichier :** `src/components/chat/ChatFullscreenV2.tsx` (ligne 445-462)

**Code :**
```typescript
useEffect(() => {
  if (currentSession?.id && currentSession.id !== previousSessionIdRef.current) {
    animations.setDisplayedSessionId(null);
    animations.resetAnimation();
    clearInfiniteMessages(); // ❌ Clear immédiat
    streamingState.reset();
    previousSessionIdRef.current = currentSession.id;
  }

  if (!isLoadingMessages && !animations.displayedSessionId && currentSession?.id) {
    animations.setDisplayedSessionId(currentSession.id);
  }
}, [currentSession?.id, ...]);
```

**Problème :**
- `clearInfiniteMessages()` vide immédiatement l'affichage
- Écran vide pendant chargement nouveaux messages
- Flicker / flash blanc désagréable

**Impact :** 🟡 MOYEN (UX)

**Solution :**
```typescript
// Option 1: Skeleton loader
if (isLoadingMessages && messages.length === 0) {
  return <MessagesSkeleton count={3} />;
}

// Option 2: Fade out/in
animations.fadeOut(); // Fade out anciens messages
await loadMessages(); // Charger nouveaux
animations.fadeIn();  // Fade in nouveaux messages
```

---

## 📊 RÉSUMÉ PROBLÈMES

| Problème | Priorité | Impact | Probabilité | Effort Fix |
|----------|----------|--------|-------------|------------|
| isInitializedRef bloque retry | 🔴 HAUTE | BLOQUANT | MOYENNE | 15 min |
| Pas de retry auto | 🔴 HAUTE | BLOQUANT | MOYENNE | 1h |
| Pas de timeout fetch | 🟡 MOYENNE | Freeze | FAIBLE | 30 min |
| clearMessages flicker | 🟡 MOYENNE | UX | HAUTE | 1h |
| Pas de feedback création | 🟡 MOYENNE | UX | HAUTE | 30 min |
| setCurrentSession sync | 🟢 BASSE | Edge case | FAIBLE | 1h |

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Phase 1 : URGENT (Fixes critiques)

**1. Fix isInitializedRef (15 min)**
```typescript
// Reset isInitializedRef au changement de sessionId
useEffect(() => {
  isInitializedRef.current = false;
  if (sessionId && enabled) {
    loadInitialMessages();
  }
}, [sessionId, enabled, loadInitialMessages]);
```

**2. Ajouter retry automatique (1h)**
- Retry 3x avec backoff exponentiel (1s, 2s, 4s)
- Logger chaque tentative
- Afficher erreur finale si échec total

**3. Ajouter timeout fetch (30 min)**
- AbortController avec 10s timeout
- Message erreur clair "Timeout: chargement trop long"

**Total Phase 1 : ~2h**

---

### Phase 2 : UX (Feedback visuel)

**4. Skeleton loader messages (1h)**
- Afficher 3 skeletons pendant `isLoadingMessages`
- Fade in quand messages chargés
- Pas de flicker

**5. Feedback création session (30 min)**
- Spinner sur agent pendant création
- Button disabled
- Message "Création de la conversation..."

**Total Phase 2 : ~1.5h**

---

### Phase 3 : Robustesse (Nice-to-have)

**6. Validation session existence (1h)**
- Vérifier session existe avant de charger
- Fallback si session supprimée

**Total Phase 3 : ~1h**

---

## 🚨 RISQUES ACTUELS EN PRODUCTION

| Risque | Probabilité | Impact | Mitigation actuelle |
|--------|-------------|--------|---------------------|
| **Conversation ne charge pas au 1er clic** | MOYENNE | CRITIQUE | ❌ Aucune (user clique ailleurs) |
| **Nouvelle session agent ne charge pas** | MOYENNE | CRITIQUE | ❌ Aucune |
| **Freeze si API lente** | FAIBLE | MOYEN | ❌ Aucune (pas de timeout) |
| **Flicker changement conversation** | HAUTE | MOYEN | ⚠️ Partiel (animations) |
| **User ne sait pas si création en cours** | HAUTE | FAIBLE | ⚠️ Partiel (isCreatingSession bloque) |

**Risques critiques : 2/5** 🔴

---

## 💡 ROOT CAUSE PRINCIPAL

**Le problème N°1 (conversation ne charge pas) est causé par :**

```typescript
// ❌ PROBLÈME
useEffect(() => {
  if (sessionId && enabled && !isInitializedRef.current) {
    loadInitialMessages();
  }
}, [sessionId, enabled, loadInitialMessages]);
```

**Scénario d'échec :**
1. User click conversation A
2. `loadInitialMessages()` appelé
3. Fetch échoue (timeout, 500, réseau)
4. `isInitializedRef` reste `false` (ligne 111 jamais atteinte)
5. `loadingRef` passe à `false` (ligne 125)
6. User click conversation A à nouveau
7. `useEffect` NE SE DÉCLENCHE PAS (sessionId identique)
8. Messages jamais chargés

**Fix simple :**
```typescript
useEffect(() => {
  // ✅ TOUJOURS reset au changement de session
  isInitializedRef.current = false;
  loadingRef.current = false;
  
  if (sessionId && enabled) {
    loadInitialMessages();
  }
}, [sessionId, enabled, loadInitialMessages]);
```

---

## 📋 RECOMMANDATIONS IMMÉDIATES

**AVANT NEXT RELEASE :**

1. ✅ **Fix isInitializedRef** (15 min) - BLOQUANT
2. ✅ **Ajouter retry auto** (1h) - CRITIQUE
3. ✅ **Ajouter timeout** (30 min) - IMPORTANT

**Durée totale : ~2h**

**APRÈS ces fixes :**
- ✅ Conversations chargeront toujours (même après échec)
- ✅ Retry automatique si erreur temporaire
- ✅ Timeout si API trop lente
- ✅ UX robuste et prévisible

---

## 🔧 AUTRES OBSERVATIONS

**Points positifs :**
- ✅ Protection race condition sur création (isCreatingSession)
- ✅ Logging structuré (permet debug)
- ✅ Gestion erreurs avec try/catch
- ✅ loadingRef empêche double-load
- ✅ clearMessages au changement session

**Points à améliorer :**
- ⚠️ Pas de skeleton loader (flicker)
- ⚠️ Pas de feedback visuel création
- ⚠️ Erreurs silencieuses (pas affichées à l'user)

---

**Version :** 1.0  
**Auteur :** Jean-Claude (Senior Dev)  
**Action requise :** FIX URGENT isInitializedRef + retry

