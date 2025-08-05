# 📚 API v2 Scrivia - Documentation Complète

## 🎯 Vue d'ensemble

L'API v2 de Scrivia est conçue pour les interactions LLM (Large Language Models) avec une interface unifiée, une validation stricte et un monitoring spécifique. Elle utilise une architecture RESTful avec authentification JWT et validation Zod.

### **🏗️ Architecture**

- **Base URL :** `https://scrivia.app/api/v2`
- **Authentification :** JWT Bearer Token
- **Content-Type :** `application/json`
- **Headers requis :** `X-Client-Type: llm`

---

## 🔐 Authentification

### **Headers requis**
```http
Content-Type: application/json
X-Client-Type: llm
Authorization: Bearer <jwt_token>
```

### **Format de réponse d'erreur**
```json
{
  "error": "Message d'erreur",
  "details": ["Détail 1", "Détail 2"],
  "status": 400
}
```

---

## 📝 Gestion des Notes

### **POST** `/api/v2/note/create`
**Créer une nouvelle note**

**Description :** Créer une nouvelle note structurée dans un classeur spécifique (par ID ou slug), avec un titre obligatoire, un contenu markdown optionnel, et un dossier parent facultatif.

**Payload :**
```json
{
  "source_title": "Titre de la note",
  "notebook_id": "uuid-du-classeur",
  "markdown_content": "Contenu markdown optionnel",
  "header_image": "https://example.com/image.jpg",
  "folder_id": "uuid-du-dossier"
}
```

**Paramètres :**
- `source_title` (string, **obligatoire**) : Titre de la note (max 255 caractères)
- `notebook_id` (string, **obligatoire**) : ID ou slug du classeur
- `markdown_content` (string, optionnel) : Contenu markdown
- `header_image` (string, optionnel) : URL de l'image d'en-tête
- `folder_id` (string, optionnel) : ID du dossier parent

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note",
    "markdown_content": "Contenu markdown",
    "html_content": "<p>Contenu HTML</p>",
    "classeur_id": "uuid-classeur",
    "folder_id": "uuid-dossier",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Note créée avec succès"
}
```

---

### **PUT** `/api/v2/note/{ref}/update`
**Modifier une note existante**

**Description :** Modifier une note existante identifiée par son ID ou slug, pour changer son titre, contenu markdown, description ou dossier parent (sans écraser les autres champs non spécifiés).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "Nouveau contenu markdown",
  "html_content": "<p>Nouveau contenu HTML</p>",
  "header_image": "https://example.com/new-image.jpg",
  "folder_id": "nouveau-folder-id",
  "description": "Nouvelle description"
}
```

**Paramètres :**
- `source_title` (string, optionnel) : Nouveau titre (max 255 caractères)
- `markdown_content` (string, optionnel) : Nouveau contenu markdown
- `html_content` (string, optionnel) : Nouveau contenu HTML
- `header_image` (string, optionnel) : URL de l'image d'en-tête
- `folder_id` (string, optionnel) : ID du nouveau dossier
- `description` (string, optionnel) : Nouvelle description (max 500 caractères)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Nouveau titre",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Note mise à jour avec succès"
}
```

---

### **DELETE** `/api/v2/note/{ref}/delete`
**Supprimer une note**

**Description :** Supprimer définitivement une note et tout son contenu de la base de données. Cette action est irréversible et ne peut pas être annulée.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "message": "Note supprimée avec succès"
}
```

---

### **GET** `/api/v2/note/{ref}/content`
**Récupérer le contenu d'une note**

**Description :** Récupérer le contenu markdown et HTML d'une note, avec toutes ses métadonnées (titre, image d'en-tête, dates de création/modification, visibilité).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note",
    "markdown_content": "Contenu markdown",
    "html_content": "<p>Contenu HTML</p>",
    "header_image": "https://example.com/image.jpg",
    "classeur_id": "uuid-classeur",
    "folder_id": "uuid-dossier",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "ispublished": false,
    "visibility": "private"
  }
}
```

---

### **GET** `/api/v2/note/{ref}/metadata`
**Récupérer les métadonnées d'une note**

**Description :** Récupérer les métadonnées d'une note sans son contenu complet.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note",
    "header_image": "https://example.com/image.jpg",
    "classeur": {
      "id": "uuid-classeur",
      "name": "Nom du classeur",
      "slug": "nom-du-classeur"
    },
    "folder": {
      "id": "uuid-dossier",
      "name": "Nom du dossier",
      "slug": "nom-du-dossier"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "ispublished": false,
    "visibility": "private"
  }
}
```

