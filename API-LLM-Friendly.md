# API LLM-Friendly - Abrège

## 🧠 **Conception pour les LLMs**

L'API Abrège a été conçue spécifiquement pour être **LLM-friendly** avec des noms d'endpoints explicites et une structure cohérente.

## 📋 **Principes de design**

### **1. Noms explicites**
- **Explicit endpoints, separated for each action (CRUD, add-content, overwrite, move, merge, information, table-of-contents, etc.)**
- **No abbreviations** - `add-content` instead of `append`
- **Clear intentions** - `overwrite` instead of `erase`
- **Natural language** - `table-of-contents` instead of `toc`

### **2. Structure cohérente**
- **Resource-based URLs** - `/note/{ref}/action`
- **Consistent patterns** - All endpoints follow the same structure
- **Predictable naming** - Easy to guess endpoint names

### **3. LLM-Optimized**
- **Self-documenting** - Endpoint names explain what they do
- **No ambiguity** - Clear distinction between similar actions
- **Intuitive** - Natural language for AI understanding

## 🎯 **Endpoints principaux**

### **Notes (Articles)**

#### Create note
- **POST** `/api/v1/note/create/`
- **Payload**: `{ source_title, markdown_content, folder_id?, classeur_id? }`
- **Response**: `{ note: { id, slug, source_title, markdown_content, ... } }`

#### Read note
- **GET** `/api/v1/note/{ref}/`
- **Response**: `{ note: { id, slug, source_title, markdown_content, ... } }`

#### Update note
- **PUT** `/api/v1/note/{ref}/`
- **Payload**: `{ source_title?, markdown_content? }`
- **Response**: `{ note: { ... } }`

#### Delete note
- **DELETE** `/api/v1/note/{ref}/`
- **Response**: `{ success: true }`

#### Overwrite note completely
- **POST** `/api/v1/note/overwrite/`
- **Payload**: `{ note_id, source_title, markdown_content }`
- **Response**: `{ note: { ... } }`

#### Add content
- **PATCH** `/api/v1/note/{ref}/add-content/`
- **Payload**: `{ text, position? }`
- **Response**: `{ note: { ... } }`

#### Add to a section
- **PATCH** `/api/v1/note/{ref}/add-to-section/`
- **Payload**: `{ section, text }`
- **Response**: `{ note: { ... } }`

#### Clear a section
- **PATCH** `/api/v1/note/{ref}/clear-section/`
- **Payload**: `{ section }`
- **Response**: `{ note: { ... } }`

#### Update information
- **PATCH** `/api/v1/note/{ref}/information/`
- **Payload**: `{ source_title?, header_image? }`
- **Response**: `{ note: { ... } }`

#### Read table of contents
- **GET** `/api/v1/note/{ref}/table-of-contents/`
- **Response**: `{ toc: [ { level: number, title: string, slug: string } ] }`

#### Read statistics
- **GET** `/api/v1/note/{ref}/statistics/`
- **Response**: `{ id, title, word_count, char_count, section_count, toc, ... }`

#### Move note
- **PATCH** `/api/v1/note/{ref}/move/`
- **Payload**: `{ target_classeur_id?, target_folder_id?, position? }`
- **Response**: `{ note: { ... } }`

#### Merge notes
- **POST** `/api/v1/note/merge/`
- **Payload**: `{ note_ids: string[], order?: string[], create_new?: boolean, title?: string }`
- **Response**: `{ merged_content, notes }` or `{ created_note, merged_from }`

### **Folders (Dossiers)**

#### Create folder
- **POST** `/api/v1/folder/create/`
- **Payload**: `{ name, classeur_id, parent_id? }`
- **Response**: `{ folder: { id, slug, name, ... } }`

#### Read folder
- **GET** `/api/v1/folder/{ref}/`
- **Response**: `{ folder: { id, slug, name, ... } }`

#### Update folder
- **PUT** `/api/v1/folder/{ref}/`
- **Payload**: `{ name }`
- **Response**: `{ folder: { ... } }`

#### Delete folder
- **DELETE** `/api/v1/folder/{ref}/`
- **Response**: `{ success: true }`

#### Move folder
- **PATCH** `/api/v1/dossier/{ref}/move/`
- **Payload**: `{ target_classeur_id?, target_parent_id?, position? }`
- **Response**: `{ dossier: { ... } }`

#### Get folder tree
- **GET** `/api/v1/dossier/{ref}/tree/`
- **Response**: `{ folder, notes_at_root, folders }`

#### Get folder notes
- **GET** `/api/v1/dossier/{ref}/notes/`
- **Response**: `{ notes: [...] }`

### **Notebooks (Classeurs)**

