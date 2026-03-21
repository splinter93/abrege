# Advanced Chat Roadmap

Document de référence listant les **problèmes identifiés** sur le chat par rapport aux meilleurs produits du marché (ChatGPT, Claude, etc.). Ces points constituent une roadmap d’amélioration pour se rapprocher du niveau industriel.

---

## 1. Robustesse et gestion des erreurs

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas d’ErrorBoundary autour du chat** | Une erreur non catchée dans un composant chat peut faire tomber toute la vue. Les autres zones (settings, dossiers) ont un ErrorBoundary ; la page chat et `ChatFullscreenV2` non. | Haute |
| **Rate limit (429) invisible côté UI** | L’API renvoie 429 et des headers `X-RateLimit-*` / `Retry-After`, mais le client n’affiche pas de message « Trop de requêtes », ni de désactivation temporaire du bouton d’envoi avec compte à rebours. | Haute |
| **StreamErrorDisplay sans fermeture** | Le composant reçoit `onDismiss` en prop mais n’affiche pas de bouton « Fermer » / « Ignorer » ; seulement Copier et Relancer. L’utilisateur ne peut pas masquer l’erreur sans relancer. | Moyenne |
| **Retry limité** | Retry automatique existe pour le fetch du stream (NetworkRetryService) et partiellement pour `tool_use_failed` ; pas de stratégie UI claire pour les 5xx ou autres erreurs réseau. | Moyenne |

---

## 2. Fonctionnalités manquantes ou partielles

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas de recherche full-text dans les messages** | La sidebar permet de rechercher par **nom de conversation** uniquement. Aucune recherche dans le **contenu** des messages (comme dans ChatGPT / Claude). | Basse |
| **Pas de gestion offline** | Aucune détection de `navigator.onLine`, pas de file d’attente des messages, pas de message « Vous êtes hors ligne ». L’expérience en perte de connexion est non gérée. | Moyenne |
| **Pas de bouton « Arrêter » dédié pendant le stream** | L’arrêt est possible via `abortStream` / comportement du bouton d’envoi en mode « stop », mais aucun bouton dédié « Arrêter la génération » toujours visible pendant le stream, comme chez les leaders. | Moyenne |

---

## 3. Mobile et clavier

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **`keyboardInset` non utilisé** | La valeur est calculée (ex. pour le clavier mobile) mais **n’est pas utilisée** dans `ChatInputContainer` / `ChatMessagesArea` pour le layout. Risque de champ masqué ou de scroll incorrect. | Haute |
| **Comportement Android** | `resetRootScroll` sur Android peut provoquer des saccades ; stratégie clavier (adjustResize, etc.) documentée dans `AUDIT-KEYBOARD-ANDROID-CHAT.md` mais à valider en conditions réelles. | Moyenne |

---

## 4. Accessibilité

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Pas de région live pour le streaming** | Aucun `aria-live` (polite ou assertive) pour annoncer aux lecteurs d’écran l’arrivée d’un nouveau message ou le début / fin du streaming. | Moyenne |
| **Couverture a11y** | ARIA et `aria-label` présents sur de nombreux contrôles ; pas d’audit exhaustif (focus, ordre de tab, contraste, annonces dynamiques). | Basse |

---

## 5. Qualité de code et maintenabilité

| Problème | Détail | Priorité suggérée |
|----------|--------|-------------------|
| **Taille de `ChatFullscreenV2`** | Fichier encore ~755 lignes ; objectif de refactoring documenté (sous 300 lignes) dans `PRIORITES-REFACTORING-GROS-FICHIERS.md`. | Moyenne |
| **Tests des chemins d’erreur** | Tests d’intégration présents sur `ChatFullscreenV2` et sur edit/regenerate ; pas de couverture explicite des scénarios d’erreur (stream, retry, rate limit, offline). | Moyenne |

---

## 6. Synthèse des priorités

### À traiter en priorité (impact élevé, effort raisonnable)
- Ajouter un **ErrorBoundary** autour de la page chat ou de `ChatFullscreenV2`.
- Afficher en **UI le rate limit (429)** : message explicite + désactivation temporaire du bouton d’envoi (éventuellement avec compte à rebours).

### Ensuite
- Utiliser **`keyboardInset`** pour le layout mobile (ou corriger le comportement clavier).
- Bouton **« Arrêter »** visible pendant le stream.
- Bouton **« Fermer »** sur `StreamErrorDisplay`.
- **Gestion offline** minimale (détection + message).
- **`aria-live`** pour les annonces de nouveaux messages / streaming.

### Plus tard
- **Recherche full-text** dans le contenu des messages.
- **Refactoring** de `ChatFullscreenV2` (réduction de la taille).
- **Tests** ciblés sur les chemins d’erreur et l’accessibilité.