---

### **POST** `/api/v2/note/{ref}/add-content`
**Ajouter du contenu à une note**

**Description :** Ajouter du texte markdown à la fin du contenu d'une note existante, sans remplacer le contenu existant. Le nouveau contenu sera concaténé après le contenu actuel.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "content": "Nouveau contenu à ajouter"
}
```

**Paramètres :**
- `content` (string, **obligatoire**) : Contenu markdown à ajouter

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Contenu ajouté avec succès"
}
```

---

### **POST** `/api/v2/note/{ref}/insert`
**Insérer du contenu à une position spécifique**

**Description :** Insérer du contenu markdown à une position spécifique dans une note existante.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "content": "Contenu à insérer",
  "position": 0
}
```

**Paramètres :**
- `content` (string, **obligatoire**) : Contenu markdown à insérer
- `position` (number, **obligatoire**) : Position d'insertion (0 = début)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Contenu inséré avec succès"
}
```

---

### **POST** `/api/v2/note/{ref}/add-to-section`
**Ajouter du contenu à une section spécifique**

**Description :** Ajouter du contenu markdown à une section spécifique d'une note (basée sur les titres markdown).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "sectionId": "nom-de-la-section",
  "content": "Contenu à ajouter à la section"
}
```

**Paramètres :**
- `sectionId` (string, **obligatoire**) : ID ou titre de la section
- `content` (string, **obligatoire**) : Contenu à ajouter

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Contenu ajouté à la section avec succès"
}
```

---

### **DELETE** `/api/v2/note/{ref}/clear-section`
**Vider une section**

**Description :** Vider le contenu d'une section spécifique d'une note (basée sur les titres markdown).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "sectionId": "nom-de-la-section"
}
```

**Paramètres :**
- `sectionId` (string, **obligatoire**) : ID ou titre de la section

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Section vidée avec succès"
}
```

---

### **DELETE** `/api/v2/note/{ref}/erase-section`
**Supprimer une section**

**Description :** Supprimer complètement une section et son contenu d'une note (basée sur les titres markdown).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "sectionId": "nom-de-la-section"
}
```

**Paramètres :**
- `sectionId` (string, **obligatoire**) : ID ou titre de la section

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Section supprimée avec succès"
}
```

---

### **GET** `/api/v2/note/{ref}/table-of-contents`
**Récupérer la table des matières**

**Description :** Récupérer la table des matières d'une note basée sur les titres markdown.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "title": "Titre principal",
      "level": 1,
      "slug": "titre-principal",
      "line": 1
    },
    {
      "title": "Sous-section",
      "level": 2,
      "slug": "sous-section",
      "line": 5
    }
  ]
}
```

---

### **GET** `/api/v2/note/{ref}/statistics`
**Récupérer les statistiques d'une note**

**Description :** Récupérer les statistiques d'une note (nombre de caractères, mots, lignes, etc.).

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "data": {
    "characters": 1500,
    "words": 250,
    "lines": 45,
    "sections": 8,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### **POST** `/api/v2/note/{ref}/merge`
**Fusionner des notes**

**Description :** Fusionner le contenu d'une note dans une autre note selon une stratégie spécifique (append, prepend, replace), puis supprimer la note source.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note source

**Payload :**
```json
{
  "targetNoteId": "uuid-note-destination",
  "mergeStrategy": "append"
}
```

**Paramètres :**
- `targetNoteId` (string, **obligatoire**) : ID de la note de destination
- `mergeStrategy` (string, **obligatoire**) : Stratégie de fusion (`append`, `prepend`, `replace`)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "sourceNoteId": "uuid-note-source",
    "targetNoteId": "uuid-note-destination",
    "mergeStrategy": "append"
  },
  "message": "Notes fusionnées avec succès"
}
```

---

### **PUT** `/api/v2/note/{ref}/move`
**Déplacer une note**

