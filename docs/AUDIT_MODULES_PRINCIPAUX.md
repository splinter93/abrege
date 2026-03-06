# Audit des modules principaux — Chat, Éditeur, Classeurs & Fichiers

**Date :** 27 février 2026  
**Périmètre :** Code uniquement (pas les docs Markdown).  
**Objectif :** Niveau de mise en production et niveau de qualité par rapport aux meilleures applications du marché.

---

## 1. CHAT

### 1.1 Architecture (code observé)

- **UI :** `ChatFullscreenV2` (~530 lignes) orchestre l’UI ; logique déléguée à des hooks (`useStreamingState`, `useChatMessageActions`, `useChatFullscreenUIState`, `useChatHandlers`, `useChatResponse`, etc.) et à des services (`ChatMessageSendingService`, `ChatContextBuilder`, `sessionSyncService`).
- **État :** Zustand (`useChatStore`) avec sessions, currentSession, selectedAgent, editingMessage, deletingSessions. Persist middleware pour persistance côté client.
- **API :** 
  - `POST /api/chat/llm/stream` — streaming SSE (~1 613 lignes dans une seule route).
  - `POST /api/chat/llm` — non-streaming (~486 lignes).
  - Validation Zod (`llmStreamRequestSchema`, `llmRequestSchema`), auth Bearer, rate limit (`dynamicChatRateLimiter`), métriques (`metricsCollector`).
- **Client :** `useChatResponse` utilise `StreamOrchestrator` + `networkRetryService` (retry 3x, backoff). Gestion tool_calls, onComplete, onError, onStreamChunk.

### 1.2 Points forts

| Critère | État |
|--------|------|
| Validation entrées | Zod sur body (message, context, history, agentConfig). |
| Auth | JWT Bearer obligatoire ; `validateAndExtractUserId` ; pas d’UUID nu accepté. |
| Rate limiting | `dynamicChatRateLimiter` sur la route stream. |
| Observabilité | `metricsCollector.recordLatency`, `recordError`, `recordThroughput` ; logs structurés. |
| Retry client | `networkRetryService.executeWithRetry` (max 3, backoff). |
| Séparation responsabilités | Store / hooks / services / composants bien séparés. |
| Tests | `ChatFullscreenV2.integration.test.tsx`, `integration-edit-regenerate.test.ts`, `validation.test.ts` (LLM), `generate-title.test.ts`. |

### 1.3 Points faibles / risques

| Problème | Détail |
|----------|--------|
| **Route stream monolithique** | `stream/route.ts` ~1 613 lignes : validation, auth, résolution agent, boucle LLM, tool calls, persistance, broadcast, SSE — tout dans un seul fichier. Difficile à maintenir et à tester unitairement. |
| **Pas d’annulation côté serveur** | Aucun usage de `AbortController` / `request.signal` dans la route stream : si le client se déconnecte, le stream peut continuer côté serveur (gaspillage CPU/LLM). |
| **Erreurs utilisateur** | Réponses 400/401/500 avec message générique ; pas de codes d’erreur stables pour le client (ex. `code: 'RATE_LIMIT'`). |
| **Tests** | Pas de tests unitaires sur la route stream elle-même ; tests surtout validation et intégration UI. |

### 1.4 Niveau production / qualité

- **Production :** **Prêt sous conditions** — auth, rate limit, validation, métriques et retry sont en place. Pour un lancement à plus grande échelle : extraire la logique stream en services testables et gérer l’annulation (signal).
- **Comparaison marché (type ChatGPT / Claude) :**  
  - Niveau **bon** sur auth, validation, observabilité, UX (streaming, retry, édition, canva).  
  - En dessous sur : taille et testabilité de la route stream, annulation des requêtes, codes d’erreur structurés.

---

## 2. ÉDITEUR

### 2.1 Architecture (code observé)

- **UI :** `Editor` orchestre layout, header, contenu, sidebar ; `EditorMainContent`, `EditorEditableContent`, `EditorTitle` ; extensions Tiptap (slash menu, floating menu, etc.).
- **État :** `useFileSystemStore` (notes, folders, classeurs en `Record<id, T>`) + `useEditorState` (titre, header image, TOC, menus). Mutations locales sur le store ; sync avec l’API via `V2UnifiedApi` et `editorSaveService`.
- **Sauvegarde :** `useEditorSave` → `editorSaveService.saveNote()` (runExclusive, retry). Constante `DEBOUNCE_DELAYS.AUTOSAVE: 500` ; debounce sur TOC (300 ms). Titre sauvegardé au blur ; contenu via `handleContentUpdate` (depuis `useEditorInteractions`).
- **Sync :** Realtime (useRealtime) pour store → éditeur quand un autre client modifie ; `editor.isFocused` évite d’écraser la saisie en cours. Pas d’EditorSyncManager actif (commentaire « DÉSACTIVÉ »).
- **API :** V2 (`/api/v2/note/[ref]`, create, update, editNoteContent, etc.) ; `V2ResourceResolver` (slug → id) ; auth sur toutes les routes.

