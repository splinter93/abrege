# Abrège API – LLM Friendly Reference (EN)

This document is designed to help an LLM understand and manipulate the Abrège API optimally. It exposes the structure, intent, constraints, and usage of each endpoint, with concrete examples and explicit rules.

---

## 1. OVERVIEW

- **RESTful API**
- **All data is in Markdown (`content` field), HTML is server-generated (`html_content` for display only)**
- **Main resources**: notes, folders, binders
- **Explicit endpoints, separated for each action (CRUD, append, erase, move, merge, meta, toc, etc.)**
- **Strict validation (types, formats, security)**
- **No user-submitted HTML is accepted**
- **Responses always in JSON**

---

## 2. CONVENTIONS

- **All routes are under `/api/v1/`**
- **ID = UUID (string)**
- **Dates in ISO8601 format**
- **Errors: HTTP code + explicit message**
- **No mutation via GET**
- **No sensitive data in URLs**

---

## 3. MAIN ENDPOINTS

### 3.1. Notes

#### Create a note
- **POST** `/api/v1/create-note/`
- **Payload**: `{ "title": string, "content": string (markdown), "header_image"?: string (URL), "dossier_id"?: string }`
- **Response**: `{ "id": string, "title": string, "content": string, "header_image"?: string, ... }`

#### Read a note
- **GET** `/api/v1/note/[id]/`
- **Response**: `{ "id": string, "title": string, "content": string, "html_content": string, ... }`

#### Append content
- **POST** `/api/v1/note/[id]/append/`
- **Payload**: `{ "content": string, "position"?: number }`
- **Response**: `{ "id": string, "content": string, ... }`

#### Append to a section
- **POST** `/api/v1/note/[id]/append-to-section/`
- **Payload**: `{ "section": string, "content": string, "position"?: number }`
- **Response**: `{ "id": string, "content": string, ... }`

#### Erase a section
- **POST** `/api/v1/note/[id]/erase-section/`
- **Payload**: `{ "section": string, "content": null }`
- **Response**: `{ "id": string, "content": string, ... }`

#### Delete a note
- **DELETE** `/api/v1/note/[id]/`
- **Response**: `{ "success": true }`

#### Update metadata
- **PATCH** `/api/v1/note/[id]/meta/`
- **Payload**: `{ "title"?: string, "header_image"?: string }`
- **Response**: `{ "id": string, ... }`

#### Read TOC
- **GET** `/api/v1/note/[id]/toc/`
- **Response**: `{ "toc": [ { "level": number, "title": string, "slug": string } ] }`

#### Read metadata/statistics
- **GET** `/api/v1/note/[id]/metadata/`
- **Response**: `{ "word_count": number, "char_count": number, "section_count": number, ... }`

#### Merge notes
- **POST** `/api/v1/note/merge/`
- **Payload**: `{ "note_ids": string[], "order"?: string[] }`
- **Response**: `{ "id": string, "content": string, ... }`

#### Move a note
- **POST** `/api/v1/note/[id]/move/`
- **Payload**: `{ "dossier_id"?: string, "classeur_id"?: string }`
- **Response**: `{ "id": string, ... }`

---

### 3.2. Folders

#### Create a folder
- **POST** `/api/v1/create-folder/`
- **Payload**: `{ "name": string, "classeur_id": string, "parent_id"?: string }`
- **Response**: `{ "id": string, "name": string, ... }`

#### Read a folder
- **GET** `/api/v1/dossier/[id]/`
- **Response**: `{ "id": string, "name": string, ... }`

#### Delete a folder
- **DELETE** `/api/v1/dossier/[id]/`
- **Response**: `{ "success": true }`

#### Move a folder
- **POST** `/api/v1/dossier/[id]/move/`
- **Payload**: `{ "parent_id"?: string, "classeur_id"?: string }`
- **Response**: `{ "id": string, ... }`

#### Update metadata
- **PATCH** `/api/v1/dossier/[id]/meta/`
- **Payload**: `{ "name"?: string }`
- **Response**: `{ "id": string, ... }`

---

### 3.3. Binders

#### Create a binder
- **POST** `/api/v1/create-classeur/`
- **Payload**: `{ "name": string }`
- **Response**: `{ "id": string, "name": string, ... }`

#### Read a binder
- **GET** `/api/v1/classeur/[id]/`
- **Response**: `{ "id": string, "name": string, ... }`

#### Delete a binder
- **DELETE** `/api/v1/classeur/[id]/`
- **Response**: `{ "success": true }`

#### Update metadata
- **PATCH** `/api/v1/classeur/[id]/meta/`
- **Payload**: `{ "name"?: string }`
- **Response**: `{ "id": string, ... }`

---

### 3.4. Full Tree

#### Read the full tree
- **GET** `/api/v1/full-tree/`
- **Response**: `{ "classeurs": [ ... ], "dossiers": [ ... ], "notes": [ ... ] }`

---

## 4. REQUEST EXAMPLES

### Create a note
```bash
curl -X POST https://.../api/v1/create-note/ \
  -H 'Content-Type: application/json' \
  -d '{ "title": "Title", "content": "# My markdown", "header_image": "https://..." }'
```

### Append to a section
```bash
curl -X POST https://.../api/v1/note/NOTE_ID/append-to-section/ \
  -H 'Content-Type: application/json' \
  -d '{ "section": "Introduction", "content": "Text to add" }'
```

### Erase a section
```bash
curl -X POST https://.../api/v1/note/NOTE_ID/erase-section/ \
  -H 'Content-Type: application/json' \
  -d '{ "section": "Conclusion", "content": null }'
```

### Merge notes
```bash
curl -X POST https://.../api/v1/note/merge/ \
  -H 'Content-Type: application/json' \
  -d '{ "note_ids": ["id1", "id2"] }'
```

---

## 5. ERRORS & VALIDATION

- **400**: Invalid data (type, format, non-compliant markdown)
- **404**: Resource not found
- **403**: Forbidden
- **422**: Business constraint violation (e.g., section does not exist)
- **500**: Server error

**Error example**:
```json
{ "error": "Section not found" }
```

---

## 6. GLOSSARY

- **note**: A markdown document
- **folder**: A folder containing notes
- **binder**: A binder containing folders
- **section**: A markdown block identified by a heading (## or ###)
- **header_image**: Optional header image URL
- **toc**: Table of contents (list of sections)

---

## 7. LLM BEST PRACTICES

- Always validate the expected schema before sending a request
- Always parse the JSON response and check for expected fields
- Use specialized endpoints (append, erase, meta, toc, etc.) for each action
- Never inject HTML into markdown
- Always handle errors (code + message)

---

**This document is designed to be copy-pasted into an LLM context to enable reliable, secure, and efficient manipulation of the Abrège API.** 