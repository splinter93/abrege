# Tableau Complet des Endpoints V2

## 📊 **Note Management**

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/create` | POST | `source_title` | string | ✅ | ❌ | ❌ | `z.string().min(1).max(255)` |
| `/api/v2/note/create` | POST | `notebook_id` | string | ✅ | ❌ | ❌ | `z.string().uuid()` |
| `/api/v2/note/create` | POST | `markdown_content` | string | ❌ | ❌ | ✅ | `z.string().optional()` |
| `/api/v2/note/create` | POST | `header_image` | string | ❌ | ❌ | ✅ | `z.string().url().optional()` |
| `/api/v2/note/create` | POST | `folder_id` | string | ❌ | ❌ | ✅ | `z.string().uuid().optional()` |
| `/api/v2/note/create` | POST | `id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (généré) |
| `/api/v2/note/create` | POST | `created_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/note/create` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/note/create` | POST | `user_id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (session) |
| `/api/v2/note/create` | POST | `position` | number | ❌ | ✅ | ✅ | `z.number().int().min(0).optional()` |
| `/api/v2/note/create` | POST | `slug` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/create` | POST | `html_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/create` | POST | `description` | string | ❌ | ❌ | ✅ | `z.string().max(500).optional()` |
| `/api/v2/note/create` | POST | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/create` | POST | `visibility` | string | ❌ | ✅ | ❌ | `z.enum(['private', 'shared', 'members', 'public'])` |
| `/api/v2/note/create` | POST | `view_count` | number | ❌ | ✅ | ❌ | `z.number().int().min(0).default(0)` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/update` | PUT | `source_title` | string | ❌ | ❌ | ✅ | `z.string().min(1).max(255).optional()` |
| `/api/v2/note/[ref]/update` | PUT | `markdown_content` | string | ❌ | ❌ | ✅ | `z.string().optional()` |
| `/api/v2/note/[ref]/update` | PUT | `html_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/update` | PUT | `header_image` | string | ❌ | ❌ | ✅ | `z.string().url().optional()` |
| `/api/v2/note/[ref]/update` | PUT | `folder_id` | string | ❌ | ❌ | ✅ | `z.string().uuid().optional()` |
| `/api/v2/note/[ref]/update` | PUT | `description` | string | ❌ | ❌ | ✅ | `z.string().max(500).optional()` |
| `/api/v2/note/[ref]/update` | PUT | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/update` | PUT | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/move` | PUT | `folder_id` | string | ✅ | ❌ | ✅ | `z.string().uuid().nullable()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/merge` | POST | `targetNoteId` | string | ✅ | ❌ | ❌ | `z.string().uuid()` |
| `/api/v2/note/[ref]/merge` | POST | `mergeStrategy` | string | ✅ | ❌ | ❌ | `z.enum(['append', 'prepend', 'replace'])` |

## 📊 **Note Content**

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/add-content` | POST | `content` | string | ✅ | ❌ | ❌ | `z.string().min(1)` |
| `/api/v2/note/[ref]/add-content` | POST | `markdown_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (concaténé) |
| `/api/v2/note/[ref]/add-content` | POST | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/add-content` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/add-to-section` | POST | `sectionId` | string | ✅ | ❌ | ❌ | `z.string().min(1)` |
| `/api/v2/note/[ref]/add-to-section` | POST | `content` | string | ✅ | ❌ | ❌ | `z.string().min(1)` |
| `/api/v2/note/[ref]/add-to-section` | POST | `markdown_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (inséré) |
| `/api/v2/note/[ref]/add-to-section` | POST | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/add-to-section` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/clear-section` | POST | `sectionId` | string | ✅ | ❌ | ❌ | `z.string().min(1)` |
| `/api/v2/note/[ref]/clear-section` | POST | `markdown_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (vidé) |
| `/api/v2/note/[ref]/clear-section` | POST | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/clear-section` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/content` | PUT | `content` | string | ✅ | ❌ | ❌ | `z.string().min(1)` |
| `/api/v2/note/[ref]/content` | PUT | `markdown_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (remplacé) |
| `/api/v2/note/[ref]/content` | PUT | `html_content` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/content` | PUT | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` (généré) |
| `/api/v2/note/[ref]/content` | PUT | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/publish` | POST | `ispublished` | boolean | ✅ | ❌ | ❌ | `z.boolean()` |
| `/api/v2/note/[ref]/publish` | POST | `public_url` | string | ❌ | ✅ | ✅ | `z.string().url().optional()` (généré) |
| `/api/v2/note/[ref]/publish` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

## 📊 **Read-only Endpoints**

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/insights` | GET | `insight` | string | ❌ | ✅ | ✅ | `z.string().optional()` |
| `/api/v2/note/[ref]/insights` | GET | `noteId` | string | ❌ | ✅ | ❌ | `z.string().uuid()` |
| `/api/v2/note/[ref]/insights` | GET | `title` | string | ❌ | ✅ | ❌ | `z.string()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/content` | GET | `content` | string | ❌ | ✅ | ✅ | `z.string().optional()` |
| `/api/v2/note/[ref]/content` | GET | `noteId` | string | ❌ | ✅ | ❌ | `z.string().uuid()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/note/[ref]/metadata` | GET | `source_title` | string | ❌ | ✅ | ❌ | `z.string()` |
| `/api/v2/note/[ref]/metadata` | GET | `created_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` |
| `/api/v2/note/[ref]/metadata` | GET | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` |
| `/api/v2/note/[ref]/metadata` | GET | `folder_id` | string | ❌ | ✅ | ✅ | `z.string().uuid().nullable()` |
| `/api/v2/note/[ref]/metadata` | GET | `description` | string | ❌ | ✅ | ✅ | `z.string().nullable()` |
| `/api/v2/note/[ref]/metadata` | GET | `visibility` | string | ❌ | ✅ | ❌ | `z.enum(['private', 'shared', 'members', 'public'])` |
| `/api/v2/note/[ref]/metadata` | GET | `view_count` | number | ❌ | ✅ | ❌ | `z.number().int().min(0)` |

## 📊 **Folder Management**

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/folder/create` | POST | `name` | string | ✅ | ❌ | ❌ | `z.string().min(1).max(255)` |
| `/api/v2/folder/create` | POST | `notebook_id` | string | ✅ | ❌ | ❌ | `z.string().uuid()` |
| `/api/v2/folder/create` | POST | `parent_id` | string | ❌ | ❌ | ✅ | `z.string().uuid().optional()` |
| `/api/v2/folder/create` | POST | `id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (généré) |
| `/api/v2/folder/create` | POST | `created_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/folder/create` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/folder/create` | POST | `user_id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (session) |
| `/api/v2/folder/create` | POST | `position` | number | ❌ | ✅ | ✅ | `z.number().int().min(0).optional()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/folder/[ref]/update` | PUT | `name` | string | ❌ | ❌ | ✅ | `z.string().min(1).max(255).optional()` |
| `/api/v2/folder/[ref]/update` | PUT | `parent_id` | string | ❌ | ❌ | ✅ | `z.string().uuid().optional()` |
| `/api/v2/folder/[ref]/update` | PUT | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/folder/[ref]/move` | PUT | `parent_id` | string | ✅ | ❌ | ✅ | `z.string().uuid().nullable()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/folder/[ref]/tree` | GET | `id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` |
| `/api/v2/folder/[ref]/tree` | GET | `name` | string | ❌ | ✅ | ❌ | `z.string()` |
| `/api/v2/folder/[ref]/tree` | GET | `children` | array | ❌ | ✅ | ✅ | `z.array(z.object({...}))` |

