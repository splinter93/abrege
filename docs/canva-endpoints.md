# Blueprint API Canva

## Vue d’ensemble
- **Créer** ou **ouvrir** un canevas dans une session de chat.
- **Éditer en streaming** (opérations locales) pour offrir une expérience temps réel.
- **Mettre à jour / synchroniser** un canevas avec la note finale.
- **Lister / fermer** les sessions en cours.

---

## `POST /canva/sessions`
### Description
Créer un nouveau brouillon Canva rattaché à une session de chat. Le `title` est requis pour garantir la compatibilité LLM.

### Requête
```json
{
  "chat_session_id": "uuid",
  "title": "Nom du canevas",
  "initial_content": "# Intro…",
  "classeur_id": "uuid"
}
```

### Réponse
```json
{
  "success": true,
  "canva_session": {
    "id": "uuid",
    "chat_session_id": "uuid",
    "note_id": null,
    "title": "Nom du canevas",
    "status": "open",
    "initial_content": "# Intro…"
  }
}
```

---

## `POST /canva/sessions/open`
### Description
Ouvrir une note existante dans Canva depuis une session de chat.

### Requête
```json
{
  "chat_session_id": "uuid",
  "note_id": "note-slug-ou-uuid",
  "classeur_id": "uuid"
}
```

### Réponse
```json
{
  "success": true,
  "canva_session": {
    "id": "uuid",
    "chat_session_id": "uuid",
    "note_id": "note-uuid",
    "title": "Titre de la note existante",
    "status": "open"
  }
}
```

---

## `PATCH /canva/sessions/{session_id}`
### Description
Mettre à jour le statut, renommer, synchroniser le contenu ou enrichir les métadonnées d’un canevas.

### Requête
```json
{
  "status": "closed",
  "title": "Nouveau titre",
  "initial_content": "# Contenu complet synchronisé",
  "metadata": {
    "last_editor": "assistant",
    "tokens_used": 1234
  }
}
```

### Réponse
```json
{
  "success": true,
  "canva_session": {
    "id": "uuid",
    "status": "closed",
    "title": "Nouveau titre",
    "metadata": { "last_editor": "assistant", "tokens_used": 1234 }
  }
}
```

---

## `POST /canva/sessions/{session_id}/operations`
### Description
Appliquer une liste d’opérations (insert, replace, delete…) pour offrir une édition locale/streaming.

### Requête
```json
{
  "operations": [
    {
      "type": "insert",
      "position": 102,
      "content": "Nouvelle phrase."
    },
    {
      "type": "replace",
      "range": [120, 135],
      "content": "Texte corrigé"
    }
  ]
}
```

### Réponse
```json
{
  "success": true,
  "preview": "# Contenu mis à jour…",
  "diff": [
    { "type": "insert", "position": 102, "content": "Nouvelle phrase." },
    { "type": "replace", "range": [120, 135], "content": "Texte corrigé" }
  ]
}
```

---

## `GET /canva/sessions`
### Description
Lister les canevas d’une session pour que le LLM sache s’il doit réutiliser ou créer.

### Paramètres
```
?chat_session_id=uuid&status=open,closed&include_note=true
```

### Réponse
```json
{
  "success": true,
  "canva_sessions": [
    {
      "id": "uuid",
      "title": "Plan marketing",
      "status": "open",
      "note_id": null,
      "updated_at": "2025-11-23T22:56:10.000Z"
    },
    {
      "id": "uuid-2",
      "title": "Note existante",
      "status": "saved",
      "note_id": "note-uuid",
      "updated_at": "2025-11-20T10:05:00.000Z"
    }
  ]
}
```

---

## `POST /canva/sessions/{session_id}/sync` *(optionnel)*
### Description
Synchroniser le contenu complet entre le canevas local et la note persistée (push/pull).

### Requête
```json
{
  "direction": "push",
  "content": "# Contenu complet du canevas"
}
```

### Réponse
```json
{
  "success": true,
  "synced_at": "2025-11-23T22:58:00.000Z"
}
```

---

## Synthèse
| Besoin | Endpoint | Notes |
| --- | --- | --- |
| Créer un canevas | `POST /canva/sessions` | `title` requis |
| Ouvrir une note existante | `POST /canva/sessions/open` | `note_id` requis |
| Mettre à jour statut / contenu | `PATCH /canva/sessions/{id}` | Close, save, rename |
| Éditer en streaming | `POST /canva/sessions/{id}/operations` | Opérations locales |
| Lister les canevas | `GET /canva/sessions` | Filtrage par statut |
| Synchroniser push/pull | `POST /canva/sessions/{id}/sync` | Optionnel |

Cette organisation garantit une compréhension claire pour tous les LLMs (Grok, GPT, etc.) tout en couvrant l’ensemble des actions Canva.