**Description :** Déplacer une note d'un dossier vers un autre dossier spécifique, ou la sortir d'un dossier vers la racine du classeur. La note conserve son contenu et ses métadonnées.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "folder_id": "uuid-dossier-destination"
}
```

**Paramètres :**
- `folder_id` (string, **obligatoire**) : ID du dossier de destination (null pour la racine)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "folder_id": "uuid-dossier-destination",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Note déplacée avec succès"
}
```

---

### **POST** `/api/v2/note/{ref}/publish`
**Publier une note**

**Description :** Changer la visibilité d'une note (public/private) et générer une URL publique.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Payload :**
```json
{
  "ispublished": true
}
```

**Paramètres :**
- `ispublished` (boolean, **obligatoire**) : Statut de publication

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "ispublished": true,
    "public_url": "https://scrivia.app/public/username/slug",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Note publiée avec succès"
}
```

---

### **GET** `/api/v2/note/{ref}/insights`
**Récupérer les insights d'une note**

**Description :** Récupérer les insights AI et embeddings d'une note pour l'analyse LLM.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug de la note

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "insight": "Résumé automatique de la note...",
    "embedding": [0.1, 0.2, 0.3, ...],
    "summary": "Résumé court de la note",
    "tags": ["tag1", "tag2"],
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 📁 Gestion des Dossiers

### **POST** `/api/v2/folder/create`
**Créer un nouveau dossier**

**Description :** Créer un nouveau dossier avec un nom obligatoire dans un classeur spécifique, avec dossier parent optionnel. Le dossier sera automatiquement positionné dans l'ordre du classeur ou du dossier parent.

**Payload :**
```json
{
  "name": "Nom du dossier",
  "notebook_id": "uuid-du-classeur",
  "parent_id": "uuid-du-dossier-parent"
}
```

**Paramètres :**
- `name` (string, **obligatoire**) : Nom du dossier (max 255 caractères)
- `notebook_id` (string, **obligatoire**) : ID du classeur
- `parent_id` (string, optionnel) : ID du dossier parent (null pour la racine)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-dossier",
    "name": "Nom du dossier",
    "slug": "nom-du-dossier",
    "notebook_id": "uuid-classeur",
    "parent_id": "uuid-dossier-parent",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Dossier créé avec succès"
}
```

---

### **PUT** `/api/v2/folder/{ref}/update`
**Modifier un dossier**

**Description :** Modifier le nom ou le dossier parent d'un dossier existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le déplacement vers un nouveau parent réorganise la hiérarchie.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du dossier

**Payload :**
```json
{
  "name": "Nouveau nom du dossier",
  "parent_id": "nouveau-parent-id"
}
```

**Paramètres :**
- `name` (string, optionnel) : Nouveau nom (max 255 caractères)
- `parent_id` (string, optionnel) : ID du nouveau dossier parent (null pour la racine)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-dossier",
    "name": "Nouveau nom du dossier",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Dossier mis à jour avec succès"
}
```

---

### **DELETE** `/api/v2/folder/{ref}/delete`
**Supprimer un dossier**

**Description :** Supprimer définitivement un dossier vide (sans sous-dossiers ni notes) de la base de données. Cette action est irréversible. Les dossiers contenant des éléments ne peuvent pas être supprimés.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du dossier

**Réponse :**
```json
{
  "success": true,
  "message": "Dossier supprimé avec succès"
}
```

---

### **GET** `/api/v2/folder/{ref}/tree`
**Récupérer l'arborescence d'un dossier**

**Description :** Récupérer l'arborescence complète d'un dossier : sous-dossiers et notes organisés hiérarchiquement.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du dossier

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-dossier",
    "name": "Nom du dossier",
    "slug": "nom-du-dossier",
    "children": [
      {
        "id": "uuid-sous-dossier",
        "name": "Sous-dossier",
        "type": "folder",
        "children": []
      },
      {
        "id": "uuid-note",
        "source_title": "Titre de la note",
        "type": "note"
      }
    ]
  }
}
```

---

### **PUT** `/api/v2/folder/{ref}/move`
**Déplacer un dossier**

**Description :** Déplacer un dossier vers un nouveau dossier parent ou vers la racine du classeur.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du dossier

