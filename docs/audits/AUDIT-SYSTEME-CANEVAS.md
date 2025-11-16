# 🔍 AUDIT COMPLET - SYSTÈME CANEVAS

**Date** : 2025-11-16  
**Système** : Système de canevas dans le chat (canva_sessions + Realtime + Store Zustand)  
**Objectif** : Vérifier la robustesse, identifier les risques et proposer des améliorations

---

## 📊 RÉSUMÉ EXÉCUTIF

| Aspect | Évaluation | Risque | Action Requise |
|--------|------------|--------|----------------|
| **Race Conditions** | ⚠️ Moyen | Modéré | Protection `runExclusive` pour toutes les actions |
| **Synchronisation DB ↔ Local** | ⚠️ Moyen | Modéré | Idempotence et déduplication |
| **Gestion d'erreurs** | ✅ Bon | Faible | Améliorations mineures |
| **Code Dupliqué** | ❌ Élevé | Faible | Refactoring recommandé |
| **Performance** | ⚠️ Moyen | Faible | Création multiple clients Supabase |
| **Architecture** | ✅ Bon | Faible | Complexité acceptable |
| **Edge Cases** | ⚠️ Moyen | Modéré | Améliorations recommandées |

**Verdict Global** : ⚠️ **SYSTÈME FONCTIONNEL MAIS BESOIN D'AMÉLIORATIONS CRITIQUES**

---

## 🚨 PROBLÈMES CRITIQUES

### 1. ❌ RACE CONDITIONS NON PROTÉGÉES

#### **Problème 1.1 : `openCanva` sans protection de concurrence**

```typescript
// ❌ PROBLÈME : Pas de protection contre appels simultanés
openCanva: async (userId, chatSessionId, options) => {
  // Si 2 appels simultanés → 2 canvas créés
  const response = await fetch('/api/v2/canva/sessions', { method: 'POST', ... });
  // ...
  // Fermeture autres canvas en parallèle
  await Promise.all(otherCanvas.map(...)); // ❌ Pas atomique
}
```

**Impact** :
- Si l'utilisateur clique 2x rapidement → 2 canvas créés
- Fermeture d'autres canvas en parallèle peut échouer partiellement
- Pas de garantie qu'un seul canvas reste 'open'

**Solution recommandée** :
```typescript
// ✅ Ajouter runExclusive par chatSessionId
private static openQueues = new Map<string, Promise<CanvaSession>>();

openCanva: async (userId, chatSessionId, options) => {
  const existing = this.openQueues.get(chatSessionId);
  if (existing) return existing;
  
  const promise = (async () => {
    try {
      // ... logique existante
    } finally {
      this.openQueues.delete(chatSessionId);
    }
  })();
  
  this.openQueues.set(chatSessionId, promise);
  return promise;
}
```

---

#### **Problème 1.2 : `closeCanva` sans protection**

