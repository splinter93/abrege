# Solution Supabase Realtime pour le streaming editNoteContent

**Date** : 13 mars 2026  
**Contexte** : Remplacer `streamBroadcastService` (in-memory) par Supabase Realtime Broadcast pour que le streaming fonctionne en serverless.

---

## 1. Pourquoi Supabase Realtime

| Critère | streamBroadcastService (actuel) | Supabase Realtime |
|---------|----------------------------------|-------------------|
| Stockage | Map in-memory par instance | WebSocket partagé par Supabase |
| Serverless | ❌ 0 listeners (instances différentes) | ✅ Fonctionne (infra Supabase) |
| Auth | Aucune | RLS / channel privé |
| Déjà intégré | Non | ✅ RealtimeService, useCanvaRealtime existants |
| Coût | Gratuit | Inclus dans l’abonnement Supabase |

---

## 2. API Supabase Broadcast

### Envoi depuis le serveur (sans subscribe)

```js
// "Sending a message before subscribing will use HTTP"
const channel = supabase.channel('note-stream:${noteId}');
await channel.send({
  type: 'broadcast',
  event: 'chunk',
  payload: { data: chunk, position: 'end', metadata: { source: 'editNoteContent' } }
});
```

### REST API (alternative)

```bash
POST https://<project>.supabase.co/realtime/v1/api/broadcast
Headers: apikey, Content-Type: application/json
Body: {
  "messages": [{
    "topic": "note-stream:${noteId}",
    "event": "chunk",
    "payload": { "data": "...", "position": "end" }
  }]
}
```

### Réception côté client

```js
const channel = supabase.channel('note-stream:${noteId}', { config: { broadcast: { self: false } } });
channel
  .on('broadcast', { event: 'chunk' }, (payload) => handleChunk(payload))
  .on('broadcast', { event: 'end' }, (payload) => handleEnd())
  .subscribe();
```

---

## 3. Architecture proposée

```
editNoteContent (API route)
    |
    +-- contentStreamer.streamContent()
    |       |
    |       +-- supabaseRealtimeBroadcast.send(noteId, { type: 'chunk', data, position })
    |       |       → channel.send() sans subscribe (HTTP sous le capot)
    |       |
    |       +-- supabaseRealtimeBroadcast.send(noteId, { type: 'end' })
    |
    (pas de streamBroadcastService)

ChatCanvaPane (client)
    |
    +-- supabase.channel('note-stream:${noteId}')
    |       .on('broadcast', { event: 'chunk' }, ...)
    |       .on('broadcast', { event: 'end' }, ...)
    |       .subscribe()
    |
    (remplace EventSource ops-listen)
```

---

## 4. Nom du channel

| Option | Format | Avantages |
|--------|--------|-----------|
| A | `note-stream:${noteId}` | Simple, isolé par note |
| B | `note-stream:${noteId}:${userId}` | Par user (plus privé) |

**Recommandation** : `note-stream:${noteId}` — une note peut avoir plusieurs viewers (ex. partage futur). Le channel privé impose l’auth pour s’abonner.

---

## 5. Implémentation

### 5.1 Nouveau service : `supabaseRealtimeBroadcast.ts`

```typescript
// src/services/supabaseRealtimeBroadcast.ts
import { createClient } from '@supabase/supabase-js';

const CHANNEL_PREFIX = 'note-stream:';

export async function sendStreamEvent(
  noteId: string,
  event: 'chunk' | 'end' | 'start' | 'error',
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const channel = supabase.channel(`${CHANNEL_PREFIX}${noteId}`);
  await channel.send({
    type: 'broadcast',
    event,
    payload
  });
}
```

### 5.2 Modifier `contentStreamer.ts`

Remplacer `streamBroadcastService.broadcast()` par `sendStreamEvent()`.

### 5.3 Modifier `ChatCanvaPane`

Remplacer l’EventSource `ops-listen` par un abonnement Supabase :

```typescript
const channel = supabase.channel(`note-stream:${noteId}`, {
  config: { broadcast: { self: false } }
});
channel
  .on('broadcast', { event: 'chunk' }, (payload) => handleStreamChunk(payload.payload?.data))
  .on('broadcast', { event: 'end' }, () => handleStreamEnd())
  .subscribe();
```

### 5.4 Supprimer / déprécier

- `streamBroadcastService` (ou le garder pour `content_updated` si utilisé ailleurs)
- `ops-listen` (ou le garder pour `content_updated` si utilisé)
- `useNoteStreamListener` si non utilisé

---

## 6. Channel privé vs public

- **Privé** : seuls les clients authentifiés peuvent s’abonner.
- **Public** : tout le monde peut s’abonner.

Pour un flux de contenu d’une note, on veut un channel **privé** : seuls les utilisateurs ayant accès à la note peuvent recevoir les chunks.

Supabase : les channels sont privés par défaut si on utilise `config: { private: true }` ou l’équivalent. À vérifier dans la doc actuelle.

---

## 7. Points d’attention

1. **Limite de messages** : Supabase Realtime a des limites de rate. Pour des chunks de ~80 caractères toutes les 15 ms, on reste raisonnable.
2. **Compatibilité** : `content_updated` (SSE) reste utilisé par `content:apply` pour les clients sans canva. On peut garder les deux.
3. **Fallback** : si 0 listeners (ou si Supabase Realtime échoue), sauvegarder en DB comme aujourd’hui.

---

## 8. Plan d’action

| Étape | Action | Fichiers |
|-------|--------|----------|
| 1 | Créer `supabaseRealtimeBroadcast.ts` | `src/services/` |
| 2 | Adapter `contentStreamer` pour utiliser `sendStreamEvent` | `contentStreamer.ts` |
| 3 | Remplacer EventSource par Supabase channel dans `ChatCanvaPane` | `ChatCanvaPane.tsx` |
| 4 | Router le LLM vers `editNoteContent` | `ApiV2HttpClient.ts` |
| 5 | Tester en dev | - |
| 6 | Optionnel : supprimer `ops-listen` si plus utilisé | `ops-listen/route.ts` |
