# API V2 Documentation

## 🎯 **Vue d'ensemble**

L'API V2 d'Abrège est conçue pour les interactions LLM avec une interface unifiée et un monitoring spécifique. Elle utilise les mêmes logiques que l'API V1 mais avec une séparation claire via les headers.

## 📋 **Architecture V2**

### **Séparation par Headers :**
```typescript
// API Client (V1)
headers: { 'Content-Type': 'application/json' }

// API LLM (V2)
headers: { 
  'Content-Type': 'application/json',
  'X-Client-Type': 'llm'
}
```

### **Monitoring spécifique :**
- **V1** : `v1_client_note_create`, `v1_editor_add_content`
- **V2** : `v2_llm_note_create`, `v2_llm_add_content`

## 🗂️ **Endpoints V2**

### **Note Management**

#### **POST** `/api/v2/note/create`
**Usage :** Créer une note via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "source_title": "Titre de la note",
  "notebook_id": "notebook-uuid",
  "markdown_content": "Contenu optionnel",
  "header_image": "url-optionnel",
  "folder_id": "folder-uuid-optionnel"
}
```

#### **PUT** `/api/v2/note/[ref]/update`
**Usage :** Mettre à jour une note via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "Nouveau contenu",
  "folder_id": "nouveau-folder-id"
}
```

#### **DELETE** `/api/v2/note/[ref]`
**Usage :** Supprimer une note via LLM
**Logique :** Zustand + Polling

#### **PUT** `/api/v2/note/[ref]/move`
**Usage :** Déplacer une note via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "folder_id": "target-folder-uuid"
}
```

#### **POST** `/api/v2/note/[ref]/merge`
**Usage :** Fusionner des notes via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "targetNoteId": "note-uuid",
  "mergeStrategy": "append" | "prepend" | "replace"
}
```

### **Note Content**

#### **POST** `/api/v2/note/[ref]/add-content`
**Usage :** Ajouter du contenu à une note via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "content": "Nouveau contenu à ajouter"
}
```

#### **POST** `/api/v2/note/[ref]/add-to-section`
**Usage :** Ajouter du contenu à une section spécifique via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "sectionId": "section-uuid",
  "content": "Contenu à ajouter"
}
```

#### **POST** `/api/v2/note/[ref]/clear-section`
**Usage :** Vider une section via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "sectionId": "section-uuid"
}
```

#### **PUT** `/api/v2/note/[ref]/content`
**Usage :** Remplacer le contenu d'une note via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "content": "Nouveau contenu complet"
}
```

#### **POST** `/api/v2/note/[ref]/publish`
**Usage :** Publier une note via LLM
**Logique :** Direct + Polling
**Payload :**
```json
{
  "ispublished": true
}
```

### **Read-only Endpoints**

#### **GET** `/api/v2/note/[ref]/content`
**Usage :** Récupérer le contenu d'une note via LLM
**Réponse :**
```json
{
  "success": true,
  "content": "Contenu markdown",
  "noteId": "note-uuid"
}
```

#### **GET** `/api/v2/note/[ref]/metadata`
**Usage :** Récupérer les métadonnées d'une note via LLM
**Réponse :**
```json
{
  "success": true,
  "metadata": {
    "source_title": "Titre",
    "created_at": "2024-01-30T...",
    "updated_at": "2024-01-30T...",
    "folder_id": "folder-uuid"
  }
}
```

#### **GET** `/api/v2/note/[ref]/insights`
**Usage :** Récupérer les insights d'une note pour recherche LLM
**Réponse :**
```json
{
  "success": true,
  "insight": "Titre - Description - Tags: tag1, tag2 - Slug: note-slug - ID: note-123 - TOC: # Section 1, ## Sous-section 1.1",
  "noteId": "note-uuid",
  "title": "Titre de la note"
}
```

### **Folder Management**

#### **POST** `/api/v2/folder/create`
**Usage :** Créer un dossier via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "name": "Nom du dossier",
  "notebook_id": "notebook-uuid",
  "parent_id": "parent-folder-uuid-optionnel"
}
```

#### **PUT** `/api/v2/folder/[ref]/update`
**Usage :** Mettre à jour un dossier via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "name": "Nouveau nom",
  "parent_id": "nouveau-parent-uuid"
}
```