```typescript
// ❌ PROBLÈME : Pas de protection contre appels simultanés
closeCanva: async (sessionId, options) => {
  // Si 2 appels simultanés → 2 PATCH status='closed'
  const statusResponse = await fetch(`/api/v2/canva/sessions/${targetId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'closed' })
  });
}
```

**Impact** :
- Appels redondants à l'API
- Possible inconsistance si un appel échoue et l'autre réussit
- Pas d'idempotence garantie

**Solution recommandée** : Protection `runExclusive` par canvaId

---

#### **Problème 1.3 : Realtime + Actions locales peuvent se chevaucher**

```typescript
// ❌ PROBLÈME : Realtime déclenche switchCanva pendant qu'un autre switchCanva est en cours
useCanvaRealtime → switchCanva(canvaId, noteId) // Via INSERT/UPDATE
ChatFullscreenV2 → switchCanva(canvaId, noteId) // Via auto-activate
```

**Impact** :
- `pendingSwitches` protège partiellement mais seulement pour le même canvaId
- Si Realtime switch canva A pendant que l'utilisateur switch canva B → pas de protection
- Possible double activation

**Statut actuel** : ✅ Protection partielle avec `pendingSwitches` (ligne 101, 488)

---

### 2. ❌ CRÉATION MULTIPLE DE CLIENTS SUPABASE

#### **Problème identifié**

Le store `useCanvaStore` crée un nouveau client Supabase à chaque action :
- `openCanva` : ligne 121-126
- `closeCanva` : ligne 378-383 et 432-437
- `switchCanva` : ligne 505-510 et 602-607

**Impact** :
- Performance : création inutile de clients
- Concurrency : Supabase avertit "Multiple GoTrueClient instances"
- Risque de problèmes d'authentification si plusieurs clients gèrent la session différemment

**Solution recommandée** :
```typescript
// ✅ Singleton client Supabase
class SupabaseClientSingleton {
  private static instance: ReturnType<typeof createClient> | null = null;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return this.instance;
  }
}
```

---

### 3. ❌ CODE DUPLIQUÉ IMPORTANT

#### **Duplication 1 : Fermeture d'autres canvas**

Code dupliqué dans :
- `openCanva` : lignes 272-313
- `switchCanva` (session existante) : lignes 529-563
- `switchCanva` (nouvelle session) : lignes 731-788

**Impact** :
- Maintenance difficile : si logique change, 3 endroits à modifier
- Risque d'incohérence si une version n'est pas mise à jour

**Solution recommandée** :
```typescript
// ✅ Extraire en méthode privée
private async closeOtherOpenCanvases(
  chatSessionId: string, 
  excludeCanvaId: string,
  authToken: string
): Promise<void> {
  const listResponse = await fetch(`/api/v2/canva/sessions?chat_session_id=${chatSessionId}`, {
    headers: { 'Authorization': `Bearer ${authToken}`, ... }
  });
  
  if (!listResponse.ok) return;
  
  const listData = await listResponse.json() as ListCanvasResponse;
  const otherCanvas = (listData.canva_sessions || []).filter(
    (c: CanvaSessionDB) => c.id !== excludeCanvaId && c.status === 'open'
  );
  
  await Promise.all(
    otherCanvas.map((otherCanva: CanvaSessionDB) =>
      fetch(`/api/v2/canva/sessions/${otherCanva.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${authToken}`, ... },
        body: JSON.stringify({ status: 'closed' })
      })
    )
  );
}
```

---

#### **Duplication 2 : Synchronisation status DB**

Code dupliqué dans :
- `openCanva` : lignes 315-340
- `switchCanva` (session existante) : lignes 566-582
- `switchCanva` (nouvelle session) : lignes 790-810

**Solution recommandée** : Extraire en méthode privée

---

### 4. ⚠️ PROBLÈMES DE SYNCHRONISATION

#### **Problème 4.1 : `chatSessionId` hydraté de manière asynchrone**

```typescript
// ❌ PROBLÈME : chatSessionId peut être vide temporairement
const canvaSession: CanvaSession = {
  id: canvaId,
  chatSessionId: '', // ❌ Vide au début
  noteId: note.id,
  // ...
};

// Plus tard, mis à jour de manière asynchrone
if (chatSessionId) {
  get().updateSession(canvaId, { chatSessionId }); // ⚠️ Timing non garanti
}
```

**Impact** :
- Le useEffect de fermeture dans ChatFullscreenV2 peut se déclencher avant que `chatSessionId` soit hydraté
- Protection ajoutée (ligne 399-403) mais solution workaround

**Solution recommandée** : Ne créer la session locale qu'après avoir récupéré `chatSessionId`

---

#### **Problème 4.2 : Race condition dans auto-activation**

```typescript
// ChatFullscreenV2.tsx ligne 418-536
// ❌ PROBLÈME : Deux useEffects peuvent se déclencher simultanément
useEffect(() => {
  // Fermeture si pas la bonne session
}, [currentSession?.id, isCanvaOpen, activeCanvaId, ...]);

useEffect(() => {
  // Auto-activation si open canvas
}, [currentSession?.id, ...]);
```

**Impact** :
- Le premier useEffect peut fermer le canevas
- Le deuxième peut l'activer immédiatement après
- Possible boucle si conditions changent rapidement

**Statut actuel** : ✅ Protection partielle avec vérification `chatSessionId` vide

---

### 5. ⚠️ EDGE CASES NON GÉRÉS

#### **Edge Case 1 : Session supprimée pendant switch**

```typescript
// ❌ PROBLÈME : Si la session est supprimée en DB pendant switchCanva
switchCanva: async (canvaId, noteId) => {
  // Charger note depuis API
  const response = await fetch(`/api/v2/note/${noteId}`, ...);
  
  // ⚠️ Entre temps, le canva peut être supprimé en DB par un autre onglet
  // Mais switchCanva continue et active quand même
}
```

**Impact** : Canevas activé localement alors qu'il n'existe plus en DB

**Solution recommandée** : Vérifier existence du canva en DB avant activation

---

#### **Edge Case 2 : Fermeture partielle d'autres canvas**

```typescript
// ❌ PROBLÈME : Promise.all peut échouer partiellement
await Promise.all(
  otherCanvas.map((otherCanva) => fetch(..., { status: 'closed' }))
);
// ⚠️ Si 1 sur 3 échoue → 2 canvas fermés, 1 reste 'open'
```

**Impact** : Plusieurs canvas peuvent rester 'open' si fermeture partielle

**Solution recommandée** :
```typescript
const results = await Promise.allSettled(...);
const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) {
  logger.warn('Some canvas closures failed', { count: failed.length });
  // Retry ou notification
}
```

---

#### **Edge Case 3 : Realtime événement pendant opération**

```typescript
// ❌ PROBLÈME : Realtime peut recevoir UPDATE pendant que switchCanva est en cours
switchCanva → PATCH status='open' → Realtime reçoit UPDATE → switchCanva appelé à nouveau
```

**Impact** : Double activation possible malgré `pendingSwitches`

**Statut actuel** : ✅ Protection partielle avec `pendingSwitches` + vérification état local dans Realtime (ligne 154-155)

---

### 6. ⚠️ INCOHÉRENCES ARCHITECTURALES

#### **Incohérence 1 : Mix de `get()` et `getState()`**

```typescript
// ❌ INCOHÉRENCE : Utilisation mixte
const { sessions } = useCanvaStore.getState(); // Ligne 501
get().updateSession(...); // Ligne 586, 747
```

**Impact** : Confusion, risque d'utiliser état obsolète

**Solution recommandée** : Utiliser uniquement `get()` dans les actions

---

#### **Incohérence 2 : Gestion status DB inconsistante**

```typescript
// ❌ INCOHÉRENCE : Parfois on ignore les erreurs, parfois on throw
if (!statusResponse.ok) {
  logger.warn(...); // ⚠️ Continue même si échec
  // Pas de throw
}