### 2.2 Points forts

| Critère | État |
|--------|------|
| Typage | `NoteUpdatePayload`, `Note`, `Folder`, `Classeur` bien typés ; validation Zod côté client (`validateEditorData`). |
| Sauvegarde | Service dédié (`EditorSaveService`), runExclusive, retry, mise à jour optimiste du store. |
| Conflits | Évite d’appliquer le store → éditeur si `editor.isFocused`. |
| Realtime | Mise à jour store → éditeur avec garde-fou focus. |
| Notes temporaires | `isTemporaryCanvaNote` pour ne pas appeler l’API sur brouillons canva. |
| Tests | `Editor.test.tsx`, `EditorMainContent.test.tsx`, `EditorHeader.test.tsx`, `integration-editor-flow.test.tsx`, `useEditorHandlers.test.ts`, `useEditorEffects.test.ts`. |

### 2.3 Points faibles / risques

| Problème | Détail |
|----------|--------|
| **Pas de debounce explicite sur autosave contenu** | `DEBOUNCE_DELAYS.AUTOSAVE` existe (500 ms) mais le chemin `editor.on('update')` → `handleContentUpdate` n’est pas clairement debouncé dans les fichiers lus ; risque d’appels API trop fréquents si le debounce est ailleurs ou absent. |
| **Store + Realtime** | Sync realtime désactivée dans un composant (EditorSyncManager) ; la logique est dans `Editor.tsx` (useEffect rawContent). À clarifier pour éviter double source de vérité. |
| **Fichier Editor.tsx** | ~525 lignes ; proche d’une limite 500 lignes souvent visée ; encore acceptable. |
| **Tests store** | Aucun test unitaire sur `useFileSystemStore` (mutations, applyDiff). |

### 2.4 Niveau production / qualité

- **Production :** **Prêt** — auth, API V2, ownership (V2ResourceResolver + user_id), sauvegarde avec concurrence et retry, realtime avec protection focus. Vérifier que l’autosave contenu est bien debouncée (500 ms) partout.
- **Comparaison marché (type Notion / Linear / Doc)** :  
  - Niveau **bon** : structure hooks/services, Tiptap, realtime, optimiste, validation.  
  - À améliorer : tests sur le store, clarté du flux autosave (debounce documenté et centralisé), et éventuellement CRDT/OT si collaboration multi-éditeurs simultanés.

---

## 3. CLASSEURS & FICHIERS

### 3.1 Architecture (code observé)

- **Classeurs / arborescence :**  
  - Store : `useFileSystemStore` (classeurs, folders, notes en `Record<id, T>`).  
  - API : V2 (`/api/v2/classeur/[ref]`, `[ref]/tree`, `[ref]/update`, create, reorder ; `/api/v2/folder/...`, `/api/v2/note/...`).  
  - Résolution : `V2ResourceResolver.resolveRef(ref, 'classeur'|'folder'|'note', userId)` — slug ou UUID, avec vérification `user_id`.  
  - Client : `V2UnifiedApi` (singleton), mise à jour optimiste du store + appels fetch.
- **Fichiers (upload / liste) :**  
  - Page : `app/private/files/page.tsx` (~860 lignes) avec `useFilesPage` (liste, quota, recherche, filtres, upload).  
  - Composants : `FilesContent`, `FileUploader`, `UnifiedUploadZone`, `SearchFiles`, `FileItem`, `FileList`.  
  - Stockage : Supabase Storage ; `SubscriptionService.getUserStorageQuota` ; `STORAGE_CONFIG`.  
  - Auth : `AuthGuard`, `getAuthenticatedUser` côté API ; `user_id` dans les requêtes.

### 3.2 Points forts