#### Create notebook
- **POST** `/api/v1/notebook/create/`
- **Payload**: `{ name, emoji?, color? }`
- **Response**: `{ notebook: { id, slug, name, ... } }`

#### Read notebook
- **GET** `/api/v1/notebook/{ref}/`
- **Response**: `{ notebook: { id, slug, name, ... } }`

#### Update notebook
- **PUT** `/api/v1/notebook/{ref}/`
- **Payload**: `{ name, emoji?, color? }`
- **Response**: `{ notebook: { ... } }`

#### Delete notebook
- **DELETE** `/api/v1/notebook/{ref}/`
- **Response**: `{ success: true }`

#### Get notebook tree
- **GET** `/api/v1/classeur/{ref}/tree/`
- **Response**: `{ classeur, notes_at_root, folders }`

#### Get notebook full tree
- **GET** `/api/v1/classeur/{ref}/full-tree/`
- **Response**: `{ classeur, notes, folders }`

#### Get notebook folders
- **GET** `/api/v1/classeur/{ref}/dossiers/`
- **Response**: `{ dossiers: [...] }`

### **Utilities**

#### Generate slug
- **POST** `/api/v1/slug/generate/`
- **Payload**: `{ title, type, userId }`
- **Response**: `{ slug }`

#### List all notebooks
- **GET** `/api/v1/classeurs/`
- **Response**: `{ classeurs: [...] }`

## 🔄 **Migration from old endpoints**

### **Old → New mapping**
- `POST /api/v1/create-note` → `POST /api/v1/note/create`
- `POST /api/v1/erase-note` → `POST /api/v1/note/overwrite`
- `PATCH /api/v1/note/{ref}/append` → `PATCH /api/v1/note/{ref}/add-content`
- `PATCH /api/v1/note/{ref}/append-to-section` → `PATCH /api/v1/note/{ref}/add-to-section`
- `PATCH /api/v1/note/{ref}/erase-section` → `PATCH /api/v1/note/{ref}/clear-section`
- `GET /api/v1/note/{ref}/toc` → `GET /api/v1/note/{ref}/table-of-contents`
- `GET /api/v1/note/{ref}/meta` → `GET /api/v1/note/{ref}/information`
- `GET /api/v1/note/{ref}/metadata` → `GET /api/v1/note/{ref}/statistics`
- `POST /api/v1/create-folder` → `POST /api/v1/folder/create`
- `POST /api/v1/create-classeur` → `POST /api/v1/notebook/create`

## 💡 **Usage examples**

### **Create and populate a note**
```bash
curl -X POST https://api.abrege.com/api/v1/note/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_title": "My First Note",
    "markdown_content": "# Introduction\n\nThis is my first note."
  }'
```

### **Add content to a section**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/NOTE_ID/add-to-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction",
    "text": "\nNew content in the section"
  }'
```

### **Clear a section**
```bash
curl -X PATCH https://api.abrege.com/api/v1/note/NOTE_ID/clear-section \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "introduction"
  }'
```

## 🎯 **LLM Integration Patterns**

### **1. Content Management**
- Use `add-content` for general content addition
- Use `add-to-section` for targeted content placement
- Use `clear-section` for content removal
- Use `overwrite` for complete content replacement

### **2. Information Retrieval**
- Use `information` for basic note metadata
- Use `statistics` for detailed analytics
- Use `table-of-contents` for structure analysis
- Use `content` for raw markdown content

### **3. Organization**
- Use `move` for repositioning resources
- Use `merge` for combining multiple notes
- Use tree endpoints for hierarchical exploration

### **4. Resource Types**
- **note**: Individual articles with markdown content
- **folder**: Containers for organizing notes
- **notebook**: Top-level containers for folders and notes

### **5. Reference Formats**
- **UUID**: `123e4567-e89b-12d3-a456-426614174000`
- **Slug**: `my-first-note` (auto-generated from title)
- **Both formats supported** in all endpoints

## 🔧 **Best Practices for LLMs**

### **1. Use explicit endpoints**
- Prefer `add-content` over guessing what `append` does
- Use `table-of-contents` instead of `toc`
- Choose `information` over `meta`

### **2. Leverage natural language**
- Endpoint names are self-documenting
- No need to memorize abbreviations
- Predictable naming patterns

### **3. Handle errors gracefully**
- All endpoints return consistent error formats
- Validation errors include detailed messages
- HTTP status codes follow REST conventions

### **4. Use slugs for sharing**
- Slugs are URL-friendly and shareable
- Auto-generated from titles
- Unique per user and resource type

---

**Abrège** - API designed for LLMs with explicit, self-documenting endpoints and natural language patterns. 