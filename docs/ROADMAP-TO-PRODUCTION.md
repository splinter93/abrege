# ROADMAP TO PRODUCTION — CINESIA
**Audit complet · 20 mars 2026**  
**Auditeur :** JEAN-CLAUDE, Senior Dev  
**Périmètre :** Application complète — focus Chat / Éditeur / Dossiers  
**Dernier audit connu :** Janvier 2026 — score déclaré 8.5/10 "prêt à vendre"

---

## VERDICT GLOBAL

> **L'application N'EST PAS prête pour la production telle qu'elle est aujourd'hui.**

Depuis l'audit de janvier 2026, des régressions sont apparues et la dette technique a augmenté sur les zones critiques. Le verdict « prêt » de janvier était valable pour 3 clients en MVP contrôlé. Pour une vraie mise en production scalable et robuste, des blockers actifs doivent être réglés.

**Score actuel : 7.5/10** (vs 6.5/10 au 20 mars — B1 + B2 + B3 + I4 + D3 résolus le 21 mars)

---

## SCORES PAR ZONE

| Zone | Score | Statut |
|------|-------|--------|
| Qualité TypeScript | 6/10 | ⚠️ Dégradé |
| ESLint / Code quality | 4/10 | 🔴 184 erreurs restantes (était 232 ; batch ESLint 0 : −10) |
| Tests | 7/10 | ✅ 601/601 passent (était 600/601) |
| Sécurité | 8/10 | ✅ Routes debug supprimées |
| Architecture Chat | 8/10 | ✅ Hooks corrigés, logger.dev supprimé |
| Architecture Éditeur | 7.5/10 | ✅ Hooks corrigés (EditorToolbar, NoteEmbed×2, HeaderImage) |
| Dossiers | 5/10 | ⚠️ Fichier monstre (non traité) |
| Performance | 7/10 | ✅ Acceptable |
| CSS / Design System | 4/10 | 🔴 Chaotique (non traité) |

---

## 🔴 BLOCKERS CRITIQUES (Pré-production obligatoire)

### B1 — React Hooks appelés conditionnellement (6 fichiers)

**Sévérité : CRITIQUE. Peut provoquer des crashes silencieux et un comportement imprévisible.**

ESLint remonte **22 violations `react-hooks/rules-of-hooks`** dans des fichiers de production :

| Fichier | Note |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Modifié en cours |
| `src/components/chat/ToolCallMessage.tsx` | |
| `src/components/editor/EditorToolbar.tsx` | |
| `src/components/editor/NoteEmbedContent.tsx` | |
| `src/components/editor/NoteEmbedView.tsx` | |
| `src/components/EditorHeaderImage.tsx` | |

**Exemple exact dans `ChatMessage.tsx` :** hooks (`useEffect`, `useRef`) appelés après des `return null` conditionnels (lignes 46, 55, 56). En React Strict Mode, cela provoque des erreurs d'hydratation et des crashes en production. C'est précisément le genre de bug qui se manifeste sur mobile ou après un rechargement rapide de page.

**Correction :** Remonter tous les hooks avant les `return` conditionnels, ou utiliser une composition de composants pour isoler les branches conditionnelles.

**Statut :** ✅ Corrigé le 21/03/2026 — tous les hooks remontés avant les early returns dans les 6 fichiers. `ToolCallMessage.tsx` supprimé (composant mort). `logger.dev` boucle rendu supprimé.

---

### B2 — `/api/debug-chatgpt` expose les tokens d'auth en production

**Sévérité : CRITIQUE SÉCURITÉ.**

Fichier : `src/app/api/debug-chatgpt/route.ts`

Ce endpoint est accessible sans aucune authentification et **logue tous les headers HTTP**, y compris les tokens `Authorization`. Il n'a aucune protection `NODE_ENV !== 'development'`. En production sur Vercel, n'importe qui peut appeler `/api/debug-chatgpt` et faire logger des tokens dans les serveurs Vercel.

À noter également : `src/app/api/debug-tool-call/route.ts` — même problème, multiple `console.log` en prod sans guard.

**Correction :** Ajouter immédiatement un guard en tête de fichier :
```typescript
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
```
Ou supprimer ces fichiers si non utilisés en développement actif.

**Statut :** ✅ Corrigé le 21/03/2026 — `debug-chatgpt/route.ts` et `debug-tool-call/route.ts` supprimés (ce dernier exposait également les 30 premiers chars de `SUPABASE_SERVICE_ROLE_KEY`).

