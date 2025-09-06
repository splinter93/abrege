# ⚡ Quickstart - Endpoints CRUD Agents Spécialisés

## 🚀 Démarrage en 5 minutes

Ce guide vous permet de commencer rapidement avec les endpoints CRUD des agents spécialisés.

## 📋 Prérequis

- Token d'authentification valide
- Accès à l'API v2 d'Abrège
- Client HTTP (Postman, cURL, ou votre application)

## 🔑 Authentification

```bash
# Récupérer votre token d'authentification
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🎯 Étapes Rapides

### 1️⃣ **Lister les agents disponibles**

```bash
GET /api/v2/agents
Authorization: Bearer <votre-token>
```

**Réponse :**
```json
{
  "success": true,
  "agents": [
    {
      "slug": "johnny",
      "display_name": "Johnny Query",
      "description": "Analyse de notes et d'images"
    },
    {
      "slug": "vision", 
      "display_name": "Vision",
      "description": "Analyse d'images complexes"
    }
  ]
}
```

### 2️⃣ **Exécuter un agent**

```bash
POST /api/v2/agents/johnny
Content-Type: application/json
Authorization: Bearer <votre-token>

{
  "input": {
    "noteId": "ma-note-123",
    "query": "Résume cette note",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "answer": "Voici un résumé de votre note...",
  "confidence": 0.92
}
```

### 3️⃣ **Modifier un agent (PATCH)**

```bash
PATCH /api/v2/agents/johnny
Content-Type: application/json
Authorization: Bearer <votre-token>

{
  "temperature": 0.7,
  "description": "Agent optimisé pour les analyses rapides"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Agent mis à jour partiellement avec succès"
}
```

## 🛠️ Exemples Pratiques

### **Analyse d'image avec Johnny**

```bash
curl -X POST "https://abrege.app/api/v2/agents/johnny" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": {
      "noteId": "document-456",
      "query": "Que vois-tu dans cette image ?",
      "imageUrl": "https://example.com/document.jpg"
    }
  }'
```

### **Mise à jour complète d'un agent**

```bash
curl -X PUT "https://abrege.app/api/v2/agents/johnny" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "display_name": "Johnny Pro",
    "description": "Version professionnelle de Johnny",
    "temperature": 0.5,
    "max_tokens": 10000
  }'
```

### **Vérifier l'existence d'un agent**

```bash
curl -I "https://abrege.app/api/v2/agents/johnny" \
  -H "Authorization: Bearer $TOKEN"
```

## 📱 Intégration JavaScript

```javascript
class AgentAPI {
  constructor(token, baseURL = 'https://abrege.app/api/v2') {
    this.token = token;
    this.baseURL = baseURL;
  }

  async executeAgent(agentId, input) {
    const response = await fetch(`${this.baseURL}/agents/${agentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ input })
    });
    return response.json();
  }

  async updateAgent(agentId, updates) {
    const response = await fetch(`${this.baseURL}/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async getAgent(agentId) {
    const response = await fetch(`${this.baseURL}/agents/${agentId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// Utilisation
const api = new AgentAPI('votre-token');

// Exécuter Johnny
const result = await api.executeAgent('johnny', {
  noteId: 'note-123',
  query: 'Analyse cette note',
  imageUrl: 'https://example.com/image.jpg'
});

console.log(result.answer);
```

## 🐍 Intégration Python

```python
import requests
import json

class AgentAPI:
    def __init__(self, token, base_url='https://abrege.app/api/v2'):
        self.token = token
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def execute_agent(self, agent_id, input_data):
        response = requests.post(
            f'{self.base_url}/agents/{agent_id}',
            headers=self.headers,
            json={'input': input_data}
        )
        return response.json()
    
    def update_agent(self, agent_id, updates):
        response = requests.patch(
            f'{self.base_url}/agents/{agent_id}',
            headers=self.headers,
            json=updates
        )
        return response.json()
    
    def get_agent(self, agent_id):
        response = requests.get(
            f'{self.base_url}/agents/{agent_id}',
            headers=self.headers
        )
        return response.json()

# Utilisation
api = AgentAPI('votre-token')

# Exécuter Vision
result = api.execute_agent('vision', {
    'imageUrl': 'https://example.com/image.jpg',
    'task': 'Décris cette image en détail'
})

print(result['analysis'])
```

## 🔧 Agents Disponibles

| Agent | Slug | Usage | Exemple |
|-------|------|-------|---------|
| **Johnny Query** | `johnny` | Analyse de notes + images | `{ noteId, query, imageUrl? }` |
| **Formateur** | `formatter` | Mise en forme de documents | `{ noteId, formatInstruction, imageUrl? }` |
| **Vision** | `vision` | Analyse d'images complexes | `{ imageUrl, task, noteId? }` |

## ⚠️ Erreurs Courantes

### **401 Unauthorized**
```json
{
  "success": false,
  "error": "Token d'authentification invalide",
  "code": "AUTHENTICATION_ERROR"
}
```
**Solution :** Vérifiez votre token d'authentification

### **404 Not Found**
```json
{
  "success": false,
  "error": "Agent johnny not found",
  "code": "AGENT_NOT_FOUND"
}
```
**Solution :** Vérifiez le slug de l'agent

### **400 Bad Request**
```json
{
  "success": false,
  "error": "Temperature doit être entre 0 et 2",
  "code": "INVALID_INPUT"
}
```
**Solution :** Vérifiez les valeurs des paramètres

## 🎯 Prochaines Étapes

1. **Testez les agents** : Essayez les différents agents avec vos données
2. **Personnalisez** : Modifiez les paramètres selon vos besoins
3. **Intégrez** : Intégrez dans votre application
4. **Optimisez** : Ajustez temperature et max_tokens pour vos cas d'usage

## 📚 Documentation Complète

- [Documentation détaillée](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md)
- [API v2 complète](./API-V2-DOCUMENTATION-COMPLETE.md)
- [Architecture des agents](../architecture/ARCHITECTURE-AGENTS-SPECIALISES.md)

---

**🚀 Vous êtes prêt à utiliser les endpoints CRUD des agents spécialisés !**
