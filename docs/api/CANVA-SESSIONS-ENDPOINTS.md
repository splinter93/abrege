# Canva Sessions – Contract & Tool Mapping (V2)

**Date:** 15 nov 2025  
**Auteur:** Jean-Claude (GPT-5.1 Codex)  
**Objectif:** Exposer un ensemble RESTful minimal pour permettre au LLM d’ouvrir, créer, fermer ou supprimer un canevas sans dupliquer les endpoints de notes.

---

## 1. Endpoint principal — `POST /api/v2/canva/session`

### 1.1 Rôle
Créer (ou rouvrir) une session Canva liée à une conversation. Cette route couvre **deux cas**:

1. **Ouvrir une note existante** dans le canevas.
2. **Créer une nouvelle note** (via l’API note existante) puis l’attacher au canevas.

### 1.2 Payload JSON
```jsonc
{
  "chat_session_id": "chat_123",              // string, obligatoire
  "note_id": "note_456",                      // string, optionnel (slug ou id)
  "create_if_missing": false,                 // bool, optionnel (default: false)
  "title": "Note Canva du 15/11",             // string, optionnel (obligatoire si create_if_missing=true)
  "classeur_id": "cls_public",                // string, optionnel (fallback = classeur système Canva)
  "metadata": {                               // optionnel – réservé
    "source": "llm-tool-call"
  }
}
```

**Règles:**
- `chat_session_id` doit appartenir à l’utilisateur authentifié.
- `note_id` peut être un slug ou un UUID: on réutilise le `NoteIdentifierSchema` de `/api/v2/note/{ref}`.
- Si `note_id` est absent:
  - `create_if_missing` **doit** être `true`.
  - `title` **doit** être fourni (fallback côté serveur: “Canva sans titre”).
  - Le serveur appelle `POST /api/v2/note/create` avec `is_canva_draft=true`.
- Si `note_id` est présent, `create_if_missing` est ignoré.

### 1.3 Réponse (succès)
```json
{
  "success": true,
  "canva_session": {
    "id": "canva_sess_789",
    "chat_session_id": "chat_123",
    "note": {
      "id": "note_456",
      "slug": "research-ai",
      "title": "Research AI",
      "classeur_id": "cls_public",
      "is_canva_draft": true
    },
    "status": "open",
    "created_at": "2025-11-15T09:32:11.000Z"
  }
}
```

### 1.4 Codes d’erreur
| Code | Motif | Exemple |
| --- | --- | --- |
| 400 | Payload invalide | `title` manquant alors que `create_if_missing=true` |
| 403 | Session ou note n’appartient pas à l’utilisateur | `chat_session_id` d’un autre user |
| 404 | Note introuvable | `note_id` inexistant |
| 409 | Conflit de statut | session déjà ouverte et `allow_multiple=false` |
| 500 | Erreur interne | échec création note |

---

## 2. Endpoint `POST /api/v2/canva/session/{id}/close`

### 2.1 Rôle
Mettre à jour l’état **UI** (pane fermé côté client) sans supprimer la session.

### 2.2 Payload
```json
{
  "reason": "user_action" // enum facultatif: user_action | inactivity | llm_tool
}
```

### 2.3 Réponse
```json
{
  "success": true,
  "canva_session": {
    "id": "canva_sess_789",
    "status": "closed",
    "closed_at": "2025-11-15T09:40:00Z"
  }
}
```

---

## 3. Endpoint `DELETE /api/v2/canva/session/{id}`

### 3.1 Rôle
Supprimer le lien entre le chat et la note (équivalent bouton “Fermer” côté user). La note reste en base.  
**NB:** On réutilise déjà cette logique côté client (`useCanvaStore.closeCanva`), on l’expose officiellement pour le LLM.

### 3.2 Réponse
```json
{
  "success": true,
  "deleted_session_id": "canva_sess_789"
}
```

---

## 4. Service-level helpers (à implémenter dans `CanvaNoteService`)

| Méthode | Description |
| --- | --- |
| `openSession({ chatSessionId, note })` | Valide les droits, crée/enregistre la session en `status='open'` |
| `createNoteAndSession({ chatSessionId, title, classeurId })` | Appelle `NoteService.create`, puis `openSession` |
| `closeSession({ sessionId, reason })` | Met `status='closed'`, journalise l’action |
| `deleteSession({ sessionId })` | Supprime définitivement (DELETE) |

Chaque méthode devra utiliser `runExclusive(chat_session_id)` pour éviter deux ouvertures en parallèle.

---

## 5. Mapping Outils LLM

| Tool slug | Endpoint | Description rapide | Paramètres requis |
| --- | --- | --- | --- |
| `canva.open_session` | `POST /api/v2/canva/session` | Ouvrir note existante ou créer un nouveau canevas | `chat_session_id`, (`note_id` _ou_ `create_if_missing=true` + `title`) |
| `canva.close_session` | `POST /api/v2/canva/session/{id}/close` | Fermer le pane Canva actif | `canva_session_id` |
| `canva.delete_session` | `DELETE /api/v2/canva/session/{id}` | Détacher/supprimer la session | `canva_session_id` |

### Exemple tool call (ouvrir une note existante)
```json
{
  "tool": "canva.open_session",
  "arguments": {
    "chat_session_id": "chat_123",
    "note_id": "summary-ai-trends"
  }
}
```

### Exemple tool call (créer une nouvelle note Canva)
```json
{
  "tool": "canva.open_session",
  "arguments": {
    "chat_session_id": "chat_123",
    "create_if_missing": true,
    "title": "Synthèse brainstorming 15 nov"
  }
}
```

---

## 6. Compatibilité & non-duplication

- **Création de note**: On ne crée pas de nouveau endpoint — on réutilise le service existant `POST /api/v2/note/create` en interne quand `note_id` est absent. Le LLM n’a pas besoin d’appeler deux routes séparées.
- **Statut UI vs suppression**: `close` garde la session pour recovery, `delete` supprime définitivement (identique au comportement actuel du bouton “Fermer”).
- **Format**: Repose sur les mêmes conventions que les autres endpoints V2 (auth header, JSON strict, Zod schemas).

---

## 7. Validation / Checklist

1. ✅ Schéma REST validé, aucun doublon avec `note/create`.
2. ✅ Un seul endpoint pour ouverture/creation (`POST /api/v2/canva/session`).
3. ✅ Deux endpoints complémentaires pour fermer ou supprimer.
4. ✅ Mapping clair vers les outils LLM.
5. 🔜 Mettre à jour `docs/api/ENDPOINTS-V2-RESUME.md` et `CANVA-V2-STATUS.md` (étape 4 du plan).