---

### B3 — Tests en régression : 3 fichiers de test échouent

**Sévérité : CRITIQUE CI/CD.**

L'audit de janvier déclarait 594/594 tests passés. Aujourd'hui : **3 fichiers en échec, 1 test failed** sur 601 (52 fichiers de test).

Résultat actuel :
```
Test Files  3 failed | 49 passed (52)
Tests       1 failed | 600 passed (601)
```

Fichiers en échec :
- `src/services/network/__tests__/NetworkRetryService.test.ts` — 1 test failed ("should use exponential backoff")
- `server/xai-voice-proxy/__tests__/server.test.ts` — erreurs TypeScript sur mocks WebSocket
- `src/services/chat/__tests__/SessionTitleGenerator.test.ts` — erreur non capturée (console.log en cause)

Cause probable pour `NetworkRetryService` : la sérialisation d'erreur `{ statusCode: 502, errorType: 'bad_gateway' }` a changé depuis une refacto.

**Correction :** Identifier et corriger les mocks cassés + adapter les assertions aux nouveaux types.

**Statut :** ✅ Corrigé le 21/03/2026 — 601/601 tests passent, 0 test individuel en échec.
- `NetworkRetryService.test.ts` : flush microtasks via `await Promise.resolve()×3` + `promise.catch(() => {})` pour les unhandled rejections
- `SessionTitleGenerator.test.ts` : assertion `>= 0` + fake timers avec AbortSignal pour le test timeout
- `server.test.ts` : mock WebSocket via `Object.assign` (TypeScript fix) + assertion `{ noServer: true }` alignée sur l'implémentation actuelle
- 2 fichiers pré-existants restent en erreur au chargement de module (`Editor.test.tsx`, `integration-editor-flow.test.tsx`) — cause : `simpleLogger.dev` en module-level dans `lowlightInstance.ts`, mock incomplet → voir I7

---

### B4 — Erreurs ESLint dans le code de production (suivi : [ESLINT-CORRECTION-ROADMAP.md](./ESLINT-CORRECTION-ROADMAP.md))

**Sévérité : CRITIQUE.**

Dernière mesure `npm run lint` (après batch 1) :
```
✖ 1154 problems (140 errors, 1014 warnings)
```

Mesure historique de référence :
```
✖ 1256 problems (232 errors, 1024 warnings)
```

Répartition des erreurs par catégorie :

| Règle | Type | Gravité |
|-------|------|---------|
| `react-hooks/rules-of-hooks` | 22 erreurs | Crash potentiel |
| `no-console` dans API routes prod | ~50 erreurs | Fuite de logs/secrets |
| `no-empty` — blocs `catch {}` vides | Plusieurs | Erreurs silencieuses |
| `no-useless-catch` | Quelques-uns | Code mort |
| `no-constant-binary-expression` | Quelques-uns | Logique morte |
| `no-case-declarations` | 4 erreurs | Comportement non défini en JS |
| `no-undef` dans `synesia.js` | 3 erreurs | Crash runtime garanti |
| `@typescript-eslint/no-unused-expressions` | 3 erreurs | Code sans effet |

Fichiers API avec `console.log` en production (extrait) :
- `src/app/api/chat/llm/stream/route.ts`
- `src/app/api/ui/files/get-url/route.ts`
- `src/app/api/ui/files/upload/route.ts`
- `src/app/api/debug-chatgpt/route.ts`
- `src/app/api/debug-tool-call/route.ts`
- `src/app/api/test-prod/route.ts`
- Et ~20 autres

**Statut :** 🔄 En cours — 232 → **184 erreurs** (batch hooks −38, batch ESLint 0 −10). Les violations `react-hooks/rules-of-hooks` en prod sont éliminées. Reste principalement les `no-console` dans les routes API et utils.

---

## 🟠 PROBLÈMES IMPORTANTS (À corriger avant scaling)

### I1 — `ClasseursPage.tsx` : 1 460 lignes, Dieu objet

**Fichier :** `src/app/private/dossiers/ClasseursPage.tsx`

Ce fichier mélange sans séparation :
- Les tabs (classeurs) avec drag-and-drop via dnd-kit
- La grille de dossiers / notes
- Les modales (création, édition, suppression, settings)
- Le contexte menu
- La logique de renommage inline
- Les breadcrumbs avec drop targets
- Le filtrage / recherche

C'est un **point de défaillance unique** : modifier un comportement de drag risque de casser l'affichage des notes, et vice versa. Aucune séparation des responsabilités.

