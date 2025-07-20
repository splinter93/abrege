# API Quickstart - Abrège (LLM-Friendly)

## 🚀 **Démarrage rapide**

### **Créer un classeur**
```bash
curl -X POST https://api.abrege.com/api/v1/notebook/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Classeur de Travail",
    "emoji": "📚",
    "color": "#3b82f6"
  }'
```

### **Créer un dossier**
```bash
curl -X POST https://api.abrege.com/api/v1/folder/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Dossier Important",
    "classeur_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  }'
```

### **Créer une note**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "Ma Première Note",
    "markdown_content": "# Introduction\n\nCeci est ma première note.",
    "folder_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### **Récupérer une note**
```bash
# Par ID
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/123e4567-e89b-12d3-a456-426614174000

# Par slug
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note
```

### **Ajouter du contenu**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note/add-content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "\n## Nouveau contenu ajouté"
  }'
```

### **Ajouter à une section**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/ma-premiere-note/add-to-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction",
    "text": "\nNouveau contenu dans la section"
  }'
```

### **Récupérer la table des matières**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/note/ma-premiere-note/table-of-contents
```

### **Lister les notebooks**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.abrege.com/api/v1/notebooks
```

## 📱 **Intégration JavaScript**

### **Configuration**
```javascript
const API_BASE = 'https://api.abrege.com/api/v1';
const TOKEN = 'YOUR_SUPABASE_TOKEN';

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};
```

### **Créer un classeur**
```javascript
async function createNotebook() {
  const response = await fetch(`${API_BASE}/notebook/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Mon Classeur de Travail',
      emoji: '📚',
      color: '#3b82f6'
    })
  });
  
  const { notebook } = await response.json();
  return notebook;
}
```

### **Créer un dossier**
```javascript
async function createFolder() {
  const response = await fetch(`${API_BASE}/folder/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Mon Dossier Important',
      classeur_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
    })
  });
  
  const { folder } = await response.json();
  return folder;
}
```

### **Créer une note**
```javascript
async function createNote() {
  const response = await fetch(`${API_BASE}/note/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_title: 'Ma Première Note',
      markdown_content: '# Introduction\n\nCeci est ma première note.',
      folder_id: '550e8400-e29b-41d4-a716-446655440000'
    })
  });
  
  const { note } = await response.json();
  return note;
}
```

### **Ajouter du contenu**
```javascript
async function addContent(noteId) {
  const response = await fetch(`${API_BASE}/note/${noteId}/add-content`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      text: '\n## Nouveau contenu ajouté'
    })
  });
  
  const { note } = await response.json();
  return note;
}
```

### **Lister les notebooks**
```javascript
async function listNotebooks() {
  const response = await fetch(`${API_BASE}/notebooks`, {
    method: 'GET',
    headers
  });
  
  const { notebooks } = await response.json();
  return notebooks;
}
```

### **Exemple complet**
```javascript
async function workflow() {
  // Créer un classeur
  const notebook = await createNotebook();
  console.log('Classeur créé:', notebook);
  
  // Créer un dossier
  const folder = await createFolder();
  console.log('Dossier créé:', folder);
  
  // Créer une note
  const note = await createNote();
  console.log('Note créée:', note);
  
  // Ajouter du contenu
  await addContent(note.id);
  console.log('Contenu ajouté');
}
```

## 🐍 **Intégration Python**

### **Configuration**
```python
import requests

API_BASE = 'https://api.abrege.com/api/v1'
TOKEN = 'YOUR_SUPABASE_TOKEN'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}
```

### **Créer un classeur**
```python
def create_notebook():
    response = requests.post(f'{API_BASE}/notebook/create',
        headers=headers,
        json={
            'name': 'Mon Classeur de Travail',
            'emoji': '📚',
            'color': '#3b82f6'
        }
    )
    return response.json()['notebook']
```

### **Créer un dossier**
```python
def create_folder():
    response = requests.post(f'{API_BASE}/folder/create',
        headers=headers,
        json={
            'name': 'Mon Dossier Important',
            'classeur_id': '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
        }
    )
    return response.json()['folder']
```

### **Créer une note**
```python
def create_note():
    response = requests.post(f'{API_BASE}/note/create',
        headers=headers,
        json={
            'source_title': 'Ma Première Note',
            'markdown_content': '# Introduction\n\nCeci est ma première note.',
            'folder_id': '550e8400-e29b-41d4-a716-446655440000'
        }
    )
    return response.json()['note']
```

### **Ajouter du contenu**
```python
def add_content(note_id):
    response = requests.patch(f'{API_BASE}/note/{note_id}/add-content',
        headers=headers,
        json={
            'text': '\n## Nouveau contenu ajouté'
        }
    )
    return response.json()['note']
```

### **Exemple complet**
```python
def workflow():
    # Créer un classeur
    notebook = create_notebook()
    print('Classeur créé:', notebook)
    
    # Créer un dossier
    folder = create_folder()
    print('Dossier créé:', folder)
    
    # Créer une note
    note = create_note()
    print('Note créée:', note)
    
    # Ajouter du contenu
    add_content(note['id'])
    print('Contenu ajouté')
```

## 🔧 **Endpoints LLM-Friendly**

### **Nouveaux noms d'endpoints**
- `POST /api/v1/note/create` (au lieu de `/create-note`)
- `POST /api/v1/folder/create` (au lieu de `/create-folder`)
- `POST /api/v1/notebook/create` (au lieu de `/create-classeur`)
- `PATCH /api/v1/note/{ref}/add-content` (au lieu de `/append`)
- `PATCH /api/v1/note/{ref}/add-to-section` (au lieu de `/append-to-section`)
- `PATCH /api/v1/note/{ref}/clear-section` (au lieu de `/erase-section`)
- `GET /api/v1/note/{ref}/table-of-contents` (au lieu de `/toc`)
- `GET /api/v1/note/{ref}/information` (au lieu de `/meta`)
- `GET /api/v1/note/{ref}/statistics` (au lieu de `/metadata`)

### **Avantages pour les LLMs**
1. **Noms explicites** : Plus besoin de deviner ce que fait `append` vs `add-content`
2. **Actions claires** : `overwrite` est plus clair que `erase`
3. **Structure cohérente** : Tous les endpoints suivent le même pattern
4. **Moins d'ambiguïté** : Plus de confusion entre `meta` et `metadata`

## 📚 **Documentation complète**

- **[API Documentation](API-DOCUMENTATION.md)** : Documentation complète
- **[OpenAPI Spec](openapi.yaml)** : Spécification technique
- **[Migration Guide](LLM-FRIENDLY-MIGRATION.md)** : Guide de migration

---

**Abrège** - API moderne et LLM-friendly pour la gestion de notes, dossiers et classeurs. 