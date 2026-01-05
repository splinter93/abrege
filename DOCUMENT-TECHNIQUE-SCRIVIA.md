# Document Technique - Scrivia

**Date de génération :** 2025-01-31  
**Version analysée :** Codebase complète  
**Type :** Documentation factuelle basée sur le code existant

---

## Overview

Scrivia est une plateforme de gestion de connaissances et d'écriture qui combine un éditeur Markdown avancé, un système d'organisation hiérarchique (Classeurs → Dossiers → Notes), une intelligence artificielle intégrée avec agents personnalisables, et des outils de collaboration.

**Objectifs MVP visibles dans le code :**
- Gestion de contenu hiérarchique (notebooks/classeurs, dossiers, notes)
- Éditeur Markdown natif avec conversion HTML automatique
- Chat IA avec streaming temps réel et tool calls
- Agents spécialisés personnalisables avec configuration LLM
- API REST complète (v2) avec support MCP et OpenAPI
- Système de partage avec 5 niveaux de visibilité
- Gestion de fichiers avec quotas par abonnement
- Système de corbeille avec restauration

**Use cases identifiés :**
- Création et organisation de notes structurées
- Collaboration via partage de notes avec permissions granulaires
- Automatisation via agents IA spécialisés (analyse, formatage, vision)
- Intégration externe via API REST et protocole MCP
- Gestion de fichiers avec stockage S3

---

## Tech Stack Actuel

### Framework Frontend
- **Next.js** 16.0.7 (App Router)
- **React** 19.0.0
- **TypeScript** 5.9.2 (strict mode)

### Framework Backend
- **Next.js API Routes** (App Router)
- **Supabase** (PostgreSQL + Auth + Realtime + Storage)

### Base de Données
- **PostgreSQL** (via Supabase)
- **Row Level Security (RLS)** activé sur toutes les tables
- **Realtime** activé pour synchronisation temps réel
- **Migrations** : 61 fichiers SQL dans `supabase/migrations/`

### Éditeur de Texte
- **Tiptap** 3.6.5 (ProseMirror-based)
- **Extensions** : Markdown, tables, code blocks, task lists, mentions, drag handle, collaboration (Y.js)
- **Markdown** : Source de vérité pour édition, HTML généré pour affichage

### Gestion d'État
- **Zustand** 5.0.7 (state management)
- **SWR** 2.3.5 (data fetching avec cache)

### Styling
- **Tailwind CSS** 3.4.17
- **Framer Motion** 12.23.12 (animations)

### IA et LLM
- **Groq** (provider principal via Synesia)
- **Modèles supportés** :
  - `meta-llama/llama-4-scout-17b-16e-instruct` (multimodal, 16 images)
  - `meta-llama/llama-4-maverick-17b-128e-instruct` (multimodal, 128 images)
  - `groq-llama3-8b-8192` (texte)
  - `groq-llama3-70b-8192` (texte)
