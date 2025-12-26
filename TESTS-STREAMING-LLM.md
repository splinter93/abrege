# Tests Streaming LLM Endpoints

**Date:** 17 décembre 2025  
**Implémentation:** Endpoints SSE pour streaming LLM dans éditeur/canva

---

## ✅ Vérification TypeScript

```bash
# Tous les fichiers compilent sans erreur
npx tsc --noEmit
```

**Résultat:** ✓ 0 erreur TypeScript

**Fichiers créés/modifiés:**
- ✅ `src/services/streamBroadcastService.ts` (258 lignes)
- ✅ `src/app/api/v2/note/[ref]/stream:listen/route.ts` (176 lignes)
- ✅ `src/app/api/v2/note/[ref]/stream:write/route.ts` (200 lignes)
- ✅ `src/app/api/v2/canva/[canva_id]/stream:write/route.ts` (194 lignes)
- ✅ `src/hooks/useNoteStreamListener.ts` (246 lignes) - Pour Canva
- ✅ `src/hooks/useEditorStreamListener.ts` (263 lignes) - Pour Éditeur classique
- ✅ `src/components/chat/ChatCanvaPane.tsx` (+5 lignes)
- ✅ `src/components/editor/Editor.tsx` (+11 lignes)
- ✅ `src/app/api/v2/openapi-schema/route.ts` (+192 lignes)

---

## 🧪 Tests Manuels

### Prérequis

1. **Démarrer le serveur dev**
   ```bash
   npm run dev
   ```

2. **Obtenir un token d'authentification**
   - Se connecter à l'app
   - Ouvrir DevTools → Application → Local Storage
   - Copier le token JWT

3. **Créer une note de test**
   ```bash
   curl -X POST http://localhost:3000/api/v2/note/create \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "source_title": "Test Streaming",
       "markdown_content": "# Test\n\nContenu initial"
     }'
   ```
   → Copier le `note_id` retourné

---

### Test 1: Écoute SSE (Client)

**Terminal 1** - Ouvrir une connexion SSE:
```bash
curl -N http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:listen \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Résultat attendu:**
```
data: {"type":"start","metadata":{"timestamp":1734451234567}}

: ping

: ping
```

✅ **Vérifications:**
- Connexion établie (pas d'erreur 401/404)
- Event `start` reçu
- Heartbeats `ping` toutes les 30s
- Connexion reste ouverte

---

### Test 2: Écriture Streaming (Agent LLM)

**Terminal 2** - Pendant que Terminal 1 écoute, envoyer des chunks:

```bash
# Chunk 1
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chunk": "Ceci est le premier chunk. ",
    "position": "end",
    "metadata": {
      "agent_id": "test-agent",
      "tool_call_id": "test-123"
    }
  }'

# Chunk 2
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chunk": "Voici le deuxième chunk. ",
    "position": "end"
  }'

# Chunk 3
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chunk": "Et le dernier !",
    "position": "end"
  }'

# Fin du stream
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"end": true}'
```

**Résultat attendu dans Terminal 1:**
```
data: {"type":"chunk","data":"Ceci est le premier chunk. ","position":"end","metadata":{"agent_id":"test-agent","tool_call_id":"test-123","timestamp":1734451234567}}

data: {"type":"chunk","data":"Voici le deuxième chunk. ","position":"end","metadata":{"timestamp":1734451234568}}

data: {"type":"chunk","data":"Et le dernier !","position":"end","metadata":{"timestamp":1734451234569}}

data: {"type":"end","metadata":{"timestamp":1734451234570}}
```

✅ **Vérifications:**
- Les 3 chunks sont reçus dans l'ordre
- Event `end` reçu à la fin
- Latence < 100ms entre POST et réception SSE
- Metadata correctement transmise

---

### Test 3: Canva Stream (Alias)

**Créer un canva:**
```bash
curl -X POST http://localhost:3000/api/v2/canva/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_session_id": "YOUR_CHAT_SESSION_ID",
    "title": "Test Stream Canva"
  }'
