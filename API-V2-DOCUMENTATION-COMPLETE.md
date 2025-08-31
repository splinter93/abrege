# 🚀 **API V2 Abrège - Documentation Complète**

## 📋 **Vue d'ensemble**

L'API V2 d'Abrège est une interface RESTful moderne et robuste conçue pour offrir une expérience de développement exceptionnelle. Elle propose une architecture unifiée, une validation stricte des données, et une gestion d'erreurs cohérente.

### **🌟 Caractéristiques principales**
- **🔐 Authentification JWT** sécurisée
- **✅ Validation Zod** stricte des payloads
- **🔄 Support UUID/Slug** universel
- **📊 Logging détaillé** pour le debugging
- **🚀 Performance optimisée** avec accès direct à la base de données
- **🛡️ Gestion d'erreurs** robuste et informative

---

## 🔗 **Informations de base**

| Propriété | Valeur |
|-----------|---------|
| **Base URL** | `https://scrivia.app/api/v2` |
| **Version** | `2.0.0` |
| **Authentification** | API Key (recommandée), OAuth, ou JWT Supabase |
| **Content-Type** | `application/json` |
| **Headers requis** | `X-Client-Type: llm` |

---

## 🔐 **Authentification**

### **Méthodes d'authentification**

L'API V2 supporte **3 méthodes d'authentification** dans l'ordre de priorité :

#### **🔑 Méthode 1 : API Key (Recommandée)**
```http
Content-Type: application/json
X-Client-Type: llm
X-API-Key: <votre-clé-api>
```

#### **🔐 Méthode 2 : Token OAuth**
```http
Content-Type: application/json
X-Client-Type: llm
Authorization: Bearer <token-oauth>
```

#### **🔑 Méthode 3 : JWT Supabase (Fallback)**
```http
Content-Type: application/json
X-Client-Type: llm
Authorization: Bearer <jwt-supabase>
```

### **Format de réponse d'erreur**
```json
{
  "error": "Message d'erreur descriptif",
  "details": ["Détail 1", "Détail 2"],
  "status": 400
}
```

### **Codes de statut HTTP**
- `200` - Succès
- `201` - Créé avec succès
- `400` - Erreur de validation
- `401` - Non authentifié
- `403` - Non autorisé
- `404` - Ressource non trouvée
- `500` - Erreur serveur interne

---

## 📝 **Gestion des Notes (Articles)**

### **POST** `/api/v2/note/create`
**Créer une nouvelle note**

**Description :** Créer une nouvelle note structurée dans un classeur spécifique avec un titre obligatoire et un contenu markdown optionnel.

**Payload :**
```json
{
  "source_title": "Titre de la note",
  "notebook_id": "uuid-du-classeur-ou-slug",
  "markdown_content": "Contenu markdown optionnel",
  "header_image": "https://example.com/image.jpg",
  "folder_id": "uuid-du-dossier-optionnel"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `source_title` | string | ✅ | Titre de la note (max 255 caractères) |
| `notebook_id` | string | ✅ | ID ou slug du classeur |
| `markdown_content` | string | ❌ | Contenu markdown de la note |
| `header_image` | string | ❌ | URL de l'image d'en-tête |
| `folder_id` | string | ❌ | ID du dossier parent |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note",
    "public_url": "https://scrivia.app/note/titre-de-la-note",
    "notebook_id": "uuid-classeur",
    "folder_id": "uuid-dossier",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Exemple d'utilisation :**
```bash
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "source_title": "Guide de l'API V2",
    "notebook_id": "mon-classeur",
    "markdown_content": "# Guide API V2\n\nCe guide explique...",
    "header_image": "https://example.com/api-guide.jpg"
  }'