- **Synesia LLM Execution API** (orchestration d'agents)
- **Whisper Turbo** (transcription audio)

### Intégrations Externes
- **AWS S3** (`@aws-sdk/client-s3` 3.848.0) - Stockage fichiers
- **MCP (Model Context Protocol)** - Connexion outils externes
- **OpenAPI** - Génération automatique de tools pour LLMs

### Validation et Sécurité
- **Zod** 3.25.74 (validation schémas)
- **bcryptjs** 3.0.2 (hashing)
- **jsonwebtoken** 9.0.2 (tokens JWT)

### Autres Dépendances Clés
- **date-fns** 4.1.0 (manipulation dates)
- **mermaid** 11.9.0 (diagrammes)
- **react-markdown** 10.1.0 (rendu markdown)
- **dompurify** 3.2.6 (sanitization HTML)
- **yjs** 13.6.27 (collaboration temps réel)

### Outils de Développement
- **Vitest** 3.2.4 (tests unitaires)
- **Playwright** 1.57.0 (tests E2E)
- **ESLint** 9 (linting)
- **Sentry** 10.32.1 (monitoring erreurs)

---

## Data Models

### Users (`auth.users` - Supabase)
- `id` (UUID, PK)
- `email` (TEXT)
- Métadonnées gérées par Supabase Auth

### Classeurs/Notebooks (`notebooks`)
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `emoji` (TEXT)
- `color` (TEXT)
- `slug` (TEXT, unique par user)
- `position` (INTEGER, DEFAULT 0)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `user_id`, `slug`, `created_at`

### Dossiers (`folders`)
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `emoji` (TEXT)
- `color` (TEXT)
- `slug` (TEXT)
- `parent_id` (UUID, FK → folders.id, nullable pour racine)
- `notebook_id` (UUID, FK → notebooks.id, CASCADE DELETE)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `position` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `(notebook_id, parent_id)`, `user_id`, `slug`

### Notes/Articles (`articles`)
- `id` (UUID, PK)
- `title` (TEXT, NOT NULL)
- `content` (TEXT, NOT NULL) - Markdown source de vérité
- `html_content` (TEXT) - HTML généré automatiquement
- `slug` (TEXT, unique par user)
- `folder_id` (UUID, FK → folders.id, nullable)
- `notebook_id` (UUID, FK → notebooks.id, nullable)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `is_favorite` (BOOLEAN, DEFAULT false)
- `is_canva_draft` (BOOLEAN, DEFAULT false)
- `header_image_url` (TEXT)
- `header_image_offset` (DECIMAL)
- `visibility` (TEXT, CHECK IN ('private', 'public', 'shared', 'team', 'organization'))
- `deleted_at` (TIMESTAMPTZ, nullable - soft delete)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `user_id`, `folder_id`, `notebook_id`, `slug`, `is_favorite`, `is_canva_draft` (partial)

### Chat Sessions (`chat_sessions`)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `name` (TEXT)
- `agent_id` (UUID, FK → agents.id, nullable)
- `history_limit` (INTEGER, DEFAULT 30)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `user_id`, `created_at`

### Chat Messages (`chat_messages`)
- `id` (UUID, PK)
- `session_id` (UUID, FK → chat_sessions.id, CASCADE DELETE)
- `sequence_number` (INTEGER, NOT NULL) - Atomicité garantie
- `role` (TEXT, CHECK IN ('user', 'assistant', 'tool', 'system'))
- `content` (TEXT, NOT NULL)
- `tool_calls` (JSONB) - Tool calls demandés par LLM
- `tool_call_id` (TEXT) - ID pour messages role=tool
- `name` (TEXT) - Nom du tool
- `reasoning` (TEXT) - Raisonnement interne (CoT)
- `timestamp` (TIMESTAMPTZ, NOT NULL)
- `stream_timeline` (JSONB) - Timeline streaming
- `tool_results` (JSONB) - Résultats tool calls
- `attached_images` (JSONB) - Images attachées (user)
- `attached_notes` (JSONB) - Notes attachées (user)
- `operation_id` (TEXT) - Pour idempotence
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Contrainte UNIQUE** : `(session_id, sequence_number)` - Prévention race conditions
- **Indexes** : `(session_id, sequence_number DESC)`, `(session_id, timestamp DESC)`, `tool_call_id`, `(session_id, role)`, GIN sur `stream_timeline` et `tool_results`

### Agents (`agents`)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `name` (VARCHAR(255), NOT NULL)
- `provider` (VARCHAR(50), DEFAULT 'groq')
- `model` (TEXT, DEFAULT 'deepseek-chat')
- `temperature` (NUMERIC(3,2), DEFAULT 0.7)
- `top_p` (NUMERIC(3,2), DEFAULT 1.0)
- `max_tokens` (INTEGER, DEFAULT 4000)
- `system_instructions` (TEXT)
- `context_template` (TEXT)
- `personality` (TEXT)
- `expertise` (TEXT[])
- `capabilities` (JSONB)
- `api_config` (JSONB)
- `profile_picture` (TEXT)
- `api_v2_capabilities` (TEXT[]) - Scopes/permissions
- `is_active` (BOOLEAN, DEFAULT true)
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `user_id`, `provider`, `is_active`, `name`

### MCP Servers (`mcp_servers`)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `url` (TEXT, NOT NULL)
- `header` (TEXT, DEFAULT 'x-api-key')
- `api_key` (TEXT, NOT NULL)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Agent MCP Servers (`agent_mcp_servers`)
- `id` (UUID, PK)
- `agent_id` (UUID, FK → agents.id, CASCADE DELETE)
- `mcp_server_id` (UUID, FK → mcp_servers.id, CASCADE DELETE)
- `priority` (INTEGER)
- `is_active` (BOOLEAN, DEFAULT true)
- **UNIQUE** : `(agent_id, mcp_server_id)`

### Files (`files`)
- `id` (UUID, PK)
- `filename` (TEXT, NOT NULL)
- `original_name` (TEXT, NOT NULL)
- `mime_type` (TEXT, NOT NULL)
- `size_bytes` (BIGINT, NOT NULL, CHECK > 0)
- `s3_key` (TEXT, NOT NULL, UNIQUE)
- `s3_bucket` (TEXT, NOT NULL)
- `s3_region` (TEXT, DEFAULT 'us-east-1')
- `url` (TEXT)
- `thumbnail_url` (TEXT)
- `status` (TEXT, CHECK IN ('uploading', 'processing', 'ready', 'failed'), DEFAULT 'ready')
- `sha256` (TEXT)
- `request_id` (TEXT)
- `etag` (TEXT)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `note_id` (UUID, FK → articles.id, nullable)
- `folder_id` (UUID, FK → folders.id, nullable)
- `notebook_id` (UUID, FK → notebooks.id, nullable)
- `deleted_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **Indexes** : `user_id`, `note_id`, `folder_id`, `notebook_id`, `s3_key`

### Storage Usage (`storage_usage`)
- `user_id` (UUID, PK, FK → auth.users, CASCADE DELETE)
- `used_bytes` (BIGINT, DEFAULT 0, CHECK >= 0)
- `quota_bytes` (BIGINT, DEFAULT 1073741824, CHECK > 0) - 1GB par défaut
- `current_plan_id` (UUID, FK → subscription_plans.id, nullable)
- `plan_updated_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Subscription Plans (`subscription_plans`)
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL, UNIQUE)
- `type` (ENUM: 'free', 'basic', 'premium', 'enterprise', 'custom')
- `display_name` (TEXT, NOT NULL)
- `description` (TEXT)
- `storage_quota_bytes` (BIGINT, NOT NULL, CHECK > 0)
- `max_file_size_bytes` (BIGINT, NOT NULL, CHECK > 0)
- `max_files_per_upload` (INTEGER, NOT NULL, CHECK > 0)
- `features` (JSONB, DEFAULT '{}')
- `price_monthly` (DECIMAL(10,2))
- `price_yearly` (DECIMAL(10,2))
- `currency` (TEXT, DEFAULT 'EUR')
- `is_active` (BOOLEAN, DEFAULT true)
- `is_default` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### User Subscriptions (`user_subscriptions`)
- `id` (UUID, PK)
- `user_id` (UUID, NOT NULL, FK → auth.users, CASCADE DELETE)
- `plan_id` (UUID, NOT NULL, FK → subscription_plans.id, RESTRICT DELETE)
- `status` (TEXT, CHECK IN ('active', 'trialing', 'past_due', 'canceled', 'expired'), DEFAULT 'active')
- `started_at` (TIMESTAMPTZ, NOT NULL)
- `expires_at` (TIMESTAMPTZ, nullable)
- `canceled_at` (TIMESTAMPTZ, nullable)
- `billing_provider` (TEXT)
- `external_subscription_id` (TEXT)
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- **UNIQUE** : `(user_id, plan_id)`

