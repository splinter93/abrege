# API Abrège - Documentation Complète

## 📋 **Vue d'ensemble**

L'API Abrège permet la gestion complète de notes, dossiers et classeurs avec support des slugs pour une meilleure intégration avec les LLMs.

**Base URL :** `https://votre-domaine.com/api/v1`

## 🔐 **Authentification**

Tous les endpoints nécessitent une authentification via Supabase :

```bash
Authorization: Bearer YOUR_SUPABASE_TOKEN
```

## 📊 **Types de ressources**

| Ressource | ID Format | Slug Format | Description |
|-----------|-----------|-------------|-------------|
| **Notes** | `123e4567-e89b-12d3-a456-426614174000` | `ma-premiere-note` | Articles markdown |
| **Dossiers** | `550e8400-e29b-41d4-a716-446655440000` | `mon-dossier-important` | Conteneurs de notes |
| **Classeurs** | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` | `classeur-de-travail` | Conteneurs de dossiers |

---

## 📝 **Notes (Articles)**

### **Créer une note**

```http
POST /api/v1/note/create
```

**Corps :**
```json
{
  "source_title": "Nouvelle note",
  "markdown_content": "# Contenu de la note",
  "header_image": "https://example.com/image.jpg",
  "folder_id": "550e8400-e29b-41d4-a716-446655440000",
  "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

**Champs :**
- `source_title` (string, **requis**) : Titre de la note
- `markdown_content` (string, **requis**) : Contenu markdown
- `header_image` (string, optionnel) : URL de l'image d'en-tête
- `folder_id` (string, optionnel) : ID du dossier (hérite automatiquement du classeur_id)
- `classeur_id` (string, optionnel) : ID du classeur (si pas de folder_id)

**Réponse :**
```json
{
  "note": {
    "id": "new-note-id",
    "slug": "nouvelle-note",
    "source_title": "Nouvelle note",
    "markdown_content": "# Contenu de la note",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Récupérer une note**

```http
GET /api/v1/note/{ref}
```

**Paramètres :**
- `ref` (string, requis) : ID ou slug de la note

**Réponse :**
```json
{
  "note": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "slug": "ma-premiere-note",
    "source_title": "Ma première note",
    "markdown_content": "# Contenu markdown",
    "html_content": "<h1>Contenu HTML</h1>",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Supprimer une note**

```http
DELETE /api/v1/note/{ref}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Note supprimée"
}
```

### **Ajouter du contenu**

```http
PATCH /api/v1/note/{ref}/add-content
```

**Corps :**
```json
{
  "text": "\n## Nouveau contenu ajouté",
  "position": 150
}
```

**Champs :**
- `text` (string, **requis**) : Contenu à ajouter
- `position` (number, optionnel) : Position d'insertion

### **Ajouter à une section spécifique**

```http
PATCH /api/v1/note/{ref}/add-to-section
```

**Corps :**
```json
{
  "section": "introduction",
  "text": "\nNouveau contenu dans la section"
}
```

### **Effacer une section**

```http
PATCH /api/v1/note/{ref}/clear-section
```

**Corps :**
```json
{
  "section": "introduction"
}
```

### **Récupérer la table des matières**

```http
GET /api/v1/note/{ref}/table-of-contents
```

**Réponse :**
```json
{
  "toc": [
    {
      "level": 1,
      "title": "Introduction",
      "slug": "introduction",
      "line": 1,
      "start": 3
    },
    {
      "level": 2,
      "title": "Première partie",
      "slug": "premiere-partie",
      "line": 5,
      "start": 4
    }
  ]
}
```

### **Récupérer les informations de base**

```http
GET /api/v1/note/{ref}/information
```

**Réponse :**
```json
{
  "note": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "source_title": "Ma note",
    "header_image": "https://example.com/image.jpg",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "slug": "ma-note"
  }
}
```

### **Récupérer les statistiques**

```http
GET /api/v1/note/{ref}/statistics
```

**Réponse :**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Ma note",
  "header_image": "https://example.com/image.jpg",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "word_count": 150,
  "char_count": 2500,
  "section_count": 5,
  "toc": [
    {
      "title": "Introduction",
      "slug": "introduction",
      "level": 1
    }
  ]
}
```

### **Déplacer une note**

```http
PATCH /api/v1/note/{ref}/move
```

**Corps :**
```json
{
  "target_classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "target_folder_id": "550e8400-e29b-41d4-a716-446655440000",
  "position": 3
}
```

**Champs :**
- `target_classeur_id` (string, optionnel) : ID du classeur de destination
- `target_folder_id` (string | null, optionnel) : ID du dossier de destination (null = racine)
- `position` (number, optionnel) : Position dans la liste

---

## 📁 **Dossiers (Folders)**

### **Créer un dossier**

```http
POST /api/v1/folder/create
```

**Corps :**
```json
{
  "name": "Nouveau dossier",
  "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "parent_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Champs :**
- `name` (string, **requis**) : Nom du dossier
- `classeur_id` (string, **requis**) : ID du classeur parent
- `parent_id` (string | null, optionnel) : ID du dossier parent (pour sous-dossiers)

**Réponse :**
```json
{
  "folder": {
    "id": "new-folder-id",
    "slug": "nouveau-dossier",
    "name": "Nouveau dossier",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "parent_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Récupérer un dossier**

```http
GET /api/v1/folder/{ref}
```

**Réponse :**
```json
{
  "folder": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "slug": "mon-dossier-important",
    "name": "Mon dossier important",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "parent_id": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Mettre à jour un dossier**

```http
PUT /api/v1/folder/{ref}
```

**Corps :**
```json
{
  "name": "Nom modifié"
}
```

### **Supprimer un dossier**

```http
DELETE /api/v1/folder/{ref}
```

---

## 📚 **Classeurs (Notebooks)**

### **Lister tous les notebooks**

```http
GET /api/v1/notebooks
```

**Réponse :**
```json
{
  "notebooks": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "slug": "classeur-de-travail",
      "name": "Classeur de travail",
      "emoji": "📚",
      "color": "#3b82f6",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "position": 0
    }
  ]
}
```

### **Créer un notebook**

```http
POST /api/v1/notebook/create
```

**Corps :**
```json
{
  "name": "Nouveau classeur",
  "emoji": "📚",
  "color": "#3b82f6"
}
```

**Champs :**
- `name` (string, **requis**) : Nom du classeur
- `emoji` (string, optionnel) : Emoji du classeur
- `color` (string, optionnel) : Couleur du classeur

**Réponse :**
```json
{
  "notebook": {
    "id": "new-notebook-id",
    "slug": "nouveau-classeur",
    "name": "Nouveau classeur",
    "emoji": "📚",
    "color": "#3b82f6",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Récupérer un notebook**

```http
GET /api/v1/notebook/{ref}
```

**Réponse :**
```json
{
  "notebook": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "slug": "classeur-de-travail",
    "name": "Classeur de travail",
    "emoji": "📚",
    "color": "#3b82f6",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Récupérer le contenu complet d'un notebook**

```http
GET /api/v1/classeur/{ref}/full-tree
```

**Réponse :**
```json
{
  "classeur": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Classeur de travail",
    "emoji": "📚",
    "color": "#3b82f6"
  },
  "notes_at_root": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Note à la racine",
      "header_image": "https://example.com/image.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "folders": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Mon dossier",
      "parent_id": null,
      "notes": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "title": "Note dans le dossier",
          "header_image": null,
          "created_at": "2024-01-15T10:30:00Z"
        }
      ],
      "children": []
    }
  ]
}
```

### **Mettre à jour un notebook**

```http
PUT /api/v1/notebook/{ref}
```

**Corps :**
```json
{
  "name": "Nom modifié",
  "emoji": "🧪",
  "color": "#ef4444"
}
```

### **Supprimer un notebook**

```http
DELETE /api/v1/notebook/{ref}
```

---

## 🔧 **Points importants**

### **Héritage automatique du classeur_id**
- Si vous créez une note avec `folder_id`, l'API récupère automatiquement le `classeur_id` du dossier
- Vous pouvez aussi spécifier `classeur_id` explicitement

### **Support des slugs et IDs**
- Tous les endpoints acceptent les slugs ou les IDs dans les paramètres `{ref}`
- Exemple : `/note/ma-note` ou `/note/123e4567-e89b-12d3-a456-426614174000`

### **Endpoints cohérents**
- `/notebooks` pour lister les notebooks
- `/classeur/[ref]/full-tree` pour voir le contenu complet
- `/note/create` accepte `folder_id` ET `classeur_id`

### **Codes de réponse**
- `200` : Succès
- `201` : Créé avec succès
- `404` : Ressource non trouvée
- `422` : Erreur de validation
- `500` : Erreur serveur

---

## 🚀 **Exemples d'utilisation**

### **Workflow complet**

1. **Lister les notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```

2. **Voir le contenu d'un notebook**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/classeur/mon-notebook/full-tree
```

3. **Créer une note dans un dossier**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Nouvelle note",
    "markdown_content": "# Contenu de la note",
    "folder_id": "ID_DU_DOSSIER"
  }'
```

4. **Ajouter du contenu à la note**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-note/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Nouveau contenu\n\nAjouté via l'API !"
  }'
```

### **Cas d'usage typiques**

**Créer une note directement dans un classeur :**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Note à la racine",
    "markdown_content": "# Contenu",
    "classeur_id": "ID_DU_CLASSEUR"
  }'
```

**Déplacer une note vers un autre dossier :**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-note/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_folder_id": "ID_DU_DOSSIER_DESTINATION"
  }'
```

**Récupérer les statistiques d'une note :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-note/statistics
```

---

## 📋 **Résumé des endpoints**

### **Notes**
- `POST /api/v1/note/create` - Créer une note
- `GET /api/v1/note/{ref}` - Récupérer une note
- `DELETE /api/v1/note/{ref}` - Supprimer une note
- `PATCH /api/v1/note/{ref}/add-content` - Ajouter du contenu
- `PATCH /api/v1/note/{ref}/add-to-section` - Ajouter à une section
- `PATCH /api/v1/note/{ref}/clear-section` - Effacer une section
- `GET /api/v1/note/{ref}/table-of-contents` - Table des matières
- `GET /api/v1/note/{ref}/information` - Informations de base
- `GET /api/v1/note/{ref}/statistics` - Statistiques
- `PATCH /api/v1/note/{ref}/move` - Déplacer une note

### **Dossiers**
- `POST /api/v1/folder/create` - Créer un dossier
- `GET /api/v1/folder/{ref}` - Récupérer un dossier
- `PUT /api/v1/folder/{ref}` - Mettre à jour un dossier
- `DELETE /api/v1/folder/{ref}` - Supprimer un dossier

### **Classeurs**
- `GET /api/v1/notebooks` - Lister tous les notebooks
- `POST /api/v1/notebook/create` - Créer un notebook
- `GET /api/v1/notebook/{ref}` - Récupérer un notebook
- `GET /api/v1/classeur/{ref}/full-tree` - Contenu complet d'un notebook
- `PUT /api/v1/notebook/{ref}` - Mettre à jour un notebook
- `DELETE /api/v1/notebook/{ref}` - Supprimer un notebook 