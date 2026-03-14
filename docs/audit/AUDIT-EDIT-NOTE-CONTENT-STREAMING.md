# 🔍 Audit — Streaming editNoteContent

**Date** : 13 mars 2026  
**Constat** : Le streaming de `editNoteContent` n'a jamais vraiment fonctionné.

---

## 1. Architecture du flux

```
LLM (tool call)
    → ApiV2HttpClient.applyContentOperations()
    → POST /api/v2/note/{ref}/content:apply   ← ❌ JAMAIS editNoteContent
    → Sauvegarde DB immédiate, pas de stream

editNoteContent (jamais appelé par le LLM)
    → isCanvaOpen() ? stream : save DB
    → contentStreamer.streamContent()
    → streamBroadcastService.broadcast(noteId, { type: 'chunk', data })
    → Listeners (enregistrés par ops-listen)
    → ChatCanvaPane EventSource reçoit chunks
    → handleStreamChunk() insère dans TipTap
```

---

## 2. Problèmes critiques

### 2.1 🔴 Le LLM n'appelle jamais editNoteContent

**Fichier** : `src/services/llm/clients/ApiV2HttpClient.ts`

```typescript
async applyContentOperations(ref: string, params: Record<string, unknown>, userToken: string): Promise<unknown> {
  return this.makeRequest(`/note/${ref}/content:apply`, 'POST', params, userToken);
}
```

**Impact** : Le tool `applyContentOperations` pointe vers `content:apply`, qui sauvegarde toujours en DB et n'a pas de streaming. L'endpoint `editNoteContent` (avec streaming) n'est **jamais appelé** par le LLM.

**Correction** : Faire pointer `applyContentOperations` vers `editNoteContent` (qui gère les deux cas : stream si canva ouvert, save si fermé).

---

### 2.2 🔴 streamBroadcastService in-memory = inutilisable en serverless

**Fichier** : `src/services/streamBroadcastService.ts`

```typescript
private listeners: Map<string, Set<ListenerMetadata>> = new Map();
```

**Problème** : En environnement serverless (Vercel, AWS Lambda, etc.), chaque requête peut s'exécuter sur une **instance différente** :

- **Requête 1** : Client ouvre canva → `GET /ops-listen` → Instance A → `registerListener(noteId, sendSSE)`
- **Requête 2** : LLM édite → `POST /editNoteContent` → Instance B → `broadcast(noteId, chunk)` → **0 listeners** (Instance B a sa propre Map vide)

Le broadcast ne touche jamais les listeners enregistrés sur une autre instance.

**Correction** : Utiliser un bus externe partagé :
- **Redis Pub/Sub** : `ops-listen` subscribe, `editNoteContent` publish
- **Supabase Realtime** : channel dédié pour les chunks
- **Vercel** : Pas de solution native ; nécessite Redis ou autre store externe

---

### 2.3 🟡 extractAddedContent — range_after potentiellement incorrect

**Fichier** : `src/services/contentStreamer.ts`

Pour `insert` avec `where: 'after'`, le `range_after` retourné par `ContentApplier` est :

```typescript
range_after: { start: range.start, end: range.start + contentLength }
```

Or le contenu inséré est à la position `range.end` dans le nouveau document, pas `range.start`. Donc `newContent.slice(range.start, range.start + contentLength)` peut extraire la mauvaise portion (avant ou match au lieu du contenu ajouté).

**Impact** : Chunks streamés incorrects ou vides pour les insertions `where: 'after'`.

---

### 2.4 🟡 extractAddedContent — replace et delete

Pour une opération **replace** : `range_after` couvre le nouveau contenu. L'extraction peut être correcte si les coordonnées sont bonnes.

Pour une opération **delete** : pas de `range_after` (pas de contenu ajouté). `extractAddedContent` retourne `''` → aucun chunk streamé. Comportement attendu pour un delete, mais l'éditeur ne reçoit aucune mise à jour (il faudrait un événement "content_updated" pour recharger).

---

### 2.5 🟡 Double implémentation EventSource

- **ChatCanvaPane** : crée son propre `EventSource` vers `ops-listen`, avec `handleStreamChunk` / `handleStreamEnd`
- **useNoteStreamListener** : importé dans ChatCanvaPane mais **jamais appelé** (dead code)

De plus, `useNoteStreamListener` utilise `ops:listen` (avec `:`) alors que ChatCanvaPane utilise `ops-listen` (avec `-`) à cause de problèmes de routing Next.js.

---

### 2.6 🟡 Sauvegarde en mode stream

Quand `editNoteContent` stream (canva ouvert), il **ne sauvegarde pas** en DB. Le commentaire indique : « La sauvegarde DB se fera via l'auto-save du canva (toutes les 2s) ».

Si le stream ne fonctionne pas (0 listeners, serverless), le client ne reçoit rien → l'éditeur n'est pas mis à jour → l'auto-save ne sauvegarde pas le nouveau contenu. **Résultat : perte de données.**

---

## 3. Synthèse des causes

| Cause | Sévérité | Impact |
|-------|----------|--------|
| LLM appelle content:apply au lieu de editNoteContent | 🔴 | editNoteContent jamais utilisé |
| streamBroadcastService in-memory en serverless | 🔴 | 0 listeners, chunks jamais livrés |
| range_after incorrect pour insert 'after' | 🟡 | Chunks incorrects ou vides |
| useNoteStreamListener non utilisé | 🟡 | Code mort, confusion |
| Pas de fallback si 0 listeners | 🟡 | Perte de données (pas de save DB) |

---

## 4. Recommandations

### Court terme (sans infra externe)

1. **Router le LLM vers editNoteContent** : modifier `ApiV2HttpClient.applyContentOperations` pour appeler `/editNoteContent` au lieu de `/content:apply`.
2. **Fallback si 0 listeners** : si `getListenerCount(noteId) === 0` au moment du stream, sauvegarder en DB (comme en mode canva fermé) au lieu de streamer. Évite la perte de données.
3. **Corriger range_after** dans `ContentApplier` pour les insertions `where: 'after'` (coordonnées dans le nouveau contenu).
4. **Nettoyer** : supprimer ou utiliser `useNoteStreamListener`, unifier `ops:listen` / `ops-listen`.

### Moyen terme (avec Redis ou équivalent)

5. **Remplacer streamBroadcastService** par Redis Pub/Sub (ou Supabase Realtime) pour que les chunks soient diffusés entre instances.
6. **Tester** le flux complet : LLM → editNoteContent → stream → ChatCanvaPane → affichage en temps réel.

---

## 5. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/services/llm/clients/ApiV2HttpClient.ts` | Pointe vers content:apply |
| `src/services/streamBroadcastService.ts` | Map in-memory (serverless = KO) |
| `src/services/contentStreamer.ts` | extractAddedContent, streamContent |
| `src/utils/contentApplyUtils.ts` | range_after pour insert |
| `src/app/api/v2/note/[ref]/editNoteContent/route.ts` | Logique stream vs save |
| `src/components/chat/ChatCanvaPane.tsx` | EventSource ops-listen |
| `src/hooks/useNoteStreamListener.ts` | Non utilisé |
