# API Documentation - Support des Slugs

## 🎯 **Vue d'ensemble**

L'API "mon JC" supporte maintenant les **références par ID ou slug** pour tous les endpoints. Cela facilite l'utilisation par les LLMs, le partage d'URLs, et l'intégration avec les assistants.

## 📋 **Types de références supportées**

### **Notes (Articles)**
- **ID** : `123e4567-e89b-12d3-a456-426614174000`
- **Slug** : `ma-premiere-note`, `note-avec-caracteres-speciaux`

### **Dossiers (Folders)**
- **ID** : `550e8400-e29b-41d4-a716-446655440000`
- **Slug** : `mon-dossier-important`, `dossier-de-travail`

### **Classeurs**
- **ID** : `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- **Slug** : `classeur-de-travail`, `mes-notes`

## 🔧 **Endpoints principaux**

### **Notes**

#### `GET /api/v1/note/[ref]`
Récupère une note par ID ou slug.

**Paramètres :**
- `ref` : ID ou slug de la note

**Exemples :**
```bash
# Par ID
GET /api/v1/note/123e4567-e89b-12d3-a456-426614174000

# Par slug
GET /api/v1/note/ma-premiere-note
```

#### `PUT /api/v1/note/[ref]`
Met à jour une note par ID ou slug.

**Corps :**
```json
{
  "source_title": "Nouveau titre",
  "markdown_content": "# Contenu mis à jour"
}
```

#### `DELETE /api/v1/note/[ref]`
Supprime une note par ID ou slug.

### **Création avec slugs**

#### `POST /api/v1/create-note`
Crée une nouvelle note avec génération automatique de slug.

**Corps :**
```json
{
  "source_title": "Ma nouvelle note",
  "markdown_content": "# Contenu de la note",
  "folder_id": "folder-id"
}
```

**Réponse :**
```json
{
  "note": {
    "id": "new-note-id",
    "slug": "ma-nouvelle-note",
    "source_title": "Ma nouvelle note",
    "markdown_content": "# Contenu de la note"
  }
}
```

### **Génération de slugs**

#### `POST /api/v1/slug/generate`
Génère un slug pour un titre donné.

**Corps :**
```json
{
  "title": "Mon titre avec caractères spéciaux: éàç!",
  "type": "note"
}
```

**Réponse :**
```json
{
  "slug": "mon-titre-avec-caracteres-speciaux-eac"
}
```

**Types supportés :**
- `note` : Pour les articles
- `folder` : Pour les dossiers
- `classeur` : Pour les classeurs

## 📁 **Dossiers**

### `GET /api/v1/dossier/[ref]`
### `PUT /api/v1/dossier/[ref]`
### `DELETE /api/v1/dossier/[ref]`

**Exemples :**
```bash
# Par ID
GET /api/v1/dossier/550e8400-e29b-41d4-a716-446655440000

# Par slug
GET /api/v1/dossier/mon-dossier-important
```

## 📚 **Classeurs**

### `GET /api/v1/classeur/[ref]`
### `PUT /api/v1/classeur/[ref]`
### `DELETE /api/v1/classeur/[ref]`

**Exemples :**
```bash
# Par ID
GET /api/v1/classeur/6ba7b810-9dad-11d1-80b4-00c04fd430c8

# Par slug
GET /api/v1/classeur/classeur-de-travail
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

### **Migration SQL**

Exécuter dans Supabase :
```sql
-- Ajouter les colonnes slug
ALTER TABLE articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE classeurs ADD COLUMN IF NOT EXISTS slug TEXT;

-- Créer les index uniques
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug_user_id 
ON articles(slug, user_id) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_slug_user_id 
ON folders(slug, user_id) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_classeurs_slug_user_id 
ON classeurs(slug, user_id) WHERE slug IS NOT NULL;
```

## 🎯 **Exemples d'utilisation**

### **Pour les LLMs**

```javascript
// Générer un slug pour une nouvelle note
const response = await fetch('/api/v1/slug/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Guide complet de React',
    type: 'note'
  })
});

const { slug } = await response.json();
// slug = "guide-complet-de-react"

// Créer la note avec le slug
const noteResponse = await fetch('/api/v1/create-note', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source_title: 'Guide complet de React',
    markdown_content: '# React\n\nGuide complet...',
    folder_id: 'my-folder-id'
  })
});
```

### **Pour le partage d'URLs**

```javascript
// Accéder à une note par slug
const note = await fetch('/api/v1/note/guide-complet-de-react');
const noteData = await note.json();

// URL partageable
const shareableUrl = `https://mon-app.com/note/guide-complet-de-react`;
```

## 🔒 **Sécurité et validation**

- **Unicité** : Les slugs sont uniques par utilisateur et par type
- **Validation** : Tous les paramètres sont validés avec Zod
- **Sanitisation** : Les caractères spéciaux sont gérés automatiquement
- **Fallback** : En cas de collision, un suffixe numérique est ajouté

## 🚀 **Déploiement**

1. **Exécuter la migration SQL** dans Supabase
2. **Lancer la migration des données** : `npm run migrate-slugs`
3. **Tester les endpoints** : `npm run test-endpoints`
4. **Déployer** : `npm run build && npm run start`

## 📞 **Support**

Pour toute question ou problème :
- Vérifier les logs : `npm run test-endpoints`
- Consulter la documentation des erreurs
- Tester avec les scripts fournis 