---

## Références dans le codebase

- Composants : `src/components/chat/` (ChatFullscreenV2, ChatMessagesArea, ChatInputContainer, SidebarUltraClean, StreamErrorDisplay, EnhancedMarkdownMessage, ChatMessage, BubbleButtons).
- Hooks : `src/hooks/chat/` (useStreamingState, useChatMessageActions, useChatFullscreenEffects), `useInfiniteMessages.ts`, `useChatResponse.ts`.
- Store : `src/store/useChatStore.ts`.
- Mobile : `docs/mobile/AUDIT-KEYBOARD-ANDROID-CHAT.md`, `docs/BREAKPOINT_768_CHAT.md`.

---

---

## 7. Bloquants production — audit mars 2026

Audit complet effectué le 21 mars 2026. Résultat et suivi dans [`docs/ADVANCED-CHAT-PRODUCTION-2026.md`](ADVANCED-CHAT-PRODUCTION-2026.md).

### Corrigés (commit `5e54d4ce`, 21 mars 2026)

| ID | Problème | Correction |
|----|----------|-----------|
| **C1** | `FinalMessagePersistenceService` appelait un stub `addMessageWithToken` qui ne persistait rien | Rebranché sur `HistoryManager.getInstance().addMessage()` (SERVICE_ROLE, atomique) ; stub remplacé par une erreur explicite |
| **C2** | Aucune subscription Realtime sur `chat_messages` — sync multi-onglet/multi-device cassée | Nouveau hook `useChatMessagesRealtime` (circuit-breaker + backoff) monté dans `ChatFullscreenV2` ; migration `REPLICA IDENTITY FULL` + `supabase_realtime` publication appliquée |
| **C3** | URL Railway codée en dur dans `LiminalityProvider` — risque d’outage sans alerte | `DEFAULT_CONFIG.baseUrl` lit `process.env.LIMINALITY_BASE_URL` + fallback conservé + warning one-shot si absent |
| **C4** | Erreur Groq 500 masquée en `success: true` — client persistait une réponse générique comme vraie IA | Retourne `{ success: false, errorCode: 'PROVIDER_UNAVAILABLE' }` HTTP 200 ; toast UI, rien en base |

### À corriger — TypeScript hauts (Phase 1)

Détail complet dans [`ADVANCED-CHAT-PRODUCTION-2026.md`](ADVANCED-CHAT-PRODUCTION-2026.md).

| ID | Fichier | Problème |
|----|---------|----------|
| T1 | `stream/route.ts` | Double cast `supabase as unknown as SupabaseClient<...>` à chaque appel auth |
| T2 | `stream/route.ts` | Cast provider pour `callWithMessagesStream(callables?)` absent de `BaseProvider` |
| T3 | `stream/route.ts` | Mutation de propriétés custom sur un array `Tool[]` |
| T4 | `stream/route.ts` | `catch {}` vide — parse errors JSON swallowées silencieusement |
| T6 | `stream/helpers.ts` | `unknown` casté sans validation runtime |
| T7 | `llm/route.ts` | `history as unknown as ChatMessage[]` — mismatch Zod/type |
| T8 | `llm/route.ts` | `!` sur `Partial<AgentConfig>` et `string | undefined` |
| T9 | `ui/chat-sessions/route.ts` | `process.env.SUPABASE_ANON_KEY!` sans guard |
| T10 | `ui/chat-sessions/route.ts` | `let body` — `any` implicite |

### À corriger — Architecture (Phase 2)

| ID | Problème |
|----|----------|
| A1 | `ToolCall` défini dans 11 fichiers — source unique absente |
| A2 | Pas d’`AbortSignal.timeout` sur le fetch streaming Liminality |
| A3 | Rollback UI absent si persist DB échoue |
| A4 | `loading` jamais positionné dans les actions async du store |
| A5 | `updateSession` swallow les erreurs sans feedback utilisateur |
| A6 | Écriture en deux phases non atomique dans `HistoryManager` (JSONB) |
| A8 | `alreadyExecuted` / `result` injectés sur `ToolCall` sans type |
| A10 | `DEFAULT_AGENT_SCOPES` dupliqué dans `route.ts` et `helpers.ts` |
| A11 | SSE parse errors silencieusement skippées dans tous les providers |

### À supprimer — dès que Liminality couvre tous les cas

`groq.ts` (1616L) + `xai.ts` (1135L) + `xai-native.ts` (1219L) + `api/chat/llm/route.ts` (486L) = **~4 456 lignes** de dette supprimées d’un coup.

---

*Document généré à partir de l’audit du chat (comparaison aux meilleurs chats IA du marché). Dernière mise à jour : 21 mars 2026.*
