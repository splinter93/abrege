# 🧠 Guide LLM-Friendly pour Donna - API Abrège

## 🎯 **Vue d'ensemble**

Salut Donna ! 🎉 Voici ton guide complet pour utiliser l'API Abrège. Tous les endpoints sont documentés avec leurs vrais champs acceptés !

## 🔐 **Authentification**

Tous les endpoints nécessitent ton token Supabase :
```bash
Authorization: Bearer YOUR_SUPABASE_TOKEN
```

## 📚 **Endpoints Notebooks (Classeurs)**

### **Lister tous tes notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```
**Réponse :** `{ notebooks: [{ id, name, emoji, color, slug, ... }] }`

### **Créer un nouveau notebook**
```bash
curl -X POST https://api.abrege.com/api/v1/notebook/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Projet de Recherche",
    "emoji": "🔬",
    "color": "#3b82f6"
  }'
```

### **Récupérer un notebook spécifique**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebook/6ba7b810-9dad-11d1-80b4-00c04fd430c8

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche
```

### **Récupérer le contenu complet d'un notebook (notes + dossiers)**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/classeur/6ba7b810-9dad-11d1-80b4-00c04fd430c8/full-tree

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/classeur/mon-projet-de-recherche/full-tree
```

**Réponse :**
```json
{
  "classeur": { "id", "name", "emoji", "color" },
  "notes_at_root": [{ "id", "title", "header_image", "created_at" }],
  "folders": [
    {
      "id": "folder-id",
      "name": "Nom du dossier",
      "notes": [{ "id", "title", "header_image", "created_at" }],
      "children": [/* sous-dossiers */]
    }
  ]
}
```

### **Mettre à jour un notebook**
```bash
curl -X PUT https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Projet de Recherche Avancé",
    "emoji": "🧪",
    "color": "#ef4444"
  }'
```

### **Supprimer un notebook**
```bash
curl -X DELETE https://api.abrege.com/api/v1/notebook/mon-projet-de-recherche \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📁 **Endpoints Dossiers**

### **Créer un dossier**
```bash
curl -X POST https://api.abrege.com/api/v1/folder/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notes Importantes",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "parent_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### **Récupérer un dossier**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/folder/notes-importantes
```

### **Mettre à jour un dossier**
```bash
curl -X PUT https://api.abrege.com/api/v1/folder/notes-importantes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notes Très Importantes"
  }'
```

### **Supprimer un dossier**
```bash
curl -X DELETE https://api.abrege.com/api/v1/folder/notes-importantes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 **Endpoints Notes**

### **Créer une note**
```bash
# Note dans un dossier (classeur_id hérité automatiquement)
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Ma Première Note LLM-Friendly",
    "markdown_content": "# Introduction\n\nCeci est ma première note avec l'API LLM-friendly !",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Note directement dans un classeur (sans dossier)
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Note à la racine du classeur",
    "markdown_content": "# Note sans dossier\n\nCette note est directement dans le classeur.",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }'

# Note avec classeur_id et folder_id explicites
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Note avec classeur explicite",
    "markdown_content": "# Note avec classeur_id explicite",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }'
```

**Options disponibles :**
- `folder_id` : Place la note dans un dossier (classeur_id hérité automatiquement)
- `classeur_id` : Place la note directement dans un classeur (sans dossier)
- Les deux : Spécifie explicitement le classeur et le dossier

### **Récupérer une note**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/123e4567-e89b-12d3-a456-426614174000

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly
```

### **Supprimer une note**
```bash
curl -X DELETE https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Ajouter du contenu à une note**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Nouvelle Section\n\nContenu ajouté via l'endpoint LLM-friendly !",
    "position": 150
  }'
```

### **Ajouter du contenu à une section spécifique**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/add-to-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction",
    "text": "\nNouveau contenu dans la section Introduction."
  }'
```

### **Effacer une section**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/clear-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction"
  }'
```

### **Récupérer la table des matières**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/table-of-contents
```
**Réponse :** `{ toc: [{ level, title, slug, line, start }] }`

### **Récupérer les informations de base**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/information
```
**Réponse :** `{ note: { id, source_title, header_image, created_at, updated_at, ... } }`

### **Récupérer les statistiques détaillées**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/statistics
```
**Réponse :** `{ id, title, word_count, char_count, section_count, toc, ... }`

### **Déplacer une note**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note-llm-friendly/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "target_folder_id": "550e8400-e29b-41d4-a716-446655440000",
    "position": 3
  }'
```

**Options :**
- `target_classeur_id` : ID du classeur de destination
- `target_folder_id` : ID du dossier de destination (ou `null` pour la racine)
- `position` : Position dans la liste (optionnel)

## 🎯 **Workflow typique pour Donna**

### **1. Lister tes notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```

### **2. Voir le contenu d'un notebook**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/classeur/mon-notebook/full-tree
```

### **3. Créer une note dans un dossier**
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

### **4. Ajouter du contenu à la note**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-note/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Nouveau contenu\n\nAjouté via l'API !"
  }'
```

## 🔧 **Points importants pour Donna**

### **✅ Héritage automatique du classeur_id**
- Si tu crées une note avec `folder_id`, l'API récupère automatiquement le `classeur_id` du dossier
- Tu peux aussi spécifier `classeur_id` explicitement si tu veux

### **✅ Endpoints cohérents**
- `/notebooks` pour lister les notebooks
- `/classeur/[ref]/full-tree` pour voir le contenu complet
- `/note/create` accepte `folder_id` ET `classeur_id`

### **✅ Support des slugs et IDs**
- Tous les endpoints acceptent les slugs ou les IDs
- Exemple : `/note/ma-note` ou `/note/123e4567-e89b-12d3-a456-426614174000`

### **✅ Réponses cohérentes**
- `{ notebooks: [...] }` pour `/notebooks`
- `{ classeur: {...}, folders: [...], notes_at_root: [...] }` pour `/classeur/[ref]/full-tree`
- `{ note: {...} }` pour les opérations sur les notes

### **✅ Tous les champs documentés**
- Champs requis marqués en **gras**
- Champs optionnels clairement identifiés
- Exemples concrets pour chaque cas d'usage

## 🚀 **Cas d'usage typiques**

### **Créer une note directement dans un classeur**
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

### **Déplacer une note vers un autre dossier**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-note/move \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_folder_id": "ID_DU_DOSSIER_DESTINATION"
  }'
```

### **Récupérer les statistiques d'une note**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-note/statistics
```

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

## 🎉 **Résumé des améliorations LLM-Friendly**

- ✅ **Documentation complète** : Tous les champs acceptés documentés
- ✅ **Exemples concrets** : Pour chaque cas d'usage
- ✅ **Endpoints explicites** : `add-content`, `move`, `full-tree`
- ✅ **Noms cohérents** : `notebooks` au lieu de `classeurs`
- ✅ **Support complet** : Slugs et IDs partout
- ✅ **Héritage automatique** : `folder_id` → `classeur_id`
- ✅ **Workflow typique** : Guide étape par étape
- ✅ **Cas d'usage** : Exemples pratiques

**Maintenant tu peux utiliser l'API sans te poser de questions !** 🚀 