### Canva Sessions (`canva_sessions`)
- `id` (UUID, PK)
- `chat_session_id` (UUID, FK → chat_sessions.id, CASCADE DELETE)
- `note_id` (UUID, FK → articles.id, nullable, UNIQUE - 1 note = 1 canva max)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `status` (TEXT, CHECK IN ('open', 'closed', 'saved', 'deleted'))
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `closed_at` (TIMESTAMPTZ, nullable)
- `saved_at` (TIMESTAMPTZ, nullable)
- **Indexes** : `(chat_session_id, status)`, `(user_id, status)`, `note_id`, `created_at DESC`

### Sharing (`article_permissions`)
- `id` (UUID, PK)
- `article_id` (UUID, FK → articles.id, CASCADE DELETE)
- `user_id` (UUID, FK → auth.users, nullable - pour partage public)
- `permission_level` (TEXT, CHECK IN ('read', 'write', 'admin'))
- `shared_by` (UUID, FK → auth.users)
- `expires_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)
- **Indexes** : `article_id`, `user_id`

### Editor Prompts (`editor_prompts`)
- `id` (UUID, PK)
- `user_id` (UUID, FK → auth.users, CASCADE DELETE)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT)
- `prompt` (TEXT, NOT NULL)
- `context` (TEXT) - Contexte injecté automatiquement
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### User Settings (`user_settings`)
- `user_id` (UUID, PK, FK → auth.users, CASCADE DELETE)
- `theme` (TEXT, DEFAULT 'system')
- `language` (TEXT, DEFAULT 'en')
- `metadata` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Endpoints et Tools Existants

### API V2 (Recommandée)

#### Notes
- `GET /api/v2/note/{ref}` - Récupérer une note (ID ou slug)
- `POST /api/v2/note/create` - Créer une note
- `PUT /api/v2/note/{ref}/update` - Mettre à jour une note
- `DELETE /api/v2/note/{ref}` - Supprimer une note
- `GET /api/v2/note/recent` - Notes récentes
- `POST /api/v2/note/{ref}/insert-content` - Insérer du contenu
- `POST /api/v2/note/{ref}/content:apply` - Appliquer opérations de contenu (insert, replace, delete, upsert_section)
- `GET /api/v2/note/{ref}/table-of-contents` - Table des matières
- `POST /api/v2/note/{ref}/share` - Partager une note
- `PUT /api/v2/note/{ref}/move` - Déplacer une note

#### Dossiers
- `GET /api/v2/folder/{ref}` - Récupérer un dossier
- `POST /api/v2/folder/create` - Créer un dossier
- `PUT /api/v2/folder/{ref}/update` - Mettre à jour un dossier
- `GET /api/v2/folder/{ref}/tree` - Arbre du dossier
- `POST /api/v2/folder/{ref}/move` - Déplacer un dossier

#### Classeurs
- `GET /api/v2/classeurs` - Liste des classeurs
- `GET /api/v2/classeurs/with-content` - Classeurs avec contenu
- `POST /api/v2/classeur/create` - Créer un classeur
- `GET /api/v2/classeur/{ref}` - Récupérer un classeur
- `PUT /api/v2/classeur/{ref}/update` - Mettre à jour un classeur
- `GET /api/v2/classeur/{ref}/tree` - Arbre du classeur
- `POST /api/v2/classeur/reorder` - Réorganiser les classeurs

#### Corbeille
- `GET /api/v2/trash` - Contenu de la corbeille
- `POST /api/v2/trash/restore` - Restaurer un élément
- `POST /api/v2/trash/purge` - Vider la corbeille

#### Fichiers
- `GET /api/v2/files/search` - Recherche de fichiers

#### Agents
- `GET /api/v2/agents/{agentId}` - Récupérer un agent
- `POST /api/v2/agents/{agentId}` - Exécuter un agent
- `PUT /api/v2/agents/{agentId}` - Mettre à jour un agent
- `PATCH /api/v2/agents/{agentId}` - Mise à jour partielle
- `DELETE /api/v2/agents/{agentId}` - Supprimer un agent
- `HEAD /api/v2/agents/{agentId}` - Vérifier l'existence
- `POST /api/v2/agents/execute` - Exécuter un agent universel (ref, input, options)

#### Utilitaires
- `GET /api/v2/search` - Recherche de contenu
- `GET /api/v2/me` - Profil utilisateur
- `GET /api/v2/stats` - Statistiques utilisateur
- `GET /api/v2/tools` - Outils disponibles pour LLMs
- `GET /api/v2/openapi-schema` - Documentation OpenAPI
- `DELETE /api/v2/delete/{resource}/{ref}` - Suppression unifiée

### API UI (Interface Utilisateur)

#### Agents UI
- `GET /api/ui/agents?specialized=true` - Liste agents spécialisés
- `POST /api/ui/agents` - Créer un agent
- `GET /api/ui/agents/specialized` - Liste agents spécialisés
- `POST /api/ui/agents/specialized` - Créer agent spécialisé

### Chat
- `GET /api/chat` - Info endpoint chat
- `POST /api/chat/llm` - Chat avec LLM (streaming)

### Whisper (Audio)
- `POST /api/v2/whisper/transcribe` - Transcription audio
- `POST /api/v2/whisper/translate` - Traduction audio

### OAuth
- `GET /api/auth/chatgpt-oauth` - OAuth ChatGPT
- `POST /api/auth/create-code` - Création code OAuth
- `POST /api/auth/authorize` - Autorisation OAuth
- `POST /api/auth/token` - Échange tokens

### Tools LLM (OpenAPI V2)

Les tools suivants sont exposés aux LLMs via `/api/v2/tools` et `/api/v2/openapi-schema` :

#### Notes
- `create_note` - Créer une note
- `get_note` - Récupérer une note
- `update_note` - Mettre à jour une note
- `delete_note` - Supprimer une note
- `add_content_to_note` - Ajouter du contenu
- `insert_content_to_note` - Insérer du contenu
- `move_note` - Déplacer une note
- `get_note_toc` - Table des matières
- `get_note_stats` - Statistiques d'une note
- `get_recent_notes` - Notes récentes

#### Classeurs
- `create_classeur` - Créer un classeur
- `list_classeurs` - Lister les classeurs
- `get_classeur_tree` - Arborescence d'un classeur

#### Dossiers
- `create_folder` - Créer un dossier
- `get_folder_tree` - Arborescence d'un dossier

#### Recherche
- `search_notes` - Rechercher dans le contenu
- `search_files` - Rechercher des fichiers

#### Utilisateur
- `get_user_info` - Informations utilisateur
- `get_platform_stats` - Statistiques globales

#### Gestion unifiée
- `delete_resource` - Supprimer une ressource

### MCP Tools (Model Context Protocol)

Support du protocole MCP pour intégration d'outils externes :
- Configuration de serveurs MCP personnalisés (table `mcp_servers`)
- Liaison agents ↔ serveurs MCP (table `agent_mcp_servers`)
- Mode hybride MCP + OpenAPI
- Serveurs MCP supportés : Notion, Exa, Stripe, Hugging Face, etc.

### Agents Pré-configurés

- `johnny` - Johnny Query - Analyse de notes et d'images (Llama 4 Scout)
- `formatter` - Formateur - Mise en forme de documents (Llama 4 Maverick)
- `vision` - Vision - Analyse d'images complexes (Llama 4 Scout)

### Exemples de Payloads

#### Créer une note
```json
POST /api/v2/note/create
{
  "title": "Ma note",
  "content": "# Titre\n\nContenu markdown...",
  "folder_id": "uuid-ou-slug",
  "notebook_id": "uuid-ou-slug"
}
```

#### Appliquer opérations de contenu
```json
POST /api/v2/note/{ref}/content:apply
{
  "ops": [{
    "id": "op-1",
    "action": "insert",
    "target": {
      "type": "heading",
      "heading": {
        "path": ["Section", "Sous-section"],
        "level": 3
      }
    },
    "where": "after",
    "content": "### Nouveau bloc\nContenu..."
  }],
  "dry_run": true,
  "return": "diff"
}
```

#### Exécuter un agent
```json
POST /api/v2/agents/execute
{
  "ref": "johnny",
  "input": "Analyse cette note et donne-moi un résumé",
  "options": {
    "temperature": 0.7,
    "max_tokens": 500
  }
}
```

---

## Roadmap et Open Issues

### TODOs identifiés dans le code

#### Migration de code (src/utils/v2DatabaseUtils.refactored.ts)
- Migrer fonctions vers modules appropriés (noteMutations, userQueries, statsQueries, trashQueries, contentOperations)

### Bugs potentiels / Points d'attention

#### Base de données
- Migration `20241215_rename_classeurs_to_notebooks.sql` : Colonnes `classeur_id` toujours présentes dans `articles` et `folders` (commentées pour sécurité, à supprimer manuellement après vérification)

#### Performance
- Migration `20250217_fix_slow_session_delete.sql` : Optimisation des suppressions de sessions (à vérifier en production)

### Features en cours / Partiellement implémentées

#### Canva (Canvas)
- Système de canva sessions implémenté (table `canva_sessions`)
- Status : MVP Phase 1 complète selon `AUDIT-CANVA-ARCHITECTURE-V2.md`
- Fonctionnalités : Création, sauvegarde, statuts (open, closed, saved, deleted)

#### Collaboration temps réel
- Y.js intégré dans Tiptap (`@tiptap/extension-collaboration`)
- Status : Partiellement implémenté (à vérifier en production)

#### Système de partage
- Table `article_permissions` créée
- 5 niveaux de visibilité : private, public, shared, team, organization
- Support expiration de liens
- Status : Implémenté selon migrations

### Améliorations suggérées (basées sur audits)

#### Conformité Guide Excellence
- Vérifier que tous les fichiers respectent la limite de 300 lignes
- S'assurer qu'aucun `any` ou `@ts-ignore` n'est présent (sauf exceptions justifiées)
- Vérifier que tous les services utilisent le pattern `runExclusive` pour prévenir race conditions

#### Tests
- Couverture de tests unitaires à augmenter (objectif > 80%)
- Tests d'intégration pour flows critiques (user message → tool call → réponse)
- Tests de concurrence (10 messages simultanés, zéro doublon)

#### Performance
- Benchmarks à établir : < 2s réponse simple, < 5s avec 3 tool calls
- Vérifier stabilité mémoire avec 100 messages

### Documentation manquante

- Guide d'utilisation MCP pour utilisateurs finaux
- Documentation API complète avec exemples pour tous les endpoints
- Guide de migration depuis API v1 vers v2

---

## Notes Techniques

### Architecture Conformité

Le codebase suit strictement le **GUIDE-EXCELLENCE-CODE.md** :
- TypeScript strict (zéro `any` sauf exceptions justifiées)
- Database : Pas de collections JSONB (tables dédiées avec `sequence_number` + UNIQUE)
- Concurrency : Pattern `runExclusive` + `operation_id`/`tool_call_id` pour idempotence
- Fichiers : Max 300 lignes (strict)
- Logging : Logger structuré avec contexte, jamais `console.log` en prod
- Tests : `read_lints` après chaque modification

### Sécurité

- **RLS activé** sur toutes les tables utilisateur
- **Validation Zod** systématique sur inputs API
- **Sanitization HTML** via DOMPurify
- **Rate limiting** (à vérifier implémentation)
- **HTTPS uniquement** (via Supabase/Vercel)
- **Secrets** : Variables environnement uniquement

### Standards

- **Code pour 1M+ utilisateurs** : Architecture scalable
- **Maintenabilité** : Code debuggable à 3h du matin avec 10K users actifs
- **Pragmatisme intelligent** : MVP OK, dette critique refusée (race conditions, sécurité)

---

**Fin du document**