// Mais dans closeCanva delete :
if (!response.ok) {
  throw new Error(...); // ⚠️ Throw erreur
}
```

**Impact** : Comportement inattendu si erreur survient

**Solution recommandée** : Standardiser la gestion d'erreurs

---

## ✅ POINTS POSITIFS

### 1. ✅ Protection race condition dans `switchCanva`

```typescript
// ✅ BIEN : Protection avec pendingSwitches
if (pendingSwitches.has(canvaId)) {
  return; // Ignore appels simultanés
}
```

### 2. ✅ Vérification état local dans Realtime

```typescript
// ✅ BIEN : Vérifie état local avant action
const { isCanvaOpen, activeCanvaId } = useCanvaStore.getState();
if (currentActiveCanvaId === canvaId && currentIsCanvaOpen) {
  // Seulement si vraiment ouvert localement
}
```

### 3. ✅ Gestion erreurs avec logs structurés

Toutes les erreurs sont loggées avec contexte complet (canvaId, noteId, etc.)

### 4. ✅ Cleanup approprié dans useEffect

Les subscriptions Realtime sont correctement nettoyées au unmount

---

## 📋 RECOMMANDATIONS PRIORITAIRES

### 🔴 CRITIQUE (À faire immédiatement)

1. **Ajouter `runExclusive` pour `openCanva` et `closeCanva`**
   - Protection contre appels simultanés
   - Garantie qu'un seul canvas est créé/fermé à la fois

2. **Singleton client Supabase**
   - Éviter création multiple de clients
   - Améliorer performance et éviter warnings

3. **Vérifier existence canva en DB avant activation**
   - Dans `switchCanva`, vérifier que le canva existe toujours
   - Éviter activation de canvas supprimés

### 🟡 IMPORTANT (Cette semaine)

4. **Refactoriser code dupliqué**
   - Extraire `closeOtherOpenCanvases` et `syncStatusToDB`
   - Réduire duplication de 60% environ

5. **Standardiser gestion d'erreurs**
   - Politique claire : quand throw, quand logger.warn
   - Cohérence dans tout le système

6. **Améliorer gestion fermeture partielle**
   - Utiliser `Promise.allSettled` + retry pour échecs
   - Logger les canvas qui n'ont pas pu être fermés

### 🟢 AMÉLIORATION (Ce mois)

7. **Optimiser useEffects dans ChatFullscreenV2**
   - Fusionner les deux useEffects si possible
   - Ajouter debounce si nécessaire

8. **Ajouter métriques/monitoring**
   - Tracker nombre de canvas créés/fermés
   - Détecter anomalies (trop de canvas 'open', etc.)

---

## 🎯 CONCLUSION

**Le système fonctionne mais nécessite des améliorations pour être vraiment robuste à l'échelle.**

**Forces** :
- Architecture claire avec séparation DB ↔ Local
- Protection partielle contre race conditions
- Logs structurés pour debugging

**Faiblesses** :
- Race conditions non complètement protégées
- Code dupliqué (maintenance difficile)
- Création multiple de clients Supabase
- Edge cases non tous gérés

**Recommandation finale** : ⚠️ **IMPLÉMENTER LES 3 CORRECTIONS CRITIQUES AVANT PRODUCTION**

Le système est **utilisable en l'état** mais les corrections critiques amélioreront significativement la robustesse et éviteront des bugs en production avec de nombreux utilisateurs.

