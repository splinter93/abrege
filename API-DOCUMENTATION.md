# API Documentation - Abrège

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
POST /api/v1/create-note
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

### **Ajouter du contenu (append-only)**

```http
PATCH /api/v1/note/{ref}/append
```

**Corps :**
```json
{
  "text": "\n## Nouveau contenu ajouté"
}
```

### **Ajouter à une section spécifique**

```http
PATCH /api/v1/note/{ref}/append-to-section
```

**Corps :**
```json
{
  "section": "introduction",
  "text": "\nNouveau contenu dans la section"
}
```

### **Récupérer la table des matières**

```http
GET /api/v1/note/{ref}/toc
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

## 📁 **Dossiers**

### **Récupérer un dossier**

```http
GET /api/v1/dossier/{ref}
```

**Réponse :**
```json
{
  "dossier": {
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
POST /api/v1/create-folder
```

**Corps :**
```json
{
  "name": "Nouveau dossier",
  "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "parent_id": null
}
```

### **Mettre à jour un dossier**

```http
PUT /api/v1/dossier/{ref}
```

**Corps :**
```json
{
  "name": "Nom modifié"
}
```

### **Supprimer un dossier**

```http
DELETE /api/v1/dossier/{ref}
```

### **Lister les notes d'un dossier**

```http
GET /api/v1/dossier/{ref}/notes
```

**Réponse :**
```json
{
  "notes": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "slug": "ma-premiere-note",
      "source_title": "Ma première note",
      "markdown_content": "# Contenu...",
      "position": 0
    }
  ]
}
```

## 📚 **Classeurs**

### **Récupérer un classeur**

```http
GET /api/v1/classeur/{ref}
```

**Réponse :**
```json
{
  "classeur": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "slug": "classeur-de-travail",
    "name": "Classeur de travail",
    "user_id": "user-uuid",
    "icon": "Folder",
    "color": "#e55a2c",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "position": 0
  }
}
```

### **Créer un classeur**

```http
POST /api/v1/create-classeur
```

**Corps :**
```json
{
  "name": "Nouveau classeur",
  "icon": "Folder",
  "color": "#e55a2c"
}
```

### **Lister tous les classeurs**

```http
GET /api/v1/classeurs?user_id={user_id}
```

**Paramètres :**
- `user_id` (string, requis) : ID de l'utilisateur

**Réponse :**
```json
{
  "classeurs": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "slug": "classeur-de-travail",
      "name": "Classeur de travail",
      "icon": "Folder",
      "color": "#e55a2c",
      "position": 0
    }
  ]
}
```

### **Lister les dossiers d'un classeur**

```http
GET /api/v1/classeur/{ref}/dossiers
```

## 🔧 **Génération de slugs**

### **Générer un slug**

```http
POST /api/v1/slug/generate
```

**Corps :**
```json
{
  "title": "Mon titre avec caractères spéciaux: éàç!",
  "type": "note"
}
```

**Types supportés :**
- `note` : Pour les articles
- `folder` : Pour les dossiers
- `classeur` : Pour les classeurs

**Réponse :**
```json
{
  "slug": "mon-titre-avec-caracteres-speciaux-eac"
}
```

## 📊 **Codes de réponse**

| Code | Description |
|------|-------------|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `404` | Ressource non trouvée |
| `422` | Erreur de validation |
| `500` | Erreur serveur |

## 🔍 **Exemples d'utilisation**

### **Pour les LLMs**

```javascript
// 1. Générer un slug pour une nouvelle note
const slugResponse = await fetch('/api/v1/slug/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Guide complet de React',
    type: 'note'
  })
});

const { slug } = await slugResponse.json();
// slug = "guide-complet-de-react"

// 2. Créer la note avec le slug généré
const noteResponse = await fetch('/api/v1/create-note', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_title: 'Guide complet de React',
    markdown_content: '# React\n\nGuide complet...',
    folder_id: 'my-folder-id'
  })
});

const { note } = await noteResponse.json();
// note.slug = "guide-complet-de-react"
```

### **Pour le partage d'URLs**

```javascript
// URL partageable
const shareableUrl = `https://mon-app.com/note/guide-complet-de-react`;

// Accéder à la note partagée
const note = await fetch('/api/v1/note/guide-complet-de-react', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
```

### **Workflow complet**

```javascript
// 1. Créer un classeur
const classeurResponse = await fetch('/api/v1/create-classeur', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Mon projet',
    icon: 'Folder',
    color: '#e55a2c'
  })
});

const { classeur } = await classeurResponse.json();

// 2. Créer un dossier dans le classeur
const dossierResponse = await fetch('/api/v1/create-folder', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Notes importantes',
    classeur_id: classeur.id
  })
});

const { dossier } = await dossierResponse.json();

// 3. Créer une note dans le dossier
const noteResponse = await fetch('/api/v1/create-note', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    source_title: 'Ma première note',
    markdown_content: '# Bienvenue\n\nContenu de la note...',
    folder_id: dossier.id
  })
});

const { note } = await noteResponse.json();

// 4. Ajouter du contenu à la note
await fetch(`/api/v1/note/${note.id}/append`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: '\n## Nouvelle section\n\nContenu ajouté...'
  })
});
```

## 🔒 **Sécurité et validation**

- **Authentification** : Tous les endpoints nécessitent un token Supabase valide
- **Validation** : Tous les paramètres sont validés avec Zod
- **Unicité** : Les slugs sont uniques par utilisateur et par type
- **Sanitisation** : Les caractères spéciaux sont gérés automatiquement
- **Rétrocompatibilité** : Les IDs continuent de fonctionner

## 📞 **Support**

Pour toute question ou problème :
- **Documentation** : Consultez cette documentation
- **Tests** : Utilisez les scripts de test fournis
- **Logs** : Vérifiez les logs de votre plateforme de déploiement

---

**Abrège API** - Documentation v1.0 