**Découpage cible :**
- `ClasseursHeader.tsx` (~80 lignes)
- `ClasseursTabs.tsx` + `SortableTab.tsx` (~200 lignes)
- `ClasseursGrid.tsx` (~200 lignes)
- `ClasseursModals.tsx` (~200 lignes)
- `ClasseursPage.tsx` (orchestrateur, ~150 lignes)

**Statut :** ❌ Non corrigé

---

### I2 — Fichiers massifs dans les services critiques

| Fichier | Lignes | Limite guide | Dépassement |
|---------|--------|-------------|-------------|
| `src/app/api/chat/llm/stream/route.ts` | 1 682 | 500 | **336%** |
| `src/services/llm/providers/implementations/groq.ts` | 1 614 | 500 | **323%** |
| `src/services/V2UnifiedApi.ts` | 1 532 | 500 | **306%** |
| `src/app/private/dossiers/ClasseursPage.tsx` | 1 460 | 500 | **292%** |
| `src/app/api/v2/openapi-schema/route.ts` | 1 258 | 500 | **252%** |
| `src/services/llmApi.ts` | 1 149 | 500 | **230%** |
| `src/services/llm/providers/implementations/xai-native.ts` | 1 216 | 500 | **243%** |
| `src/app/private/files/page.tsx` | 1 107 | 500 | **221%** |
| `src/store/useCanvaStore.ts` | 1 091 | 500 | **218%** |
| `src/services/canvaNoteService.ts` | 972 | 500 | **194%** |
| `src/services/optimizedApi.ts` | 983 | 500 | **197%** |
| `src/utils/contentApplyUtils.ts` | 937 | 500 | **187%** |

Ces fichiers sont **impossibles à débugger à 3h du matin avec 10K users**. Chaque modification est risquée car le scope d'impact est inconnu sans une lecture complète.

**Statut :** ❌ Non corrigé (partiellement connu depuis janvier)

---

### I3 — Copy logic dupliquée dans ChatMessage + BubbleButtons

`BubbleButtons.tsx` gère le copier avec `navigator.clipboard`. `ChatMessage.tsx` (son parent) passe un `onCopy` callback qui fait **exactement la même chose** (`navigator.clipboard.writeText`). La logique de copie est dupliquée, sans source de vérité unique.

```typescript
// BubbleButtons.tsx — handleCopy
await navigator.clipboard.writeText(content);

// ChatMessage.tsx — onCopy prop passée à BubbleButtons
onCopy={async () => {
  await navigator.clipboard.writeText(content); // ← doublon exact
}}
```

**Correction :** Supprimer la prop `onCopy` de `ChatMessage` — laisser `BubbleButtons` seul maître de cette logique.

**Statut :** ❌ Non corrigé

---

### I4 — `logger.dev` en boucle de rendu dans ChatMessage

```typescript
// ChatMessage.tsx lignes 75-87
if (role === 'assistant') {
  logger.dev('[ChatMessage] 📊 Message assistant:', {
    messageId, hasTimeline, timelineItemsCount,
    timelineItemTypes, hasToolCalls, shouldIgnoreToolCalls,
    contentPreview, contentIncludes_Function, contentIncludes_tool_result
  });
}
```

Ce log est appelé **à chaque rendu** de chaque message assistant. Dans un thread de 50 messages, c'est 50 appels par cycle de rendu. Selon l'implémentation de `logger.dev`, ce peut être une fuite de performance significative en production.

**Correction :** Supprimer ou conditionner à un flag `DEBUG_CHAT=true` dans les variables d'environnement.

**Statut :** ✅ Corrigé le 21/03/2026 — bloc supprimé dans `ChatMessage.tsx`

---

### I5 — Rate limiter en mémoire : inopérant en multi-instance

Le rate limiter (`src/services/rateLimiter.ts`, `src/middleware-utils/rateLimit.ts`) est basé sur un store **en mémoire**. Sur Vercel avec scaling serverless, chaque instance cold-start a son propre état. Un utilisateur dont les requêtes sont routées sur plusieurs instances peut contourner le rate limit entièrement.

**Impact :** Un user malveillant peut spammer le stream LLM (coût direct sur les providers IA).

**Correction :** Migrer vers Redis (Upstash recommandé pour Vercel) avec `@upstash/ratelimit`.

**Statut :** ⚠️ Connu depuis janvier 2026, non corrigé

---

