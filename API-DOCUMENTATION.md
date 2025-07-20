# API Documentation - Abrège (LLM-Friendly)

## 📋 **Vue d'ensemble**

L'API Abrège permet la gestion complète de notes, dossiers et classeurs avec support des slugs pour une meilleure intégration avec les LLMs et le partage d'URLs.

**Base URL :** `https://votre-domaine.com/api/v1`

## 🔐 **Authentification**

Tous les endpoints nécessitent une authentification via Supabase. Incluez votre token dans les headers :

```bash
Authorization: Bearer YOUR_SUPABASE_TOKEN
```

## 📊 **Types de ressources**

| Ressource | ID Format | Slug Format | Description |
|-----------|-----------|-------------|-------------|
| **Notes** | `123e4567-e89b-12d3-a456-426614174000` | `ma-premiere-note` | Articles markdown |
| **Dossiers** | `550e8400-e29b-41d4-a716-446655440000` | `mon-dossier-important` | Conteneurs de notes |
| **Classeurs** | `6ba7b810-9dad-11d1-80b4-00c04fd430c8` | `classeur-de-travail` | Conteneurs de dossiers |

## 📝 **Notes (Articles)**

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

**Exemples :**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/123e4567-e89b-12d3-a456-426614174000

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note
```

### **Créer une note**

```http
POST /api/v1/note/create
```

**Corps :**
```json
{
  "source_title": "Nouvelle note",
  "markdown_content": "# Contenu de la note",
  "folder_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

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

### **Mettre à jour une note**

```http
PUT /api/v1/note/{ref}
```

**Corps :**
```json
{
  "source_title": "Titre modifié",
  "markdown_content": "# Contenu modifié"
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

### **Écraser complètement une note**

```http
POST /api/v1/note/overwrite
```

**Corps :**
```json
{
  "note_id": "123e4567-e89b-12d3-a456-426614174000",
  "source_title": "Nouveau titre",
  "markdown_content": "# Contenu complètement remplacé"
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

### **Mettre à jour les informations**

```http
PATCH /api/v1/note/{ref}/information
```

**Corps :**
```json
{
  "source_title": "Nouveau titre",
  "header_image": "https://example.com/new-image.jpg"
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

## 📁 **Dossiers (Folders)**

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

## 📚 **Classeurs (Notebooks)**

### **Récupérer un classeur**

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

### **Créer un classeur**

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

### **Mettre à jour un classeur**

```http
PUT /api/v1/notebook/{ref}
```

**Corps :**
```json
{
  "name": "Nom modifié",
  "emoji": "📖",
  "color": "#ef4444"
}
```

### **Supprimer un classeur**

```http
DELETE /api/v1/notebook/{ref}
```

### **Lister les notebooks**

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
      "name": "Classeur de Travail",
      "emoji": "📚",
      "color": "#3b82f6",
      "position": 0,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Exemple :**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```

## 🔧 **Utilitaires**

### **Générer un slug**

```http
POST /api/v1/slug/generate
```

**Corps :**
```json
{
  "title": "Mon titre avec caractères spéciaux: éàç!",
  "type": "note",
  "userId": "3223651c-5580-4471-affb-b3f4456bd729"
}
```

**Réponse :**
```json
{
  "slug": "mon-titre-avec-caracteres-speciaux-eac"
}
```

## 🎯 **Exemples d'utilisation pour LLMs**

### **Créer une note avec slug automatique**

```javascript
// 1. Générer le slug
const slugResponse = await fetch('/api/v1/slug/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Guide complet de React',
    type: 'note',
    userId: '3223651c-5580-4471-affb-b3f4456bd729'
  })
});

const { slug } = await slugResponse.json();

// 2. Créer la note
const noteResponse = await fetch('/api/v1/note/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source_title: 'Guide complet de React',
    markdown_content: '# React\n\nGuide complet...',
    folder_id: 'my-folder-id'
  })
});

const { note } = await noteResponse.json();
console.log('Note créée:', note.slug); // "guide-complet-de-react"
```

### **Ajouter du contenu à une section**

```javascript
await fetch('/api/v1/note/guide-complet-de-react/add-to-section', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    section: 'introduction',
    text: '\nCe guide couvre tous les aspects de React.'
  })
});
```

### **Récupérer les statistiques d'une note**

```javascript
const statsResponse = await fetch('/api/v1/note/guide-complet-de-react/statistics');
const stats = await statsResponse.json();
console.log(`Mots: ${stats.word_count}, Caractères: ${stats.char_count}, Sections: ${stats.section_count}`);
```

## 🔄 **Migration des données existantes**

### **Scripts disponibles**

```bash
# Vérifier les colonnes slug
npm run add-slug-columns

# Migrer les données existantes
npm run migrate-slugs

# Tester la génération de slugs
npm run test-slugs

# Tester les endpoints
npm run test-endpoints
```

## 🚀 **Avantages pour les LLMs**

### **✅ Actions claires et directes**
- `add-content` au lieu de `append`
- `add-to-section` au lieu de `append-to-section`
- `overwrite` au lieu de `erase`
- `clear-section` au lieu de `erase-section`

### **✅ Ressources explicites**
- `folder` au lieu de `dossier`
- `notebook` au lieu de `classeur`
- `table-of-contents` au lieu de `toc`
- `information` au lieu de `meta`
- `statistics` au lieu de `metadata`

### **✅ Structure cohérente**
- `/api/v1/note/create` (pas `/api/v1/create-note`)
- `/api/v1/folder/create` (pas `/api/v1/create-folder`)
- `/api/v1/notebook/create` (pas `/api/v1/create-classeur`)

## 📞 **Support**

- **Documentation** : `API-DOCUMENTATION.md`
- **Migration** : `MIGRATION-GUIDE.md`
- **Tests** : `npm run test-endpoints`
- **Logs** : Vérifier les logs de déploiement 