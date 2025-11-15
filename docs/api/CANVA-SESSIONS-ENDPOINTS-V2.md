# 🎨 API Canva Sessions V2 - REST Clean

**Architecture RESTful propre pour la gestion des sessions Canva**

---

## 🎯 Vue d'ensemble

Les sessions Canva V2 utilisent une architecture REST pure avec routes en `/sessions` (pluriel) et opérations CRUD complètes via méthodes HTTP standards.

### Endpoints disponibles

```
POST   /api/v2/canva/sessions                    → Créer/ouvrir session
GET    /api/v2/canva/sessions?chat_session_id=X  → Lister sessions
GET    /api/v2/canva/sessions/{id}               → Détails session
PATCH  /api/v2/canva/sessions/{id}               → Update status/metadata
DELETE /api/v2/canva/sessions/{id}               → Supprimer session
```

---

## 📝 POST /api/v2/canva/sessions

**Créer ou ouvrir une session Canva**

### Request

```json
{
  "chat_session_id": "uuid-chat-session",
  "note_id": "uuid-or-slug-note",          // Optionnel
  "create_if_missing": true,                 // Si true, crée nouvelle note
  "title": "Mon brouillon Canva",           // Requis si create_if_missing
  "classeur_id": "uuid-classeur",           // Optionnel
  "initial_content": "# Titre\n\nContenu", // Optionnel
  "metadata": {}                             // Optionnel
}
```

### Response 200

```json
{
  "success": true,
  "canva_session": {
    "id": "uuid-canva-session",
    "chat_session_id": "uuid-chat-session",
    "note_id": "uuid-note",
    "title": "Mon brouillon Canva",
    "status": "open",
    "created_at": "2025-01-15T10:00:00Z",
    "closed_at": null,
    "saved_at": null,
    "metadata": {
      "note_slug": "mon-brouillon-canva",
      "classeur_id": "uuid-classeur",
      "note_updated_at": "2025-01-15T10:00:00Z"
    }
  }
}
```

### LLM Tool Mapping

```typescript
Tool: canva.create_session
Args: {
  chat_session_id: string,
  note_id?: string,
  create_if_missing?: boolean,
  title?: string,
  classeur_id?: string,
  initial_content?: string
}
```

---

## 🔍 GET /api/v2/canva/sessions

**Lister les sessions Canva d'une session de chat**

### Query Parameters

- `chat_session_id` (required): UUID de la session de chat
- `status` (optional): Filtrer par statut (format: `"open,closed,saved"`)
- `include_note` (optional): Inclure détails note (default: `true`)

### Example Request

```
GET /api/v2/canva/sessions?chat_session_id=abc-123&status=open,closed
```

### Response 200

```json
{
  "success": true,
  "canva_sessions": [
    {
      "id": "uuid-1",
      "chat_session_id": "abc-123",
      "note_id": "note-1",
      "title": "Draft 1",
      "status": "open",
      "created_at": "2025-01-15T10:00:00Z",
      "metadata": { "note_slug": "draft-1" }
    },
    {
      "id": "uuid-2",
      "chat_session_id": "abc-123",
      "note_id": "note-2",
      "title": "Draft 2",
      "status": "closed",
      "created_at": "2025-01-14T09:00:00Z",
      "closed_at": "2025-01-15T08:00:00Z",
      "metadata": { "note_slug": "draft-2" }
    }
  ],
  "count": 2
}
```

### LLM Tool Mapping

```typescript
Tool: canva.list_sessions
Args: {
  chat_session_id: string,
  statuses?: string[]
}
```

---

## 🔍 GET /api/v2/canva/sessions/{id}

**Récupérer les détails d'une session Canva**

### Path Parameters

- `id`: UUID de la canva_session

### Response 200

```json
{
  "success": true,
  "canva_session": {
    "id": "uuid-canva-session",
    "chat_session_id": "uuid-chat",
    "note_id": "uuid-note",
    "title": "Mon Draft",
    "status": "open",
    "created_at": "2025-01-15T10:00:00Z",
    "metadata": {
      "note_slug": "mon-draft",
      "classeur_id": "uuid-classeur"
    }
  }
}
```

### LLM Tool Mapping

```typescript
Tool: canva.get_session
Args: {
  session_id: string
}
```

---