```

---

### **GET** `/api/v2/note/{ref}`
**Récupérer une note**

**Description :** Récupérer les informations complètes d'une note par son ID, slug ou URL publique.

**Paramètres de chemin :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `ref` | string | ID, slug ou URL publique de la note |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note",
    "public_url": "https://scrivia.app/note/titre-de-la-note",
    "markdown_content": "# Contenu de la note\n\n...",
    "html_content": "<h1>Contenu de la note</h1><p>...</p>",
    "notebook_id": "uuid-classeur",
    "folder_id": "uuid-dossier",
    "header_image": "https://example.com/image.jpg",
    "is_published": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### **PUT** `/api/v2/note/{ref}/update`
**Mettre à jour une note**

**Description :** Mettre à jour les informations d'une note existante.

**Payload :**
```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "Nouveau contenu markdown",
  "header_image": "https://example.com/new-image.jpg",
  "folder_id": "nouveau-folder-id"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `source_title` | string | ❌ | Nouveau titre de la note |
| `markdown_content` | string | ❌ | Nouveau contenu markdown |
| `header_image` | string | ❌ | Nouvelle image d'en-tête |
| `folder_id` | string | ❌ | Nouveau dossier parent |

---

### **DELETE** `/api/v2/note/{ref}/delete`
**Supprimer une note**

**Description :** Supprimer définitivement une note et toutes ses données associées.

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Note supprimée avec succès",
  "data": {
    "deleted_note_id": "uuid-note",
    "deleted_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### **PUT** `/api/v2/note/{ref}/move`
**Déplacer une note**

**Description :** Déplacer une note vers un autre classeur ou dossier.

**Payload :**
```json
{
  "target_notebook_id": "uuid-nouveau-classeur",
  "target_folder_id": "uuid-nouveau-dossier"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `target_notebook_id` | string | ❌ | ID du nouveau classeur |
| `target_folder_id` | string | ❌ | ID du nouveau dossier |

---

### **PATCH** `/api/v2/note/{ref}/add-content`
**Ajouter du contenu à une note**

**Description :** Ajouter du contenu markdown à la fin d'une note existante.

**Payload :**
```json
{
  "markdown_content": "Nouveau contenu à ajouter"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `markdown_content` | string | ✅ | Contenu markdown à ajouter |

---

### **GET** `/api/v2/note/{ref}/table-of-contents`
**Récupérer la table des matières**

**Description :** Générer et récupérer la table des matières automatique d'une note.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "note_id": "uuid-note",
    "table_of_contents": [
      {
        "level": 1,
        "text": "Introduction",
        "id": "introduction"
      },
      {
        "level": 2,
        "text": "Installation",
        "id": "installation"
      }
    ]
  }
}
```

---

### **GET** `/api/v2/note/{ref}/statistics`
**Récupérer les statistiques d'une note**

**Description :** Obtenir des statistiques détaillées sur une note (nombre de mots, caractères, etc.).

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "note_id": "uuid-note",
    "statistics": {
      "word_count": 1250,
      "character_count": 8750,
      "paragraph_count": 15,
      "heading_count": 8,
      "list_count": 3,
      "code_block_count": 2
    }
  }
}
```

---

### **GET** `/api/v2/note/recent**
**Récupérer les notes récentes**

**Description :** Obtenir la liste des notes les plus récemment modifiées.