```
→ Copier le `canva_id` retourné

**Terminal 1** - Écouter la note du canva:
```bash
# Récupérer le note_id du canva
curl http://localhost:3000/api/v2/canva/sessions/YOUR_CANVA_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Écouter le stream sur cette note
curl -N http://localhost:3000/api/v2/note/NOTE_ID_FROM_CANVA/stream:listen \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Terminal 2** - Écrire via l'endpoint canva:
```bash
curl -X POST http://localhost:3000/api/v2/canva/YOUR_CANVA_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chunk": "Écriture via endpoint canva !",
    "position": "end"
  }'

curl -X POST http://localhost:3000/api/v2/canva/YOUR_CANVA_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"end": true}'
```

✅ **Vérifications:**
- Chunk reçu via le listener de la note
- Endpoint canva résout correctement canva_id → note_id
- RLS check correct (403 si canva n'appartient pas à l'user)

---

### Test 4A: Interface Utilisateur (Canva)

1. **Ouvrir l'app** : `http://localhost:3000`
2. **Se connecter**
3. **Ouvrir un chat** avec une session existante
4. **Ouvrir le canva** (bouton dans le chat)
5. **Dans un terminal**, envoyer des chunks :
   ```bash
   # Récupérer le note_id du canva actif (DevTools Console)
   # ou via l'API
   
   curl -X POST http://localhost:3000/api/v2/note/CANVA_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"chunk": "Test UI Canva - chunk 1\n"}'
   
   sleep 1
   
   curl -X POST http://localhost:3000/api/v2/note/CANVA_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"chunk": "Test UI Canva - chunk 2\n"}'
   
   sleep 1
   
   curl -X POST http://localhost:3000/api/v2/note/CANVA_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"end": true}'
   ```

✅ **Vérifications:**
- Le contenu apparaît **en temps réel** dans l'éditeur TipTap du canva
- Pas de lag perceptible
- Auto-save reprend après `end: true`
- Pas d'erreurs dans DevTools Console

---

### Test 4B: Interface Utilisateur (Éditeur Classique)

1. **Ouvrir l'app** : `http://localhost:3000`
2. **Se connecter**
3. **Ouvrir une note** existante (ou en créer une)
4. **Récupérer le noteId** :
   - Dans DevTools Console : `window.location.pathname` → `/note/NOTE_ID`
   - Ou via l'URL de la page
5. **Dans un terminal**, envoyer des chunks :
   ```bash
   curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"chunk": "✨ Test éditeur classique - chunk 1\n\n"}'
   
   sleep 0.5
   
   curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"chunk": "📝 Chunk 2 avec **markdown** et *italique*\n\n"}'
   
   sleep 0.5
   
   curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"chunk": "```javascript\nconst test = \"Chunk 3 avec code\";\n```\n\n"}'
   
   sleep 0.5
   
   curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"end": true}'
   ```

✅ **Vérifications:**
- Le contenu apparaît **en temps réel** dans l'éditeur classique
- Le markdown est correctement formaté (gras, italique, code)
- L'insertion se fait par défaut à la fin (position: 'end')
- Pas de lag perceptible
- Pas d'erreurs dans DevTools Console

---

### Test 4C: Positions d'Insertion

Test des différentes positions d'insertion (start, end, cursor) :

```bash
# Position: end (défaut - à la fin du document)
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": "\n\n---\n\n## Section ajoutée à la fin\n\n", "position": "end"}'

sleep 1

# Position: start (au début du document)
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": "> **Note importante en début de document**\n\n", "position": "start"}'

sleep 1

# Position: cursor (à la position actuelle du curseur dans l'éditeur)
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": " [inséré au curseur] ", "position": "cursor"}'

curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"end": true}'
```

✅ **Vérifications:**
- `position: "end"` insère à la fin du document
- `position: "start"` insère au tout début
- `position: "cursor"` insère à la position du curseur/stream
- Chaque position fonctionne correctement

---

### Test 5: Rate Limiting

Envoyer plus de 100 chunks en 1 minute:

```bash
for i in {1..105}; do
  curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"chunk\": \"Chunk $i \"}"