**Payload :**
```json
{
  "parent_id": "nouveau-parent-id"
}
```

**Paramètres :**
- `parent_id` (string, **obligatoire**) : ID du nouveau dossier parent (null pour la racine)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-dossier",
    "parent_id": "nouveau-parent-id",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Dossier déplacé avec succès"
}
```

---

## 📚 Gestion des Classeurs

### **POST** `/api/v2/classeur/create`
**Créer un nouveau classeur**

**Description :** Créer un nouveau classeur avec un nom obligatoire, description et icône optionnelles. Le classeur sera automatiquement positionné à la fin de la liste des classeurs de l'utilisateur.

**Payload :**
```json
{
  "name": "Nom du classeur",
  "description": "Description du classeur",
  "icon": "📚"
}
```

**Paramètres :**
- `name` (string, **obligatoire**) : Nom du classeur (max 255 caractères)
- `description` (string, optionnel) : Description (max 500 caractères)
- `icon` (string, optionnel) : Icône (emoji ou nom d'icône)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-classeur",
    "name": "Nom du classeur",
    "slug": "nom-du-classeur",
    "description": "Description du classeur",
    "icon": "📚",
    "position": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Classeur créé avec succès"
}
```

---

### **PUT** `/api/v2/classeur/{ref}/update`
**Modifier un classeur**

**Description :** Modifier le nom, description ou icône d'un classeur existant identifié par son ID ou slug. Les champs non fournis restent inchangés. Le nom et la description peuvent être modifiés indépendamment.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du classeur

**Payload :**
```json
{
  "name": "Nouveau nom du classeur",
  "description": "Nouvelle description",
  "icon": "📖"
}
```

**Paramètres :**
- `name` (string, optionnel) : Nouveau nom (max 255 caractères)
- `description` (string, optionnel) : Nouvelle description (max 500 caractères)
- `icon` (string, optionnel) : Nouvelle icône (emoji ou nom d'icône)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-classeur",
    "name": "Nouveau nom du classeur",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Classeur mis à jour avec succès"
}
```

---

### **DELETE** `/api/v2/classeur/{ref}/delete`
**Supprimer un classeur**

**Description :** Supprimer définitivement un classeur et tout son contenu (dossiers et notes) de la base de données. Cette action est irréversible et supprime toutes les données associées au classeur.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du classeur

**Réponse :**
```json
{
  "success": true,
  "message": "Classeur supprimé avec succès"
}
```

---

### **GET** `/api/v2/classeur/{ref}/tree`
**Récupérer l'arborescence d'un classeur**

**Description :** Récupérer l'arborescence complète d'un classeur : dossiers, sous-dossiers et notes organisés hiérarchiquement. Permet de comprendre la structure avant d'ajouter ou déplacer des éléments.

**Paramètres de chemin :**
- `ref` (string) : ID ou slug du classeur

**Réponse :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-classeur",
    "name": "Nom du classeur",
    "slug": "nom-du-classeur",
    "folders": [
      {
        "id": "uuid-dossier",
        "name": "Nom du dossier",
        "slug": "nom-du-dossier",
        "notes": [
          {
            "id": "uuid-note",
            "source_title": "Titre de la note",
            "slug": "titre-de-la-note"
          }
        ]
      }
    ],
    "notes": [
      {
        "id": "uuid-note-racine",
        "source_title": "Note à la racine",
        "slug": "note-a-la-racine"
      }
    ]
  }
}
```

---

### **PUT** `/api/v2/classeur/reorder`
**Réorganiser les classeurs**

**Description :** Réorganiser l'ordre des classeurs de l'utilisateur.

**Payload :**
```json
{
  "classeurs": [
    {
      "id": "uuid-classeur-1",
      "position": 0
    },
    {
      "id": "uuid-classeur-2",
      "position": 1
    }
  ]
}
```

**Paramètres :**
- `classeurs` (array, **obligatoire**) : Liste des classeurs avec leurs nouvelles positions

**Réponse :**
```json
{
  "success": true,
  "data": {
    "updated": 2
  },
  "message": "Classeurs réorganisés avec succès"
}
```

---

### **GET** `/api/v2/classeurs`
**Lister tous les classeurs**

