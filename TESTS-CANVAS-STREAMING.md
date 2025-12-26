# Tests Canvas Streaming Local-First

## Vue d'ensemble

Système d'édition streaming pour le canvas avec :
- **Client-first** : Opérations appliquées localement puis envoyées
- **Validation serveur** : ACK/CONFLICT, pas de retour du doc complet
- **Persistance différée** : Checkpoint batch (10s / 50 ops / fermeture)

---

## Architecture

```
┌─────────────────┐         POST           ┌──────────────────────┐
│                 │  ────────────────────>  │                      │
│  Client (UI)    │  ops:stream             │  CanvasStateManager  │
│                 │  <────────────────────  │  (mémoire)           │
└─────────────────┘         ACK/CONFLICT    └──────────────────────┘
        │                                              │
        │ SSE (ops:listen)                             │ Checkpoint
        │                                              ▼
        └──────────────────────────────────────> Database
                                                (batch 10s/50ops)
```

---

## Tests manuels

### Test 1 : Envoi d'une opération simple

**Prérequis** :
- Une note existante (ex: `7a60e6f5-1cd8-4a7b-b58c-57e066125286`)
- Token JWT valide

**Commande** :

```bash
# 1. Récupérer le contenu actuel de la note
curl -X GET "http://localhost:3000/api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. Calculer l'ETag du contenu
# (Pour simplifier, utiliser un ETag fictif pour le premier test)

# 3. Envoyer une opération d'insertion
curl -X POST "http://localhost:3000/api/v2/canvas/7a60e6f5-1cd8-4a7b-b58c-57e066125286/ops:stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ops": [
      {
        "op_id": "550e8400-e29b-41d4-a716-446655440001",
        "client_version": "W/\"0\"",
        "timestamp": 1703001600000,
        "id": "op1",
        "action": "insert",
        "target": {
          "type": "position",
          "position": {
            "mode": "end"
          }
        },
        "where": "at",
        "content": "\n\n## Test Streaming\n\nCeci est un test d'\''édition streaming."
      }
    ]
  }'
```

**Résultat attendu** :

```json
{
  "accepted": true,
  "ops_count": 1,
  "duration": 45
}
```

**⚠️ IMPORTANT** : Le résultat métier (ACK) arrive via SSE, pas dans le HTTP response.

Pour voir le ACK, écouter le SSE dans un autre terminal :

```bash
curl -N "http://localhost:3000/api/v2/canvas/7a60e6f5-1cd8-4a7b-b58c-57e066125286/ops:listen?token=YOUR_JWT_TOKEN"
```

Vous devriez voir :

```
event: ack
data: {"event":"ack","op_id":"550e8400-e29b-41d4-a716-446655440001","status":"applied","server_version":"W/\"abc123\""}
```

---

### Test 2 : Conflit de version (ETag mismatch)

**Commande** :

```bash
# Envoyer une op avec un mauvais client_version
curl -X POST "http://localhost:3000/api/v2/canvas/7a60e6f5-1cd8-4a7b-b58c-57e066125286/ops:stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ops": [
      {
        "op_id": "550e8400-e29b-41d4-a716-446655440002",
        "client_version": "W/\"WRONG_VERSION\"",
        "timestamp": 1703001601000,
        "id": "op2",
        "action": "insert",
        "target": {
          "type": "position",
          "position": {
            "mode": "end"
          }
        },
        "where": "at",
        "content": "\n\nThis should conflict."
      }
    ]
  }'
```

**Résultat attendu** :

```json
{
  "accepted": true,
  "ops_count": 1,
  "duration": 12
}
```

**Via SSE, vous verrez** :

```
event: conflict
data: {"event":"conflict","op_id":"550e8400-e29b-41d4-a716-446655440002","reason":"etag_mismatch","expected_version":"W/\"abc123\""}
```

---

### Test 3 : Écoute SSE (ops:listen)

**Commande** :

```bash
# Dans un terminal, écouter les événements SSE
curl -N "http://localhost:3000/api/v2/canvas/7a60e6f5-1cd8-4a7b-b58c-57e066125286/ops:listen?token=YOUR_JWT_TOKEN"
```

