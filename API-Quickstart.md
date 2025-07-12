# Abrège API – Quickstart & Practical Manual

Ce document fournit des exemples concrets pour tester chaque endpoint de l’API Abrège. Pour chaque route : description, méthode, cURL prêt à copier, payload, et exemple de réponse.

---

## 📝 Notes (Articles)

### 1. Créer une note
**POST** `/api/v1/create-note`

**Payload**
```json
{
  "classeur_id": "CLASSEUR_ID",
  "title": "Titre de la note",
  "markdown_content": "# Titre\nContenu...",
  "header_image": "https://url" ,
  "source_type": "markdown",
  "source_url": "/note/uuid"
}
```

**cURL**
```bash
curl -X POST http://localhost:3000/api/v1/create-note \
  -H "Content-Type: application/json" \
  -d '{
    "classeur_id": "CLASSEUR_ID",
    "title": "Titre de la note",
    "markdown_content": "# Titre\nContenu...",
    "header_image": "https://url",
    "source_type": "markdown",
    "source_url": "/note/uuid"
  }'
```

**Réponse**
```json
{
  "success": true,
  "note": { /* ... */ }
}
```

---

### 2. Lire une note
**GET** `/api/v1/note/NOTE_ID`

**cURL**
```bash
curl -X GET http://localhost:3000/api/v1/note/NOTE_ID
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 3. Mettre à jour tout le contenu d’une note (erase)
**POST** `/api/v1/erase-note`

**Payload**
```json
{
  "noteId": "NOTE_ID",
  "title": "Nouveau titre",
  "markdown_content": "# Nouveau contenu",
  "titleAlign": "left"
}
```

**cURL**
```bash
curl -X POST http://localhost:3000/api/v1/erase-note \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "NOTE_ID",
    "title": "Nouveau titre",
    "markdown_content": "# Nouveau contenu",
    "titleAlign": "left"
  }'
```

**Réponse**
```json
{
  "success": true,
  "note": { /* ... */ }
}
```

---

### 4. Mettre à jour uniquement le titre ou l’image
**PATCH** `/api/v1/note/NOTE_ID/meta`

**Payload**
```json
{
  "title": "Nouveau titre",
  "header_image": "https://url"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/note/NOTE_ID/meta \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouveau titre",
    "header_image": "https://url"
  }'
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 5. Supprimer une note
**DELETE** `/api/v1/note/NOTE_ID`

**cURL**
```bash
curl -X DELETE http://localhost:3000/api/v1/note/NOTE_ID
```

**Réponse**
```json
{
  "success": true
}
```

---

### 6. Ajouter du contenu à une note (append)
**PATCH** `/api/v1/note/NOTE_ID/append`

**Payload**
```json
{
  "text": "Contenu à ajouter",
  "position": "end"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/note/NOTE_ID/append \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Contenu à ajouter",
    "position": "end"
  }'
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 7. Ajouter du contenu à une section
**PATCH** `/api/v1/note/NOTE_ID/append-to-section`

**Payload**
```json
{
  "section": "titre ou slug",
  "text": "Contenu à ajouter",
  "position": "end"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/note/NOTE_ID/append-to-section \
  -H "Content-Type: application/json" \
  -d '{
    "section": "titre ou slug",
    "text": "Contenu à ajouter",
    "position": "end"
  }'
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 8. Remplacer ou effacer une section
**PATCH** `/api/v1/note/NOTE_ID/erase-section`

**Payload**
```json
{
  "section": "titre ou slug",
  "content": "" // ou null pour effacer
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/note/NOTE_ID/erase-section \
  -H "Content-Type: application/json" \
  -d '{
    "section": "titre ou slug",
    "content": ""
  }'
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 9. Fusionner plusieurs notes
**POST** `/api/v1/note/merge`

**Payload**
```json
{
  "note_ids": ["id1", "id2", "id3"],
  "order": ["id2", "id1", "id3"]
}
```

**cURL**
```bash
curl -X POST http://localhost:3000/api/v1/note/merge \
  -H "Content-Type: application/json" \
  -d '{
    "note_ids": ["id1", "id2", "id3"],
    "order": ["id2", "id1", "id3"]
  }'
```

**Réponse**
```json
{
  "merged_content": "markdown fusionné",
  "notes": [
    { "id": "id2", "title": "Titre 2" },
    { "id": "id1", "title": "Titre 1" },
    { "id": "id3", "title": "Titre 3" }
  ]
}
```

---

### 10. Déplacer une note
**PATCH** `/api/v1/note/NOTE_ID/move`

**Payload**
```json
{
  "target_classeur_id": "CLASSEUR_ID",
  "target_folder_id": null,
  "position": 0
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/note/NOTE_ID/move \
  -H "Content-Type: application/json" \
  -d '{
    "target_classeur_id": "CLASSEUR_ID",
    "target_folder_id": null,
    "position": 0
  }'