**Description :** Récupérer la liste complète des classeurs de l'utilisateur avec leurs métadonnées (nom, description, icône, position). Permet de choisir le bon classeur avant de créer des notes ou dossiers.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-classeur-1",
      "name": "Nom du classeur 1",
      "slug": "nom-du-classeur-1",
      "description": "Description du classeur 1",
      "icon": "📚",
      "position": 0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-classeur-2",
      "name": "Nom du classeur 2",
      "slug": "nom-du-classeur-2",
      "description": "Description du classeur 2",
      "icon": "📖",
      "position": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 🔧 Utilitaires

### **POST** `/api/v2/slug/generate`
**Générer un slug**

**Description :** Générer un slug unique basé sur un texte pour les notes, classeurs ou dossiers.

**Payload :**
```json
{
  "text": "Titre de la note",
  "type": "note"
}
```

**Paramètres :**
- `text` (string, **obligatoire**) : Texte à partir duquel générer le slug
- `type` (string, **obligatoire**) : Type d'élément (`note`, `classeur`, `folder`)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "slug": "titre-de-la-note",
    "original": "Titre de la note"
  }
}
```

---

## 🚨 Codes d'erreur

### **Erreurs d'authentification**
- `401 Unauthorized` : Token JWT invalide ou manquant
- `403 Forbidden` : Accès refusé à la ressource

### **Erreurs de validation**
- `400 Bad Request` : Payload invalide ou champs manquants
- `422 Unprocessable Entity` : Données de validation incorrectes

### **Erreurs de ressources**
- `404 Not Found` : Ressource non trouvée
- `409 Conflict` : Conflit (ex: slug déjà existant)

### **Erreurs serveur**
- `500 Internal Server Error` : Erreur interne du serveur

---

## 📊 Monitoring

### **Headers de monitoring**
```http
X-Client-Type: llm
X-Operation: v2_note_create
X-Component: API_V2
```

### **Logs disponibles**
- `v2_llm_note_create` : Création de note via LLM
- `v2_llm_note_update` : Mise à jour de note via LLM
- `v2_llm_folder_create` : Création de dossier via LLM
- `v2_llm_classeur_create` : Création de classeur via LLM

---

## 🔗 Intégration LLM

### **Outils disponibles pour les LLMs**
L'API v2 expose les outils suivants pour les LLMs via function calling :

1. `create_note` - Créer une nouvelle note structurée
2. `update_note` - Modifier une note existante
3. `add_content_to_note` - Ajouter du contenu à une note
4. `move_note` - Déplacer une note
5. `delete_note` - Supprimer une note
6. `create_folder` - Créer un nouveau dossier
7. `update_folder` - Modifier un dossier
8. `delete_folder` - Supprimer un dossier
9. `create_notebook` - Créer un nouveau classeur
10. `update_notebook` - Modifier un classeur
11. `delete_notebook` - Supprimer un classeur
12. `get_note_content` - Récupérer le contenu d'une note
13. `get_tree` - Récupérer l'arborescence d'un classeur
14. `get_notebooks` - Lister tous les classeurs

### **Exemple d'utilisation LLM**
```javascript
// Exemple avec ChatGPT
const tools = [
  {
    name: "create_note",
    description: "Créer une nouvelle note structurée dans un classeur spécifique...",
    parameters: {
      type: "object",
      properties: {
        source_title: { type: "string" },
        notebook_id: { type: "string" },
        markdown_content: { type: "string" }
      },
      required: ["source_title", "notebook_id"]
    }
  }
];
```

---

## 📝 Notes importantes

### **Résolution des références**
- Les paramètres `{ref}` acceptent soit un UUID soit un slug
- La résolution est automatique et transparente
- Les slugs sont uniques par utilisateur

### **Validation stricte**
- Tous les payloads sont validés avec Zod
- Les erreurs de validation sont détaillées
- Les types de données sont strictement vérifiés

### **Performance**
- Tous les endpoints sont optimisés pour les LLMs
- Réponses rapides (< 200ms)
- Cache intelligent pour les requêtes fréquentes

### **Sécurité**
- Authentification JWT obligatoire
- Validation des permissions utilisateur
- Protection contre les injections SQL
- Rate limiting automatique

---

*Documentation générée le 2024-01-01 - Version 2.0* 