## 📊 **Classeur Management**

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/classeur/create` | POST | `name` | string | ✅ | ❌ | ❌ | `z.string().min(1).max(255)` |
| `/api/v2/classeur/create` | POST | `description` | string | ❌ | ❌ | ✅ | `z.string().max(500).optional()` |
| `/api/v2/classeur/create` | POST | `icon` | string | ❌ | ❌ | ✅ | `z.string().optional()` |
| `/api/v2/classeur/create` | POST | `id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (généré) |
| `/api/v2/classeur/create` | POST | `created_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/classeur/create` | POST | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |
| `/api/v2/classeur/create` | POST | `user_id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` (session) |
| `/api/v2/classeur/create` | POST | `position` | number | ❌ | ✅ | ✅ | `z.number().int().min(0).optional()` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/classeur/[ref]/update` | PUT | `name` | string | ❌ | ❌ | ✅ | `z.string().min(1).max(255).optional()` |
| `/api/v2/classeur/[ref]/update` | PUT | `description` | string | ❌ | ❌ | ✅ | `z.string().max(500).optional()` |
| `/api/v2/classeur/[ref]/update` | PUT | `icon` | string | ❌ | ❌ | ✅ | `z.string().optional()` |
| `/api/v2/classeur/[ref]/update` | PUT | `position` | number | ❌ | ❌ | ✅ | `z.number().int().min(0).optional()` |
| `/api/v2/classeur/[ref]/update` | PUT | `updated_at` | string | ❌ | ✅ | ❌ | `z.string().datetime()` (généré) |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/classeur/[ref]/reorder` | PUT | `classeurs` | array | ✅ | ❌ | ❌ | `z.array(z.object({id: z.string().uuid(), position: z.number().int().min(0)})).min(1)` |
| `/api/v2/classeur/[ref]/reorder` | PUT | `id` | string | ✅ | ❌ | ❌ | `z.string().uuid()` |
| `/api/v2/classeur/[ref]/reorder` | PUT | `position` | number | ✅ | ❌ | ❌ | `z.number().int().min(0)` |

| Endpoint | Méthode | Champ | Type | Requis | Calculatif | Nullable | Validation Zod |
|----------|---------|-------|------|--------|------------|----------|----------------|
| `/api/v2/classeur/[ref]/tree` | GET | `id` | string | ❌ | ✅ | ❌ | `z.string().uuid()` |
| `/api/v2/classeur/[ref]/tree` | GET | `name` | string | ❌ | ✅ | ❌ | `z.string()` |
| `/api/v2/classeur/[ref]/tree` | GET | `folders` | array | ❌ | ✅ | ✅ | `z.array(z.object({...}))` |
| `/api/v2/classeur/[ref]/tree` | GET | `notes` | array | ❌ | ✅ | ✅ | `z.array(z.object({...}))` |

## 📝 **Légende**

- **Requis** : Champ obligatoire dans la requête
- **Calculatif** : Champ généré automatiquement par le système
- **Nullable** : Champ qui peut être null dans la base de données
- **Validation Zod** : Schéma de validation TypeScript

## 🔧 **Types de champs calculatifs :**

- **Généré** : Créé automatiquement (UUID, timestamps)
- **Session** : Récupéré depuis la session utilisateur
- **Concaténé** : Résultat de la concaténation de contenu
- **Inséré** : Contenu inséré dans une section spécifique
- **Vidé** : Section vidée de son contenu
- **Remplacé** : Contenu entièrement remplacé
- **Généré (TOC)** : Table des matières extraite du markdown 