done
```

✅ **Vérifications:**
- À partir du chunk 101 : Erreur 429 (Rate limit exceeded)
- Message avec `retry_after` en secondes

---

### Test 6: Concurrence (Plusieurs Listeners)

**Terminal 1:**
```bash
curl -N http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:listen \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Terminal 2:**
```bash
curl -N http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:listen \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Terminal 3** - Écrire:
```bash
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": "Test broadcast multiple listeners"}'
```

✅ **Vérifications:**
- Terminal 1 ET Terminal 2 reçoivent le chunk
- `listeners_reached: 2` dans la réponse POST

---

### Test 7: Cleanup Connexions Stalées

1. Ouvrir une connexion SSE
2. Attendre 6 minutes sans activité
3. Vérifier les logs serveur

✅ **Vérifications:**
- Log `[StreamBroadcast] Cleaned up stale connections` après 5-6 min
- Connexion automatiquement fermée côté serveur

---

## 📊 Performance

### Latence

Mesurer le temps entre POST et réception SSE:

```bash
# Terminal 1: Timestamp à la réception
curl -N http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:listen \
  -H "Authorization: Bearer YOUR_TOKEN" | while read line; do
    echo "$(date +%s%3N) - $line"
  done

# Terminal 2: Timestamp à l'envoi
echo "Sending at $(date +%s%3N)"
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": "Test latency"}'
```

✅ **Objectif:** Latence < 100ms

### Mémoire

1. Ouvrir 10 connexions SSE simultanées
2. Monitorer mémoire serveur (htop / Activity Monitor)
3. Fermer les connexions

✅ **Objectif:** 
- Pas de memory leak
- Mémoire stable après fermeture connexions

---

## 🔒 Sécurité

### Test Authentification

```bash
# Sans token
curl -X POST http://localhost:3000/api/v2/note/YOUR_NOTE_ID/stream:write \
  -H "Content-Type: application/json" \
  -d '{"chunk": "Unauthorized"}'
```

✅ **Vérifications:**
- Erreur 401 Unauthorized
- Pas de broadcast

### Test Autorisation (RLS)

```bash
# Avec token d'un autre user
curl -X POST http://localhost:3000/api/v2/note/NOTE_ID_AUTRE_USER/stream:write \
  -H "Authorization: Bearer OTHER_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"chunk": "Forbidden"}'
```

✅ **Vérifications:**
- Erreur 404 (note not found) ou 403 (forbidden)
- Pas de broadcast

---

## 📝 OpenAPI Schema

Vérifier que les endpoints sont bien documentés:

```bash
curl http://localhost:3000/api/v2/openapi-schema | jq '.paths | keys | .[]' | grep stream
```

✅ **Vérifications:**
- `/api/v2/note/{ref}/stream:write` présent
- `/api/v2/canva/{canva_id}/stream:write` présent
- Tags `Streaming` ajoutés
- Schémas complets avec exemples

---

## 🎯 Checklist Finale

- [x] TypeScript : 0 erreur sur tous les fichiers
- [x] Endpoints créés et fonctionnels
- [x] Service StreamBroadcastService singleton
- [x] Hook React useNoteStreamListener
- [x] Intégration ChatCanvaPane
- [x] OpenAPI Schema mis à jour
- [ ] Test manuel : SSE écoute (Test 1)
- [ ] Test manuel : Écriture chunks (Test 2)
- [ ] Test manuel : Canva endpoint (Test 3)
- [ ] Test manuel : UI temps réel (Test 4)
- [ ] Test manuel : Rate limiting (Test 5)
- [ ] Test manuel : Concurrence (Test 6)
- [ ] Test manuel : Performance < 100ms (Test 7)
- [ ] Test manuel : Sécurité auth/RLS

---

## 🚀 Prochaines Étapes (Hors Scope)

1. **Redis pub/sub** pour scalabilité horizontale
2. **Cursor position tracking** pour multi-agent collaboration
3. **Stream replay** (stocker chunks temporairement)
4. **WebSocket fallback** pour clients legacy
5. **Metrics Prometheus** (latence, throughput, listeners actifs)

---

## 📞 Support

En cas de problème :
1. Vérifier les logs serveur (`npm run dev` output)
2. Vérifier DevTools Console (erreurs client)
3. Tester avec `curl -v` pour voir les headers complets
4. Vérifier que le token JWT est valide et non expiré

---

**Implementation Status:** ✅ 100% Complete (Code)  
**Testing Status:** ⏳ Pending Manual Testing  
**Production Ready:** 🟡 Après tests manuels validés

