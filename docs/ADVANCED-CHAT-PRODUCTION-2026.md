# Advanced Chat Production 2026

> Guide de référence — Audit complet du système de chat Cinesia.  
> Objectif : excellence production, niveau GAFAM.  
> Audité le : 21 mars 2026.

---

## Statut global

**NON PRÊT pour une production fiable et robuste.**  
4 bloquants critiques doivent être résolus avant tout passage en prod stable.  
Les problèmes TypeScript et la dette fichiers sont sérieux mais non bloquants à court terme.  
La suppression des providers Groq / xAI (dès que Liminality couvre tous les cas) effacera ~4 000 lignes de dette.

---

## Table des matières

1. [Architecture du chat](#1-architecture-du-chat)
2. [Bloquants critiques — à corriger avant prod](#2-bloquants-critiques--à-corriger-avant-prod)
3. [Problèmes TypeScript — hauts](#3-problèmes-typescript--hauts)
4. [Problèmes architecturaux — moyens](#4-problèmes-architecturaux--moyens)
5. [Problèmes TypeScript — bas](#5-problèmes-typescript--bas)
6. [Dette fichiers > 500 lignes](#6-dette-fichiers--500-lignes)
7. [Ce qui est bien fait](#7-ce-qui-est-bien-fait)
8. [Roadmap de correction priorisée](#8-roadmap-de-correction-priorisée)

---

## 1. Architecture du chat

### Flux d'envoi d'un message

```
ChatInput.onSend
  → useChatActions.send
  → useChatSend (construit MessageContent : texte + images + notes)
  → ChatFullscreenV2.handleSendMessage
  → useChatMessageActions.sendMessage
  → ChatMessageSendingService (valide, crée tempMessage optimiste, persiste)
  → useChatResponse.sendMessage
  → StreamOrchestrator → POST /api/chat/llm/stream (SSE)
      ├─ LiminalityProvider  (provider cible long terme)
      ├─ GroqProvider        (à supprimer)
      └─ xAINativeProvider   (à supprimer)
  → onComplete → useChatHandlers → useChatStore.addMessage
  → SessionSyncService.addMessageAndSync
  → HistoryManager.addMessage
  → supabase.rpc('add_message_atomic')
```

### Fichiers clés

| Couche | Fichier | Lignes |
|--------|---------|--------|
| Page | `app/chat/page.tsx` | 41 |
| Orchestrateur UI | `components/chat/ChatFullscreenV2.tsx` | 771 |
| Input | `components/chat/ChatInput.tsx` | 587 |
| Hook send/edit | `hooks/chat/useChatMessageActions.ts` | 596 |
| Hook effets | `hooks/chat/useChatFullscreenEffects.ts` | 515 |
| Hook streaming state | `hooks/chat/useStreamingState.ts` | 416 |
| Hook streaming | `hooks/useChatResponse.ts` | 503 |
| Hook handlers | `hooks/useChatHandlers.ts` | 490 |
| Store | `store/useChatStore.ts` | 284 |
| Service send | `services/chat/ChatMessageSendingService.ts` | 338 |
| Service history | `services/chat/HistoryManager.ts` | 619 |
| Route streaming | `app/api/chat/llm/stream/route.ts` | **1720** |
| Route non-streaming | `app/api/chat/llm/route.ts` | 486 |
| Provider Liminality | `services/llm/providers/implementations/liminality.ts` | 984 |
| Provider Groq | `services/llm/providers/implementations/groq.ts` | **1616** |
| Provider xAI Native | `services/llm/providers/implementations/xai-native.ts` | **1219** |
| Provider xAI | `services/llm/providers/implementations/xai.ts` | **1135** |

---

## 2. Bloquants critiques — à corriger avant prod

### C1 — `FinalMessagePersistenceService` : perte silencieuse de données

**Fichier :** `src/services/llm/services/FinalMessagePersistenceService.ts`  
**Sévérité :** 🔴 Critique

`addMessageWithToken` est un **stub** qui retourne toujours `{ success: true }` sans rien persister :

```ts
// src/services/chatSessionService.ts L479-485
async addMessageWithToken(
  _sessionId: string,
  _message: Omit<ChatMessage, 'id'>,
  _token: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true }; // ← ne persiste RIEN en base
}
```

`FinalMessagePersistenceService` appelle ce stub — tous les messages qui passent par lui **sont silencieusement perdus**.

**Actions :**
- [ ] Identifier tous les chemins qui invoquent `FinalMessagePersistenceService`
- [ ] Remplacer `addMessageWithToken` par un appel réel à `sessionSyncService.addMessageAndSync()`
- [ ] Supprimer le stub ou le marquer explicitement `@deprecated` avec une erreur en dev

---

### C2 — Pas de Realtime sur `chat_messages` : sync multi-device cassée

**Fichier :** `src/services/RealtimeService.ts`  
**Sévérité :** 🔴 Critique

`RealtimeService` s'abonne aux canaux `articles`, `classeurs`, `editor` — **jamais à `chat_messages`**.  
`useChatSessionsRealtime` ne subscribe qu'à `chat_sessions`.

Conséquence : un message reçu depuis un autre onglet, appareil, ou via API directe **n'est jamais pushé vers l'UI active**. Le seul moyen de voir les messages d'une autre session est un rechargement complet.

**Actions :**
- [ ] Créer un hook `useChatMessagesRealtime(sessionId)` qui subscribe au canal `chat_messages:session_id=eq.{sessionId}`
- [ ] Monter ce hook dans `ChatFullscreenV2` quand `currentSession` change
- [ ] Penser au cleanup (`supabase.removeChannel`) à chaque changement de session
- [ ] Tester : ouvrir deux onglets sur la même session, envoyer un message depuis l'un, vérifier réception dans l'autre

---

### C3 — URL Railway codée en dur dans Liminality

**Fichier :** `src/services/llm/providers/implementations/liminality.ts:124`  
**Sévérité :** 🔴 Critique

```ts
baseUrl: 'https://origins-server.up.railway.app', // ← hardcodé
```

Si Railway change d'URL ou si on migre l'infra, l'application tombe sans alerte.

**Actions :**
- [ ] Ajouter `LIMINALITY_BASE_URL` dans `.env.local` et `.env.production`
- [ ] Remplacer par `process.env.LIMINALITY_BASE_URL || 'https://origins-server.up.railway.app'`
- [ ] Ajouter une vérification au démarrage : si `LIMINALITY_BASE_URL` est absent, logger un warning critique
- [ ] Documenter la variable dans `README.md` ou dans un `.env.example`

---

### C4 — Groq 500 masqué en succès (route non-streaming)

**Fichier :** `src/app/api/chat/llm/route.ts:451`  
**Sévérité :** 🔴 Critique

```ts
// Une erreur Groq 500 est reportée comme un succès
return NextResponse.json({ success: true, isFallback: true, content: 'Une erreur est survenue...' })
```

Le client croit que la réponse est légitime, la persiste en base, et l'utilisateur voit un message générique sans savoir qu'une erreur s'est produite.

**Actions :**
- [ ] Changer en `success: false` avec `errorCode: 'PROVIDER_ERROR'`
- [ ] Côté client, intercepter `isFallback: true` ou `success: false` pour afficher un toast d'erreur
- [ ] Ne pas persister en base une réponse de fallback générique
- [ ] Note : cette route non-streaming est de toute façon candidate à la suppression quand Liminality couvre tout

---

## 3. Problèmes TypeScript — hauts

### T1 — Double cast `as unknown as` sur Supabase dans la route streaming

**Fichier :** `src/app/api/chat/llm/stream/route.ts:100, 152`

```ts
supabase as unknown as SupabaseClient<unknown, { PostgrestVersion: string }, never, never, { PostgrestVersion: string }>
```

Utilisé à chaque appel à `validateAndExtractUserId` et `resolveAgent`. Indique un mismatch entre le type retourné par `createClient` et le type attendu par les fonctions utilitaires.

**Action :** Aligner les signatures de `validateAndExtractUserId` et `resolveAgent` sur le type exact retourné par `createClient` de `@supabase/ssr`. Utiliser un type helper partagé.

---

### T2 — Cast unsafe du provider pour accéder à `callWithMessagesStream` avec callables

**Fichier :** `src/app/api/chat/llm/stream/route.ts:792, 1555`

```ts
(provider as { callWithMessagesStream: (messages, tools, callables?) => AsyncGenerator<unknown> })
  .callWithMessagesStream(currentMessages, tools, synesiaCallables)
```

`callWithMessagesStream` avec le troisième argument `callables` n'est pas dans l'interface `BaseProvider`. L'appel avec le cast va silencieusement appeler la méthode sans vérification.

**Action :** Ajouter `callWithMessagesStream(messages, tools, callables?: string[]): AsyncGenerator<StreamChunk>` dans `BaseProvider` avec une implémentation par défaut qui ignore `callables`. Liminality override la méthode pour les utiliser.

---

### T3 — Extension de propriétés sur un array (anti-pattern)

**Fichier :** `src/app/api/chat/llm/stream/route.ts:599, 609, 623, 724`

```ts
(tools as Tool[] & { _synesiaCallables?: string[] })._synesiaCallables = synesiaCallableIds;
(tools as Tool[] & { _callableMapping?: Map<string, string> })._callableMapping = callableMapping;
```

Mutation de propriétés custom sur un array JavaScript via cast d'intersection. Fragile, non typé, invisible au refactor.

**Action :** Créer un objet conteneur `ToolsContext { tools: Tool[], synesiaCallables?: string[], callableMapping?: Map<string, string> }` et le passer explicitement à la place de l'array muté.

---

### T4 — `catch {}` vide — parse errors JSON invisibles en prod

**Fichier :** `src/app/api/chat/llm/stream/route.ts:971-973`

```ts
try {
  const existingObj = JSON.parse(existingArgs);
  // ...
} catch {
  // existing pas un seul objet (ex. déjà concaténé), on accumule
}
```

Les erreurs de parsing JSON sont swallowées sans log. En production, des chunks malformés passent silencieusement.

**Action :** `catch (e) { logger.debug('[Stream] JSON parse skip', { fragment: newFragment?.slice(0, 50) }); }` — même un log debug rend l'erreur observable.

---

### T5 — `string | unknown` dans le type de `mcpOutput`

**Fichier :** `src/app/api/chat/llm/stream/route.ts:1463`

```ts
let mcpOutput: string | unknown = 'MCP tool executed by Groq';
```

`string | unknown` est équivalent à `unknown` — le `string` est totalement absorbé. TypeScript n'offre aucune protection sur cette variable.

**Action :** `let mcpOutput: unknown = ...` ou mieux, typer précisément le résultat MCP.

---

### T6 — `providedAgentConfig: unknown` casté sans validation

**Fichier :** `src/app/api/chat/llm/stream/helpers.ts:53-56`

```ts
providedAgentConfig: unknown,
// ...
let finalAgentConfig = providedAgentConfig as AgentConfig | null;
```

Un `unknown` casté directement sans parsing Zod ni type guard. Si le caller passe un objet mal formé, les accès aux champs suivants peuvent crasher.

**Action :** Valider avec le schema Zod `AgentConfigSchema.nullable().parse(providedAgentConfig)` ou utiliser un type guard explicite avant le cast.

---

### T7 — `history as unknown as ChatMessage[]` (route non-streaming)

**Fichier :** `src/app/api/chat/llm/route.ts:74`

```ts
history = requestHistory as unknown as ChatMessage[];
```

Mismatch entre le type inféré par Zod et `ChatMessage[]`. Le double cast cache une divergence entre le schéma de validation et le type interne.

**Action :** Faire en sorte que le schema Zod pour `history` infère directement `ChatMessage[]`, ou utiliser `.transform()` pour convertir.

---

### T8 — `!` sur `resolvedAgentConfig.id` / `.name` (Partial)

**Fichier :** `src/app/api/chat/llm/route.ts:284-285, 386`

```ts
id: resolvedAgentConfig.id!,   // Partial<AgentConfig> — id peut être undefined
name: resolvedAgentConfig.name!,
userToken: userToken!,          // déclaré let string | undefined
```

Les `!` cachent des cas où la valeur peut réellement être `undefined` — ils suppriment l'erreur TS sans corriger le problème.

**Action :** Guard explicite avant l'utilisation : `if (!resolvedAgentConfig.id || !userToken) return error response`.

---

### T9 — `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` sans guard

**Fichier :** `src/app/api/ui/chat-sessions/route.ts:93, 204`

```ts
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

Si la variable est absente en déploiement, `createClient` reçoit `undefined` casté en `string` → erreur runtime silencieuse.

**Action :** Guard au top du fichier : `const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')`.

---

### T10 — `let body` implicit `any` (route sessions)

**Fichier :** `src/app/api/ui/chat-sessions/route.ts:75`

```ts
let body;
try {
  body = await request.json();
```

TypeScript infère `any` — aucune sécurité de type sur le body parsé.

**Action :** `let body: unknown; ... body = await request.json(); const parsed = SessionCreateSchema.parse(body);`

---

## 4. Problèmes architecturaux — moyens

### A1 — `ToolCall` défini dans 11 fichiers différents

`export interface ToolCall` est déclaré dans :
- `hooks/useChatHandlers.ts`
- `hooks/chat/useStreamingState.ts`
- `services/llm/types/strictTypes.ts`
- `services/llm/types/toolCallTypes.ts`
- `services/llm/types/groqTypes.ts`
- `services/llm/types/apiV2Types.ts`
- `services/llm/types/agentTypes.ts`
- `utils/ToolCallsParser.ts`
- `services/monitoring/ToolCallMetrics.ts`
- `services/toolCallSyncService.ts`
- `services/llm/services/SimpleToolExecutor.ts`

Aucune source unique de vérité. Toute évolution du type doit être faite en 11 endroits. Divergence garantie à terme.

**Action :** Désigner `services/llm/types/strictTypes.ts` comme source canonique. Remplacer toutes les re-déclarations par `import { ToolCall } from '@/services/llm/types/strictTypes'`.

---

### A2 — Pas d'`AbortSignal.timeout` sur le fetch streaming Liminality

**Fichier :** `src/services/llm/providers/implementations/liminality.ts:~320`

La méthode `makeApiCall` (non-streaming) a un `AbortSignal.timeout`. La méthode `callWithMessagesStream` n'en a pas. Si le serveur Railway freeze, le générateur bloque indéfiniment jusqu'au timeout de 600s de la route.

**Action :**
```ts
const response = await fetch(url, {
  signal: AbortSignal.timeout(this.config.timeout ?? 120_000),
  // ...
});
```

---

### A3 — Rollback UI absent si persist DB échoue

**Fichier :** `src/store/useChatStore.ts:145-177`

`addMessage` dans le store ne met pas à jour le state local de messages — `useInfiniteMessages` dans le composant gère l'affichage. Si `sessionSyncService.addMessageAndSync()` échoue, le message reste affiché dans l'UI mais est absent en base. Aucun rollback.

**Action :**
- [ ] Sur échec de persist, appeler `removeMessage(tempMessage.id)` dans `useInfiniteMessages`
- [ ] Afficher un toast d'erreur explicite : "Message non envoyé — réessayez"
- [ ] Logger l'erreur avec le `operation_id` pour permettre le rejeu

---

### A4 — `loading` flag jamais positionné dans le store

**Fichier :** `src/store/useChatStore.ts`

`setLoading` existe mais n'est appelé dans aucune action async (`addMessage`, `createSession`, `deleteSession`, `updateSession`). Les composants qui lisent `loading` ne verront jamais de spinner pendant ces opérations.

**Action :** Ajouter `set({ loading: true })` au début et `set({ loading: false })` dans finally de chaque action async.

---

### A5 — `updateSession` swallow les erreurs sans feedback utilisateur

**Fichier :** `src/store/useChatStore.ts:268-275`

```ts
} catch (error) {
  logger.error('[ChatStore] Erreur updateSession:', error);
  // ← aucun set({ error: ... }), aucun feedback UI
}
```

Un renommage de session qui échoue est ignoré silencieusement par l'utilisateur.

**Action :** `set({ error: 'Impossible de renommer la session' })` + toast d'erreur.

---

### A6 — Écriture en deux phases non atomique dans `HistoryManager`

**Fichier :** `src/services/chat/HistoryManager.ts:226-268`

```
Étape 1 : rpc('add_message_atomic')  → INSERT — OK
Étape 2 : UPDATE stream_timeline / tool_results → peut échouer
Étape 3 : SELECT final → retourne la ligne incomplète si étape 2 a échoué
```

`updateError` est logué mais pas rethrown. Le message est sauvé **sans ses tool_calls/timeline** si l'étape 2 échoue.

**Action :** Inclure `stream_timeline` et `tool_results` directement dans le payload de `add_message_atomic` (modifier la fonction PG) pour éliminer la phase 2. Ou rethrow `updateError` pour que l'appelant sache que la persist est incomplète.

---

### A7 — `get_next_sequence` TOCTOU (mitigé côté client)

**Fichier :** `supabase/migrations/20250130_create_chat_messages_functions.sql:14-30`

```sql
SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq ...
```

Deux transactions concurrentes peuvent lire le même `MAX` → même `next_seq` → retry récursif.  
`runExclusive()` client-side sérialise les appels par session, rendant la collision très rare — mais pas éliminée.

**Action à terme :** Utiliser une `SEQUENCE` PostgreSQL par session ou un `SELECT ... FOR UPDATE` sur une ligne de lock. Acceptable en l'état tant que `runExclusive()` est actif.

---

### A8 — `alreadyExecuted` / `result` injectés sur `ToolCall` sans type

**Fichier :** `src/services/llm/providers/implementations/xai-native.ts`

```ts
(toolCall as ToolCall & { alreadyExecuted: boolean }).alreadyExecuted = true;
```

Convention runtime non typée — peut casser silencieusement lors d'un refactor de `ToolCall`.

**Action :** Étendre l'interface `ToolCall` avec `alreadyExecuted?: boolean; result?: unknown` et supprimer les casts.

---

### A9 — Logging bug : `null?.substring(...) + '...'` → `"undefined..."`

**Fichier :** `src/app/api/chat/llm/route.ts:445`

```ts
message: message?.substring(0, 100) + '...',
// ↑ si message est null (initialisé à null, jamais assigné avant l'erreur)
// → 'undefined...' dans les logs
```

**Action :** `message: message ? message.substring(0, 100) + '...' : '(null)'`

---

### A10 — `DEFAULT_AGENT_SCOPES` dupliqué dans deux fichiers

**Fichiers :** `app/api/chat/llm/stream/route.ts:25` et `app/api/chat/llm/stream/helpers.ts:10`

La constante est définie deux fois. Toute modification doit être faite en deux endroits.

**Action :** Extraire dans `constants/chatAgentScopes.ts` et importer des deux côtés.

---

### A11 — SSE parse errors silencieusement skippées dans tous les providers

Dans `GroqProvider`, `LiminalityProvider`, `XAINativeProvider` : les erreurs de parsing des chunks SSE sont catchées et `continue` — le chunk perdu est invisible.

**Action :** Ajouter un compteur `parseErrorCount` par connexion. Si > seuil (ex. 5), émettre un `StreamChunk { type: 'error' }` au lieu de continuer silencieusement.

---

## 5. Problèmes TypeScript — bas

### B1 — `!` redondant dans les type guards de `types/chat.ts`

**Fichier :** `src/types/chat.ts:137, 147`

```ts
(msg as AssistantMessage).tool_calls!.length > 0  // ! redondant après Array.isArray()
(msg as AssistantMessage).reasoning!.length > 0   // ! redondant après typeof === 'string'
```

Pas de risque runtime mais code trompeur.

**Action :** Supprimer les `!` — le check précédent suffit.

---

### B2 — `!` sur propriétés optionnelles gardées dans `ChatMessage.tsx`

**Fichier :** `src/components/chat/ChatMessage.tsx:102, 121`

```ts
{hasAttachedImages && userMessage.attachedImages!.map(...)}
```

La garde booléenne protège, mais le `!` restera incorrect si la garde est un jour refactorisée.

**Action :** Utiliser le optional chaining : `userMessage.attachedImages?.map(...)`.

---

### B3 — `options.action!.onClick()` sans guard dans `chatToast.tsx`

**Fichier :** `src/utils/chatToast.tsx:38`

```ts
options.action!.onClick()
```

`action` est optionnel dans l'interface. Le `!` supprime l'erreur TS mais crache en runtime si `action` est absent.

**Action :** `options.action?.onClick()` ou guard `if (options.action)`.

---

## 6. Dette fichiers > 500 lignes

| Fichier | Lignes | Priorité | Note |
|---------|--------|----------|------|
| `app/api/chat/llm/stream/route.ts` | **1720** | Haute | Fait DB + auth + dispatch + tool exec + métriques — splitter en modules |
| `services/llm/providers/implementations/groq.ts` | **1616** | **À supprimer** | Suppression dès Liminality complet |
| `services/llm/providers/implementations/xai-native.ts` | **1219** | **À supprimer** | Suppression dès Liminality complet |
| `services/llm/providers/implementations/xai.ts` | **1135** | **À supprimer** | Suppression dès Liminality complet |
| `services/llm/providers/implementations/liminality.ts` | **984** | Haute | Splitter : streaming / outils / retry / types |
| `services/chat/HistoryManager.ts` | **619** | Moyenne | Load / paginate / truncate à séparer |
| `hooks/chat/useChatMessageActions.ts` | **596** | Moyenne | Send et Edit à séparer |
| `components/chat/ChatInput.tsx` | **587** | Moyenne | 14 hooks câblés directement |
| `components/chat/SettingsModal.tsx` | **549** | Basse | — |
| `hooks/chat/useChatFullscreenEffects.ts` | **515** | Basse | — |
| `app/api/chat/llm/route.ts` | **486** | Candidat suppression | Route non-streaming — legacy |

**Total dette Groq + xAI + xAI-native : ~3 970 lignes supprimées dès que Liminality couvre tous les cas.**

---

## 7. Ce qui est bien fait

- **Aucun `@ts-ignore` / `@ts-nocheck`** dans tout le code chat
- **Aucun `console.log`** en production — tout passe par `logger` / `simpleLogger`
- **`operation_id` UNIQUE** en base → pas de double-persist sur retry ou double-clic
- **`runExclusive()` par session** dans `SessionSyncService` → sérialisation client correcte, pas de race côté front
- **`useChatSessionsRealtime`** : circuit breaker (10 retries → 5 min cooldown), backoff exponentiel, `isCancelled` guard, `removeChannel()` au cleanup
- **`useChatSessionsPolling`** : backoff sur erreurs, cleanup au unmount
- **Optimistic delete avec rollback** : `deletingSessions` Set empêche la réapparition fantôme depuis le polling
- **RLS** correcte sur `chat_messages` via ownership de session (pas de `user_id` direct)
- **`UNIQUE(session_id, sequence_number)`** : empêche les collisions de séquence même si la fonction PG race
- **Anti-boucle agentic loop** : 20 rounds max, dedup `seenToolCallIds`, `forcedFinalRound`
- **`tool_use_failed` retry automatique** (1×) avec message système correctif
- **Validation Zod** sur toutes les entrées de route API
- **Séparation claire** Send / Edit services (`ChatMessageSendingService` / `ChatMessageEditService`)
- **`ChatOperationLock`** : mutex async pour éviter les send/edit concurrents

---

## 8. Roadmap de correction priorisée

### Phase 0 — Bloquants (avant toute mise en prod)

| # | Item | Fichier(s) | Effort |
|---|------|-----------|--------|
| C1 | Réparer `FinalMessagePersistenceService` — brancher sur `sessionSyncService` | `FinalMessagePersistenceService.ts`, `chatSessionService.ts` | S |
| C2 | Ajouter Realtime sur `chat_messages` | Nouveau hook `useChatMessagesRealtime`, `ChatFullscreenV2` | M |
| C3 | Externaliser `LIMINALITY_BASE_URL` en variable d'env | `liminality.ts`, `.env.example` | XS |
| C4 | Groq 500 → `success: false` dans la route non-streaming | `app/api/chat/llm/route.ts` | XS |

### Phase 1 — Qualité TypeScript haute (après bloquants)

| # | Item | Effort |
|---|------|--------|
| T1 | Aligner type `createClient` dans les fonctions auth/agent | S |
| T2 | Ajouter `callWithMessagesStream(callables?)` dans `BaseProvider` | S |
| T3 | Remplacer l'array muté par un `ToolsContext` objet | M |
| T4 | Logger les catch JSON silencieux | XS |
| T6 | Valider `providedAgentConfig` via Zod dans helpers | S |
| T7 | Aligner schema Zod et type `ChatMessage[]` | S |
| T8 | Guards explicites avant les `!` sur Partial | S |
| T9 | Guard env var `SUPABASE_ANON_KEY` au top des routes | XS |
| T10 | Typer `body` avec `unknown` + Zod parse | XS |

### Phase 2 — Architecture (stabilité long terme)

| # | Item | Effort |
|---|------|--------|
| A1 | Consolider `ToolCall` vers `strictTypes.ts` (source unique) | M |
| A2 | Ajouter `AbortSignal.timeout` sur fetch streaming Liminality | XS |
| A3 | Rollback UI si persist DB échoue | M |
| A4 | Positionner `loading` dans toutes les actions async du store | S |
| A5 | `updateSession` → set erreur + toast | XS |
| A6 | Inclure JSONB dans `add_message_atomic` (éliminer phase 2 write) | M |
| A8 | Étendre interface `ToolCall` avec `alreadyExecuted?` | XS |
| A10 | Extraire `DEFAULT_AGENT_SCOPES` dans un fichier constants | XS |
| A11 | Compteur + seuil sur SSE parse errors dans les providers | S |

### Phase 3 — Dette structurelle (en parallèle de Liminality)

| # | Item | Effort |
|---|------|--------|
| D1 | Supprimer `groq.ts`, `xai.ts`, `xai-native.ts` dès Liminality complet | L |
| D2 | Splitter `stream/route.ts` (1720L) en modules auth / dispatch / tool-exec / metrics | XL |
| D3 | Splitter `liminality.ts` (984L) en streaming / outils / retry | L |
| D4 | Splitter `useChatMessageActions` en useSendMessage + useEditMessage | M |
| D5 | Splitter `HistoryManager` en load / paginate / truncate | M |
| D6 | Supprimer route non-streaming `app/api/chat/llm/route.ts` | M |

---

*Dernière mise à jour : 21 mars 2026 — Audit JEAN-CLAUDE*