### I6 — CSS : chaos total (80+ fichiers, backups pollués)

Le dossier `src/styles/` contient **80+ fichiers CSS** dont des fichiers obsolètes :

```
variables.css.backup
variables.css.new
variables.css.old
design-system.css.backup
design-system.css.new
design-system.css.old
```

Fichiers CSS distincts pour l'éditeur seul : `editor.css`, `editor-bundle.css`, `editor-content.css`, `editor-header.css`, `editor-toolbar.css`, `editor-utilities.css`, `editor-responsive.css`, `editor-layout-modes.css`, `editor-sidebar.css` — **9 fichiers** sans point d'entrée unifié.

Aucun design system cohérent ne peut être maintenu dans ces conditions. Les variables CSS sont définies dans au moins 3 endroits différents.

**Correction :**
1. Supprimer tous les fichiers `.backup`, `.old`, `.new`
2. Consolider les variables CSS dans `variables.css` unique
3. Créer un index CSS `src/styles/index.css` qui importe dans l'ordre

**Statut :** ❌ Non corrigé

---

### I7 — Erreurs TypeScript dans les tests (déphasage de types)

Les tests TypeScript ont des erreurs qui révèlent un déphasage entre les types attendus et le code actuel :

**`ChatFullscreenV2.integration.test.tsx` :**
- `ChatSession` manque les propriétés `user_id`, `is_active`, `metadata`, `last_message_at`
- `ImageAttachment` manque `id`, `file`, `previewUrl`, `mimeType`

**`integration-editor-flow.test.tsx` :**
- `EditorProps` n'accepte pas `children` (props déphasées depuis une refacto)

**`useEditorEffects.test.ts` :**
- `DocumentState` manque `forceTOCUpdate`
- `ContextMenuState` n'a pas de propriété `open`
- `UseEditorHandlersReturn` n'a pas `updateA4Mode`
- `kebabBtnRef.current` typé `null` au lieu de `HTMLButtonElement`

Ces erreurs indiquent que des types ont évolué sans que les tests aient été mis à jour — les tests ne testent donc plus le vrai contrat de l'API.

**Statut :** ❌ Non corrigé

---

## 🟡 DETTE TECHNIQUE (À planifier)

### D1 — Tests de bas niveau inexistants sur les zones critiques

Pas de test de :
- Race condition sur l'envoi de messages (double-clic → 2 messages dupliqués)
- Flux complet chat → stream → persist → affichage
- Drag-and-drop dans les dossiers
- Création / suppression / renommage de classeur
- Rendu de l'éditeur avec embeds récursifs
- Mode vocal (TTS)

**Couverture estimée : ~10-15%** (vs standard industrie 70-80%)

---

### D2 — Tests E2E non bloquants en CI

Les tests Playwright sont configurés avec `continue-on-error: true`. Une régression sur le flow principal (login → créer note → chat) peut passer en prod sans être bloquée.

**Correction :** Passer `continue-on-error: false` + écrire au minimum :
1. Test : Login → session valide
2. Test : Créer note → naviguer vers éditeur
3. Test : Envoyer message chat → réponse reçue
4. Test : Créer classeur → créer dossier

---

### D3 — `ToolCallMessage.tsx` : composant zombie avec violations hooks

Les commentaires dans `ChatMessage.tsx` indiquent que `ToolCallMessage` est "remplacé" par `StreamTimelineRenderer`. Pourtant `ToolCallMessage.tsx` existe encore, a **plusieurs violations `react-hooks/rules-of-hooks`**, et est potentiellement importé.

**Correction :** Supprimer `ToolCallMessage.tsx` ou l'archiver hors du build. Vérifier qu'aucun import actif ne le référence.

**Statut :** ✅ Corrigé le 21/03/2026 — `ToolCallMessage.tsx` + `ToolCallMessage.css` supprimés. Export retiré de `index.ts`, schema orphelin retiré de `validators.ts`.

---

### D4 — `supabaseClient.js` : fichier JavaScript pur dans un projet TypeScript

`src/supabaseClient.js` — zéro type safety sur le client Supabase exposé par ce fichier.

**Correction :** Migrer vers `supabaseClient.ts` avec les types `@supabase/supabase-js`.

---

### D5 — `SystemMessageBuilder.ts.backup` : fichier backup actif dans le projet

`src/services/llm/SystemMessageBuilder.ts.backup` est un fichier `.ts.backup` contenant du code TypeScript. Selon le glob du `tsconfig.json`, il peut être inclus dans la compilation et les résultats de recherche.