**Paramètres de requête :**
| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Nombre maximum de notes à retourner |
| `offset` | number | 0 | Nombre de notes à ignorer |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "uuid-note-1",
        "source_title": "Note récente 1",
        "slug": "note-recente-1",
        "updated_at": "2024-01-01T12:00:00Z"
      }
    ],
    "total_count": 1,
    "has_more": false
  }
}
```

---

## 📁 **Gestion des Dossiers (Folders)**

### **POST** `/api/v2/folder/create`
**Créer un nouveau dossier**

**Description :** Créer un nouveau dossier dans un classeur spécifique.

**Payload :**
```json
{
  "name": "Nom du dossier",
  "notebook_id": "uuid-du-classeur",
  "parent_folder_id": "uuid-dossier-parent-optionnel"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ✅ | Nom du dossier (max 255 caractères) |
| `notebook_id` | string | ✅ | ID du classeur parent |
| `parent_folder_id` | string | ❌ | ID du dossier parent (pour sous-dossiers) |

---

### **GET** `/api/v2/folder/{ref}/tree`
**Récupérer l'arborescence d'un dossier**

**Description :** Obtenir la structure complète d'un dossier avec ses sous-dossiers et notes.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "uuid-dossier",
      "name": "Nom du dossier",
      "notebook_id": "uuid-classeur"
    },
    "children": {
      "folders": [
        {
          "id": "uuid-sous-dossier",
          "name": "Sous-dossier",
          "note_count": 5
        }
      ],
      "notes": [
        {
          "id": "uuid-note",
          "source_title": "Titre de la note",
          "slug": "titre-de-la-note"
        }
      ]
    }
  }
}
```

---

### **PUT** `/api/v2/folder/{ref}/update`
**Mettre à jour un dossier**

**Description :** Modifier les informations d'un dossier existant.

**Payload :**
```json
{
  "name": "Nouveau nom du dossier"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ✅ | Nouveau nom du dossier |

---

### **DELETE** `/api/v2/folder/{ref}/delete`
**Supprimer un dossier**

**Description :** Supprimer un dossier et déplacer son contenu au niveau parent.

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Dossier supprimé avec succès",
  "data": {
    "deleted_folder_id": "uuid-dossier",
    "moved_notes_count": 5,
    "moved_folders_count": 2
  }
}
```

---

## 📚 **Gestion des Classeurs (Notebooks)**

### **POST** `/api/v2/classeur/create`
**Créer un nouveau classeur**

**Description :** Créer un nouveau classeur pour organiser vos notes et dossiers.

**Payload :**
```json
{
  "name": "Nom du classeur",
  "description": "Description optionnelle du classeur",
  "is_public": false
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ✅ | Nom du classeur (max 255 caractères) |
| `description` | string | ❌ | Description du classeur |
| `is_public` | boolean | ❌ | Rendre le classeur public (défaut: false) |

---

### **GET** `/api/v2/classeurs`
**Lister tous les classeurs**

**Description :** Obtenir la liste de tous les classeurs de l'utilisateur.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "classeurs": [
      {
        "id": "uuid-classeur",
        "name": "Nom du classeur",
        "slug": "nom-du-classeur",
        "description": "Description du classeur",
        "note_count": 25,
        "folder_count": 8,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total_count": 1
  }
}
```

---

### **GET** `/api/v2/classeur/{ref}/tree`
**Récupérer l'arborescence d'un classeur**

**Description :** Obtenir la structure complète d'un classeur avec tous ses dossiers et notes.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "classeur": {
      "id": "uuid-classeur",
      "name": "Nom du classeur",
      "slug": "nom-du-classeur"
    },
    "structure": {
      "folders": [
        {
          "id": "uuid-dossier",
          "name": "Nom du dossier",
          "children": {
            "notes": [
              {
                "id": "uuid-note",
                "source_title": "Titre de la note",
                "slug": "titre-de-la-note"
              }
            ]
          }
        }
      ],
      "notes": [
        {
          "id": "uuid-note-racine",
          "source_title": "Note racine",
          "slug": "note-racine"
        }
      ]
    }
  }
}
```

---

### **PUT** `/api/v2/classeur/{ref}/update`
**Mettre à jour un classeur**

**Description :** Modifier les informations d'un classeur existant.

**Payload :**
```json
{
  "name": "Nouveau nom du classeur",
  "description": "Nouvelle description",
  "is_public": true
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `name` | string | ❌ | Nouveau nom du classeur |
| `description` | string | ❌ | Nouvelle description |
| `is_public` | boolean | ❌ | Nouveau statut public |

---

### **DELETE** `/api/v2/classeur/{ref}/delete`
**Supprimer un classeur**

**Description :** Supprimer un classeur et tout son contenu (notes et dossiers).

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Classeur supprimé avec succès",
  "data": {
    "deleted_classeur_id": "uuid-classeur",
    "deleted_notes_count": 25,
    "deleted_folders_count": 8
  }
}
```

---

## 🔍 **Recherche et Utilitaires**

### **GET** `/api/v2/search`
**Rechercher dans le contenu**

**Description :** Effectuer une recherche textuelle dans toutes les notes de l'utilisateur.

