# 📚 API Documentation - Scrivia

## 🏗️ Architecture Overview

Scrivia utilise une architecture dual API pour optimiser les performances et la flexibilité :

### **V1 API - Client-side (Interface utilisateur)**
- **Usage** : Folder Manager, interface utilisateur
- **State Management** : Zustand
- **Polling** : Automatique après chaque action
- **Endpoints** : `/api/v1/*`

### **V2 API - LLM-side (Intelligence Artificielle)**
- **Usage** : LLMs (ChatGPT, Claude, etc.)
- **Flexibilité** : Support UUID et slug
- **Monitoring** : Headers spécifiques LLM
- **Endpoints** : `/api/v2/*`

---

## 🤖 V2 API - LLM-Friendly Endpoints

### **Base URL**
```
https://scrivia.app/api/v2
```

### **Headers Requis**
```http
Content-Type: application/json
X-Client-Type: llm
```

### **Authentification**
> **Note** : L'authentification Supabase sera implémentée prochainement. Actuellement, un USER_ID temporaire est utilisé.

---

## 📝 Note Management

### **Créer une note**
```http
POST /api/v2/note/create
```

**Payload :**
```json
{
  "source_title": "Titre de la note",
  "notebook_id": "uuid-du-notebook",
  "markdown_content": "Contenu markdown optionnel",
  "header_image": "url-image-optionnel",
  "folder_id": "uuid-dossier-optionnel",
  "description": "Description optionnelle"
}
```

**Réponse :**
```json
{
  "success": true,
  "note": {
    "id": "uuid-note",
    "source_title": "Titre de la note",
    "slug": "titre-de-la-note"
  },
  "message": "Note créée avec succès"
}
```

### **Mettre à jour une note**
```http
PUT /api/v2/note/{ref}/update
```

**Paramètres :**
- `ref` : UUID ou slug de la note

**Payload :**
```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "Nouveau contenu",
  "description": "Nouvelle description"
}
```

### **Supprimer une note**
```http
DELETE /api/v2/note/{ref}/delete
```

**Paramètres :**
- `ref` : UUID ou slug de la note

### **Déplacer une note**
```http
PUT /api/v2/note/{ref}/move
```

**Payload :**
```json
{
  "folder_id": "uuid-ou-slug-dossier-destination"
}
```

### **Fusionner des notes**
```http
POST /api/v2/note/{ref}/merge
```

**Payload :**
```json
{
  "targetNoteId": "uuid-ou-slug-note-destination",
  "mergeStrategy": "append|prepend|replace"
}
```

### **Ajouter du contenu**
```http
POST /api/v2/note/{ref}/add-content
```

**Payload :**
```json
{
  "content": "Nouveau contenu à ajouter"
}
```

### **Remplacer le contenu**
```http
PUT /api/v2/note/{ref}/content/update
```

**Payload :**
```json
{
  "content": "Nouveau contenu complet"
}
```

### **Publier/Dépublier une note**
```http
POST /api/v2/note/{ref}/publish
```

**Payload :**
```json
{
  "ispublished": true
}
```

### **Récupérer le contenu**
```http
GET /api/v2/note/{ref}/content
```

### **Récupérer les métadonnées**
```http
GET /api/v2/note/{ref}/metadata
```

### **Récupérer les insights**
```http
GET /api/v2/note/{ref}/insights
```

**Réponse :**
```json
{
  "success": true,
  "insight": "Contenu concaténé pour recherche LLM",
  "noteId": "uuid-note",
  "title": "Titre de la note"
}
```

---

## 📁 Folder Management

### **Créer un dossier**
```http
POST /api/v2/folder/create
```

**Payload :**
```json
{
  "name": "Nom du dossier",
  "notebook_id": "uuid-du-notebook",
  "parent_id": "uuid-dossier-parent-optionnel"
}
```

### **Mettre à jour un dossier**
```http
PUT /api/v2/folder/{ref}/update
```

**Payload :**
```json
{
  "name": "Nouveau nom",
  "parent_id": "uuid-nouveau-parent"
}
```

### **Supprimer un dossier**
```http
DELETE /api/v2/folder/{ref}/delete
```

### **Déplacer un dossier**
```http
PUT /api/v2/folder/{ref}/move
```

**Payload :**
```json
{
  "parent_id": "uuid-ou-slug-dossier-parent"
}
```

### **Récupérer l'arborescence**
```http
GET /api/v2/folder/{ref}/tree
```

---

## 📂 Classeur Management

### **Créer un classeur**
```http
POST /api/v2/classeur/create
```

**Payload :**
```json
{
  "name": "Nom du classeur",
  "description": "Description optionnelle",
  "icon": "emoji-optionnel"
}
```

### **Mettre à jour un classeur**
```http
PUT /api/v2/classeur/{ref}/update
```

**Payload :**
```json
{
  "name": "Nouveau nom",
  "description": "Nouvelle description",
  "icon": "nouvel-emoji",
  "position": 2
}
```

### **Supprimer un classeur**
```http
DELETE /api/v2/classeur/{ref}/delete
```

### **Réorganiser les classeurs**
```http
PUT /api/v2/classeur/{ref}/reorder
```

