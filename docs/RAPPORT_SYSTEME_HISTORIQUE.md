# Rapport Technique — Système d'Historique de Chat

> **Destination :** Agent Cursor sur un projet tiers devant implémenter un système d'historique  
> **Source :** Analyse exhaustive de l'implémentation Cinesia (Abrege)  
> **Date :** Février 2026  
> **Niveau de détail :** Exhaustif — architecture, code, SQL, frontend, sécurité, faiblesses, roadmap GAFAM

---

## Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Schéma de base de données](#2-schéma-de-base-de-données)
3. [Couche service — HistoryManager](#3-couche-service--historymanager)
4. [Fonctions SQL atomiques](#4-fonctions-sql-atomiques)
5. [Couche API (Next.js App Router)](#5-couche-api-nextjs-app-router)
6. [Couche frontend](#6-couche-frontend)
7. [Sécurité et RLS](#7-sécurité-et-rls)
8. [Modèle de types TypeScript](#8-modèle-de-types-typescript)
9. [Points forts](#9-points-forts)
10. [Points faibles et dettes techniques](#10-points-faibles-et-dettes-techniques)
11. [Axes d'amélioration pour tendre vers l'excellence](#11-axes-damélioration-pour-tendre-vers-lexcellence)
12. [Ce qui manque pour un niveau GAFAM](#12-ce-qui-manque-pour-un-niveau-gafam)
13. [Recommandations finales pour une nouvelle implémentation](#13-recommandations-finales-pour-une-nouvelle-implémentation)

---

## 1. Vue d'ensemble de l'architecture

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Base de données | PostgreSQL via Supabase |
| ORM / Requêtes | Supabase JS Client (SDK) |
| Fonctions atomiques | PL/pgSQL (SECURITY DEFINER) |
| API | Next.js 14 App Router (Route Handlers) |
| État frontend | Zustand + hooks React personnalisés |
| Pagination | Cursor-based (sequence_number) |
| Temps réel | Supabase Realtime (sessions uniquement) |
| Sécurité | RLS PostgreSQL + JWT Supabase |
| Types | TypeScript strict (0 `any`) |

### Flux de données global

```
User Action
    │
    ▼
React Component (ChatFullscreen)
    │
    ▼
Zustand Store (useChatStore)
    │
    ▼
Hook (useInfiniteMessages / useChatMessageActions)
    │
    ▼ HTTP (Authorization: Bearer <JWT>)
Next.js API Route (/api/chat/sessions/[id]/messages/...)
    │
    ▼ SERVICE_ROLE_KEY (bypass RLS)
HistoryManager (singleton)
    │
    ▼ RPC ou direct query
PostgreSQL / Supabase (chat_messages table)
```

### Organisation des fichiers clés

```
src/
├── services/
│   ├── chat/
│   │   ├── HistoryManager.ts          # Service central (singleton, ~620 lignes)
│   │   └── __tests__/
│   │       └── HistoryManager.test.ts # Tests unitaires
│   ├── chatSessionService.ts          # CRUD sessions
│   └── chatSessionCache.ts            # Cache mémoire TTL 5s
├── hooks/
│   ├── useInfiniteMessages.ts         # Pagination infinie
│   ├── chat/
│   │   ├── useChatMessageActions.ts   # Actions (add, edit, delete)
│   │   └── useChatSessionsRealtime.ts # Temps réel sessions
├── store/
│   └── useChatStore.ts                # Zustand store
├── app/api/chat/sessions/[sessionId]/messages/
│   ├── recent/route.ts                # GET N derniers messages
│   ├── before/route.ts                # GET messages avant sequence X
│   ├── add/route.ts                   # POST ajouter un message
│   └── delete-after/route.ts          # DELETE messages après sequence X
└── types/
    └── chat.ts                        # Types stricts (ChatMessage, Session, etc.)

supabase/migrations/
├── 20250101_create_chat_sessions.sql
├── 20250130_create_chat_messages.sql
├── 20250130_create_chat_messages_functions.sql
├── 20250130_add_canvas_selections_to_messages.sql
├── 20251028_remove_thread_jsonb.sql   # Migration depuis JSONB legacy
├── 20251104_update_add_message_atomic_for_mentions_prompts.sql
└── 20251210181824_add_operation_id_to_chat_messages.sql
```

---

## 2. Schéma de base de données

### Table `chat_sessions`

```sql
CREATE TABLE chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(255),
  agent_id     UUID,                    -- Agent LLM associé
  is_active    BOOLEAN DEFAULT true,
  is_empty     BOOLEAN DEFAULT true,    -- Flag: session sans messages
  metadata     JSONB,
  last_message_at TIMESTAMPTZ,          -- Pour tri sidebar (perf)
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `chat_messages` (table principale)

```sql
CREATE TABLE chat_messages (
  -- Identifiants
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sequence_number  INTEGER NOT NULL,    -- ⚠️ CRITIQUE: ordre strict, atomique

  -- Contenu du message
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content          TEXT NOT NULL,

  -- Métadonnées LLM (assistant / tool)
  tool_calls       JSONB,              -- Tool calls OpenAI format
  tool_call_id     TEXT,               -- Pour messages role='tool'
  name             TEXT,               -- Nom du tool ou canal
  reasoning        TEXT,               -- Chain-of-thought (modèles CoT)

  -- Timestamps
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Streaming et outils
  stream_timeline  JSONB,              -- Timeline chronologique du streaming
  tool_results     JSONB,              -- Résultats des tool calls

  -- Pièces jointes utilisateur
  attached_images  JSONB,              -- [{url: string, fileName?: string}]
  attached_notes   JSONB,              -- [{id, slug, title, word_count}]
  mentions         JSONB,              -- Mentions légères de notes (~10-20 tokens)
  prompts          JSONB,              -- Mentions légères de prompts
  canvas_selections JSONB,             -- Sélections de texte du canvas

  -- Idempotence
  operation_id     UUID                -- Déduplication des retries
);
```

### Contraintes et indexes

```sql
-- ⚠️ CRITIQUE: Empêche les race conditions
CREATE UNIQUE INDEX unique_session_sequence
ON chat_messages(session_id, sequence_number);

-- Index principal pour pagination (query la plus fréquente)
CREATE INDEX idx_messages_session_sequence
ON chat_messages(session_id, sequence_number DESC);

-- Index secondaire (queries par timestamp)
CREATE INDEX idx_messages_session_timestamp
ON chat_messages(session_id, timestamp DESC);

-- Index pour lookup des tool messages orphelins
CREATE INDEX idx_messages_tool_call_id
ON chat_messages(tool_call_id)
WHERE tool_call_id IS NOT NULL;

-- Index pour filtrage par rôle
CREATE INDEX idx_messages_role
ON chat_messages(session_id, role);

-- Indexes GIN pour recherche dans JSONB
CREATE INDEX idx_chat_messages_stream_timeline
ON chat_messages USING GIN(stream_timeline);

CREATE INDEX idx_chat_messages_tool_results
ON chat_messages USING GIN(tool_results);
```

### Choix de conception notables

**Sequence_number vs timestamp pour la pagination**

La pagination est basée sur `sequence_number` (INTEGER) et non sur `timestamp` (TIMESTAMPTZ). Ce choix est crucial :

- Les timestamps peuvent être identiques (messages créés dans la même milliseconde)
- Les timestamps peuvent être désordonnés (horloge serveur, NTP)
- Un `sequence_number` entier est déterministe, unique par session, et permet une pagination parfaitement stable
- La clause `WHERE sequence_number < $beforeSequence` est O(log N) sur l'index B-tree

**Historique JSONB vs table dédiée**

Le système a migré d'un historique stocké dans `chat_sessions.thread` (JSONB) vers une table dédiée `chat_messages`. Migration documentée dans `20251028_remove_thread_jsonb.sql`. Gains :

- Pagination efficace (impossible avec JSONB)
- Index par message
- DELETE granulaire (édition de message)
- Scalabilité : pas de ligne PostgreSQL qui gonfle indéfiniment

---

## 3. Couche service — HistoryManager

### Pattern Singleton

```typescript
export class HistoryManager {
  private static instance: HistoryManager;

  private constructor() {}

  static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }
}

export const historyManager = HistoryManager.getInstance();
```

**Pourquoi singleton ?** Une seule instance du client Supabase (`SERVICE_ROLE_KEY`) est nécessaire côté serveur. Le singleton évite la multiplication des connexions.

### Méthode `addMessage` — Anatomie complète

```typescript
async addMessage(sessionId: string, message: ...): Promise<ChatMessage> {
  // 1. RPC atomique → INSERT + sequence_number auto
  const { data, error } = await supabase.rpc('add_message_atomic', { ... });

  // 2. UPDATE séparé pour les champs JSONB complexes
  //    (stream_timeline, tool_results — non supportés par la RPC)
  if (message.stream_timeline || message.tool_results) {
    await supabase.from('chat_messages').update({...}).eq('id', data.id);

    // 3. RE-SELECT pour retourner le message complet avec JSONB
    const { data: fullMessage } = await supabase
      .from('chat_messages').select('*').eq('id', data.id).single();

    return fullMessage;
  }

  return data;
}
```

**⚠️ Problème identifié ici** : Pour un message `assistant` avec streaming, on effectue **3 round-trips** vers PostgreSQL au lieu d'1 :
1. `rpc('add_message_atomic')` → INSERT
2. `UPDATE` pour `stream_timeline` + `tool_results`
3. `SELECT *` pour retourner le message complet

### Méthode `buildLLMHistory` — Filtrage intelligent

```typescript
async buildLLMHistory(sessionId, config): Promise<ChatMessage[]> {
  // Charge 2x la limite (buffer)
  const { messages } = await this.getRecentMessages(sessionId, maxMessages * 2);

  return this.filterForLLM(messages, config);
}

private filterForLLM(messages, config): ChatMessage[] {
  // 1. Séparer conversationnel (user/assistant) vs tools
  const conversational = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  const tools = messages.filter(m => m.role === 'tool');

  // 2. Garder N conversationnels récents (fenêtre glissante)
  const recentConversational = conversational.slice(-maxMessages);

  // 3. Garder seulement les tool messages liés aux assistants récents
  const relevantToolCallIds = new Set(
    recentConversational
      .filter(hasToolCalls)
      .flatMap(m => m.tool_calls.map(tc => tc.id))
  );

  const relevantTools = tools.filter(t => relevantToolCallIds.has(t.tool_call_id));

  // 4. Recombiner et trier par sequence_number
  return [...recentConversational, ...relevantTools]
    .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));
}
```

**Point fort** : Empêche l'envoi de tool messages orphelins au LLM (tool messages dont l'assistant parent n'est plus dans la fenêtre de contexte), ce qui provoquerait des erreurs API chez OpenAI/Anthropic.

### Méthode `getSessionStats` — Problème de performance

```typescript
async getSessionStats(sessionId: string) {
  // ⚠️ Charge TOUS les messages sans LIMIT
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, sequence_number')
    .eq('session_id', sessionId);

  // Calculs en mémoire
  return {
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    // ...
    oldestSequence: Math.min(...messages.map(m => m.sequence_number)),
    newestSequence: Math.max(...messages.map(m => m.sequence_number))
  };
}
```

**⚠️ Bug potentiel** : `Math.min(...array)` et `Math.max(...array)` explosent avec de grands arrays (stack overflow sur ~100K éléments). Devrait être une requête SQL `MIN/MAX`.

---

## 4. Fonctions SQL atomiques

### `get_next_sequence` — Mécanisme et risque

```sql
CREATE OR REPLACE FUNCTION public.get_next_sequence(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_seq INT;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM public.chat_messages
  WHERE session_id = p_session_id;

  RETURN next_seq;
END;
$$;
```

**Fonctionnement** : `MAX(sequence_number) + 1` est lu sans verrou explicite. Deux transactions concurrentes peuvent lire le même MAX et tenter d'insérer le même `sequence_number`.

**Protection** : Le `UNIQUE INDEX unique_session_sequence` garantit qu'une seule réussit. L'autre déclenche `unique_violation` → retry.

**⚠️ Risque identifié** : La récursion dans `add_message_atomic` n'a pas de garde-fou de profondeur. En cas de contentions soutenues (rare en pratique, impossible à exclure théoriquement), une boucle infinie est possible. Solution propre : `FOR i IN 1..5 LOOP ... EXIT WHEN success; END LOOP;`.

### `add_message_atomic` — Retry sur collision

```sql
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Collision sequence_number, retry...';
    RETURN public.add_message_atomic(...);  -- Récursion
```

**Note PostgreSQL** : Lors d'un `unique_violation` dans un bloc `EXCEPTION`, PostgreSQL effectue un savepoint implicite (subtransaction rollback). La transaction principale reste valide. Le retry fonctionne correctement.

**⚠️ Signature obsolète** : La fonction originale ne prend pas en compte `mentions`, `prompts`, `canvas_selections`, `operation_id`. Ces champs ont été ajoutés via des migrations ultérieures (`20251104_...`, `20251210_...`). Le fichier de migration `20250130` reflète l'état initial, pas l'état actuel de production. Risque de confusion pour les nouveaux développeurs.

### `delete_messages_after` — Édition de message (branching)

```sql
CREATE OR REPLACE FUNCTION public.delete_messages_after(
  p_session_id UUID,
  p_after_sequence INT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.chat_messages
  WHERE session_id = p_session_id
    AND sequence_number > p_after_sequence;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
```

**Point fort** : Suppression atomique en une seule requête SQL. Pas de race condition possible (DELETE est atomique en PostgreSQL).

**⚠️ Absence de soft delete** : Les messages supprimés lors d'une édition sont définitivement perdus. Pas d'audit trail, pas de possibilité d'annuler une édition.

---

## 5. Couche API (Next.js App Router)

### Routes implémentées

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/chat/sessions/[id]/messages/recent` | GET | N derniers messages (pagination initiale) |
| `/api/chat/sessions/[id]/messages/before` | GET | Messages avant sequence X (infinite scroll) |
| `/api/chat/sessions/[id]/messages/add` | POST | Ajouter un message (atomique) |
| `/api/chat/sessions/[id]/messages/delete-after` | DELETE | Supprimer messages après sequence X |

### Flux d'une route type

```typescript
// GET /api/chat/sessions/[sessionId]/messages/recent
export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  // 1. Auth JWT via Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Vérification ownership (session appartient à user)
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // 3. Validation des query params (Zod)
  const limit = parseInt(searchParams.get('limit') || '15');

  // 4. Appel HistoryManager (SERVICE_ROLE pour bypass RLS)
  const result = await historyManager.getRecentMessages(sessionId, limit);

  // 5. Réponse normalisée
  return NextResponse.json({ success: true, data: result });
}
```

**Point fort** : Double vérification — JWT côté Supabase + ownership check dans la route. Même si RLS est bypassé par SERVICE_ROLE dans HistoryManager, le contrôle d'accès est fait au niveau API avant l'appel.

**⚠️ Absence de rate limiting** : Aucun rate limiting sur ces routes. Un utilisateur peut spammer `/messages/recent` à volonté.

**⚠️ Pas de cache HTTP** : Aucun header `Cache-Control` ou ETag sur les réponses GET. Le navigateur refetch à chaque fois.

---

## 6. Couche frontend

### Hook `useInfiniteMessages`

**Responsabilités :**
- Chargement initial des N derniers messages
- Chargement des messages plus anciens (infinite scroll)
- Gestion des états `isLoading`, `isLoadingMore`, `hasMore`, `error`
- Ajout optimiste de nouveaux messages
- Préservation de la position de scroll

**Pagination cursor-based correctement implémentée :**

```typescript
// ✅ Bon : utilise sequence_number du message le plus ancien
const oldestMessage = messages[0];
const beforeSequence = oldestMessage.sequence_number || 0;
const response = await fetch(`/messages/before?before=${beforeSequence}&limit=20`);
```

**Préservation de la position de scroll :**

```typescript
// Avant ajout des anciens messages
const scrollHeightBefore = container?.scrollHeight || 0;
const scrollTopBefore = container?.scrollTop || 0;

// Ajout des messages en tête du tableau
setMessages(prev => [...markedMessages, ...prev]);

// Après render : compenser la hauteur ajoutée
requestAnimationFrame(() => {
  const heightDiff = container.scrollHeight - scrollHeightBefore;
  container.scrollTop = scrollTopBefore + heightDiff;
});
```

**⚠️ Problème de couplage DOM** : Le hook accède au DOM via `document.querySelector('.chatgpt-messages-container')`. C'est un anti-pattern React — le hook devrait recevoir une `ref` en paramètre plutôt que de chercher un sélecteur CSS.

**⚠️ Timeout hardcodé** : `setTimeout(() => { /* retirer marqueur animation */ }, 400)`. Si l'animation CSS est changée, ce timeout doit être synchronisé manuellement.

**⚠️ `isInitializedRef` non réinitialisé sur changement de session** : Lors d'un changement de `sessionId`, `clearMessages` remet `isInitializedRef.current = false`, mais le `useEffect` de cleanup s'exécute après le render, potentiellement après que le nouveau `loadInitialMessages` a déjà été déclenché. Race condition subtile possible.

### Cache sessions (`chatSessionCache.ts`)

```typescript
const SESSIONS_TTL_MS = 5000;

let lastSessionsResult: ChatSessionsListResponse | null = null;
let lastFetchTime: number | null = null;
let inFlightPromise: Promise<ChatSessionsListResponse> | null = null;
```

**Point fort** : Pattern "request deduplication" — si plusieurs composants déclenchent un fetch simultané, un seul part en réseau, les autres attendent la même Promise.

**⚠️ State global mutable** : Variables globales au niveau du module. En cas de Server-Side Rendering (Next.js), cet état peut fuiter entre les requêtes utilisateurs différents. Doit être côté client uniquement.

**⚠️ Pas de cache pour les messages** : Chaque changement de session recharge tous les messages depuis la DB. Un cache LRU par session éviterait des aller-retours réseau.

### Déduplication de la `stream_timeline`

```typescript
function deduplicateTimelineItems(timeline: StreamTimeline, messageId?: string): StreamTimeline {
  const seenToolCallIds = new Set<string>();
  // ...filtre les tool_execution en double
}
```

**Contexte** : Lors du streaming, les tool calls peuvent être enregistrés deux fois dans `stream_timeline` (bug dans le streaming pipeline). Cette déduplication est une mitigation client/DB-read, pas un fix à la source.

**⚠️ Symptôme traité, pas la cause** : Si le bug de double-enregistrement est corrigé à la source, cette déduplication devient du code mort. Si la cause n'est pas fixée, le JSONB stocké en DB contient des doublons permanents.

---

## 7. Sécurité et RLS

### Row Level Security (RLS)

```sql
-- Users peuvent voir leurs messages via l'ownership de la session
CREATE POLICY "Users can view messages from their sessions"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions
    WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
  )
);
```

**Point fort** : L'isolation est basée sur `chat_sessions.user_id`, pas sur un `user_id` direct dans `chat_messages`. Cohérent — si une session est supprimée, tous ses messages le sont aussi (ON DELETE CASCADE).

**⚠️ Performance RLS** : La policy fait une subquery EXISTS sur `chat_sessions` à chaque SELECT. Sur une table avec des millions de messages, cela peut être coûteux. Un index sur `chat_sessions(id, user_id)` est nécessaire.

### SERVICE_ROLE_KEY dans HistoryManager

`HistoryManager` utilise la `SERVICE_ROLE_KEY` pour bypasser RLS. Cela est nécessaire pour les fonctions `SECURITY DEFINER`. Mais cela signifie que **toute faille dans les API routes permet un accès complet à toutes les données**.

**Mitigation en place** : Double check dans les API routes (JWT + ownership) avant d'appeler HistoryManager.

**⚠️ Pas de validation du contenu** : Aucune validation de la longueur du `content` au niveau API. Un utilisateur peut insérer un message de 100MB.

---

## 8. Modèle de types TypeScript

### Hiérarchie des types

```typescript
// Union discriminée
type ChatMessage = UserMessage | AssistantMessage | SystemMessage | ToolMessage;

interface BaseMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  sequence_number?: number;       // Ordre strict DB
  clientMessageId?: string;       // Stabilité clés React (optimistic update)
  operation_id?: string;          // Idempotence
}

interface UserMessage extends BaseMessage {
  role: 'user';
  attachedImages?: Array<{ url: string; fileName?: string }>;
  attachedNotes?: Array<{ id: string; slug: string; title: string }>;
  mentions?: NoteMention[];
  prompts?: PromptMention[];
  canvasSelections?: CanvasSelection[];
}

interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  reasoning?: string;
  isStreaming?: boolean;
  stream_timeline?: StreamTimeline;
}
```

**Points forts :**
- Union discriminée sur `role` → TypeScript sait exactement quel type de message on a
- Type guards (`hasToolCalls`, `hasReasoning`, `isEmptyAnalysisMessage`) pour accès safe
- `clientMessageId` pour la stabilité des clés React entre optimistic update et persistance

**⚠️ Duplication camelCase/snake_case** :
- `streamTimeline` (camelCase, BaseMessage) ET `stream_timeline` (snake_case, AssistantMessage)
- Mapping manuel dans `getRecentMessages` et `getMessagesBefore` (fragile)
- Devrait être géré par une couche de mapping centralisée (DTO pattern)

**⚠️ `id?` et `sequence_number?` optionnels** : Ces champs sont obligatoires en DB mais optionnels dans les types TypeScript (pour supporter les messages optimistes avant persistance). Risque de `undefined` non géré en prod.

---

## 9. Points forts

### ✅ Atomicité et absence de race conditions

Le couple `UNIQUE INDEX (session_id, sequence_number)` + retry sur `unique_violation` est une solution robuste et éprouvée. Testé explicitement dans les tests unitaires.

### ✅ Pagination cursor-based sur `sequence_number`

Choix architecturalement correct. Stable, performant, sans skip/offset. La pagination offset (`OFFSET 100 LIMIT 20`) est O(N) ; la pagination cursor est O(log N) via l'index.

### ✅ Filtrage LLM intelligent (`buildLLMHistory`)

La logique de filtrage des tool messages orphelins est non triviale et correctement implémentée. Évite les erreurs API OpenAI/Anthropic causées par des tool messages sans assistant parent dans la fenêtre de contexte.

### ✅ Migration propre depuis JSONB

Le passage de `chat_sessions.thread` (JSONB) à une table dédiée `chat_messages` est une décision architecturale saine. La migration est documentée et irréversible (suppression du champ legacy).

### ✅ TypeScript strict avec type guards

Union discriminée + type guards = 0 cast non sécurisé. Le compilateur détecte les accès invalides (`assistantMessage.tool_calls` vs `userMessage.attachedImages`).

### ✅ RLS PostgreSQL + double check API

Deux couches d'isolation : RLS au niveau DB + vérification d'ownership dans chaque route API. Défense en profondeur.

### ✅ Indexes complets et bien pensés

Index composite `(session_id, sequence_number DESC)` pour la query principale, index partial sur `tool_call_id` (WHERE NOT NULL), index GIN pour JSONB. Pas d'index sur des colonnes non interrogées.

### ✅ `operation_id` pour idempotence

UUID unique par opération, permettant de détecter et rejeter les doublons en cas de retry réseau.

### ✅ Déduplication des requêtes sessions

Le pattern "in-flight promise" dans `chatSessionCache.ts` évite N fetches simultanés pour les mêmes données.

### ✅ Tests sur le service central

`HistoryManager.test.ts` couvre les race conditions, la pagination et les performances — les 3 zones à risque d'un système d'historique.

---

## 10. Points faibles et dettes techniques

### ❌ 3 round-trips DB pour un message assistant

```
add_message_atomic (INSERT)  →  UPDATE stream_timeline  →  SELECT * (re-fetch)
```

Pour chaque message assistant avec streaming (= le cas le plus fréquent), 3 appels réseau vers PostgreSQL. Coût : latence × 3, connexions DB × 3.

**Fix** : Étendre la signature de `add_message_atomic` pour accepter tous les champs JSONB, ou utiliser un CTE (Common Table Expression) en SQL pur.

### ❌ `get_next_sequence` sans verrou + récursion infinie possible

```sql
SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq ...
-- Pas de FOR UPDATE, pas de SKIP LOCKED
```

En cas de contentions soutenues (ex : bot qui envoie 100 messages simultanés), la récursion infinie est théoriquement possible. En pratique le UNIQUE index le prévient, mais sans garde-fou de profondeur.

**Fix recommandé** :
```sql
-- Option 1 : Séquence PostgreSQL dédiée par session (CREATE SEQUENCE)
-- Option 2 : Boucle avec compteur max
FOR i IN 1..10 LOOP
  BEGIN
    INSERT ... RETURNING * INTO new_message;
    EXIT;  -- succès
  EXCEPTION WHEN unique_violation THEN
    next_seq := public.get_next_sequence(p_session_id);
  END;
END LOOP;
IF new_message IS NULL THEN RAISE EXCEPTION 'Max retries exceeded'; END IF;
```

### ❌ Deux requêtes DB pour `hasMore` (N+1 pattern)

Dans `getRecentMessages` :
```typescript
// Requête 1 : récupérer les messages
const { data: messages } = await supabase.from('chat_messages').select('*')...

// Requête 2 : compter le total (séparé !)
const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true })...
```

**Fix** : Utiliser une window function PostgreSQL pour obtenir le count sans requête supplémentaire, ou une fonction SQL qui retourne les messages + count dans une seule requête.

### ❌ `getSessionStats` charge tous les messages en mémoire

```typescript
const { data: messages } = await supabase
  .from('chat_messages')
  .select('role, sequence_number')  // Pas de LIMIT
  .eq('session_id', sessionId);
```

Pour une session avec 10 000 messages, cela transfère 10 000 lignes depuis PostgreSQL. `Math.min(...array)` explose au-delà de ~65 000 éléments.

**Fix** :
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE role = 'user') as user_messages,
  MIN(sequence_number) as oldest,
  MAX(sequence_number) as newest
FROM chat_messages
WHERE session_id = $1;
```

### ❌ Couplage DOM dans un hook React

```typescript
const container = document.querySelector('.chatgpt-messages-container') as HTMLElement;
```

Le hook `useInfiniteMessages` dépend d'un sélecteur CSS hardcodé. Si la classe change, le scroll est silencieusement cassé (pas d'erreur, juste un jump de scroll).

**Fix** : Passer une `RefObject<HTMLElement>` en paramètre du hook.

### ❌ Pas de real-time sur les messages

`useChatSessionsRealtime` synchronise les sessions via Supabase Realtime mais **pas les messages**. Sur un autre onglet, les nouveaux messages n'apparaissent pas sans refresh manuel.

**Fix** : Subscription Supabase Realtime sur `chat_messages` filtrée par `session_id`.

### ❌ Pas de cache pour les messages

Chaque changement de session (même pour une session déjà visitée) recharge tous les messages. Sans cache client, la latence perçue est constante même si les données n'ont pas changé.

**Fix** : Cache LRU côté client (ex : `Map<sessionId, { messages, hasMore, loadedAt }>` avec TTL).

### ❌ Pas de validation de la longueur du contenu

Aucune contrainte sur la longueur de `content` en DB ou en API. Un message de 100MB peut être inséré.

**Fix** :
```sql
ALTER TABLE chat_messages ADD CONSTRAINT content_length CHECK (length(content) <= 1000000);
```
ET validation Zod dans les routes API.

### ❌ Pas de rate limiting

Les routes `/messages/recent`, `/messages/before`, `/messages/add` n'ont aucun rate limiting. Vecteur d'attaque DoS.

### ❌ Signature `add_message_atomic` fragmentée entre migrations

La fonction a été modifiée plusieurs fois via des migrations, mais le fichier `20250130_create_chat_messages_functions.sql` reflète l'état initial. La vraie signature de prod n'est visible qu'en lisant **toutes les migrations dans l'ordre**. Risque de confusion.

**Fix** : Maintenir un fichier `schema/functions.sql` ou `schema/current_state.sql` qui reflète toujours l'état courant.

### ❌ Soft delete absent

L'édition de message supprime définitivement tout ce qui suit le point d'édition. Pas d'audit trail, pas d'annulation possible.

### ❌ Pas de recherche full-text

Aucun index `tsvector` sur `content`. Impossible de rechercher dans l'historique.

---

## 11. Axes d'amélioration pour tendre vers l'excellence

### 11.1 Consolidation de la fonction SQL atomique

Étendre `add_message_atomic` pour gérer **tous les champs en un seul appel** :

```sql
CREATE OR REPLACE FUNCTION public.add_message_atomic(
  p_session_id       UUID,
  p_role             TEXT,
  p_content          TEXT,
  p_tool_calls       JSONB DEFAULT NULL,
  p_tool_call_id     TEXT DEFAULT NULL,
  p_name             TEXT DEFAULT NULL,
  p_reasoning        TEXT DEFAULT NULL,
  p_stream_timeline  JSONB DEFAULT NULL,  -- ✅ NOUVEAU
  p_tool_results     JSONB DEFAULT NULL,  -- ✅ NOUVEAU
  p_attached_images  JSONB DEFAULT NULL,
  p_attached_notes   JSONB DEFAULT NULL,
  p_mentions         JSONB DEFAULT NULL,
  p_prompts          JSONB DEFAULT NULL,
  p_canvas_selections JSONB DEFAULT NULL,
  p_operation_id     UUID DEFAULT NULL
)
RETURNS public.chat_messages
-- ...
```

Résultat : 1 round-trip au lieu de 3 pour les messages assistant.

### 11.2 Séquence PostgreSQL pour atomicité sans retry

Remplacer `MAX() + 1` par une séquence PostgreSQL dédiée par session :

```sql
-- Alternative avec advisory lock (sans séquence)
SELECT pg_advisory_xact_lock(hashtext(p_session_id::text));
next_seq := get_next_sequence(p_session_id);
-- INSERT sans risque de collision, lock libéré à la fin de la transaction
```

Ou avec une table de compteurs :

```sql
INSERT INTO session_sequence_counters (session_id, next_val)
VALUES (p_session_id, 1)
ON CONFLICT (session_id) DO UPDATE SET next_val = session_sequence_counters.next_val + 1
RETURNING next_val;
```

Ce pattern garantit l'atomicité sans retry et sans récursion.

### 11.3 Query optimisée avec count intégré

```sql
-- Remplacer 2 queries par 1 avec window function
SELECT *, COUNT(*) OVER() as total_count
FROM chat_messages
WHERE session_id = $1
ORDER BY sequence_number DESC
LIMIT $2;
```

Ou une fonction SQL dédiée :

```sql
CREATE OR REPLACE FUNCTION get_recent_messages_paginated(
  p_session_id UUID,
  p_limit INT DEFAULT 15
)
RETURNS TABLE(message chat_messages, total_count BIGINT)
-- ...
```

### 11.4 Temps réel sur les messages

```typescript
// Dans useInfiniteMessages
useEffect(() => {
  if (!sessionId) return;

  const subscription = supabase
    .channel(`messages:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      // Ajouter le nouveau message seulement si pas déjà présent
      setMessages(prev => {
        const exists = prev.some(m => m.id === payload.new.id);
        return exists ? prev : [...prev, payload.new as ChatMessage];
      });
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [sessionId]);
```

### 11.5 Cache LRU côté client

```typescript
// Cache simple avec TTL et invalidation
const messageCache = new Map<string, {
  messages: ChatMessage[];
  hasMore: boolean;
  loadedAt: number;
}>();

const CACHE_TTL_MS = 60_000; // 1 minute

function getCachedMessages(sessionId: string) {
  const cached = messageCache.get(sessionId);
  if (!cached) return null;
  if (Date.now() - cached.loadedAt > CACHE_TTL_MS) {
    messageCache.delete(sessionId);
    return null;
  }
  return cached;
}
```

### 11.6 Ref pour le container de scroll

```typescript
// Avant
const container = document.querySelector('.chatgpt-messages-container');

// Après
interface UseInfiniteMessagesOptions {
  sessionId: string | null;
  scrollContainerRef: RefObject<HTMLElement>; // ✅ Injection de dépendance
}
```

### 11.7 Soft delete avec audit trail

```sql
ALTER TABLE chat_messages
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN deleted_by UUID;

-- Vue pour les messages actifs
CREATE VIEW active_chat_messages AS
SELECT * FROM chat_messages WHERE deleted_at IS NULL;
```

### 11.8 Rate limiting sur les routes API

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min par user
});

// Dans chaque route handler
const { success } = await ratelimit.limit(user.id);
if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
```

### 11.9 Recherche full-text

```sql
-- Ajouter colonne tsvector
ALTER TABLE chat_messages ADD COLUMN content_search tsvector
  GENERATED ALWAYS AS (to_tsvector('french', content)) STORED;

-- Index GIN pour la recherche
CREATE INDEX idx_messages_content_search ON chat_messages USING GIN(content_search);

-- Query
SELECT * FROM chat_messages
WHERE session_id = $1
  AND content_search @@ plainto_tsquery('french', $2)
ORDER BY sequence_number DESC;
```

---

## 12. Ce qui manque pour un niveau GAFAM

### 12.1 Virtualisation des messages (critique au-delà de 200 messages)

La virtualisation est conditionnée à `> 100 messages` mais n'est pas activée par défaut. Pour des conversations longues (5 000+ messages, cas fréquent pour les power users), rendre tous les DOM nodes détruit les performances.

**Solution GAFAM** : `@tanstack/react-virtual` avec virtualisation permanente, taille de fenêtre dynamique basée sur la hauteur des messages, et "overscan" ajusté.

### 12.2 Streaming avec récupération sur reconnexion

Si la connexion est coupée pendant un stream, le message est perdu ou corrompu. Pas de mécanisme de reprise.

**Solution GAFAM** : Enregistrement incrémental pendant le streaming (checkpoint toutes les N tokens), reprise possible sur reconnexion via `sequence_number` + `operation_id`.

### 12.3 Export de l'historique

Aucune fonctionnalité d'export (JSON, Markdown, PDF). Essentiel pour la conformité RGPD (droit à la portabilité).

### 12.4 Archivage et rétention

Pas de stratégie d'archivage. Les vieilles sessions restent dans la table principale. Pour 500K utilisateurs avec 1 000 messages/session en moyenne = 500M rows dans une seule table.

**Solution GAFAM** : Table de partitioning PostgreSQL par date, archivage des sessions > 90 jours vers object storage (S3/GCS), "recall" à la demande.

### 12.5 Observabilité des messages

Aucune métrique : latence d'insertion, taille des messages, fréquence d'édition, distribution des rôles. Pour un système de prod, impossible de détecter une dégradation sans métriques.

**Solution GAFAM** : `pg_stat_user_tables`, OpenTelemetry sur chaque méthode HistoryManager, alertes sur P95 > 500ms.

### 12.6 Recherche cross-sessions

Impossible de chercher "quel message contient X dans toutes mes sessions". Essentiel pour la productivité des power users.

**Solution GAFAM** : Index `tsvector` + fonction de recherche avec ranking (`ts_rank`), ou ElasticSearch/Typesense en synchronisation.

### 12.7 Collaborative history (multi-user sur une session)

Actuellement, une session = un utilisateur. Pas de support pour le partage de session ou la collaboration.

**Solution GAFAM** : Table `session_members`, RLS basée sur l'appartenance plutôt que le `user_id` direct, Realtime multi-user.

### 12.8 Branchement de conversations (vrai branching, pas juste delete-after)

L'édition supprime définitivement la branche précédente. Un système avancé permettrait de conserver les branches et de naviguer entre elles (comme git).

**Solution GAFAM** : Table `chat_branches`, `parent_branch_id`, `branch_point_sequence`. Complexe mais transforme l'historique en arbre plutôt qu'en liste.

### 12.9 Compression du contenu

Les messages longs (avec code, documents) peuvent faire plusieurs dizaines de KB chacun. Sans compression, l'espace DB explose.

**Solution GAFAM** : `pg_compress` sur la colonne `content`, ou stockage des messages > 10KB dans S3 avec une référence dans la table.

### 12.10 Circuit breaker et fallback

Si PostgreSQL est surchargé, toute l'application est bloquée. Pas de circuit breaker, pas de mode dégradé.

**Solution GAFAM** : Circuit breaker (Opossum.js ou implémentation maison), cache Redis en lecture pour les messages récents, mode lecture seule automatique si écriture échoue.

---

## 13. Recommandations finales pour une nouvelle implémentation

Si tu construis un système d'historique de chat from scratch en visant le niveau GAFAM, voici les décisions architecturales dans l'ordre d'importance :

### Priorité 1 — Fondations (sans compromis)

1. **Table dédiée `messages`** avec `sequence_number` auto-incrémenté — jamais de JSONB pour les collections
2. **Pagination cursor-based** sur `sequence_number` — jamais d'offset
3. **Atomicité garantie** : séquence PostgreSQL ou advisory lock — pas de `MAX() + 1` nu
4. **RLS PostgreSQL** : isolation par user dès le départ
5. **TypeScript strict** avec union discriminée sur `role`

### Priorité 2 — Performance (avant le premier utilisateur)

6. **Index composite** `(session_id, sequence_number DESC)` — non négociable
7. **LIMIT en DB** — jamais de slice en mémoire
8. **Count dans la même query** — window function ou CTE
9. **Virtualisation** dès le départ (pas au-delà de 100 messages)
10. **Cache client LRU** pour les sessions déjà visitées

### Priorité 3 — Robustesse (avant 100 utilisateurs)

11. **Rate limiting** sur toutes les routes API
12. **Validation de la longueur** en DB et en API (Zod)
13. **Soft delete** avec `deleted_at`
14. **operation_id** pour idempotence des retries
15. **Real-time** sur les messages (Supabase Realtime ou WebSocket)

### Priorité 4 — Excellence (avant 500 utilisateurs)

16. **Recherche full-text** (`tsvector` + GIN index)
17. **Observabilité** : métriques par méthode, alertes P95
18. **Archivage** : partitioning par date ou table d'archive
19. **Export RGPD** : JSON + Markdown
20. **Circuit breaker** sur HistoryManager

### Erreurs à ne jamais reproduire

| ❌ Anti-pattern | ✅ Solution |
|----------------|-------------|
| JSONB pour les messages | Table dédiée avec sequence_number |
| Pagination par offset | Pagination cursor (sequence_number) |
| `document.querySelector` dans un hook | `RefObject<HTMLElement>` en paramètre |
| `MAX() + 1` sans verrou | Séquence PostgreSQL ou advisory lock |
| 3 round-trips pour 1 message | Fonction SQL complète (1 round-trip) |
| Cache sessions en module global | Cache avec scope utilisateur |
| `Math.min(...allMessages.map(...))` | Query SQL `MIN(sequence_number)` |
| Pas de rate limiting | Rate limit dès le départ |
| Contenu sans limite de taille | Contrainte DB + validation Zod |

---

*Rapport rédigé par analyse statique du code Cinesia — Février 2026*  
*Périmètre : `src/services/chat/`, `src/hooks/useInfiniteMessages.ts`, `src/types/chat.ts`, `supabase/migrations/`, routes API `/api/chat/sessions/`*