**Résultat attendu** :

```
event: start
data: {"type":"start","metadata":{"timestamp":1703001600000}}

: ping

event: ack
data: {"event":"ack","op_id":"550e8400-e29b-41d4-a716-446655440001","status":"applied","server_version":"W/\"abc123\""}
```

---

### Test 4 : Batch de 3 opérations

**Commande** :

```bash
curl -X POST "http://localhost:3000/api/v2/canvas/7a60e6f5-1cd8-4a7b-b58c-57e066125286/ops:stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ops": [
      {
        "op_id": "550e8400-e29b-41d4-a716-446655440003",
        "client_version": "W/\"abc123\"",
        "timestamp": 1703001602000,
        "id": "op3",
        "action": "insert",
        "target": { "type": "position", "position": { "mode": "end" } },
        "where": "at",
        "content": "\n\n## Batch Test 1"
      },
      {
        "op_id": "550e8400-e29b-41d4-a716-446655440004",
        "client_version": "W/\"def456\"",
        "timestamp": 1703001603000,
        "id": "op4",
        "action": "insert",
        "target": { "type": "position", "position": { "mode": "end" } },
        "where": "at",
        "content": "\n\n## Batch Test 2"
      },
      {
        "op_id": "550e8400-e29b-41d4-a716-446655440005",
        "client_version": "W/\"ghi789\"",
        "timestamp": 1703001604000,
        "id": "op5",
        "action": "insert",
        "target": { "type": "position", "position": { "mode": "end" } },
        "where": "at",
        "content": "\n\n## Batch Test 3"
      }
    ]
  }'
```

**Résultat attendu** :

```json
{
  "accepted": true,
  "ops_count": 3,
  "duration": 78
}
```

**Via SSE** (résultats métier) :

```
event: ack
data: {"event":"ack","op_id":"...-003","status":"applied","server_version":"W/\"xyz1\""}

event: ack
data: {"event":"ack","op_id":"...-004","status":"applied","server_version":"W/\"xyz2\""}

event: ack
data: {"event":"ack","op_id":"...-005","status":"applied","server_version":"W/\"xyz3\""}
```

---

### Test 5 : Checkpoint automatique (10 secondes)

**Procédure** :

1. Envoyer une opération
2. Attendre 10 secondes
3. Vérifier les logs serveur pour voir le checkpoint
4. Vérifier en DB que le contenu a été persisté

**Logs attendus** :

```
[CanvasStateManager] Auto-checkpoint { canvasId: '...' }
[CanvasStateManager] Checkpoint démarré { canvasId: '...', opsCount: 1, noteId: '...' }
[CanvasStateManager] Checkpoint réussi { canvasId: '...', opsCount: 1, duration: 45, newEtag: 'W/"..."' }
```

---

### Test 6 : Checkpoint par seuil (50 ops)

**Procédure** :

1. Envoyer 50 opérations rapidement
2. Observer le checkpoint immédiat

**Script** :

```bash
for i in {1..50}; do
  curl -X POST "http://localhost:3000/api/v2/canvas/NOTE_ID/ops:stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d "{\"ops\":[{\"op_id\":\"$(uuidgen)\",\"client_version\":\"W/\\\"current\\\"\",\"timestamp\":$(date +%s)000,\"id\":\"op$i\",\"action\":\"insert\",\"target\":{\"type\":\"position\",\"position\":{\"mode\":\"end\"}},\"where\":\"at\",\"content\":\"\\n\\nOp $i\"}]}" &
done
wait
```

---

### Test 7 : Idempotence (même op_id envoyé 2x)

**Commande** :