**Paramètres de requête :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `query` | string | ✅ | Terme de recherche |
| `notebook_id` | string | ❌ | Limiter la recherche à un classeur |
| `folder_id` | string | ❌ | Limiter la recherche à un dossier |
| `limit` | number | ❌ | Nombre maximum de résultats (défaut: 20) |
| `offset` | number | ❌ | Nombre de résultats à ignorer |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "query": "terme recherché",
    "results": [
      {
        "note_id": "uuid-note",
        "source_title": "Titre de la note",
        "slug": "titre-de-la-note",
        "notebook_name": "Nom du classeur",
        "snippet": "...contexte autour du terme recherché...",
        "relevance_score": 0.95
      }
    ],
    "total_count": 1,
    "has_more": false
  }
}
```

---

### **POST** `/api/v2/slug/generate`
**Générer un slug unique**

**Description :** Générer un slug unique basé sur un titre pour éviter les conflits.

**Payload :**
```json
{
  "title": "Titre pour lequel générer un slug",
  "resource_type": "note"
}
```

**Paramètres :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `title` | string | ✅ | Titre pour lequel générer un slug |
| `resource_type` | string | ✅ | Type de ressource (note, folder, classeur) |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "original_title": "Titre original",
    "generated_slug": "titre-original",
    "is_unique": true
  }
}
```

---

### **GET** `/api/v2/me`
**Informations sur l'utilisateur actuel**

**Description :** Récupérer les informations de l'utilisateur authentifié.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-utilisateur",
      "email": "user@example.com",
      "full_name": "Nom Complet",
      "created_at": "2024-01-01T00:00:00Z",
      "last_login": "2024-01-01T12:00:00Z"
    },
    "statistics": {
      "total_notes": 150,
      "total_classeurs": 8,
      "total_folders": 25,
      "storage_used_mb": 45.2
    }
  }
}
```

---

### **GET** `/api/v2/stats`
**Statistiques globales**

**Description :** Obtenir des statistiques globales sur l'utilisation de la plateforme.

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "platform_stats": {
      "total_users": 1250,
      "total_notes": 45600,
      "total_classeurs": 3200,
      "total_folders": 8900
    },
    "user_stats": {
      "total_notes": 150,
      "total_classeurs": 8,
      "total_folders": 25,
      "storage_used_mb": 45.2,
      "storage_limit_mb": 1000
    }
  }
}
```

---

## 🗑️ **Gestion des Ressources Unifiée**

### **DELETE** `/api/v2/delete/{resource}/{ref}`
**Supprimer une ressource**

**Description :** Endpoint unifié pour supprimer n'importe quel type de ressource (note, classeur, dossier, fichier).

