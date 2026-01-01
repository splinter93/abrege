# 🔍 AUDIT SYSTÈME DE STREAMING - 2026-01-01

## Problème identifié
Les listeners ne s'activent pas et le stream n'est pas visible.

## Architecture du système

### Flux de données
1. **Client** : `useEditorStreamListener` se connecte à `/api/v2/canvas/{noteId}/ops:listen`
2. **Serveur** : `ops:listen` enregistre un listener dans `streamBroadcastService`
3. **LLM/API** : `editNoteContent` appelle `contentStreamer.streamContent()`
4. **Streamer** : `contentStreamer` broadcast les chunks via `streamBroadcastService.broadcast()`
5. **Broadcast** : `streamBroadcastService` envoie les événements à tous les listeners enregistrés
6. **Client** : `useEditorStreamListener` reçoit les événements et insère dans TipTap

## Points de vérification ajoutés

### 1. Vérification des listeners avant broadcast
- ✅ `editNoteContent` vérifie `getListenerCount()` avant de streamer
- ✅ `contentStreamer` vérifie les listeners avant chaque chunk
- ✅ Logs d'avertissement si aucun listener

### 2. Logs de diagnostic
- ✅ Logs console dans `useEditorStreamListener` pour chaque événement
- ✅ Logs dans `ops:listen` pour l'enregistrement du listener
- ✅ Logs dans `contentStreamer` pour chaque broadcast
- ✅ Logs dans `editNoteContent` pour le démarrage du stream

### 3. Vérification de l'enregistrement
- ✅ `ops:listen` vérifie `getListenerCount()` après enregistrement
- ✅ Logs du nombre de listeners actifs

## Problèmes potentiels identifiés

### 1. Timing / Race condition
**Problème** : Le listener peut ne pas être enregistré quand `editNoteContent` broadcast.

**Solution** : 
- Vérification des listeners avant broadcast (déjà fait)
- Logs pour identifier si c'est un problème de timing

### 2. NoteId mismatch
**Problème** : Le `noteId` utilisé pour broadcast peut ne pas correspondre au `noteId` résolu dans `ops:listen`.

**Vérification** :
- `ops:listen` résout `ref` → `noteId` via `V2ResourceResolver`
- `editNoteContent` utilise directement `noteId` (résolu depuis `ref`)
- ✅ Les deux utilisent le même `noteId` (UUID de la note)

### 3. EventSource non connecté
**Problème** : `useEditorStreamListener` peut ne pas se connecter correctement.

**Vérification** :
- ✅ Logs dans `onopen` pour confirmer la connexion
- ✅ Logs dans les event listeners pour confirmer la réception
- ✅ Gestion d'erreur améliorée

### 4. Format des événements SSE
**Problème** : Les événements peuvent ne pas être au bon format.

**Vérification** :
- ✅ `ops:listen` envoie `event: chunk\ndata: {...}\n\n`
- ✅ `useEditorStreamListener` écoute avec `addEventListener('chunk', ...)`
- ✅ Format JSON correct dans les données

## Commandes de diagnostic

### Vérifier les logs serveur
```bash
# Chercher les logs d'enregistrement de listener
grep "Listener registered" logs/*.log

# Chercher les logs de broadcast
grep "Event broadcasted" logs/*.log

# Chercher les warnings "NO LISTENERS"
grep "NO LISTENERS" logs/*.log
```

### Vérifier les logs client (console navigateur)
```javascript
// Vérifier que useEditorStreamListener se connecte
// Chercher : "[useEditorStreamListener] 🔌 Connecting..."
// Chercher : "[useEditorStreamListener] Connection OPENED"

// Vérifier la réception des événements
// Chercher : "[useEditorStreamListener] start event received"
// Chercher : "[useEditorStreamListener] chunk event received"
```

## Prochaines étapes

1. ✅ Ajout de logs de diagnostic complets
2. ✅ Vérification des listeners avant broadcast
3. ⏳ Tester le flux complet et analyser les logs
4. ⏳ Identifier le point de défaillance exact
5. ⏳ Corriger le problème identifié

## Fichiers modifiés

- `src/services/contentStreamer.ts` : Ajout vérification listeners + logs
- `src/app/api/v2/note/[ref]/editNoteContent/route.ts` : Ajout vérification listeners + logs
- `src/app/api/v2/canvas/[ref]/ops:listen/route.ts` : Ajout vérification après enregistrement
- `src/hooks/useEditorStreamListener.ts` : Ajout logs console pour diagnostic