**Payload :**
```json
{
  "classeurs": [
    { "id": "uuid-classeur-1", "position": 1 },
    { "id": "uuid-classeur-2", "position": 2 }
  ]
}
```

### **Récupérer l'arborescence**
```http
GET /api/v2/classeur/{ref}/tree
```

---

## 🔄 Polling System

### **Principe**
- **Single trigger** : 1 action = 1 polling unique
- **Pas de polling permanent** : Économie de ressources
- **Sync immédiate** : Interface mise à jour instantanément

### **Déclenchement automatique**
Chaque endpoint V2 déclenche automatiquement le polling côté client :
- `triggerArticlesPolling('UPDATE'|'DELETE')`
- `triggerFoldersPolling('UPDATE'|'DELETE')`
- `triggerClasseursPolling('UPDATE'|'DELETE')`

---

## 🎯 Exemples d'utilisation

### **Navigation par UUID**
```typescript
await llmApi.getNoteContent('123e4567-e89b-12d3-a456-426614174000');
await llmApi.updateNote('123e4567-e89b-12d3-a456-426614174000', { 
  source_title: 'Nouveau titre' 
});
```

### **Navigation par slug**
```typescript
await llmApi.getNoteContent('ma-note-importante');
await llmApi.updateNote('ma-note-importante', { 
  source_title: 'Nouveau titre' 
});
```

### **Navigation par slug avec numéro**
```typescript
await llmApi.getNoteContent('ma-note-importante-2');
```

### **Déplacer une note vers un dossier**
```typescript
await llmApi.moveNote('ma-note', 'mon-dossier-projets');
```

### **Fusionner des notes**
```typescript
await llmApi.mergeNote('note-source', { 
  targetNoteId: 'note-destination', 
  mergeStrategy: 'append' 
});
```

---

## 🛡️ Validation et Sécurité

### **Validation Zod**
Tous les payloads sont validés avec des schémas Zod :
- Validation des types
- Messages d'erreur en français
- Validation des UUIDs et slugs

### **Gestion d'erreurs**
```json
{
  "error": "Message d'erreur clair",
  "details": ["Détail 1", "Détail 2"]
}
```

### **Status Codes**
- `200` : Succès
- `400` : Erreur de validation
- `404` : Ressource non trouvée
- `500` : Erreur serveur

---

## 📊 Monitoring

### **Headers de monitoring**
```http
X-Client-Type: llm
```

### **Logs détaillés**
Chaque opération est loggée avec :
- Timestamp
- Opération
- Référence (UUID/slug)
- Temps d'exécution
- Statut

---

## 🚀 Service LLM API

### **Import**
```typescript
import { llmApi } from '@/services/llmApi';
```

### **Méthodes disponibles**
```typescript
// Note Management
await llmApi.createNote(noteData);
await llmApi.updateNote(noteRef, updateData);
await llmApi.deleteNote(noteRef);
await llmApi.moveNote(noteRef, targetFolderRef);
await llmApi.mergeNote(sourceNoteRef, mergeData);
await llmApi.addContent(noteRef, content);
await llmApi.updateContent(noteRef, content);
await llmApi.publishNote(noteRef, isPublished);
await llmApi.getNoteContent(noteRef);
await llmApi.getNoteMetadata(noteRef);
await llmApi.getNoteInsights(noteRef);

// Folder Management
await llmApi.createFolder(folderData);
await llmApi.updateFolder(folderRef, updateData);
await llmApi.deleteFolder(folderRef);
await llmApi.moveFolder(folderRef, targetParentRef);
await llmApi.getFolderTree(folderRef);

// Classeur Management
await llmApi.createClasseur(classeurData);
await llmApi.updateClasseur(classeurRef, updateData);
await llmApi.deleteClasseur(classeurRef);
await llmApi.reorderClasseurs(updatedClasseurs);
await llmApi.getClasseurTree(classeurRef);
```

---

## 📈 Performance

### **Optimisations**
- **Résolution UUID/slug** : Cache optimisé
- **Polling single-trigger** : Pas de charge permanente
- **Validation Zod** : Performance optimisée
- **Logging conditionnel** : Debug en dev uniquement

### **Scalabilité**
- **Architecture modulaire** : Séparation V1/V2
- **Monitoring spécifique** : Headers LLM
- **Validation robuste** : Zod sur tous les payloads
- **Gestion d'erreurs** : Messages clairs

---

## 🔧 Configuration

### **Variables d'environnement**
```env
NEXT_PUBLIC_SUPABASE_URL=https://scrivia.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### **Headers requis**
```typescript
headers: {
  'Content-Type': 'application/json',
  'X-Client-Type': 'llm'
}
```

---

## 📝 Notes importantes

1. **Flexibilité maximale** : Tous les endpoints supportent UUID et slug
2. **Polling automatique** : Synchronisation immédiate de l'interface
3. **Validation robuste** : Zod sur tous les payloads
4. **Monitoring spécifique** : Headers LLM pour traçabilité
5. **Performance optimisée** : Single-trigger polling

---

## 🆘 Support

Pour toute question ou problème :
- **Documentation** : Ce fichier
- **Logs** : Console avec contexte détaillé
- **Validation** : Messages d'erreur en français
- **Monitoring** : Headers `X-Client-Type: llm` 