**Paramètres de chemin :**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `resource` | string | Type de ressource (note, classeur, folder, file) |
| `ref` | string | ID ou slug de la ressource |

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Ressource supprimée avec succès",
  "data": {
    "resource_type": "note",
    "resource_id": "uuid-ressource",
    "deleted_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 📁 **Gestion des Fichiers**

### **POST** `/api/v2/files/upload`
**Uploader un fichier**

**Description :** Uploader un fichier et l'associer à une note ou un dossier.

**Payload (multipart/form-data) :**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `file` | file | ✅ | Fichier à uploader |
| `note_id` | string | ❌ | ID de la note associée |
| `folder_id` | string | ❌ | ID du dossier associé |
| `description` | string | ❌ | Description du fichier |

**Réponse de succès :**
```json
{
  "success": true,
  "data": {
    "file_id": "uuid-fichier",
    "filename": "document.pdf",
    "size_bytes": 1024000,
    "mime_type": "application/pdf",
    "url": "https://scrivia.app/files/uuid-fichier",
    "uploaded_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### **DELETE** `/api/v2/files/{ref}/delete`
**Supprimer un fichier**

**Description :** Supprimer définitivement un fichier uploadé.

**Réponse de succès :**
```json
{
  "success": true,
  "message": "Fichier supprimé avec succès",
  "data": {
    "deleted_file_id": "uuid-fichier",
    "deleted_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## 🔧 **Gestion des Erreurs**

### **Codes d'erreur courants**

| Code | Message | Description |
|------|---------|-------------|
| `VALIDATION_ERROR` | Erreur de validation des données | Les données envoyées ne respectent pas le schéma attendu |
| `AUTHENTICATION_FAILED` | Échec de l'authentification | Token JWT invalide ou expiré |
| `RESOURCE_NOT_FOUND` | Ressource non trouvée | L'ID ou slug fourni n'existe pas |
| `PERMISSION_DENIED` | Permission refusée | L'utilisateur n'a pas les droits sur cette ressource |
| `RATE_LIMIT_EXCEEDED` | Limite de taux dépassée | Trop de requêtes dans un court laps de temps |

### **Format d'erreur détaillé**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Les données fournies sont invalides",
  "details": [
    "Le champ 'source_title' est requis",
    "Le champ 'notebook_id' doit être un UUID valide"
  ],
  "status": 400,
  "timestamp": "2024-01-01T00:00:00Z",
  "request_id": "req_123456789"
}
```

---

## 📚 **Exemples d'utilisation complets**

### **Créer une note avec contenu complet**
```bash
curl -X POST https://scrivia.app/api/v2/note/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "source_title": "Guide complet de l'API V2",
    "notebook_id": "guides-techniques",
    "markdown_content": "# Guide API V2\n\n## Introduction\n\nCe guide explique comment utiliser l'API V2 d'Abrège...\n\n## Authentification\n\nL'API utilise l'authentification par API Key...",
    "header_image": "https://example.com/api-guide-header.jpg"
  }'
```

### **Récupérer et mettre à jour une note**
```bash
# 1. Récupérer la note
curl -X GET https://scrivia.app/api/v2/note/guide-api-v2 \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY"

# 2. Mettre à jour le contenu
curl -X PUT https://scrivia.app/api/v2/note/guide-api-v2/update \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "markdown_content": "# Guide API V2 - Version 2.0\n\n## Introduction\n\nCe guide a été mis à jour...",
    "header_image": "https://example.com/new-header.jpg"
  }'
```

### **Organiser le contenu avec des dossiers**
```bash
# 1. Créer un dossier
curl -X POST https://scrivia.app/api/v2/folder/create \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "name": "Tutoriels API",
    "notebook_id": "guides-techniques"
  }'

# 2. Déplacer une note dans le dossier
curl -X PUT https://scrivia.app/api/v2/note/guide-api-v2/move \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: llm" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "target_folder_id": "uuid-dossier-tutoriels"
  }'
```

---

## 🚀 **Bonnes pratiques**

### **1. Gestion des erreurs**
- Toujours vérifier le code de statut HTTP
- Traiter les erreurs de validation avec les détails fournis
- Implémenter une logique de retry pour les erreurs temporaires

### **2. Performance**
- Utiliser la pagination pour les listes longues
- Mettre en cache les données statiques
- Éviter de faire des appels inutiles

### **3. Sécurité**
- Ne jamais stocker les tokens JWT côté client
- Valider toutes les données reçues
- Utiliser HTTPS en production

### **4. Monitoring**
- Logger toutes les erreurs importantes
- Surveiller les temps de réponse
- Tracer les requêtes avec des IDs uniques

---

## 📞 **Support et Contact**

### **Documentation additionnelle**
- **Guide de migration** : `MIGRATION-GUIDE.md`
- **Exemples de code** : Voir les exemples ci-dessus
- **Schémas de validation** : Intégrés dans l'API

### **Support technique**
- **Email** : support@scrivia.app
- **Documentation** : https://docs.scrivia.app
- **GitHub** : https://github.com/scrivia/abrege

---

## 📝 **Changelog**

### **Version 2.0.0** (2024-01-01)
- ✅ Architecture API V2 complètement refactorisée
- ✅ Support universel UUID/Slug
- ✅ Validation Zod stricte
- ✅ Gestion d'erreurs robuste
- ✅ Logging détaillé
- ✅ Endpoints unifiés et cohérents

---

*Dernière mise à jour : 2024-01-01*
*Version de l'API : 2.0.0*
