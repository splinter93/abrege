# Canvas Streaming Local-First - Architecture

## Vue d'ensemble

Système d'édition collaborative local-first pour le canvas Scrivia, permettant aux humains et aux LLM d'écrire en streaming avec validation serveur et persistance différée.

---

## Architecture

### Flux principal

```
Client (UI/LLM) → POST /ops:stream → CanvasStateManager (mémoire)
                                     ↓
                                     Validation + Application
                                     ↓
                ← 202 Accepted ←     Broadcast SSE (tous clients)
                                     ↓
                                     Checkpoint (10s/50ops) → Database
```

### ⚠️ État mémoire volatile (assumé)

**CanvasStateManager = mémoire RAM** :
- ✅ Pas de Redis, pas de persistence intermédiaire
- ✅ Redémarrage serveur = état perdu
- ✅ Rechargement depuis DB au prochain open
- ❌ Pas HA (High Availability) dans cette v1

**Pourquoi c'est acceptable pour MVP** :
- Checkpoint auto toutes les 10s → perte max = 10s
- Checkpoint immédiat à 50 ops → charge haute protégée
- Checkpoint force à la fermeture → UX normale = 0 perte

**Évolution future (si besoin)** :
- Redis pour état partagé multi-instance
- Snapshot incrémental pour reprise rapide
- Event sourcing complet

### 🤖 LLM Writers = Clients standards (aucun privilège)

**Règle fondamentale** :

> Les agents LLM utilisent **exactement les mêmes endpoints**, règles de version (ETag) et mécanismes de conflit que les humains.

**Pas de traitement spécial** :
- ❌ Pas de bypass de validation
- ❌ Pas de "force write" pour l'IA
- ❌ Pas de canal privilégié

**Avantages** :
- ✅ Architecture simple et testable
- ✅ Pas de drift entre UI et agents
- ✅ LLM apprennent à gérer les conflits (comme les humains)

**Conséquence pratique** :
Si un LLM envoie un ETag obsolète → **CONFLICT** (comme un humain)  
→ Le LLM doit recharger et réessayer

---

## Principe architectural clé

### 📡 **SSE = Source de vérité fonctionnelle unique**

**Règle critique** :

> Le POST retourne un **202 Accepted technique** uniquement.  
> **Tous** les résultats métier (ACK/CONFLICT) sont émis via SSE.

**Pourquoi** :
- ✅ Un seul canal de vérité (pas de doublon)
- ✅ Même expérience pour tous les clients (émetteur ou observateur)
- ✅ Facilite le debug (un seul endroit à surveiller)

**Exemple** :

```typescript
// Client A envoie une op
await sendOp(op);  // ← Retourne 202 Accepted immédiatement

// Résultat métier arrive via SSE (pour A ET pour B)
onAck({ op_id: '...', server_version: 'W/"..."' });
```

**Conséquence** :
- Le client qui envoie **doit** écouter le SSE pour connaître le résultat
- Pas de "fast path" HTTP + "slow path" SSE

---

## Composants

### 1. contentOperations.ts
- Wrapper autour de `ContentApplier`
- Fonction pure : `applyOperationsToContent()`
- Réutilisé par streaming ET persistance

### 2. CanvasStateManager (Singleton)
- État en mémoire : Map<canvasId, CanvasState>
- Applique ops sans write DB
- Checkpoint batch automatique
- Cleanup après 30min inactivité

### 3. API Endpoints
- `POST /api/v2/canvas/[ref]/ops:stream` : Envoi ops
- `GET /api/v2/canvas/[ref]/ops:listen` : SSE events

### 4. Hook client
- `useCanvasStreamOps()` : sendOp, sendBatch, isConnected

---

## Checkpoint Rules

Premier seuil atteint déclenche le checkpoint :
- ⏱️ 10 secondes
- ✍️ 50 opérations
- 🚪 Fermeture canvas

---

## Fichiers créés

1. `src/services/contentOperations.ts`
2. `src/services/canvasStateManager.ts`
3. `src/app/api/v2/canvas/[ref]/ops:stream/route.ts`
4. `src/app/api/v2/canvas/[ref]/ops:listen/route.ts`
5. `src/hooks/useCanvasStreamOps.ts`
6. `src/components/chat/ChatCanvaPane.tsx` (modifié)
7. `TESTS-CANVAS-STREAMING.md`

---

**Status** : ✅ Implémentation complète  
**Date** : 2025-12-23