```

**Réponse**
```json
{
  "note": { /* ... */ }
}
```

---

### 11. Lire le markdown brut d’une note
**GET** `/api/v1/note/NOTE_ID/content`

**cURL**
```bash
curl -X GET http://localhost:3000/api/v1/note/NOTE_ID/content
```

**Réponse**
```json
{
  "content": "markdown brut"
}
```

---

### 12. Lire le markdown d’une section
**GET** `/api/v1/note/NOTE_ID/section?section=slug`

**cURL**
```bash
curl -X GET "http://localhost:3000/api/v1/note/NOTE_ID/section?section=slug"
```

**Réponse**
```json
{
  "section": "slug",
  "content": "markdown de la section"
}
```

---

### 13. Lire la table des matières (TOC)
**GET** `/api/v1/note/NOTE_ID/toc`

**cURL**
```bash
curl -X GET http://localhost:3000/api/v1/note/NOTE_ID/toc
```

**Réponse**
```json
{
  "toc": [
    { "level": 1, "title": "Titre principal", "slug": "titre-principal", "line": 1, "start": 3 },
    { "level": 2, "title": "Sous-titre", "slug": "sous-titre", "line": 5, "start": 4 }
  ]
}
```

---

### 14. Lire les métadonnées/statistiques d’une note
**GET** `/api/v1/note/NOTE_ID/metadata`

**cURL**
```bash
curl -X GET http://localhost:3000/api/v1/note/NOTE_ID/metadata
```

**Réponse**
```json
{
  "id": "NOTE_ID",
  "title": "Titre",
  "header_image": "https://url",
  "created_at": "...",
  "updated_at": "...",
  "word_count": 123,
  "char_count": 456,
  "section_count": 5,
  "toc": [ { "title": "Intro", "slug": "intro", "level": 1 } ]
}
```

---

## 📁 Dossiers (Folders)

### Créer un dossier
**POST** `/api/v1/create-folder`
```json
{
  "classeur_id": "CLASSEUR_ID",
  "name": "Nom du dossier",
  "parent_id": null
}
```

**cURL**
```bash
curl -X POST http://localhost:3000/api/v1/create-folder \
  -H "Content-Type: application/json" \
  -d '{
    "classeur_id": "CLASSEUR_ID",
    "name": "Nom du dossier",
    "parent_id": null
  }'
```

**Réponse**
```json
{
  "success": true,
  "folder": { /* ... */ }
}
```

---

### Mettre à jour le nom d’un dossier
**PATCH** `/api/v1/create-folder/FOLDER_ID/meta`
```json
{
  "name": "Nouveau nom"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/create-folder/FOLDER_ID/meta \
  -H "Content-Type: application/json" \
  -d '{ "name": "Nouveau nom" }'
```

**Réponse**
```json
{
  "folder": { /* ... */ }
}
```

---

### Supprimer un dossier
**DELETE** `/api/v1/create-folder` (body)
```json
{ "id": "FOLDER_ID" }
```

**cURL**
```bash
curl -X DELETE http://localhost:3000/api/v1/create-folder \
  -H "Content-Type: application/json" \
  -d '{ "id": "FOLDER_ID" }'
```

**Réponse**
```json
{
  "success": true
}
```

---

### Déplacer un dossier
**PATCH** `/api/v1/folder/FOLDER_ID/move`
```json
{
  "target_classeur_id": "CLASSEUR_ID",
  "target_parent_id": null,
  "position": 0
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/folder/FOLDER_ID/move \
  -H "Content-Type: application/json" \
  -d '{
    "target_classeur_id": "CLASSEUR_ID",
    "target_parent_id": null,
    "position": 0
  }'
```

**Réponse**
```json
{
  "folder": { /* ... */ }
}
```

---

## 📚 Classeurs (Notebooks)

### Créer un classeur
**POST** `/api/v1/create-classeur`
```json
{
  "name": "Nom du classeur",
  "emoji": "📁",
  "color": "#e55a2c",
  "position": 0
}
```

**cURL**
```bash
curl -X POST http://localhost:3000/api/v1/create-classeur \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nom du classeur",
    "emoji": "📁",
    "color": "#e55a2c",
    "position": 0
  }'
```

**Réponse**
```json
{
  "success": true,
  "classeur": { /* ... */ }
}
```

---

### Mettre à jour le nom, l’emoji ou la couleur
**PATCH** `/api/v1/create-classeur/CLASSEUR_ID/meta`
```json
{
  "name": "Nouveau nom",
  "emoji": "📒",
  "color": "#00bfff"
}
```

**cURL**
```bash
curl -X PATCH http://localhost:3000/api/v1/create-classeur/CLASSEUR_ID/meta \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nouveau nom",
    "emoji": "📒",
    "color": "#00bfff"
  }'
```

**Réponse**
```json
{
  "classeur": { /* ... */ }
}
```

---

### Supprimer un classeur
**DELETE** `/api/v1/create-classeur` (body)
```json
{ "id": "CLASSEUR_ID" }
```

**cURL**
```bash
curl -X DELETE http://localhost:3000/api/v1/create-classeur \
  -H "Content-Type: application/json" \
  -d '{ "id": "CLASSEUR_ID" }'
```

**Réponse**
```json
{
  "success": true
}
```

---

### Lire tous les classeurs d’un utilisateur
**GET** `/api/v1/classeurs?user_id=USER_ID`

**cURL**
```bash
curl -X GET "http://localhost:3000/api/v1/classeurs?user_id=USER_ID"
```

**Réponse**
```json
{
  "classeurs": [ /* ... */ ]
}
```

---

### Lire la structure complète d’un classeur
**GET** `/api/v1/classeur/CLASSEUR_ID/full-tree`

**cURL**
```bash
curl -X GET http://localhost:3000/api/v1/classeur/CLASSEUR_ID/full-tree
```

**Réponse**
```json
{
  "classeur": { /* ... */ },
  "folders": [ /* ... */ ],
  "notes": [ /* ... */ ]
}
```

---

**Fin du manuel pratique.** 