## 📝 PATCH /api/v2/canva/sessions/{id}

**Mettre à jour une session Canva**

Utilisé pour changer le statut (fermer UI, marquer saved) ou update metadata.

### Path Parameters

- `id`: UUID de la canva_session

### Request Body

```json
{
  "status": "closed",                        // Optionnel
  "metadata": { "custom_key": "value" },     // Optionnel
  "reason": "user_action"                    // Optionnel
}
```

**Note:** Au moins `status` ou `metadata` doit être fourni.

### Response 200

```json
{
  "success": true,
  "canva_session": {
    "id": "uuid-canva-session",
    "status": "closed",
    "closed_at": "2025-01-15T11:00:00Z",
    "metadata": { "custom_key": "value" }
  }
}
```

### LLM Tool Mapping

```typescript
Tool: canva.update_session
Args: {
  session_id: string,
  status?: 'open' | 'closed' | 'saved' | 'deleted',
  metadata?: Record<string, any>,
  reason?: 'user_action' | 'inactivity' | 'llm_tool'
}
```

---

## 🗑️ DELETE /api/v2/canva/sessions/{id}

**Supprimer une session Canva**

Détache définitivement la note du chat. Si la note est un brouillon Canva (`is_canva_draft=true`), elle sera aussi supprimée de la DB.

### Path Parameters

- `id`: UUID de la canva_session

### Response 200

```json
{
  "success": true,
  "deleted_session_id": "uuid-canva-session"
}
```

### LLM Tool Mapping

```typescript
Tool: canva.delete_session
Args: {
  session_id: string
}
```

---

## 🔐 Authentification

Tous les endpoints requièrent l'authentification via:

- **Bearer Token JWT** (Supabase Auth)
- Ou **API Key** (header `X-API-Key`)

---

## 📊 Statuts de Session

| Statut    | Description                                          |
|-----------|------------------------------------------------------|
| `open`    | Session active, pane UI ouvert                       |
| `closed`  | Pane UI fermé, session toujours liée au chat       |
| `saved`   | Note sauvegardée dans un classeur                   |
| `deleted` | Session supprimée (soft delete, pour audit)         |

---

## 🎯 Workflow LLM Standard

### 1. Créer nouveau Canva

```typescript
// LLM appelle
canva.create_session({
  chat_session_id: "current-chat-uuid",
  create_if_missing: true,
  title: "Article TypeScript",
  initial_content: "# TypeScript\n\nIntro..."
})
```

### 2. Lister les Canvases du chat

```typescript
// LLM appelle
canva.list_sessions({
  chat_session_id: "current-chat-uuid",
  statuses: ["open", "closed"]
})
```

### 3. Fermer le pane UI (update status)

```typescript
// LLM appelle
canva.update_session({
  session_id: "canva-uuid",
  status: "closed",
  reason: "llm_tool"
})
```

### 4. Supprimer session

```typescript
// LLM appelle
canva.delete_session({
  session_id: "canva-uuid"
})
```

---

## ✅ Standards GAFAM

- **REST pur** : Méthodes HTTP standards (POST, GET, PATCH, DELETE)
- **Noms pluriels** : `/sessions` (convention collections REST)
- **Query params** : Filtrage naturel pour GET
- **Idempotence** : DELETE et PATCH sont idempotents
- **Validation stricte** : Zod schemas + messages clairs
- **Logs structurés** : Contexte complet pour debugging
- **Race condition** : `runExclusive` sur ops critiques

---

## 🔄 Migration depuis V1

| V1 (deprecated)                      | V2 (REST clean)                                |
|--------------------------------------|------------------------------------------------|
| `POST /canva/session`                | `POST /canva/sessions`                         |
| `GET /canva/session/{chatId}`        | `GET /canva/sessions?chat_session_id={chatId}` |
| `POST /canva/session/{id}/close`     | `PATCH /canva/sessions/{id}` + `status: closed`|
| `DELETE /canva/session/{id}`         | `DELETE /canva/sessions/{id}`                  |

**Tools LLM:**
- `canva.open_session` → `canva.create_session`
- `canva.close_session` → `canva.update_session`

---

**Dernière mise à jour** : 15 janvier 2025  
**Version API** : V2.0.0  
**Architecture** : REST Clean + Standards GAFAM