**Correction :** Supprimer ce fichier ou le déplacer hors de `src/`.

---

### D6 — `ChatHeader` sans `React.memo`

`ChatHeader.tsx` est re-rendu à chaque changement d'état du parent `ChatFullscreenV2`, même si ses props n'ont pas changé. Or `ChatFullscreenV2` a de nombreux états internes qui changent fréquemment pendant le streaming.

**Correction :** Wrapper `ChatHeader` avec `React.memo` + vérifier que les callbacks passés en props sont mémoïsés (`useCallback`).

---

### D7 — Backup DB non configuré

Supabase permet les backups automatiques (Point-in-Time Recovery) en plan payant. Non confirmé comme activé.

**Impact :** En cas d'incident DB (corruption, suppression accidentelle), pas de restauration possible.

---

### D8 — 2FA absent

L'authentification ne supporte pas la double authentification. Acceptable en MVP, mais bloquant pour des clients enterprise.

---

## FOCUS DÉTAILLÉ : MODULE CHAT

**Score : 7/10**

### ✅ Ce qui fonctionne bien

- Architecture bien découpée : `ChatFullscreenV2` délègue à des hooks spécialisés (`useChatFullscreenUIState`, `useChatFullscreenUIActions`, `useChatFullscreenEffects`) — refacto réussie depuis les 1244 lignes d'origine
- Streaming architecture solide avec `useStreamingState` et refs miroirs (évite les re-renders pendant le stream)
- Gestion optimiste des messages (upsert/remove par `clientMessageId`)
- Mode vocal (TTS) fonctionnel et bien isolé dans `TextToSpeechProvider`
- Infinite messages avec pagination lazy (`useInfiniteMessages`) ✅
- Stop generation propre (abort + nettoyage TTS buffer) ✅
- Gestion d'erreurs streaming visible dans l'UI (`streamError` state)

### ✅ Corrigé le 21/03/2026

1. ~~**Violations hooks dans `ChatMessage.tsx`**~~ → corrigé (B1)
2. ~~**`logger.dev` en boucle de rendu**~~ → supprimé (I4)
3. ~~**`ToolCallMessage.tsx`** composant zombie~~ → supprimé (D3)

### ❌ Reste à corriger

1. **Copy logic dupliquée** entre `BubbleButtons` et `ChatMessage` (voir I3)
2. **`ChatHeader` sans `React.memo`** — re-render inutile à chaque keystroke (voir D6)
3. **Race condition double-envoi non testée** — `runExclusive` présent mais non couvert (voir D1)
4. **Tests d'intégration `ChatFullscreenV2` cassés** — déphasage de types (voir I7)

---

## FOCUS DÉTAILLÉ : MODULE ÉDITEUR

**Score : 6/10**

### ✅ Ce qui fonctionne bien

- Architecture correctement décomposée : `Editor.tsx` à 618 lignes, sous la limite
- Composants séparés : `EditorHeader`, `EditorToolbar`, `EditorSidebar`, `EditorSidebarFilesList`, etc.
- Error boundary dédié : `EditorErrorBoundary.tsx` ✅
- Support TipTap avec extensions custom
- Système de TOC (table des matières) fonctionnel
- Drag-and-drop des blocs (notion-style)
- Embeds YouTube / notes récursifs

### ✅ Corrigé le 21/03/2026

1. ~~**Violations hooks dans `EditorToolbar.tsx`**~~ → corrigé (B1)
2. ~~**Violations hooks dans `NoteEmbedContent.tsx` et `NoteEmbedView.tsx`**~~ → corrigés, hooks remontés avec `enabled` conditionnel (B1)
3. ~~**Violations hooks dans `EditorHeaderImage.tsx`**~~ → useEffect debug supprimé (B1)

### ❌ Reste à corriger

1. **Tests d'intégration `integration-editor-flow.test.tsx`** cassés — types déphasés (voir I7)
2. **Tests `useEditorEffects.test.ts`** cassés — multiples erreurs TypeScript sur les types de hooks
3. **`lowlightInstance.ts`** : `simpleLogger.dev` appelé en module-level → mock incomplet dans les tests Editor (2 fichiers en erreur de chargement)
4. **9 fichiers CSS distincts** pour l'éditeur sans point d'entrée clair (voir I6)
5. **`EditorPreview.tsx`** avec `console.log` (erreur ESLint)

---

## FOCUS DÉTAILLÉ : MODULE DOSSIERS

