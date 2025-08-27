# API V2 Documentation - Abrège

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentification](#authentification)
3. [Conventions générales](#conventions-générales)
4. [Endpoints des Notes](#endpoints-des-notes)
5. [Endpoints des Classeurs](#endpoints-des-classeurs)
6. [Endpoints des Dossiers](#endpoints-des-dossiers)
7. [Endpoints des Fichiers](#endpoints-des-fichiers)
8. [Endpoints Audio (Whisper)](#endpoints-audio-whisper)
9. [Gestion des Références](#gestion-des-références)
10. [Schémas de Validation](#schémas-de-validation)
11. [Codes d'erreur](#codes-derreur)
12. [Exemples d'utilisation](#exemples-dutilisation)
13. [Limites et bonnes pratiques](#limites-et-bonnes-pratiques)

---

## Vue d'ensemble

L'API V2 d'Abrège est une interface REST moderne et sécurisée conçue pour permettre aux LLM et applications tierces d'interagir avec le système de gestion de connaissances d'Abrège. Cette version apporte des améliorations significatives en termes de sécurité, de performance et de facilité d'utilisation.

### Caractéristiques principales

- **Authentification JWT** avec gestion des permissions granulaires
- **Support des slugs** en plus des UUID pour une meilleure lisibilité
- **Validation stricte** avec schémas Zod
- **Gestion unifiée des ressources** (notes, classeurs, dossiers, fichiers)
- **Support audio** avec transcription Whisper via Groq
- **API LLM-friendly** avec résolution automatique des références

### Base URL

```
https://votre-domaine.com/api/v2
```

---

## Authentification

L'API V2 utilise l'authentification JWT via Supabase. Toutes les requêtes doivent inclure un token d'authentification valide.

### Headers requis

```http
Authorization: Bearer <votre-jwt-token>
Content-Type: application/json
X-Client-Type: llm (ou autre identifiant client)
```

### Obtention du token

1. Authentifiez-vous via l'endpoint Supabase Auth
2. Récupérez le JWT token de la réponse
3. Incluez ce token dans toutes les requêtes API

---

## Conventions générales

### Format des réponses

Toutes les réponses suivent un format standard :

```json
{
  "success": true,
  "message": "Opération réussie",
  "data": { ... }
}
```

### Gestion des erreurs

```json
{
  "error": "Description de l'erreur",
  "details": ["Détails supplémentaires"],
  "status": 400
}
```

### Références (UUID vs Slug)

L'API V2 accepte deux types de références :
- **UUID** : Identifiant unique standard (ex: `123e4567-e89b-12d3-a456-426614174000`)
- **Slug** : Identifiant lisible (ex: `ma-note-importante`)

La résolution est automatique et transparente.

---

## Endpoints des Notes

### 1. Lister les notes

**GET** `/api/v2/notes`

Récupère la liste de toutes les notes de l'utilisateur authentifié.

#### Paramètres de requête

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID spécifique d'une note (optionnel) |

#### Réponse

```json
{
  "success": true,
  "notes": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "source_title": "Titre de la note",
      "slug": "titre-de-la-note",
      "folder_id": "456e7890-e89b-12d3-a456-426614174000",
      "classeur_id": "789e0123-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "is_published": false,
      "markdown_content": "# Contenu de la note"
    }
  ]
}
```

### 2. Créer une note

**POST** `/api/v2/note/create`

Crée une nouvelle note dans le système.

#### Corps de la requête

```json
{
  "source_title": "Titre de la nouvelle note",
  "notebook_id": "789e0123-e89b-12d3-a456-426614174000",
  "markdown_content": "# Contenu initial de la note",
  "header_image": "https://example.com/image.jpg",
  "folder_id": "456e7890-e89b-12d3-a456-426614174000"
}
```

#### Réponse

```json
{
  "success": true,
  "message": "Note créée avec succès",
  "note": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "source_title": "Titre de la nouvelle note",
    "slug": "titre-de-la-nouvelle-note",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Récupérer le contenu d'une note

**GET** `/api/v2/note/{ref}/content`

Récupère le contenu complet d'une note par son UUID ou slug.

#### Paramètres de chemin

| Paramètre | Type | Description |
|-----------|------|-------------|
| `ref` | string | UUID ou slug de la note |

#### Réponse

```json
{
  "success": true,
  "message": "Contenu récupéré avec succès",
  "content": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Titre de la note",
    "markdown": "# Contenu en markdown",
    "html": "<h1>Contenu en HTML</h1>",
    "headerImage": "https://example.com/image.jpg",
    "headerImageOffset": 50,
    "headerImageBlur": 2,
    "headerImageOverlay": 1,
    "headerTitleInImage": true,
    "wideMode": false,
    "fontFamily": "Noto Sans",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "slug": "titre-de-la-note",
    "publicUrl": "https://votre-domaine.com/p/titre-de-la-note",
    "share_settings": {
      "visibility": "private"
    }
  }
}
```

### 4. Mettre à jour une note

**PUT** `/api/v2/note/{ref}/update`

Met à jour les métadonnées d'une note.

#### Corps de la requête

```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "# Nouveau contenu",
  "header_image": "https://example.com/new-image.jpg",
  "wide_mode": true,
  "font_family": "Arial"
}
```

### 5. Ajouter du contenu

**POST** `/api/v2/note/{ref}/add-content`

Ajoute du contenu à la fin d'une note existante.

#### Corps de la requête

```json
{
  "content": "\n\n## Nouvelle section\n\nContenu ajouté à la fin."
}
```

### 6. Insérer du contenu

**POST** `/api/v2/note/{ref}/insert`

Insère du contenu à une position spécifique dans la note.

#### Corps de la requête

```json
{
  "content": "## Section insérée",
  "position": 100
}
```

### 7. Supprimer une note

**DELETE** `/api/v2/note/{ref}/delete`

Supprime définitivement une note.

### 8. Déplacer une note

**PUT** `/api/v2/note/{ref}/move`

Déplace une note vers un autre dossier ou classeur.

#### Corps de la requête

```json
{
  "folder_id": "456e7890-e89b-12d3-a456-426614174000"
}
```

### 9. Publier une note

**PUT** `/api/v2/note/{ref}/publish`

Change la visibilité d'une note.

#### Corps de la requête

```json
{
  "visibility": "public"
}
```

#### Options de visibilité

- `private` : Privé (par défaut)
- `public` : Public
- `link-private` : Accessible via lien privé
- `link-public` : Accessible via lien public
- `limited` : Accès limité
- `scrivia` : Partage Scrivia

### 10. Fusionner des notes

**POST** `/api/v2/note/{ref}/merge`

Fusionne le contenu de la note source avec une note cible.

#### Corps de la requête

```json
{
  "targetNoteId": "456e7890-e89b-12d3-a456-426614174000",
  "mergeStrategy": "append"
}
```

#### Stratégies de fusion

- `append` : Ajouter à la fin de la note cible
- `prepend` : Ajouter au début de la note cible
- `replace` : Remplacer le contenu de la note cible

### 11. Gestion des sections

#### Vider une section

**POST** `/api/v2/note/{ref}/clear-section`

```json
{
  "sectionId": "section-1"
}
```

#### Supprimer une section

**POST** `/api/v2/note/{ref}/erase-section`

```json
{
  "sectionId": "section-1"
}
```

#### Ajouter à une section

**POST** `/api/v2/note/{ref}/add-to-section`

```json
{
  "sectionId": "section-1",
  "content": "Contenu ajouté à la section"
}
```

### 12. Métadonnées et statistiques

#### Récupérer les métadonnées

**GET** `/api/v2/note/{ref}/metadata`

#### Récupérer les statistiques

**GET** `/api/v2/note/{ref}/statistics`

#### Récupérer les insights

**GET** `/api/v2/note/{ref}/insights`

#### Récupérer la table des matières

**GET** `/api/v2/note/{ref}/table-of-contents`

### 13. Apparence et personnalisation

**PUT** `/api/v2/note/{ref}/appearance`

Personnalise l'apparence d'une note.

#### Corps de la requête

```json
{
  "header_image": "https://example.com/image.jpg",
  "header_image_offset": 30,
  "header_image_blur": 1,
  "header_image_overlay": 2,
  "header_title_in_image": true,
  "wide_mode": true,
  "font_family": "Georgia"
}
```

---

## Endpoints des Classeurs

### 1. Lister les classeurs

**GET** `/api/v2/classeurs`

Récupère la liste de tous les classeurs de l'utilisateur.

#### Réponse

```json
{
  "success": true,
  "classeurs": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174000",
      "name": "Mon Classeur",
      "description": "Description du classeur",
      "emoji": "📚",
      "position": 1,
      "slug": "mon-classeur",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Créer un classeur

**POST** `/api/v2/classeur/create`

Crée un nouveau classeur.

#### Corps de la requête

```json
{
  "name": "Nouveau Classeur",
  "description": "Description du nouveau classeur",
  "emoji": "📖"
}
```

### 3. Mettre à jour un classeur

**PUT** `/api/v2/classeur/{ref}/update`

Met à jour un classeur existant.

#### Corps de la requête

```json
{
  "name": "Nouveau nom",
  "description": "Nouvelle description",
  "emoji": "📚",
  "position": 2
}
```

### 4. Supprimer un classeur

**DELETE** `/api/v2/classeur/{ref}/delete`

Supprime un classeur et tout son contenu.

### 5. Classeurs avec contenu

**GET** `/api/v2/classeurs/with-content`

Récupère les classeurs avec leur contenu (notes et dossiers).

---

## Endpoints des Dossiers

### 1. Lister les dossiers

**GET** `/api/v2/folders`

Récupère la liste de tous les dossiers de l'utilisateur.

#### Paramètres de requête

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID spécifique d'un dossier (optionnel) |

#### Réponse

```json
{
  "success": true,
  "folders": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174000",
      "name": "Mon Dossier",
      "description": "Description du dossier",
      "parent_id": null,
      "classeur_id": "789e0123-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Créer un dossier

**POST** `/api/v2/folder/create`

Crée un nouveau dossier.

#### Corps de la requête

```json
{
  "name": "Nouveau Dossier",
  "notebook_id": "789e0123-e89b-12d3-a456-426614174000",
  "parent_id": "456e7890-e89b-12d3-a456-426614174000"
}
```

### 3. Mettre à jour un dossier

**PUT** `/api/v2/folder/{ref}/update`

Met à jour un dossier existant.

#### Corps de la requête

```json
{
  "name": "Nouveau nom",
  "parent_id": "789e0123-e89b-12d3-a456-426614174000"
}
```

### 4. Déplacer un dossier

**PUT** `/api/v2/folder/{ref}/move`

Déplace un dossier vers un autre parent.

#### Corps de la requête

```json
{
  "parent_id": "789e0123-e89b-12d3-a456-426614174000"
}
```

### 5. Supprimer un dossier

**DELETE** `/api/v2/folder/{ref}/delete`

Supprime un dossier et tout son contenu.

---

## Endpoints des Fichiers

### 1. Lister les fichiers

**GET** `/api/v2/files`

Récupère la liste de tous les fichiers de l'utilisateur.

#### Paramètres de requête

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | string | ID spécifique d'un fichier (optionnel) |

#### Réponse

```json
{
  "success": true,
  "files": [
    {
      "id": "abc12345-e89b-12d3-a456-426614174000",
      "filename": "document.pdf",
      "original_name": "Mon Document.pdf",
      "mime_type": "application/pdf",
      "size": 1048576,
      "classeur_id": "789e0123-e89b-12d3-a456-426614174000",
      "folder_id": "456e7890-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Enregistrer un fichier

**POST** `/api/v2/files/register`

Enregistre un nouveau fichier dans le système.

#### Corps de la requête

```json
{
  "filename": "document.pdf",
  "original_name": "Mon Document.pdf",
  "mime_type": "application/pdf",
  "size": 1048576,
  "classeur_id": "789e0123-e89b-12d3-a456-426614174000",
  "folder_id": "456e7890-e89b-12d3-a456-426614174000"
}
```

### 3. Upload de fichier

**POST** `/api/v2/files/upload`

Upload un fichier vers le stockage.

#### Corps de la requête (FormData)

- `file`: Le fichier à uploader
- `classeur_id`: ID du classeur de destination
- `folder_id`: ID du dossier de destination (optionnel)

### 4. Presign upload

**POST** `/api/v2/files/presign-upload`

Génère une URL présignée pour l'upload direct vers le stockage.

#### Corps de la requête

```json
{
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "classeur_id": "789e0123-e89b-12d3-a456-426614174000"
}
```

### 5. Gestion des fichiers

#### Récupérer un fichier

**GET** `/api/v2/files/{ref}`

#### Mettre à jour un fichier

**PUT** `/api/v2/files/{ref}/update`

#### Supprimer un fichier

**DELETE** `/api/v2/files/{ref}/delete`

---

## Endpoints Audio (Whisper)

### 1. Transcription audio

**POST** `/api/v2/whisper/transcribe`

Transcrit un fichier audio en texte via l'API Whisper de Groq.

#### Corps de la requête (FormData)

- `file`: Fichier audio (m4a, mp3, wav, flac, ogg, webm, mpeg, mpga)
- `model`: Modèle Whisper (défaut: `whisper-large-v3-turbo`)
- `language`: Langue du fichier audio (optionnel)
- `prompt`: Prompt pour guider la transcription (optionnel)
- `response_format`: Format de réponse (défaut: `verbose_json`)
- `temperature`: Température (défaut: `0`)

#### Formats supportés

- **Modèles**: `whisper-large-v3-turbo`, `whisper-large-v3`
- **Formats de réponse**: `json`, `verbose_json`, `text`
- **Taille maximale**: 25MB
- **Types de fichiers**: m4a, mp3, wav, flac, ogg, webm, mpeg, mpga

#### Réponse

```json
{
  "success": true,
  "data": {
    "text": "Transcription du fichier audio",
    "language": "fr",
    "segments": [...]
  },
  "metadata": {
    "model": "whisper-large-v3-turbo",
    "language": "fr",
    "response_format": "verbose_json",
    "file_size": 1048576,
    "file_type": "audio/mp3",
    "api_version": "v2"
  }
}
```

### 2. Traduction audio

**POST** `/api/v2/whisper/translate`

Traduit un fichier audio vers l'anglais.

#### Corps de la requête (FormData)

Similaire à la transcription, mais traduit automatiquement vers l'anglais.

---

## Gestion des Références

L'API V2 utilise un système de résolution automatique des références qui accepte à la fois les UUID et les slugs.

### Résolution automatique

```typescript
// Ces deux appels sont équivalents :
GET /api/v2/note/123e4567-e89b-12d3-a456-426614174000/content
GET /api/v2/note/ma-note-importante/content
```

### Types de ressources supportés

- `note` : Notes/articles
- `classeur` : Classeurs/notebooks
- `folder` : Dossiers

### Exemple de résolution

```typescript
// L'API résout automatiquement :
const noteRef = "ma-note-importante"; // Slug
const noteId = await V2ResourceResolver.resolveRef(noteRef, 'note', userId, context);
// Retourne l'UUID correspondant
```

---

## Schémas de Validation

L'API V2 utilise Zod pour la validation stricte de tous les payloads.

### Schéma de création de note

```typescript
const createNoteV2Schema = z.object({
  source_title: z.string().min(1).max(255),
  notebook_id: z.string().min(1),
  markdown_content: z.string().optional().default(''),
  header_image: z.string().url().optional(),
  folder_id: z.string().uuid().nullable().optional(),
});
```

### Schéma de mise à jour de note

```typescript
const updateNoteV2Schema = z.object({
  source_title: z.string().min(1).max(255).optional(),
  markdown_content: z.string().optional(),
  html_content: z.string().optional(),
  header_image: z.string().url().optional().nullable(),
  header_image_offset: z.number().min(0).max(100).optional(),
  header_image_blur: z.number().int().min(0).max(5).optional(),
  header_image_overlay: z.number().int().min(0).max(5).optional(),
  header_title_in_image: z.boolean().optional(),
  wide_mode: z.boolean().optional(),
  a4_mode: z.boolean().optional(),
  slash_lang: z.enum(['fr', 'en']).optional(),
  font_family: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  description: z.string().max(500).optional(),
});
```

### Schéma de création de classeur

```typescript
const createClasseurV2Schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  emoji: z.string().optional(),
});
```

### Schéma de création de dossier

```typescript
const createFolderV2Schema = z.object({
  name: z.string().min(1).max(255),
  notebook_id: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
});
```

---

## Codes d'erreur

### Codes HTTP standards

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Créé avec succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Ressource non trouvée |
| 422 | Erreur de validation |
| 500 | Erreur serveur interne |

### Messages d'erreur courants

```json
{
  "error": "Token d'authentification manquant",
  "status": 401
}
```

```json
{
  "error": "Payload invalide",
  "details": [
    "source_title requis",
    "notebook_id OBLIGATOIRE"
  ],
  "status": 422
}
```

```json
{
  "error": "Note non trouvée",
  "status": 404
}
```

```json
{
  "error": "Accès refusé",
  "status": 403
}
```

---

## Exemples d'utilisation

### Créer une note complète

```bash
curl -X POST "https://votre-domaine.com/api/v2/note/create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -d '{
    "source_title": "Ma première note via API",
    "notebook_id": "mon-classeur",
    "markdown_content": "# Bienvenue\n\nCeci est ma première note créée via l\'API V2.",
    "header_image": "https://example.com/header.jpg"
  }'
```

### Récupérer le contenu d'une note

```bash
curl -X GET "https://votre-domaine.com/api/v2/note/ma-note-importante/content" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Client-Type: llm"
```

### Ajouter du contenu à une note

```bash
curl -X POST "https://votre-domaine.com/api/v2/note/ma-note-importante/add-content" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -d '{
    "content": "\n\n## Nouvelle section\n\nContenu ajouté via l\'API."
  }'
```

### Lister tous les classeurs

```bash
curl -X GET "https://votre-domaine.com/api/v2/classeurs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Client-Type: llm"
```

### Transcrire un fichier audio

```bash
curl -X POST "https://votre-domaine.com/api/v2/whisper/transcribe" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Client-Type: llm" \
  -F "file=@audio.mp3" \
  -F "model=whisper-large-v3-turbo" \
  -F "language=fr" \
  -F "response_format=verbose_json"
```

### Utilisation avec JavaScript/TypeScript

```typescript
class AbregeAPI {
  private baseUrl = 'https://votre-domaine.com/api/v2';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur API');
    }

    return response.json();
  }

  async createNote(data: {
    source_title: string;
    notebook_id: string;
    markdown_content?: string;
    header_image?: string;
  }) {
    return this.request('/note/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNoteContent(ref: string) {
    return this.request(`/note/${ref}/content`);
  }

  async addContent(ref: string, content: string) {
    return this.request(`/note/${ref}/add-content`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async listClasseurs() {
    return this.request('/classeurs');
  }

  async transcribeAudio(file: File, options: {
    model?: string;
    language?: string;
    prompt?: string;
  } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.model) formData.append('model', options.model);
    if (options.language) formData.append('language', options.language);
    if (options.prompt) formData.append('prompt', options.prompt);

    return this.request('/whisper/transcribe', {
      method: 'POST',
      headers: {
        'X-Client-Type': 'llm',
      },
      body: formData,
    });
  }
}

// Utilisation
const api = new AbregeAPI('YOUR_JWT_TOKEN');

// Créer une note
const note = await api.createNote({
  source_title: 'Ma note',
  notebook_id: 'mon-classeur',
  markdown_content: '# Contenu initial'
});

// Ajouter du contenu
await api.addContent(note.note.slug, '\n\n## Nouvelle section\n\nContenu ajouté.');

// Transcrire un fichier audio
const transcription = await api.transcribeAudio(audioFile, {
  language: 'fr',
  model: 'whisper-large-v3-turbo'
});
```

---

## Limites et bonnes pratiques

### Limites techniques

- **Taille maximale des fichiers audio** : 25MB
- **Longueur maximale des titres** : 255 caractères
- **Longueur maximale des descriptions** : 500 caractères
- **Taille maximale du contenu markdown** : Illimitée (selon les limites de la base de données)

### Bonnes pratiques

1. **Authentification** : Toujours inclure le token JWT valide
2. **Gestion des erreurs** : Vérifier le code de statut et traiter les erreurs appropriément
3. **Validation** : Utiliser les schémas de validation fournis
4. **Références** : Préférer les slugs pour une meilleure lisibilité
5. **Rate limiting** : Respecter les limites de l'API
6. **Logging** : Inclure `X-Client-Type` pour le suivi des utilisations

### Sécurité

- **JWT** : Les tokens expirent automatiquement
- **Permissions** : Chaque utilisateur n'accède qu'à ses propres ressources
- **Validation** : Tous les inputs sont validés et sanitizés
- **RLS** : Row Level Security activé au niveau de la base de données

### Performance

- **Cache** : Utiliser le cache approprié pour les requêtes fréquentes
- **Pagination** : Les listes sont paginées automatiquement
- **Optimisation** : Les requêtes sont optimisées avec des index appropriés

---

## Support et contact

Pour toute question ou support concernant l'API V2 d'Abrège :

- **Documentation** : Cette documentation
- **Issues** : Système de tickets du projet
- **Développement** : Équipe de développement Abrège

---

*Dernière mise à jour : Janvier 2025*
*Version de l'API : 2.0*
