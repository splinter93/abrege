# Audit : Indicateur "Stream inactif" dans le canevas

**Date** : 14 mars 2026  
**Problème** : Le log affiche toujours "Stream inactif" dans le canevas.

---

## 1. Architecture des flux

| Flux | Canal | Rôle | Indicateur |
|------|-------|------|------------|
| **Supabase Realtime Broadcast** | `note-stream:${noteId}` | Chunks LLM (start/chunk/end) | `isEventSourceConnected` → "Stream actif/inactif" |
| **EventSource ops:listen** | `/api/v2/canvas/[ref]/ops:listen` | ACK/CONFLICT des opérations d'édition | `isOpsConnected` (non utilisé pour l'indicateur) |

L'indicateur "Stream actif/inactif" reflète **uniquement** la connexion au channel Supabase Realtime Broadcast.

---

## 2. Où `isEventSourceConnected` est mis à `true`

1. Réception de l'événement broadcast `start`
2. Callback `subscribe()` avec status `SUBSCRIBED`

---

## 3. Où `isEventSourceConnected` est mis à `false`

1. Callback `subscribe()` avec status `CHANNEL_ERROR`
2. Cleanup du `useEffect` (unmount ou changement de deps)

---

## 4. Causes probables

### 4.1 Status Supabase non géré

Le client Supabase Realtime peut retourner `joined` au lieu de `SUBSCRIBED` selon la version.  
**Référence** : `RealtimeConnection.ts` gère les deux :

```ts
case 'SUBSCRIBED':
case 'joined':
  // connexion OK
```

`ChatCanvaPane` ne gérait que `SUBSCRIBED` → si Supabase envoie `joined`, l'indicateur reste inactif.

### 4.2 Effect qui se re-exécute avant SUBSCRIBED

Dépendances : `[session?.noteId, session?.id, activeCanvaId, isEditorReady, endStreaming]`

- Si `endStreaming` change de référence (Zustand), l'effect re-run → cleanup → `isEventSourceConnected = false` avant que `SUBSCRIBED` n'arrive.
- **Mitigation** : `endStreaming` est une action Zustand, normalement stable.

### 4.3 Connexion Realtime échouée

- Realtime désactivé sur le projet Supabase
- Auth : le client utilise `anonKey` ; si l'utilisateur n'est pas connecté, certains channels peuvent échouer
- CORS / réseau : WebSocket bloqué

### 4.4 Channel jamais créé

Condition d'entrée : `session && session.noteId && isEditorReady`.  
Si l'un manque, l'effect retourne tôt sans créer le channel.

---

## 5. Correctifs appliqués

### 5.1 Gérer `joined` dans le callback subscribe

```ts
.subscribe((status) => {
  if (status === 'SUBSCRIBED' || status === 'joined') {
    setIsEventSourceConnected(true);
    logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Supabase channel subscribed', { noteId, channelName });
  } else if (status === 'CHANNEL_ERROR') {
    setIsEventSourceConnected(false);
    logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Supabase channel error', { noteId });
  } else {
    // Debug : log tous les status pour diagnostiquer
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Channel status', { status, noteId });
  }
});
```

### 5.2 Stabiliser les dépendances de l'effect

Si nécessaire, retirer `endStreaming` des deps et utiliser une ref :

```ts
const endStreamingRef = useRef(endStreaming);
useEffect(() => { endStreamingRef.current = endStreaming; }, [endStreaming]);
// Dans le cleanup : endStreamingRef.current?.(sessionIdForCleanup);
```

---

## 6. Vérifications manuelles

1. **Console** : Vérifier si `[ChatCanvaPane] Channel status` apparaît avec un status autre que SUBSCRIBED/joined (ex. `joining`, `TIMED_OUT`).
2. **Supabase Dashboard** : Realtime activé, pas de rate limit.
3. **Network** : WebSocket vers `realtime.<project>.supabase.co` établi.
4. **Auth** : Utilisateur connecté (session Supabase valide).

---

## 7. Alternative : indicateur combiné

Si l'objectif est de montrer "au moins une connexion temps réel active", on peut combiner :

```ts
const isAnyStreamActive = isEventSourceConnected || isOpsConnected;
```

Afficher "Stream actif" quand `isAnyStreamActive` est vrai.

---

## 8. Fichiers impactés

| Fichier | Rôle |
|---------|------|
| `src/components/chat/ChatCanvaPane.tsx` | Subscribe callback, indicateur |
| `src/services/supabaseRealtimeBroadcast.ts` | Envoi des events (serveur) |
| `src/services/contentStreamer.ts` | Orchestration du stream (start/chunk/end) |