| Critère | État |
|--------|------|
| Ownership | Toutes les routes V2 utilisent `getAuthenticatedUser` puis `userId` ; `V2ResourceResolver` filtre par `user_id` ; pas d’accès cross-user. |
| Validation | Note create : `createNoteV2Schema` (Zod), `createValidationErrorResponse`. Rate limit `noteCreateRateLimiter` sur création de notes. |
| Permissions | `canPerformAction(authResult, 'notes:create', context)` ; scopes (notes:*, classeurs:*, dossiers:*, files:*). |
| Quota | `SubscriptionService.getUserStorageQuota` ; affichage utilisé / limite. |
| UX | Recherche avec debounce (300 ms), filtres, tri, vue grille/liste, ErrorBoundary, AuthGuard. |

### 3.3 Points faibles / risques

| Problème | Détail |
|----------|--------|
| **Page fichiers très grosse** | `files/page.tsx` ~860 lignes ; logique et UI mélangées ; à découper (sous-composants, hook `useFilesPage` déjà présent mais page encore lourde). |
| **Tests** | Aucun test unitaire trouvé sur `useFilesPage`, `useFileSystemStore`, `V2ResourceResolver`, ou les routes V2 classeur/folder. |
| **Params Next.js** | `note/[ref]/route.ts` utilise `await params` ; `classeur/[ref]/route.ts` utilise `params.ref` synchrone. À homogénéiser si Next 15 (params Promise). |
| **Double API** | Présence de `/api/ui/classeur/...` et `/api/v2/classeur/...` ; à clarifier le périmètre pour éviter la duplication. |

### 3.4 Niveau production / qualité

- **Production :** **Prêt sous conditions** — auth, ownership, validation, rate limit (création notes), quota. Pour monter en charge : tests sur store et API V2, refactor de la page fichiers.
- **Comparaison marché (type Notion / Google Drive)** :  
  - Niveau **correct à bon** : modèle données cohérent, V2 unifié, permissions, quota.  
  - En dessous : couverture de tests, taille de la page fichiers, documentation claire des différences UI vs V2.

---

## 4. SYNTHÈSE GLOBALE

### 4.1 Niveau « prêt pour la production »

| Module | Verdict | Conditions / actions |
|--------|---------|----------------------|
| **Chat** | Prêt sous conditions | Découper la route stream en services + gérer `request.signal` pour annulation. |
| **Éditeur** | Prêt | Confirmer debounce 500 ms sur autosave contenu ; ajouter tests store. |
| **Classeurs & Fichiers** | Prêt sous conditions | Tests (store, resolver, routes) ; refactor page fichiers ; aligner params Next si besoin. |

### 4.2 Niveau par rapport au marché

- **Chat :** Niveau **bon** (proche des produits type ChatGPT) sur stack technique, auth, validation, streaming, retry. Écart principal : maintenabilité de la route stream (taille, testabilité) et annulation des requêtes.
- **Éditeur :** Niveau **bon** (proche Notion / éditeurs riches) sur architecture, sauvegarde, realtime, typage. Écart : tests store, clarté du flux autosave, et si besoin modèle de collaboration (CRDT/OT) pour le multi-éditeur.
- **Classeurs & Fichiers :** Niveau **correct à bon** (proche Drive / Notion) sur modèle et sécurité. Écart : couverture de tests et taille de la page fichiers.

### 4.3 Recommandations prioritaires (code, pas docs)

1. **Chat**  
   - Extraire la logique de `stream/route.ts` dans des services (validation déjà en helpers) : ex. `streamLLMHandler`, `persistAndBroadcast`, et brancher `request.signal` pour annuler le stream si le client se déconnecte.  
   - Ajouter des codes d’erreur stables dans les réponses (ex. `code: 'RATE_LIMIT'`, `'VALIDATION_ERROR'`).

2. **Éditeur**  
   - Vérifier que chaque chemin `editor.on('update')` qui mène à une sauvegarde API passe par un debounce 500 ms (idéalement un seul point central).  
   - Ajouter tests unitaires sur `useFileSystemStore` (updateNote, moveNote, applyDiff).

3. **Classeurs & Fichiers**  
   - Refactorer `app/private/files/page.tsx` : extraire sous-composants (FilesPageHeader, FilesPageContent, etc.) et garder la page < 300 lignes.  
   - Ajouter tests : au minimum `V2ResourceResolver.resolveRef` et une route V2 (ex. GET note, GET classeur) avec auth mockée.

---

*Audit basé uniquement sur l’analyse du code (composants, hooks, stores, routes API, services) sans s’appuyer sur les documents Markdown du projet.*
