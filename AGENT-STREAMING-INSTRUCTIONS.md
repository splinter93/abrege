# Instructions pour Agent LLM - Streaming API

## 📋 Informations de base

**Endpoint:** `POST http://localhost:3000/api/v2/note/{ref}/stream:write`

**NoteId de test:** `7a60e6f5-1cd8-4a7b-b58c-57e066125286`

**URL complète:** `http://localhost:3000/api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write`

**Schéma OpenAPI:** `openapi-streaming-write.json` (dans le même dossier)

---

## 🔑 Authentification

**Type:** Bearer Token (JWT)

**Header requis:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

Pour obtenir le token :
1. Se connecter à l'app dans le navigateur
2. DevTools → Console :
   ```javascript
   localStorage.getItem('supabase.auth.token')
   ```
3. Copier le token pour l'agent

---

## 📝 Format de requête

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (envoyer un chunk):**
```json
{
  "chunk": "Contenu markdown à ajouter",
  "position": "end",
  "metadata": {
    "agent_id": "ton-agent-id",
    "tool_call_id": "call_123"
  }
}
```

**Body (terminer le stream):**
```json
{
  "end": true
}
```

---

## 🎯 Exemple de workflow pour l'agent

### Scénario : Rédiger un article sur l'IA

**Requête 1 - Titre:**
```json
POST /api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write
{
  "chunk": "# Intelligence Artificielle : Introduction\n\n"
}
```

**Requête 2 - Premier paragraphe:**
```json
POST /api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write
{
  "chunk": "L'intelligence artificielle (IA) représente une révolution technologique majeure. "
}
```

**Requête 3 - Suite:**
```json
POST /api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write
{
  "chunk": "Elle transforme profondément notre façon de travailler et d'interagir avec la technologie.\n\n"
}
```

**Requête 4 - Section avec code:**
```json
POST /api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write
{
  "chunk": "## Exemple de code\n\n```python\ndef hello_ai():\n    print(\"Bonjour l'IA !\")\n```\n\n"
}
```

**Requête 5 - Fin du stream:**
```json
POST /api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write
{
  "end": true
}
```

---

## ⚙️ Paramètres optionnels

### Position d'insertion

- `"position": "end"` (défaut) → Ajouter à la fin du document
- `"position": "start"` → Ajouter au début du document
- `"position": "cursor"` → Ajouter à la position du curseur

### Metadata (tracking)

```json
{
  "chunk": "...",
  "metadata": {
    "agent_id": "synesia-writer-v1",
    "tool_call_id": "call_xyz789"
  }
}
```

---

## 🚨 Limites et contraintes

- **Rate limit:** 100 chunks par minute par utilisateur
- **Markdown:** Le contenu est automatiquement sanitizé
- **Encoding:** UTF-8 uniquement
- **Taille max chunk:** Aucune limite technique, mais recommandé < 10KB par chunk pour la latence

---

## ✅ Réponses attendues

**Succès (200):**
```json
{
  "success": true,
  "note_id": "7a60e6f5-1cd8-4a7b-b58c-57e066125286",
  "listeners_reached": 1,
  "chunk_length": 45
}
```

**Erreur (401):**
```json
{
  "error": "Unauthorized"
}
```

**Rate limit (429):**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 30
}
```

---

## 🧪 Test rapide pour l'agent

**Prompt pour l'agent:**

> "Utilise l'API streaming pour écrire un court article (3-4 paragraphes) sur l'intelligence artificielle dans la note `7a60e6f5-1cd8-4a7b-b58c-57e066125286`. 
> 
> Envoie le contenu en plusieurs chunks (un par paragraphe) en utilisant l'endpoint `/api/v2/note/7a60e6f5-1cd8-4a7b-b58c-57e066125286/stream:write`.
> 
> N'oublie pas de terminer avec `{\"end\": true}`."

---

## 📚 Format Markdown supporté

L'agent peut utiliser tout le markdown standard :

- **Titres:** `# H1`, `## H2`, `### H3`, etc.
- **Gras:** `**texte**`
- **Italique:** `*texte*`
- **Code inline:** `` `code` ``
- **Blocs de code:** ` ```language\ncode\n``` `
- **Listes:** `- item`, `1. item`
- **Liens:** `[texte](url)`
- **Citations:** `> citation`
- **Tableaux:** `| col1 | col2 |`

Tout sera correctement formaté dans l'éditeur TipTap en temps réel !

---

## 🎯 Résultat attendu

Pendant que l'agent envoie les chunks, l'utilisateur qui a la note ouverte dans son navigateur verra le contenu apparaître **en temps réel**, chunk par chunk, avec le markdown correctement formaté.

**C'est magique ! ✨**