#### **DELETE** `/api/v2/folder/[ref]`
**Usage :** Supprimer un dossier via LLM
**Logique :** Zustand + Polling

#### **PUT** `/api/v2/folder/[ref]/move`
**Usage :** Déplacer un dossier via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "parent_id": "target-parent-uuid"
}
```

#### **GET** `/api/v2/folder/[ref]/tree`
**Usage :** Récupérer l'arborescence d'un dossier via LLM
**Réponse :**
```json
{
  "success": true,
  "tree": {
    "id": "folder-uuid",
    "name": "Nom du dossier",
    "children": [...]
  }
}
```

### **Classeur Management**

#### **POST** `/api/v2/classeur/create`
**Usage :** Créer un classeur via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "name": "Nom du classeur",
  "description": "Description optionnelle",
  "icon": "icon-optionnel"
}
```

#### **PUT** `/api/v2/classeur/[ref]/update`
**Usage :** Mettre à jour un classeur via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "name": "Nouveau nom",
  "description": "Nouvelle description",
  "icon": "nouvel-icon"
}
```

#### **DELETE** `/api/v2/classeur/[ref]`
**Usage :** Supprimer un classeur via LLM
**Logique :** Zustand + Polling

#### **PUT** `/api/v2/classeur/[ref]/reorder`
**Usage :** Réorganiser les classeurs via LLM
**Logique :** Zustand + Polling
**Payload :**
```json
{
  "classeurs": [
    { "id": "classeur-1", "position": 1 },
    { "id": "classeur-2", "position": 2 }
  ]
}
```

#### **GET** `/api/v2/classeur/[ref]/tree`
**Usage :** Récupérer l'arborescence d'un classeur via LLM
**Réponse :**
```json
{
  "success": true,
  "tree": {
    "id": "classeur-uuid",
    "name": "Nom du classeur",
    "folders": [...],
    "notes": [...]
  }
}
```

## 🔄 **Logique de Polling**

### **Zustand + Polling (Structure) :**
- **Note Management** : create, update, delete, move
- **Folder Management** : create, update, delete, move
- **Classeur Management** : create, update, delete, reorder

### **Direct + Polling (Contenu) :**
- **Note Content** : add-content, add-to-section, clear-section, content, publish, merge

## 📊 **Monitoring V2**

### **Logs spécifiques :**
```typescript
// Chaque endpoint V2 a son log spécifique
logApi('v2_llm_note_create', 'Création note LLM');
logApi('v2_llm_folder_create', 'Création dossier LLM');
logApi('v2_llm_note_add_content', 'Ajout contenu LLM');
```

### **Headers de distinction :**
```typescript
// V1 - Client
headers: { 'Content-Type': 'application/json' }

// V2 - LLM
headers: { 
  'Content-Type': 'application/json',
  'X-Client-Type': 'llm'
}
```

## 🚀 **Utilisation**

### **Service LLMApi :**
```typescript
import { llmApi } from '@/services/llmApi';

// Créer une note
const result = await llmApi.createNote({
  source_title: "Ma note",
  notebook_id: "notebook-uuid"
});

// Ajouter du contenu
await llmApi.addContent("note-uuid", "Nouveau contenu");

// Récupérer les insights
const insights = await llmApi.getNoteInsights("note-uuid");
```

### **Appels directs :**
```typescript
// Créer une note
const response = await fetch('/api/v2/note/create', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Client-Type': 'llm'
  },
  body: JSON.stringify({
    source_title: "Ma note",
    notebook_id: "notebook-uuid"
  })
});
```

## 📝 **Notes importantes**

1. **Séparation claire** : V1 (Client) vs V2 (LLM)
2. **Monitoring spécifique** : Logs distincts pour chaque version
3. **Même logique** : Zustand + Polling vs Direct + Polling
4. **Headers de distinction** : `X-Client-Type: 'llm'` pour V2
5. **Évolution indépendante** : Chaque version peut évoluer séparément

Cette API V2 permet une interaction fluide avec les LLMs tout en maintenant la cohérence avec l'architecture existante. 