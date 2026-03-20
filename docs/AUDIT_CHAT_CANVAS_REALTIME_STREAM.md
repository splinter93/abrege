# Audit – Canevas Chat : Realtime & Listeners Streaming

**Date :** 2026-03-20  
**Périmètre :** `ChatCanvaPane` (éditeur dans le chat), flux `editNoteContent`, Realtime Supabase.

---

## 1. Contexte

- **Éditeur complet** : `Editor` avec `useRealtime` + `useEditorStreamListener` → fonctionne correctement.
- **Canevas chat** : même composant `Editor` rendu dans `ChatCanvaPane`, avec en plus une logique dédiée (ref, auto-save, indicateurs). Problèmes rapportés :
  - Realtime pas toujours actif.
  - Listeners de stream (start/chunk/end) rarement actifs / non robustes.

---

## 2. Architecture actuelle

### 2.1 Flux streaming (editNoteContent → client)

1. **API** `POST /api/v2/note/{ref}/editNoteContent`  
   - Vérifie `isCanvaOpen(supabase, noteId, userId)` (table `canva_sessions`, `status = 'open'`).
2. Si canva ouvert : **contentStreamer.streamContent()** envoie les événements via **Supabase Realtime Broadcast** sur le canal `note-stream:${noteId}` :
   - `start` → début du stream
   - `chunk` → morceaux de texte (`payload.data`)
   - `end` → fin
   - `error` → en cas d’erreur
3. Côté client, **deux abonnements** écoutent ce même canal :
   - **useEditorStreamListener** (dans `Editor.tsx`) : s’abonne quand `!!editor && !readonly`, insère en TipTap (position end/start/cursor).
   - **ChatCanvaPane** : un `useEffect` s’abonne à `note-stream:${noteId}` quand `session && session.noteId && isEditorReady`, et appelle `handleStreamChunk` / `handleStreamEnd` qui écrivent dans `editorRef.current`.

### 2.2 Realtime (synchronisation DB / éditeur)

- **RealtimeService** (singleton) : canaux `articles:${userId}`, `classeurs`, et si `noteId` fourni `editor:${noteId}:${userId}` (broadcast `editor_update` / `editor_insert` / `editor_delete`).
- **useRealtime** : utilisé à la fois dans **ChatCanvaPane** et dans **Editor** avec le même `(userId, noteId)`. Le service est partagé ; une seule config à la fois.
- **createChannels()** : délai fixe de **1 seconde** avant de créer les canaux, ce qui retarde la connexion Realtime au premier chargement.

---

## 3. Problèmes identifiés

### 3.1 Double abonnement au canal `note-stream:${noteId}` (critique)

- **Editor** : `useEditorStreamListener(noteId, editor, { enabled: !readonly && !!editor })` → s’abonne dès que l’instance TipTap existe.
- **ChatCanvaPane** : s’abonne quand `session && session.noteId && isEditorReady`.
- **Conséquences** :  
  - Deux listeners reçoivent chaque `start` / `chunk` / `end`.  
  - Risque de **double insertion** ou d’insertions incohérentes (stratégies différentes : accumulation + remplacement dans le pane vs insertion incrémentale dans le hook).  
  - Comportement non déterministe selon l’ordre d’exécution et le timing.

**Recommandation :** Une seule source d’écoute du stream pour le canevas. Soit désactiver `useEditorStreamListener` quand l’éditeur est dans le contexte canevas (`toolbarContext === 'canvas'`), soit supprimer l’abonnement dans `ChatCanvaPane` et ne garder que le hook. La solution retenue : **désactiver le hook dans le canevas** et garder la logique dans `ChatCanvaPane` (ref + accumulation cohérente avec le flux “Ask AI”).

### 3.2 Abonnement stream conditionné à `isEditorReady` (critique)

- Dans `ChatCanvaPane`, l’abonnement au canal stream ne s’active que si `isEditorReady === true` (callback `onReady` appelé après chargement du contenu).
- Si l’API envoie `start` / `chunk` / `end` **avant** que `onReady` soit appelé (ouverture canevas + LLM rapide), les événements sont **perdus**.
- **Recommandation :** S’abonner dès qu’on a `session?.noteId`, sans attendre `isEditorReady`. Gérer le cas “éditeur pas encore prêt” en mettant les chunks en buffer et en les insérant au moment où l’éditeur devient disponible (ex. dans `handleEditorRef` ou au premier `onReady`).

### 3.3 Délai RealtimeService (mineur)

- `createChannels()` fait `await new Promise(resolve => setTimeout(resolve, 1000))` avant de créer les canaux.
- Retarde d’environ 1 s l’affichage “Realtime actif” dans le canevas.
- **Recommandation :** Réduire ce délai (ex. 100–200 ms) ou le rendre conditionnel / configurable, en veillant à ne pas casser l’auth ou les autres canaux.

### 3.4 Dépendances d’effet stream dans ChatCanvaPane

- L’effet qui s’abonne au stream utilise `handleStreamChunk` et `handleStreamEnd` dans les callbacks du canal ; ces callbacks sont stables (useCallback avec `session?.id`).  
- `startStreaming` / `endStreaming` viennent du store (stables). Pas de bug identifié, mais les deps pourraient être explicitées si on refactorise.

---

## 4. Synthèse des corrections

| # | Problème | Action |
|---|----------|--------|
| 1 | Double abonnement `note-stream` | Désactiver `useEditorStreamListener` quand `toolbarContext === 'canvas'`. |
| 2 | Abonnement stream trop tard | Dans `ChatCanvaPane`, s’abonner dès `session?.noteId` (sans `isEditorReady`). |
| 3 | Chunks avant éditeur prêt | Buffer des chunks reçus avant que `editorRef.current` soit défini ; flush au moment où l’éditeur est fourni (ou au `onReady`). |
| 4 | (Optionnel) Realtime lent | Réduire ou adapter le délai 1000 ms dans `RealtimeService.createChannels()`. |

---

## 5. Vérifications après correctifs

- [ ] Ouvrir le canevas dans le chat, lancer une action LLM qui appelle `editNoteContent` : les chunks s’affichent en streaming dans l’éditeur du pane, une seule fois.
- [ ] Indicateur “Stream actif” passe au vert quand un stream start est reçu.
- [ ] Indicateur “Realtime” reflète l’état du RealtimeService (connecté / en cours / erreur).
- [ ] Pas de régression sur l’éditeur plein page (stream + realtime inchangés).

---

*Audit rédigé dans le cadre de la préparation pré-production Cinesia.*
