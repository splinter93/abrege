# 📚 API V2 Abrège - Documentation Complète

## 🔐 Authentification

Tous les endpoints de l'API V2 nécessitent une authentification via :
- **Header** : `Authorization: Bearer <token>`
- **Cookie** : `sb-access-token` (pour les requêtes côté serveur)

---

## 📝 NOTES

### `POST /api/v2/note/create`
**Créer une nouvelle note**

#### Payload
```json
{
  "source_title": "string*",           // Titre de la note (1-255 caractères)
  "notebook_id": "string*",            // UUID ou slug du classeur
  "markdown_content": "string",        // Contenu markdown (optionnel, défaut: "")
  "header_image": "string",            // URL de l'image d'en-tête (optionnel)
  "folder_id": "string"                // UUID du dossier parent (optionnel, nullable)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Note créée avec succès",
  "note": {
    "id": "uuid",
    "source_title": "string",
    "slug": "string",
    "public_url": "string|null",
    "markdown_content": "string",
    "html_content": "string",
    "header_image": "string|null",
    "folder_id": "string|null",
    "classeur_id": "uuid",
    "user_id": "uuid",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `GET /api/v2/note/[ref]`
**Récupérer une note par UUID ou slug**

#### Paramètres
- `ref` : UUID ou slug de la note
- `fields` : `all` | `content` | `metadata` (optionnel, défaut: `all`)

#### Réponse (mode `all`)
```json
{
  "success": true,
  "note": {
    "id": "uuid",
    "title": "string",
    "slug": "string",
    "public_url": "string|null",
    "header_image": "string|null",
    "folder_id": "string|null",
    "classeur_id": "uuid",
    "created_at": "datetime",
    "updated_at": "datetime",
    "share_settings": "object|null",
    "markdown_content": "string"
  },
  "mode": "all"
}
```

#### Réponse (mode `content`)
```json
{
  "success": true,
  "note": {
    "id": "uuid",
    "title": "string",
    "slug": "string",
    "public_url": "string|null",
    "header_image": "string|null",
    "markdown_content": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
  },
  "mode": "content"
}
```

#### Réponse (mode `metadata`)
```json
{
  "success": true,
  "note": {
    "id": "uuid",
    "title": "string",
    "slug": "string",
    "public_url": "string|null",
    "header_image": "string|null",
    "folder_id": "string|null",
    "classeur_id": "uuid",
    "created_at": "datetime",
    "updated_at": "datetime",
    "share_settings": "object|null"
  },
  "mode": "metadata"
}
```

---

### `PUT /api/v2/note/[ref]/update`
**Mettre à jour une note**

#### Payload
```json
{
  "source_title": "string",            // Titre (1-255 caractères, optionnel)
  "markdown_content": "string",        // Contenu markdown (optionnel)
  "html_content": "string",            // Contenu HTML (optionnel)
  "header_image": "string",            // URL image d'en-tête (optionnel, nullable)
  "header_image_offset": "number",     // Offset image (0-100, optionnel)
  "header_image_blur": "number",       // Flou image (0-5, optionnel)
  "header_image_overlay": "number",    // Overlay image (0-5, optionnel)
  "header_title_in_image": "boolean",  // Titre dans l'image (optionnel)
  "wide_mode": "boolean",              // Mode large (optionnel)
  "a4_mode": "boolean",                // Mode A4 (optionnel)
  "slash_lang": "string",              // Langue slash commands (fr|en, optionnel)
  "font_family": "string",             // Famille de police (optionnel)
  "folder_id": "string",               // UUID dossier parent (optionnel, nullable)
  "description": "string"              // Description (max 500 caractères, optionnel)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Note mise à jour avec succès",
  "note": {
    "id": "uuid",
    "source_title": "string",
    "slug": "string",
    "public_url": "string|null",
    "markdown_content": "string",
    "html_content": "string",
    "header_image": "string|null",
    "folder_id": "string|null",
    "classeur_id": "uuid",
    "user_id": "uuid",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `DELETE /api/v2/note/[ref]/delete`
**Supprimer une note (mise en corbeille)**

#### Réponse
```json
{
  "success": true,
  "message": "Note supprimée avec succès"
}
```

---

### `POST /api/v2/note/[ref]/move`
**Déplacer une note**

#### Payload
```json
{
  "target_folder_id": "string",        // UUID dossier destination (optionnel, nullable)
  "target_notebook_id": "string"       // UUID classeur destination (optionnel)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Note déplacée avec succès"
}
```

---

### `POST /api/v2/note/[ref]/insert-content`
**Insérer du contenu à une position spécifique**

#### Payload
```json
{
  "content": "string*",                // Contenu à insérer
  "position": "number*"                // Position d'insertion (entier >= 0)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Contenu inséré avec succès",
  "note": {
    "id": "uuid",
    "markdown_content": "string"
  }
}
```

---

### `GET /api/v2/note/[ref]/table-of-contents`
**Récupérer la table des matières d'une note**

#### Réponse
```json
{
  "success": true,
  "toc": [
    {
      "id": "string",
      "level": "number",
      "title": "string",
      "position": "number"
    }
  ]
}
```

---

### `POST /api/v2/note/[ref]/share`
**Partager une note**

#### Payload
```json
{
  "visibility": "string*"              // private|public|link-private|link-public|limited|scrivia
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Note partagée avec succès",
  "public_url": "string"
}
```

---

### `GET /api/v2/note/recent`
**Récupérer les notes récentes**

#### Paramètres
- `limit` : Nombre de notes (optionnel, défaut: 20)

#### Réponse
```json
{
  "success": true,
  "notes": [
    {
      "id": "uuid",
      "source_title": "string",
      "slug": "string",
      "public_url": "string|null",
      "header_image": "string|null",
      "folder_id": "string|null",
      "classeur_id": "uuid",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

## 📁 DOSSIERS

### `POST /api/v2/folder/create`
**Créer un nouveau dossier**

#### Payload
```json
{
  "name": "string*",                   // Nom du dossier (1-255 caractères)
  "notebook_id": "string*",            // UUID ou slug du classeur
  "parent_id": "string"                // UUID du dossier parent (optionnel, nullable)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Dossier créé avec succès",
  "folder": {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "parent_id": "string|null",
    "classeur_id": "uuid",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `GET /api/v2/folder/[ref]`
**Récupérer un dossier par UUID ou slug**

#### Réponse
```json
{
  "success": true,
  "folder": {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "parent_id": "string|null",
    "classeur_id": "uuid",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `PUT /api/v2/folder/[ref]/update`
**Mettre à jour un dossier**

#### Payload
```json
{
  "name": "string",                    // Nom du dossier (1-255 caractères, optionnel)
  "parent_id": "string"                // UUID du dossier parent (optionnel, nullable)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Dossier mis à jour avec succès",
  "folder": {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "parent_id": "string|null",
    "classeur_id": "uuid",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `DELETE /api/v2/folder/[ref]/delete`
**Supprimer un dossier (mise en corbeille)**

#### Réponse
```json
{
  "success": true,
  "message": "Dossier supprimé avec succès"
}
```

---

### `POST /api/v2/folder/[ref]/move`
**Déplacer un dossier**

#### Payload
```json
{
  "target_folder_id": "string",        // UUID dossier destination (optionnel, nullable)
  "target_classeur_id": "string"       // UUID classeur destination (optionnel)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Dossier déplacé avec succès"
}
```

---

### `GET /api/v2/folder/[ref]/tree`
**Récupérer l'arborescence d'un dossier**

#### Réponse
```json
{
  "success": true,
  "tree": {
    "id": "uuid",
    "name": "string",
    "children": [
      {
        "id": "uuid",
        "name": "string",
        "type": "folder|note",
        "children": "array|null"
      }
    ],
    "folders": "array",
    "notes": "array"
  }
}
```

---

## 📚 CLASSEURS

### `POST /api/v2/classeur/create`
**Créer un nouveau classeur**

#### Payload
```json
{
  "name": "string*",                   // Nom du classeur (1-255 caractères)
  "description": "string",             // Description (max 500 caractères, optionnel)
  "icon": "string",                    // Icône (optionnel)
  "emoji": "string"                    // Emoji (optionnel)
}
```

#### Réponse
```json
{
  "success": true,
  "classeur": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "emoji": "string",
    "icon": "string",
    "slug": "string",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `GET /api/v2/classeurs`
**Récupérer la liste des classeurs**

#### Réponse
```json
{
  "success": true,
  "classeurs": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "emoji": "string",
      "position": "number",
      "slug": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

### `GET /api/v2/classeurs/with-content`
**Récupérer les classeurs avec leur contenu**

#### Réponse
```json
{
  "success": true,
  "classeurs": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "emoji": "string",
      "position": "number",
      "slug": "string",
      "created_at": "datetime",
      "updated_at": "datetime",
      "tree": "array",
      "notes_at_root": "array"
    }
  ]
}
```

---

### `GET /api/v2/classeur/[ref]`
**Récupérer un classeur par UUID ou slug**

#### Réponse
```json
{
  "success": true,
  "classeur": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "emoji": "string",
    "icon": "string",
    "slug": "string",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `PUT /api/v2/classeur/[ref]/update`
**Mettre à jour un classeur**

#### Payload
```json
{
  "name": "string",                    // Nom du classeur (1-255 caractères, optionnel)
  "description": "string",             // Description (max 500 caractères, optionnel)
  "icon": "string",                    // Icône (optionnel)
  "emoji": "string",                   // Emoji (optionnel)
  "position": "number"                 // Position (entier >= 0, optionnel)
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Classeur mis à jour avec succès",
  "classeur": {
    "id": "uuid",
    "name": "string",
    "description": "string|null",
    "emoji": "string",
    "icon": "string",
    "slug": "string",
    "user_id": "uuid",
    "position": "number",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### `DELETE /api/v2/classeur/[ref]/delete`
**Supprimer un classeur (mise en corbeille)**

#### Réponse
```json
{
  "success": true,
  "message": "Classeur supprimé avec succès"
}
```

---

### `GET /api/v2/classeur/[ref]/tree`
**Récupérer l'arborescence d'un classeur**

#### Réponse
```json
{
  "success": true,
  "tree": {
    "id": "uuid",
    "name": "string",
    "children": [
      {
        "id": "uuid",
        "name": "string",
        "type": "folder|note",
        "children": "array|null"
      }
    ],
    "folders": "array",
    "notes": "array"
  }
}
```

---

### `POST /api/v2/classeur/reorder`
**Réorganiser les classeurs**

#### Payload
```json
{
  "classeurs": [
    {
      "id": "string*",                 // UUID du classeur
      "position": "number*"            // Nouvelle position (entier >= 0)
    }
  ]
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Classeurs réorganisés avec succès"
}
```

---

### `POST /api/v2/classeur/[ref]/reorder`
**Réorganiser le contenu d'un classeur**

#### Payload
```json
{
  "items": [
    {
      "id": "string*",                 // UUID de l'élément
      "type": "string*",               // folder|note
      "position": "number*",           // Nouvelle position (entier >= 0)
      "parent_id": "string"            // UUID du parent (optionnel, nullable)
    }
  ]
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Contenu réorganisé avec succès"
}
```

---

## 🔍 RECHERCHE

### `GET /api/v2/search`
**Rechercher dans le contenu**

#### Paramètres
- `q` : Terme de recherche (obligatoire)
- `classeur_id` : UUID du classeur (optionnel)
- `type` : `all` | `notes` | `folders` (optionnel, défaut: `all`)
- `limit` : Nombre de résultats (optionnel, défaut: 20, max: 100)

#### Réponse
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid",
      "type": "note|folder",
      "title": "string",
      "content": "string",
      "classeur_id": "uuid",
      "folder_id": "string|null",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": "number"
}
```

---

## 📊 STATISTIQUES

### `GET /api/v2/stats`
**Récupérer les statistiques utilisateur**

#### Réponse
```json
{
  "success": true,
  "stats": {
    "total_notes": "number",
    "total_folders": "number",
    "total_classeurs": "number",
    "total_characters": "number",
    "last_activity": "datetime"
  }
}
```

---

## 👤 UTILISATEUR

### `GET /api/v2/me`
**Récupérer les informations utilisateur**

#### Réponse
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "string",
    "username": "string|null",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

## 🗑️ CORBEILLE

### `GET /api/v2/trash`
**Récupérer les éléments en corbeille**

#### Réponse
```json
{
  "success": true,
  "trash": [
    {
      "id": "uuid",
      "type": "note|folder|classeur",
      "name": "string",
      "trashed_at": "datetime"
    }
  ]
}
```

---

### `POST /api/v2/trash/restore`
**Restaurer un élément de la corbeille**

#### Payload
```json
{
  "id": "string*",                     // UUID de l'élément
  "type": "string*"                    // note|folder|classeur
}
```

#### Réponse
```json
{
  "success": true,
  "message": "Élément restauré avec succès"
}
```

---

### `POST /api/v2/trash/purge`
**Vider définitivement la corbeille**

#### Réponse
```json
{
  "success": true,
  "message": "Corbeille vidée avec succès"
}
```

---

## 🛠️ OUTILS

### `GET /api/v2/tools`
**Récupérer les outils disponibles**

#### Réponse
```json
{
  "success": true,
  "tools": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "parameters": "object"
    }
  ]
}
```

---

## 📄 FICHIERS

### `GET /api/v2/files/search`
**Rechercher des fichiers**

#### Paramètres
- `q` : Terme de recherche (obligatoire)
- `limit` : Nombre de résultats (optionnel, défaut: 20)

#### Réponse
```json
{
  "success": true,
  "files": [
    {
      "id": "uuid",
      "filename": "string",
      "url": "string",
      "size": "number",
      "type": "string",
      "created_at": "datetime"
    }
  ]
}
```

---

## 🔧 ENDPOINTS GÉNÉRIQUES

### `DELETE /api/v2/delete/[resource]/[ref]`
**Supprimer une ressource générique**

#### Paramètres
- `resource` : `note` | `folder` | `classeur`
- `ref` : UUID ou slug de la ressource

#### Réponse
```json
{
  "success": true,
  "message": "Ressource supprimée avec succès"
}
```

---

## 📋 SCHÉMA OPENAPI

### `GET /api/v2/openapi-schema`
**Récupérer le schéma OpenAPI complet**

#### Réponse
```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "API V2 Abrège",
    "version": "2.0.0"
  },
  "paths": {
    // ... schéma complet
  }
}
```

---

## ⚠️ CODES D'ERREUR

| Code | Description |
|------|-------------|
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Accès refusé |
| `404` | Ressource non trouvée |
| `422` | Données de validation invalides |
| `500` | Erreur serveur |

---

## 🔄 POLLING REALTIME

Tous les endpoints de création, modification et suppression déclenchent automatiquement le polling realtime pour synchroniser les clients connectés.

---

## 📝 NOTES IMPORTANTES

1. **Références** : Tous les endpoints acceptent les UUID ou les slugs comme identifiants
2. **Validation** : Tous les payloads sont validés avec Zod
3. **Authentification** : Obligatoire pour tous les endpoints
4. **Logging** : Toutes les opérations sont loggées
5. **Performance** : Les requêtes sont optimisées avec des sélections de champs spécifiques
6. **Sécurité** : RLS (Row Level Security) activé sur toutes les tables

---

*Documentation générée automatiquement à partir de l'implémentation réelle de l'API V2*