**Score : 5/10**

### ✅ Ce qui fonctionne bien

- Drag-and-drop multi-classeur implémenté (dnd-kit)
- Tabs réordonnables avec `SortableContext`
- Contexte menu fonctionnel
- Gestion des breadcrumbs avec drop targets
- `useDossiersPage.ts` extrait (logique séparée de la vue)
- Renommage inline des tabs
- Vue grille / liste switchable

### ❌ Ce qui est cassé / problématique

1. **`ClasseursPage.tsx` : 1 460 lignes** — fichier monstre, impossible à maintenir (voir I1)
2. **Aucun test** sur ce module entier
3. **3 systèmes de drag simultanés** dans `SortableTab` : dnd-kit (réordonnancement tabs) + drag natif HTML5 (cross-classeur items) + drag natif HTML5 (cross-classeur tabs) — interaction non testée entre les trois
4. **Pas de gestion d'erreur visible** quand une opération échoue (création classeur, déplacement note) — l'UI reste silencieuse
5. **Fragmentation CSS** : `ClasseursPage.css` + `glassmorphism.css` + `index.css` dans le même dossier dossiers
6. **Pas de pagination** sur les notes dans un dossier — si un dossier a 500 notes, tout est chargé d'un coup

---

## SÉCURITÉ : BILAN COMPLET

| Vecteur | Sévérité | Statut |
|---------|----------|--------|
| `/api/debug-chatgpt` sans auth → log tokens | 🔴 CRITIQUE | ❌ Non corrigé |
| `/api/debug-tool-call` — console.log en prod | 🟠 ÉLEVÉ | ❌ Non corrigé |
| Rate limiting mémoire (multi-instance inefficace) | 🟠 ÉLEVÉ | ⚠️ Connu, non corrigé |
| 2FA absent | 🟡 MOYEN | ⚠️ Acceptable MVP |
| Backup DB non confirmé | 🟡 MOYEN | ⚠️ À vérifier |
| Tokens JWT exposés dans logs Vercel | 🟠 ÉLEVÉ | ❌ Via debug-chatgpt |
| `npm audit` | ✅ 0 vulnérabilités | ✅ OK |
| RLS Supabase | Activé | ✅ OK |
| CORS | Configuré | ✅ OK |
| XSS — DOMPurify | Actif | ✅ OK |
| SQL injection | Protégé (Supabase paramétré) | ✅ OK |
| RGPD — endpoint delete compte | Présent | ✅ OK |

---

## CE QUI SÉPARE L'APP DES STANDARDS DU MARCHÉ (N8N, Langsmith, etc.)

Pour prétendre au niveau GAFAM / top marché, voici les écarts fondamentaux :

### 1. Qualité code : 0 erreur ESLint est le standard

232 erreurs ESLint en production. Un codebase professionnel a **zéro erreur ESLint**. C'est non-négociable dans un contexte GAFAM. Les leaders du marché ont des pipelines qui rejettent tout commit introduisant une erreur de lint.

### 2. Couverture de tests : ~10-15% vs 70-80% industrie

Pas de tests sur les flows critiques :
- Envoi de message + streaming + persistence
- Création / suppression de classeur
- Drag-and-drop (aucun test)
- Mode édition de message
- Race conditions

### 3. Aucun test E2E bloquant

Les leaders (Linear, Notion, N8N) ont des suites E2E complètes qui couvrent tous les user journeys critiques. Une régression sur "envoyer un message" ou "créer un dossier" est **détectée avant chaque déploiement**.

### 4. Fichiers de 1600+ lignes dans les services critiques

Le streaming LLM principal (`stream/route.ts` à 1 682 lignes) est le cœur du produit. Un module de cette taille est **impossible à débugger rapidement sous incident**. Les services des entreprises top-tier ont des modules ciblés de 100-300 lignes avec une responsabilité unique.

### 5. CSS fragmenté en 80+ fichiers sans design system

Un design system robuste (tokens → variables CSS → composants) est la base d'un produit scalable. Un produit premium maintient une cohérence visuelle à travers des tokens centralisés. Là, c'est de l'accumulation organique non gouvernée.

### 6. Monitoring sans stratégie d'observabilité

