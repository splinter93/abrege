# Abrège API – Documentation de Référence

---

## Table of Contents
- [📝 Notes](#notes)
  - [Créer une note](#créer-une-note)
  - [Déplacer une note](#déplacer-une-note)
  - [Récupérer une note](#récupérer-une-note)
- [📁 Dossiers](#dossiers)
  - [Créer un dossier](#créer-un-dossier)
  - [Déplacer un dossier](#déplacer-un-dossier)
  - [Récupérer un dossier](#récupérer-un-dossier)
  - [Mettre à jour un dossier](#mettre-à-jour-un-dossier)
  - [Supprimer un dossier](#supprimer-un-dossier)
- [📒 Notebooks](#notebooks)
  - [Créer un notebook](#créer-un-notebook)
  - [Récupérer un notebook](#récupérer-un-notebook)
  - [Mettre à jour un notebook](#mettre-à-jour-un-notebook)
  - [Supprimer un notebook](#supprimer-un-notebook)
- [🛠️ Utilitaires](#utilitaires)
  - [Générer un slug](#générer-un-slug)

---

> **Tous les endpoints nécessitent un Bearer token (JWT) dans l’en-tête `Authorization`.**
> Toutes les ressources (notes, dossiers, notebooks) peuvent être référencées par **slug ou UUID** partout (URL et body).
> Toutes les réponses sont en JSON, avec une propriété racine claire (`note`, `folder`, `notebook`, etc.).

---

## 📝 Notes

---

### Créer une note

**Nom & Description**  
Créer une note dans un notebook (classeur), éventuellement dans un dossier.

**Méthode HTTP** : `POST`

**URL complète** : `/api/v1/note/create`

**Paramètres** : Aucun

**Corps de la requête (body)** :

| Champ            | Type         | Requis | Description                                         |
|------------------|--------------|--------|-----------------------------------------------------|
| `source_title`   | string       | oui    | Titre de la note                                    |
| `markdown_content`| string      | oui    | Contenu markdown                                    |
| `folder_id`      | string/null  | non    | ID/slug du dossier, ou null/""/"null" pour racine    |
| `notebook_id`    | string       | oui    | ID ou slug du notebook (classeur)                   |

**Exemple de requête JSON** :
```json
{
  "source_title": "My note",
  "markdown_content": "# Hello",
  "folder_id": null,
  "notebook_id": "ai"
}
```

**Réponse attendue** :
```json
{
  "note": {
    "id": "123",
    "slug": "my-note",
    "source_title": "My note",
    "markdown_content": "# Hello",
    "folder_id": null,
    "classeur_id": "ai",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Codes de réponse HTTP** :
- `201` : Note créée avec succès
- `400` : Paramètre manquant ou invalide
- `401` : Authentification requise
- `422` : Erreur de validation (ex: markdown vide)
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si `notebook_id` absent ou invalide → 400/422
> - Si `folder_id` non trouvé → 404
> - Si le Content-Type n’est pas `application/json`, le backend peut renvoyer une erreur ou du HTML (rare)
> - Si le champ est absent, il n’est pas modifié (jamais racine par défaut)

> **Remarques / Conseils d’intégration**
> - Toujours envoyer un `folder_id` explicite pour la racine (`null`, `""` ou `"null"`)
> - Les slugs sont acceptés partout (plus simple pour les LLM)
> - Réponse toujours JSON, jamais HTML sauf bug critique

---

### Déplacer une note

**Nom & Description**  
Déplacer une note dans un autre notebook et/ou dossier, ou à la racine.

**Méthode HTTP** : `PATCH`

**URL complète** : `/api/v1/note/{ref}/move`

**Paramètres** :
| Nom   | Type   | Où     | Description                  |
|-------|--------|--------|------------------------------|
| `ref` | string | path   | ID ou slug de la note à déplacer |

**Corps de la requête (body)** :
| Champ                | Type         | Requis | Description                                         |
|----------------------|--------------|--------|-----------------------------------------------------|
| `target_classeur_id` | string       | non    | ID ou slug du notebook cible                        |
| `target_folder_id`   | string/null  | non    | ID/slug du dossier cible, ou null/""/"null" pour racine |
| `position`           | number       | non    | Position dans le dossier cible                      |

**Exemples de requête JSON** :
- Déplacer dans un dossier :
```json
{
  "target_classeur_id": "ai",
  "target_folder_id": "my-folder"
}
```
- Déplacer à la racine :
```json
{
  "target_classeur_id": "ai",
  "target_folder_id": null
}
```

**Réponse attendue** :
```json
{
  "note": {
    "id": "...",
    "folder_id": null,
    "classeur_id": "ai"
  }
}
```

**Codes de réponse HTTP** :
- `200` : Note déplacée
- `404` : Note, notebook ou dossier cible non trouvé
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si `target_folder_id` absent → le champ n’est pas modifié (la note reste dans son dossier)
> - Pour la racine, il faut explicitement envoyer `null`, `""` ou `"null"`
> - Si le backend bug, il peut renvoyer du HTML (rare, bug critique)

> **Remarques / Conseils d’intégration**
> - Toujours inclure `target_folder_id` pour la racine
> - Slugs et IDs acceptés partout
> - Réponse toujours JSON

---

### Récupérer une note

**Nom & Description**  
Retourne les infos d’une note par ID ou slug.

**Méthode HTTP** : `GET`

**URL complète** : `/api/v1/note/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug de la note        |

**Corps de la requête (body)** : Aucun

**Exemple de requête JSON** : N/A

**Réponse attendue** :
```json
{
  "note": { ... }
}
```

**Codes de réponse HTTP** :
- `200` : OK
- `404` : Note non trouvée
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si le ref est invalide, 404 ou 422
> - Si le backend bug, peut renvoyer du HTML

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

### Publier ou dépublier une note

**Nom & Description**  
Permet d’activer ou désactiver la publication publique d’une note (partage via URL).

**Méthode HTTP** : `PATCH`

**URL complète** : `/api/v1/note/publish`

**Corps de la requête (body)** :

| Champ         | Type    | Requis | Description                                 |
|--------------|---------|--------|---------------------------------------------|
| `ref`        | string  | oui    | ID ou slug de la note à publier/dépublier   |
| `isPublished`| boolean | oui    | true pour publier, false pour dépublier     |

**Réponse (200)** :
```json
{
  "success": true,
  "url": "https://abrege93.vercel.app/@username/shared/note-slug"
}
```
- `url` est présent uniquement si la note est publiée (`isPublished: true`).

**Réponse (erreur)** :
```json
{
  "error": "Message d’erreur explicite."
}
```

---

## 📁 Dossiers

---

### Créer un dossier

**Nom & Description**  
Créer un dossier dans un notebook (classeur), éventuellement dans un dossier parent.

**Méthode HTTP** : `POST`

**URL complète** : `/api/v1/folder/create`

**Paramètres** : Aucun

**Corps de la requête (body)** :
| Champ         | Type         | Requis | Description                                         |
|--------------|--------------|--------|-----------------------------------------------------|
| `name`       | string       | oui    | Nom du dossier                                      |
| `notebook_id`| string       | oui    | ID ou slug du notebook (classeur)                   |
| `parent_id`  | string/null  | non    | ID/slug du dossier parent, ou null/""/"null" pour racine |

**Exemple de requête JSON** :
```json
{
  "name": "My folder",
  "notebook_id": "ai",
  "parent_id": null
}
```

**Réponse attendue** :
```json
{
  "folder": {
    "id": "...",
    "slug": "my-folder",
    "name": "My folder",
    "parent_id": null,
    "classeur_id": "ai",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Codes de réponse HTTP** :
- `201` : Dossier créé
- `400` : Paramètre manquant ou invalide
- `401` : Authentification requise
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si `notebook_id` absent ou invalide → 400/422
> - Si `parent_id` non trouvé → 404
> - Pour la racine, il faut explicitement envoyer `null`, `""` ou `"null"`

> **Remarques / Conseils d’intégration**
> - Slugs acceptés partout
> - Réponse toujours JSON

---

### Déplacer un dossier

**Nom & Description**  
Déplacer un dossier dans un autre notebook et/ou dossier parent, ou à la racine.

**Méthode HTTP** : `PATCH`

**URL complète** : `/api/v1/dossier/{ref}/move`

**Paramètres** :
| Nom   | Type   | Où     | Description                  |
|-------|--------|--------|------------------------------|
| `ref` | string | path   | ID ou slug du dossier à déplacer |

**Corps de la requête (body)** :
| Champ                | Type         | Requis | Description                                         |
|----------------------|--------------|--------|-----------------------------------------------------|
| `target_classeur_id` | string       | non    | ID ou slug du notebook cible                        |
| `target_parent_id`   | string/null  | non    | ID/slug du dossier parent, ou null/""/"null" pour racine |
| `position`           | number       | non    | Position dans le dossier parent                     |

**Exemples de requête JSON** :
- Déplacer dans un dossier parent :
```json
{
  "target_classeur_id": "ai",
  "target_parent_id": "parent-folder"
}
```
- Déplacer à la racine :
```json
{
  "target_classeur_id": "ai",
  "target_parent_id": null
}
```

**Réponse attendue** :
```json
{
  "folder": {
    "id": "...",
    "parent_id": null,
    "classeur_id": "ai"
  }
}
```

**Codes de réponse HTTP** :
- `200` : Dossier déplacé
- `404` : Dossier, notebook ou parent cible non trouvé
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si `target_parent_id` absent → le champ n’est pas modifié (le dossier reste dans son parent)
> - Pour la racine, il faut explicitement envoyer `null`, `""` ou `"null"`

> **Remarques / Conseils d’intégration**
> - Toujours inclure `target_parent_id` pour la racine
> - Slugs et IDs acceptés partout
> - Réponse toujours JSON

---

### Récupérer un dossier

**Nom & Description**  
Retourne les infos d’un dossier par ID ou slug.

**Méthode HTTP** : `GET`

**URL complète** : `/api/v1/folder/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du dossier        |

**Corps de la requête (body)** : Aucun

**Exemple de requête JSON** : N/A

**Réponse attendue** :
```json
{
  "folder": { ... }
}
```

**Codes de réponse HTTP** :
- `200` : OK
- `404` : Dossier non trouvé
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si le ref est invalide, 404 ou 422

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

### Mettre à jour un dossier

**Nom & Description**  
Met à jour le nom d’un dossier.

**Méthode HTTP** : `PUT`

**URL complète** : `/api/v1/folder/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du dossier        |

**Corps de la requête (body)** :
| Champ | Type   | Requis | Description |
|-------|--------|--------|-------------|
| `name`| string | oui    | Nouveau nom |

**Exemple de requête JSON** :
```json
{
  "name": "Updated folder"
}
```

**Réponse attendue** :
```json
{
  "folder": { ... }
}
```

**Codes de réponse HTTP** :
- `200` : Dossier mis à jour
- `404` : Dossier non trouvé
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

### Supprimer un dossier

**Nom & Description**  
Supprime un dossier par ID ou slug.

**Méthode HTTP** : `DELETE`

**URL complète** : `/api/v1/folder/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du dossier        |

**Corps de la requête (body)** : Aucun

**Exemple de requête JSON** : N/A

**Réponse attendue** :
```json
{
  "success": true
}
```

**Codes de réponse HTTP** :
- `200` : Dossier supprimé
- `404` : Dossier non trouvé
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

## 📒 Notebooks

---

### Créer un notebook

**Nom & Description**  
Créer un nouveau notebook (classeur).

**Méthode HTTP** : `POST`

**URL complète** : `/api/v1/notebook/create`

**Paramètres** : Aucun

**Corps de la requête (body)** :
| Champ   | Type   | Requis | Description |
|---------|--------|--------|-------------|
| `name`  | string | oui    | Nom du notebook |
| `emoji` | string | oui    | Emoji unicode (ex: "📒") |

**Exemple de requête JSON** :
```json
{
  "name": "My notebook",
  "emoji": "📒"
}
```

**Réponse attendue** :
```json
{
  "notebook": {
    "id": "...",
    "slug": "my-notebook",
    "name": "My notebook",
    "emoji": "📒",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Codes de réponse HTTP** :
- `201` : Notebook créé
- `400` : Paramètre manquant ou invalide
- `401` : Authentification requise
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - L'emoji est un caractère unicode (ex: "📒"), pas un nom d'icône React.
> - Le champ `color` n'est plus utilisé.
> - Slug généré automatiquement
> - Réponse toujours JSON

---

### Récupérer un notebook

**Nom & Description**  
Retourne les infos d’un notebook par ID ou slug.

**Méthode HTTP** : `GET`

**URL complète** : `/api/v1/notebook/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du notebook       |

**Corps de la requête (body)** : Aucun

**Exemple de requête JSON** : N/A

**Réponse attendue** :
```json
{
  "notebook": { ... }
}
```

**Codes de réponse HTTP** :
- `200` : OK
- `404` : Notebook non trouvé
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

### Mettre à jour un notebook

**Nom & Description**  
Met à jour le nom, l’emoji ou la couleur d’un notebook.

**Méthode HTTP** : `PUT`

**URL complète** : `/api/v1/notebook/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du notebook       |

**Corps de la requête (body)** :
| Champ   | Type   | Requis | Description |
|---------|--------|--------|-------------|
| `name`  | string | non    | Nouveau nom |
| `emoji` | string | non    | Nouvel emoji |
| `color` | string | non    | Nouvelle couleur hex |

**Exemple de requête JSON** :
```json
{
  "name": "Updated name",
  "emoji": "🧠",
  "color": "#ffcc00"
}
```

**Réponse attendue** :
```json
{
  "notebook": { ... }
}
```

**Codes de réponse HTTP** :
- `200` : Notebook mis à jour
- `404` : Notebook non trouvé
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

### Supprimer un notebook

**Nom & Description**  
Supprime un notebook par ID ou slug.

**Méthode HTTP** : `DELETE`

**URL complète** : `/api/v1/notebook/{ref}`

**Paramètres** :
| Nom   | Type   | Où   | Description                  |
|-------|--------|------|------------------------------|
| `ref` | string | path | ID ou slug du notebook       |

**Corps de la requête (body)** : Aucun

**Exemple de requête JSON** : N/A

**Réponse attendue** :
```json
{
  "success": true
}
```

**Codes de réponse HTTP** :
- `200` : Notebook supprimé
- `404` : Notebook non trouvé
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Slug ou ID accepté
> - Réponse toujours JSON

---

## 🛠️ Utilitaires

---

### Générer un slug

**Nom & Description**  
Génère un slug unique pour une note, un dossier ou un notebook.

**Méthode HTTP** : `POST`

**URL complète** : `/api/v1/slug/generate`

**Paramètres** : Aucun

**Corps de la requête (body)** :
| Champ   | Type   | Requis | Description |
|---------|--------|--------|-------------|
| `title` | string | oui    | Titre à slugifier |
| `type`  | string | oui    | "note", "folder" ou "notebook" |
| `userId`| string | oui    | ID utilisateur |

**Exemple de requête JSON** :
```json
{
  "title": "My note",
  "type": "note",
  "userId": "..."
}
```

**Réponse attendue** :
```json
{
  "slug": "my-note"
}
```

**Codes de réponse HTTP** :
- `200` : Slug généré
- `400` : Paramètre manquant ou invalide
- `422` : Erreur de validation
- `500` : Erreur serveur

> **Remarques / Conseils d’intégration**
> - Le slug est unique par utilisateur/type
> - Réponse toujours JSON 

---

### Fusionner des notes

**Nom & Description**  
Fusionne plusieurs notes en une seule, soit en prévisualisation (sans création), soit en créant une nouvelle note fusionnée dans un notebook/dossier cible.

**Méthode HTTP** : `POST`

**URL complète** : `/api/v1/note/merge`

**Paramètres** : Aucun

**Corps de la requête (body)** :
| Champ         | Type           | Requis | Description                                                                 |
|---------------|----------------|--------|-----------------------------------------------------------------------------|
| `note_ids`    | string[]       | oui    | Tableau d'IDs/slugs de notes à fusionner (au moins 2)                       |
| `order`       | string[]       | non    | Ordre d'assemblage (mêmes valeurs que note_ids, optionnel)                  |
| `create_new`  | boolean        | non    | Si true, crée une nouvelle note fusionnée (sinon, preview uniquement)       |
| `title`       | string         | non    | Titre de la note fusionnée (défaut : "Fusion de X notes")                  |
| `classeur_id` | string         | oui*   | ID/slug du notebook cible (obligatoire si create_new: true)                 |
| `notebook_id` | string         | oui*   | Alias LLM-friendly pour classeur_id (slug ou id, prioritaire sur classeur_id)|
| `folder_id`   | string         | non    | ID/slug du dossier cible (optionnel)                                        |

> *Obligatoire si `create_new: true` (sinon ignoré)

**Exemples de requête JSON** :
- **Prévisualisation (fusion temporaire, pas de création)**
```json
{
  "note_ids": ["id1", "id2"],
  "order": ["id2", "id1"]
}
```
- **Création d'une note fusionnée**
```json
{
  "note_ids": ["id1", "id2"],
  "notebook_id": "demo",
  "title": "Fusion finale",
  "create_new": true
}
```

**Réponses attendues** :
- **Prévisualisation (pas de création)**
```json
{
  "merged_content": "Contenu markdown fusionné...",
  "notes": [
    { "id": "id1", "title": "Note 1" },
    { "id": "id2", "title": "Note 2" }
  ]
}
```
- **Création réelle**
```json
{
  "created_note": {
    "id": "...",
    "source_title": "Fusion finale",
    "markdown_content": "Contenu markdown fusionné...",
    "folder_id": null,
    "classeur_id": "demo",
    "created_at": "..."
  },
  "merged_from": [
    { "id": "id1", "title": "Note 1" },
    { "id": "id2", "title": "Note 2" }
  ]
}
```

**Codes de réponse HTTP** :
- `200` : Fusion temporaire réussie (pas de création)
- `201` : Note fusionnée créée
- `404` : Une des notes source est introuvable
- `422` : Payload invalide, ou notebook/classeur_id absent si create_new
- `500` : Erreur serveur

> **Erreurs connues / pièges**
> - Si `create_new: true` sans notebook/classeur_id → 422
> - Si une note source est introuvable → 404
> - Si le Content-Type n’est pas `application/json`, le backend peut renvoyer une erreur ou du HTML (rare)

> **Remarques / Conseils d’intégration**
> - Utilise `create_new: true` pour créer la note fusionnée, sinon tu n’auras qu’un aperçu temporaire.
> - Tu peux passer des slugs ou des IDs pour toutes les références (notes, notebook, dossier).
> - Le champ `order` permet de choisir l’ordre d’assemblage (sinon, l’ordre de note_ids est utilisé).
> - La note fusionnée sera visible dans le notebook/dossier cible si et seulement si `create_new: true`.
> - Réponse toujours JSON, jamais HTML sauf bug critique. 