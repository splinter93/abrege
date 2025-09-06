# 📖 Référence Rapide - Endpoints CRUD Agents

## 🔗 Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/v2/agents/{agentId}` | Récupérer un agent |
| `POST` | `/api/v2/agents/{agentId}` | Exécuter un agent |
| `PUT` | `/api/v2/agents/{agentId}` | Mise à jour complète |
| `PATCH` | `/api/v2/agents/{agentId}` | Mise à jour partielle |
| `DELETE` | `/api/v2/agents/{agentId}` | Supprimer un agent |
| `HEAD` | `/api/v2/agents/{agentId}` | Vérifier existence |
| `GET` | `/api/v2/agents` | Liste tous les agents |

## 🎯 Agents Disponibles

| Slug | Nom | Modèle | Capacités |
|------|-----|--------|-----------|
| `johnny` | Johnny Query | Llama 4 Scout | Texte + Images |
| `formatter` | Formateur | Llama 4 Scout | Texte + Images |
| `vision` | Vision | Llama 4 Maverick | Texte + Images |

## 📝 Exemples de Requêtes

### **Exécuter Johnny**
```bash
POST /api/v2/agents/johnny
{
  "input": {
    "noteId": "note-123",
    "query": "Analyse cette note",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

### **Mettre à jour (PUT)**
```bash
PUT /api/v2/agents/johnny
{
  "display_name": "Johnny Pro",
  "temperature": 0.5,
  "max_tokens": 10000
}
```

### **Mise à jour partielle (PATCH)**
```bash
PATCH /api/v2/agents/johnny
{
  "temperature": 0.7
}
```

### **Supprimer**
```bash
DELETE /api/v2/agents/test-agent
```

## 🔐 Headers Requis

```bash
Authorization: Bearer <token>
Content-Type: application/json
```

## 📊 Codes de Réponse

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Créé |
| `400` | Données invalides |
| `401` | Non authentifié |
| `404` | Agent non trouvé |
| `500` | Erreur serveur |

## ⚡ Codes d'Erreur

| Code | Description |
|------|-------------|
| `AUTHENTICATION_ERROR` | Problème d'auth |
| `INVALID_INPUT` | Données invalides |
| `AGENT_NOT_FOUND` | Agent inexistant |
| `EXECUTION_ERROR` | Erreur d'exécution |

## 🛠️ Validation

- **Temperature** : 0-2
- **Max tokens** : 1-8192
- **Slug** : `[a-z0-9-]+`
- **Schémas JSON** : Validation stricte

## 🚀 cURL Examples

```bash
# Exécuter
curl -X POST "https://abrege.app/api/v2/agents/johnny" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": {"noteId": "123", "query": "test"}}'

# Mettre à jour
curl -X PATCH "https://abrege.app/api/v2/agents/johnny" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 0.7}'

# Récupérer
curl -X GET "https://abrege.app/api/v2/agents/johnny" \
  -H "Authorization: Bearer $TOKEN"

# Supprimer
curl -X DELETE "https://abrege.app/api/v2/agents/test" \
  -H "Authorization: Bearer $TOKEN"
```

## 📱 JavaScript

```javascript
// Exécuter
const result = await fetch('/api/v2/agents/johnny', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: { noteId: '123', query: 'test' }
  })
}).then(r => r.json());

// Mettre à jour
await fetch('/api/v2/agents/johnny', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ temperature: 0.7 })
});
```

## 🐍 Python

```python
import requests

# Exécuter
response = requests.post(
    'https://abrege.app/api/v2/agents/johnny',
    headers={'Authorization': f'Bearer {token}'},
    json={'input': {'noteId': '123', 'query': 'test'}}
)

# Mettre à jour
requests.patch(
    'https://abrege.app/api/v2/agents/johnny',
    headers={'Authorization': f'Bearer {token}'},
    json={'temperature': 0.7}
)
```

---

**⚡ Référence rapide pour les endpoints CRUD des agents spécialisés !**