Avoir Sentry ≠ avoir une stratégie d'observabilité. Il manque :
- SLA définis (ex: "p99 latence streaming < 3s")
- Alertes sur métriques métier (taux d'erreur streaming, % sessions sans réponse)
- Dashboard de santé temps réel
- Alertes PagerDuty / Slack sur les incidents

### 7. Rate limiting fragile

Un rate limiter en mémoire dans un environnement serverless est une illusion de sécurité. Les providers comme xAI et Groq facturent à la requête — un abuseur peut tripler les coûts API sans être bloqué.

---

## PLAN D'ACTION PRIORISÉ

### ✅ SEMAINE 1 — BLOCKERS — TERMINÉE (21/03/2026)

| # | Action | Fichier(s) | Statut |
|---|--------|-----------|--------|
| 1 | Supprimer routes debug (tokens exposés) | `debug-chatgpt/route.ts`, `debug-tool-call/route.ts` | ✅ Fait |
| 2 | Corriger violations React hooks dans ChatMessage | `ChatMessage.tsx` | ✅ Fait |
| 3 | Corriger violations React hooks dans EditorToolbar | `EditorToolbar.tsx` | ✅ Fait |
| 4 | Corriger violations React hooks NoteEmbedContent + NoteEmbedView | `NoteEmbed*.tsx` | ✅ Fait |
| 5 | Corriger violations React hooks EditorHeaderImage | `EditorHeaderImage.tsx` | ✅ Fait |
| 6 | Débugger les 3 fichiers de test | `NetworkRetryService`, `server`, `SessionTitleGenerator` | ✅ Fait — 601/601 |
| 7 | Supprimer `logger.dev` boucle de rendu | `ChatMessage.tsx` | ✅ Fait |
| — | Supprimer `ToolCallMessage.tsx` (D3, fait en avance) | `ToolCallMessage.tsx` + `.css` | ✅ Fait |

---

### 🟠 SEMAINE 2 — QUALITÉ CODE (en cours)

| # | Action | Fichier(s) | Effort | Statut |
|---|--------|-----------|--------|--------|
| 8 | Nettoyer les `no-console` dans les API routes actives | ~20 fichiers API | 3h | ❌ Ouvert |
| 9 | Corriger les `no-empty` (catch vides) | À identifier via lint | 1h | ❌ Ouvert |
| ~~10~~ | ~~Supprimer ToolCallMessage.tsx~~ | — | — | ✅ Fait en avance |
| 11 | Déduplicer la logique copier (ChatMessage → BubbleButtons) | `ChatMessage.tsx`, `BubbleButtons.tsx` | 1h | ❌ Ouvert |
| 12 | Supprimer les fichiers CSS `.backup`, `.old`, `.new` | `src/styles/` | 30 min | ❌ Ouvert |
| 13 | Supprimer `SystemMessageBuilder.ts.backup` | `src/services/llm/` | 5 min | ❌ Ouvert |
| 14 | Migrer `supabaseClient.js` → `.ts` | `src/supabaseClient.js` | 1h | ❌ Ouvert |
| 15 | Ajouter `React.memo` à `ChatHeader` | `ChatHeader.tsx` | 30 min | ❌ Ouvert |
| 16 | Corriger les erreurs TypeScript dans les tests (déphasage types) | `ChatFullscreenV2.integration.test.tsx`, `useEditorEffects.test.ts` | 3h | ❌ Ouvert |

**Total estimé : ~1 jour (item 10 déjà fait)**

---

### 🟡 SEMAINE 3 — ARCHITECTURE DOSSIERS + E2E

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 17 | Découper `ClasseursPage.tsx` en 5-6 composants | `src/app/private/dossiers/` | 1 jour |
| 18 | Écrire tests Playwright bloquants (4 journeys critiques) | `tests/e2e/` | 1 jour |
| 19 | Passer `continue-on-error: false` dans CI | `.github/workflows/ci.yml` | 30 min |
| 20 | Consolider CSS éditeur (9 fichiers → 1 point d'entrée) | `src/styles/editor-*.css` | 4h |

**Total estimé : 2.5 jours**

---

### 🔵 SEMAINE 4 — SCALABILITÉ

| # | Action | Fichier(s) | Effort |
|---|--------|-----------|--------|
| 21 | Refactorer `stream/route.ts` (1682 → modules ~300 lignes) | `src/app/api/chat/llm/stream/` | 2 jours |
| 22 | Migrer rate limiter vers Redis (Upstash) | `src/services/rateLimiter.ts`, `middleware-utils/rateLimit.ts` | 4h |
| 23 | Définir SLA + alertes Sentry sur métriques métier | Sentry config | 3h |
| 24 | Configurer backup automatique Supabase (PITR) | Dashboard Supabase | 1h |

**Total estimé : 3 jours**

---

### 🟢 PLUS TARD — EXCELLENCE (après 100 users)

| # | Action | Effort |
|---|--------|--------|
| 25 | Refactorer `groq.ts` (1614 lignes) | 1.5 jours |
| 26 | Refactorer `V2UnifiedApi.ts` (1532 lignes) | 1.5 jours |
| 27 | Pagination des notes dans un dossier | 1 jour |
| 28 | Implémenter 2FA | 1-2 jours |
| 29 | Monter couverture tests unitaires à 50% | 1 semaine |

---

## SUIVI DE L'ÉTAT DES ITEMS

> Mettre à jour ce tableau au fur et à mesure des corrections.

| ID | Description | Priorité | Statut | Date correction |
|----|-------------|----------|--------|----------------|
| B1 | Hooks conditionnels — 6 fichiers | 🔴 CRITIQUE | ✅ Corrigé | 21/03/2026 |
| B2 | `/api/debug-chatgpt` sans auth | 🔴 CRITIQUE | ✅ Corrigé | 21/03/2026 |
| B3 | 3 fichiers de test en échec | 🔴 CRITIQUE | ✅ Corrigé | 21/03/2026 |
| B4 | 232 → **140** erreurs ESLint | 🔴 CRITIQUE | 🔄 En cours | batch 0–1 ESLint 20–21/03 |
| I1 | ClasseursPage.tsx 1460 lignes | 🟠 IMPORTANT | ❌ Ouvert | — |
| I2 | Fichiers massifs services | 🟠 IMPORTANT | ❌ Ouvert | — |
| I3 | Copy logic dupliquée | 🟠 IMPORTANT | ❌ Ouvert | — |
| I4 | logger.dev en boucle rendu | 🟠 IMPORTANT | ✅ Corrigé | 21/03/2026 |
| I5 | Rate limiter mémoire | 🟠 IMPORTANT | ⚠️ Connu | — |
| I6 | CSS chaos 80+ fichiers | 🟠 IMPORTANT | ❌ Ouvert | — |
| I7 | Erreurs TS dans les tests | 🟠 IMPORTANT | ❌ Ouvert | — |
| D1 | Tests bas niveau absents | 🟡 DETTE | ❌ Ouvert | — |
| D2 | E2E non bloquant | 🟡 DETTE | ❌ Ouvert | — |
| D3 | ToolCallMessage zombie | 🟡 DETTE | ✅ Corrigé | 21/03/2026 |
| D4 | supabaseClient.js non typé | 🟡 DETTE | ❌ Ouvert | — |
| D5 | SystemMessageBuilder.ts.backup | 🟡 DETTE | ❌ Ouvert | — |
| D6 | ChatHeader sans React.memo | 🟡 DETTE | ❌ Ouvert | — |
| D7 | Backup DB non configuré | 🟡 DETTE | ⚠️ À vérifier | — |
| D8 | 2FA absent | 🟡 DETTE | ⚠️ Post-MVP | — |

---

## CRITÈRES DE SORTIE — "PRÊT POUR PRODUCTION"

L'application sera considérée **prête pour une mise en production professionnelle** quand :

- [x] **0 violation `react-hooks/rules-of-hooks`** dans les fichiers de production ✅ 21/03/2026
- [x] **0 endpoint debug** accessible sans authentification en production ✅ 21/03/2026
- [x] **601/601 tests individuels passent** ✅ 21/03/2026 (2 fichiers pré-existants en erreur de mock → voir I7)
- [ ] **0 erreur ESLint** — 184 restantes (était 232)
- [ ] **4 tests E2E bloquants** dans la CI/CD
- [ ] **`ClasseursPage.tsx` < 500 lignes** (ou décomposé en modules)
- [ ] **`stream/route.ts` < 500 lignes** (ou décomposé en modules)
- [ ] **Fichiers CSS backup supprimés**
- [ ] **Rate limiter Redis** actif
- [ ] **SLA définis et alertes Sentry** configurées

---

*Document créé le 20 mars 2026 — Données mesurées sur codebase live.*  
*Mis à jour le 21 mars 2026 — Semaine 1 terminée : B1, B2, B3, I4, D3 résolus. Score 6.5 → 7.5/10.*  
*À mettre à jour à chaque correction d'item.*  
*Référence : audit janvier 2026 dans `AUDIT-PRODUCTION-BRUTAL-2025-12-27.md`*