```bash
# Envoyer la même op 2 fois
OP_ID="550e8400-e29b-41d4-a716-446655440010"

curl -X POST "http://localhost:3000/api/v2/canvas/NOTE_ID/ops:stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"ops\":[{\"op_id\":\"$OP_ID\",\"client_version\":\"W/\\\"current\\\"\",\"timestamp\":1703001605000,\"id\":\"op10\",\"action\":\"insert\",\"target\":{\"type\":\"position\",\"position\":{\"mode\":\"end\"}},\"where\":\"at\",\"content\":\"\\n\\nIdempotence test\"}]}"

# Renvoyer immédiatement
curl -X POST "http://localhost:3000/api/v2/canvas/NOTE_ID/ops:stream" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d "{\"ops\":[{\"op_id\":\"$OP_ID\",\"client_version\":\"W/\\\"current\\\"\",\"timestamp\":1703001606000,\"id\":\"op10\",\"action\":\"insert\",\"target\":{\"type\":\"position\",\"position\":{\"mode\":\"end\"}},\"where\":\"at\",\"content\":\"\\n\\nIdempotence test\"}]}"
```

**Résultat attendu** :

```json
// Première requête
{ "accepted": true, "ops_count": 1, "duration": 23 }

// Deuxième requête (même op_id)
{ "accepted": true, "ops_count": 1, "duration": 8 }
```

**Via SSE** :

```
// Première fois : ACK normal
event: ack
data: {"event":"ack","op_id":"...-010","status":"applied","server_version":"W/\"...\""}

// Deuxième fois : ACK idempotent (pas d'application, mais retour ACK)
event: ack
data: {"event":"ack","op_id":"...-010","status":"applied","server_version":"W/\"...\""}
```

---

## Tests unitaires (TODO)

```typescript
// src/services/__tests__/contentOperations.test.ts
describe('contentOperations', () => {
  it('should apply insert operation', async () => {
    const content = '# Title\n\nContent';
    const ops = [{
      id: 'op1',
      action: 'insert',
      target: { type: 'position', position: { mode: 'end' } },
      where: 'at',
      content: '\n\nNew paragraph'
    }];
    
    const result = await applyOperationsToContent(content, ops);
    expect(result.success).toBe(true);
    expect(result.content).toContain('New paragraph');
  });
});

// src/services/__tests__/canvasStateManager.test.ts
describe('CanvasStateManager', () => {
  it('should initialize state', async () => {
    await canvasStateManager.initializeState(
      'canvas1',
      'note1',
      'user1',
      '# Test',
      'W/"123"'
    );
    
    const state = canvasStateManager.getState('canvas1');
    expect(state).toBeDefined();
    expect(state?.content).toBe('# Test');
  });
  
  it('should detect ETag mismatch', async () => {
    // ... test conflict detection
  });
});
```

---

## Checklist de validation

- [ ] ✅ Opération simple (insert) fonctionne
- [ ] ✅ Conflit de version détecté
- [ ] ✅ Événements SSE reçus
- [ ] ✅ Batch de 3 ops fonctionne
- [ ] ✅ Checkpoint auto après 10s
- [ ] ✅ Checkpoint auto après 50 ops
- [ ] ✅ Idempotence respectée
- [ ] ✅ Cleanup d'état inactif (30min)
- [ ] ✅ Contenu persisté en DB
- [ ] ✅ TypeScript : 0 erreur
- [ ] ✅ Logs structurés et observables

---

## Métriques de performance attendues

| Opération | Latence cible | Observé |
|-----------|---------------|---------|
| POST ops:stream | < 50ms | ___ ms |
| SSE event delivery | < 100ms | ___ ms |
| Checkpoint (10 ops) | < 200ms | ___ ms |
| Checkpoint (50 ops) | < 500ms | ___ ms |

---

## Prochaines étapes (améliorations futures)

1. **CRDT avancé** : Merge automatique des conflits
2. **Cursor awareness** : Voir les autres utilisateurs
3. **Undo/Redo distribué** : Operational transformation
4. **Compression ops** : Batch fusion intelligente
5. **WebSocket** : Remplacer POST+SSE par full-duplex
6. **WebRTC** : P2P pour latence ultra-faible

---

**Date** : 2025-12-23  
**Auteur** : Jean-Claude (AI Agent)  
**Version** : 1.0

