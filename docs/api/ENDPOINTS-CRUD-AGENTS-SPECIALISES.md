# 📚 Documentation API - Endpoints CRUD Agents Spécialisés

## 🎯 Vue d'ensemble

Cette documentation couvre les endpoints CRUD (Create, Read, Update, Delete) pour la gestion des agents spécialisés dans l'API v2 d'Abrège. Ces endpoints permettent de créer, lire, modifier et supprimer des agents spécialisés avec support multimodale.

## 🔗 Base URL

```
https://abrege.app/api/v2/agents
```

## 🔐 Authentification

Tous les endpoints nécessitent une authentification via :

- **Header Authorization** : `Bearer <token>`
- **Cookie de session** : Session valide

## 📋 Endpoints Disponibles

### 1. **GET** `/api/v2/agents/{agentId}` - Récupérer un agent

Récupère les informations détaillées d'un agent spécialisé.

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Exemple de requête
```bash
GET /api/v2/agents/johnny
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "name": "Johnny Query",
  "slug": "johnny",
  "description": "Agent spécialisé dans l'analyse de notes et d'images",
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "provider": "groq",
  "input_schema": {
    "type": "object",
    "properties": {
      "noteId": { "type": "string", "description": "ID de la note" },
      "query": { "type": "string", "description": "Question à poser" },
      "imageUrl": { "type": "string", "description": "URL de l'image (optionnel)" }
    },
    "required": ["noteId", "query"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "answer": { "type": "string", "description": "Réponse de l'agent" },
      "confidence": { "type": "number", "description": "Niveau de confiance" }
    }
  },
  "is_active": true,
  "is_chat_agent": false,
  "is_endpoint_agent": true,
  "capabilities": ["text", "images", "function_calling"],
  "api_v2_capabilities": ["get_note", "get_file", "search_notes"],
  "temperature": 0.3,
  "max_tokens": 8192,
  "priority": 10,
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 45,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Réponse d'erreur (404)
```json
{
  "success": false,
  "error": "Agent johnny not found",
  "code": "AGENT_NOT_FOUND",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 12,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

### 2. **POST** `/api/v2/agents/{agentId}` - Exécuter un agent

Exécute un agent spécialisé avec les données d'entrée fournies.

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Body de la requête
```json
{
  "input": {
    "noteId": "note-123",
    "query": "Analyse cette note et l'image associée",
    "imageUrl": "https://example.com/image.jpg"
  }
}
```

#### Exemple de requête
```bash
POST /api/v2/agents/johnny
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "input": {
    "noteId": "note-123",
    "query": "Que vois-tu dans cette image ?",
    "imageUrl": "https://example.com/document.jpg"
  }
}
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "answer": "Je vois un document PDF contenant un rapport financier avec des graphiques et des tableaux. Le document semble être un rapport trimestriel d'entreprise avec des données de ventes et des projections.",
  "confidence": 0.92,
  "changes": [
    "Analyse de l'image effectuée",
    "Contenu textuel extrait",
    "Éléments visuels identifiés"
  ],
  "metadata": {
    "agentId": "johnny",
    "executionTime": 2150,
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "traceId": "agent-johnny-1705312200000",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Réponse d'erreur (400)
```json
{
  "success": false,
  "error": "Input doit être un objet JSON",
  "code": "INVALID_INPUT",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 25,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

### 3. **PUT** `/api/v2/agents/{agentId}` - Mise à jour complète

Met à jour complètement la configuration d'un agent spécialisé.

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Body de la requête
```json
{
  "display_name": "Johnny Query Pro",
  "description": "Agent professionnel pour l'analyse de documents complexes",
  "system_instructions": "Tu es Johnny Pro, un assistant expert dans l'analyse de documents professionnels...",
  "temperature": 0.5,
  "max_tokens": 12000,
  "input_schema": {
    "type": "object",
    "properties": {
      "documentId": { "type": "string", "description": "ID du document" },
      "analysisType": { "type": "string", "enum": ["summary", "extract", "analyze"] },
      "imageUrl": { "type": "string", "description": "URL de l'image" }
    },
    "required": ["documentId", "analysisType"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "analysis": { "type": "string", "description": "Analyse détaillée" },
      "confidence": { "type": "number", "description": "Niveau de confiance" },
      "extractedData": { "type": "object", "description": "Données extraites" }
    }
  }
}
```

#### Exemple de requête
```bash
PUT /api/v2/agents/johnny
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "display_name": "Johnny Query Pro",
  "description": "Agent professionnel pour l'analyse de documents complexes",
  "temperature": 0.5,
  "max_tokens": 12000
}
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "agent": {
    "id": "uuid-123",
    "slug": "johnny",
    "display_name": "Johnny Query Pro",
    "description": "Agent professionnel pour l'analyse de documents complexes",
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "temperature": 0.5,
    "max_tokens": 12000,
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "message": "Agent mis à jour avec succès",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 180,
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

#### Réponse d'erreur (400)
```json
{
  "success": false,
  "error": "Temperature doit être entre 0 et 2",
  "code": "INVALID_INPUT",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 45,
    "timestamp": "2024-01-15T11:00:00Z"
  }
}
```

---

### 4. **PATCH** `/api/v2/agents/{agentId}` - Mise à jour partielle

Met à jour partiellement la configuration d'un agent spécialisé.

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Body de la requête
```json
{
  "temperature": 0.7,
  "description": "Description mise à jour via PATCH"
}
```

#### Exemple de requête
```bash
PATCH /api/v2/agents/johnny
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "temperature": 0.7,
  "description": "Agent optimisé pour les analyses rapides"
}
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "agent": {
    "id": "uuid-123",
    "slug": "johnny",
    "display_name": "Johnny Query Pro",
    "description": "Agent optimisé pour les analyses rapides",
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    "temperature": 0.7,
    "max_tokens": 12000,
    "updated_at": "2024-01-15T11:15:00Z"
  },
  "message": "Agent mis à jour partiellement avec succès",
  "metadata": {
    "agentId": "johnny",
    "executionTime": 95,
    "timestamp": "2024-01-15T11:15:00Z"
  }
}
```

---

### 5. **DELETE** `/api/v2/agents/{agentId}` - Supprimer un agent

Supprime un agent spécialisé (soft delete - désactivation).

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Exemple de requête
```bash
DELETE /api/v2/agents/test-agent
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "message": "Agent supprimé avec succès",
  "metadata": {
    "agentId": "test-agent",
    "executionTime": 60,
    "timestamp": "2024-01-15T11:30:00Z"
  }
}
```

#### Réponse d'erreur (404)
```json
{
  "success": false,
  "error": "Agent test-agent not found",
  "code": "AGENT_NOT_FOUND",
  "metadata": {
    "agentId": "test-agent",
    "executionTime": 25,
    "timestamp": "2024-01-15T11:30:00Z"
  }
}
```

---

### 6. **HEAD** `/api/v2/agents/{agentId}` - Vérifier l'existence

Vérifie rapidement l'existence d'un agent spécialisé.

#### Paramètres
- `agentId` (string, requis) : Slug ou UUID de l'agent

#### Exemple de requête
```bash
HEAD /api/v2/agents/johnny
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Réponse de succès (200)
```
HTTP/1.1 200 OK
X-Agent-Name: Johnny Query Pro
X-Agent-Model: meta-llama/llama-4-scout-17b-16e-instruct
X-Agent-Provider: groq
X-Agent-Active: true
X-Agent-Chat: false
X-Agent-Endpoint: true
```

#### Réponse d'erreur (404)
```
HTTP/1.1 404 Not Found
```

---

## 🔧 Endpoints de Gestion

### **GET** `/api/v2/agents` - Liste tous les agents

Récupère la liste de tous les agents spécialisés disponibles.

#### Exemple de requête
```bash
GET /api/v2/agents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Réponse de succès (200)
```json
{
  "success": true,
  "agents": [
    {
      "id": "uuid-1",
      "slug": "johnny",
      "display_name": "Johnny Query Pro",
      "description": "Agent spécialisé dans l'analyse de notes et d'images",
      "model": "meta-llama/llama-4-scout-17b-16e-instruct",
      "is_active": true
    },
    {
      "id": "uuid-2",
      "slug": "vision",
      "display_name": "Vision",
      "description": "Agent multimodal pour analyse d'images complexes",
      "model": "meta-llama/llama-4-maverick-17b-128e-instruct",
      "is_active": true
    }
  ],
  "metadata": {
    "total": 2,
    "timestamp": "2024-01-15T11:45:00Z"
  }
}
```

---

## 🎯 Agents Pré-configurés

### **Johnny Query** (`johnny`)
- **Modèle** : `meta-llama/llama-4-scout-17b-16e-instruct`
- **Rôle** : Analyse de notes et d'images
- **Capacités** : Texte, images, function calling
- **Input** : `{ noteId, query, imageUrl? }`
- **Output** : `{ answer, confidence }`

### **Formateur** (`formatter`)
- **Modèle** : `meta-llama/llama-4-scout-17b-16e-instruct`
- **Rôle** : Mise en forme de documents
- **Capacités** : Texte, images, function calling
- **Input** : `{ noteId, formatInstruction, imageUrl? }`
- **Output** : `{ success, formattedContent, changes }`

### **Vision** (`vision`)
- **Modèle** : `meta-llama/llama-4-maverick-17b-128e-instruct`
- **Rôle** : Analyse d'images complexes
- **Capacités** : Texte, images, function calling
- **Input** : `{ imageUrl, task, noteId? }`
- **Output** : `{ analysis, extractedText, confidence, elements }`

---

## 📊 Codes de Réponse

| Code | Description | Cas d'usage |
|------|-------------|-------------|
| **200** | Succès | Opération réussie |
| **201** | Créé | Agent créé avec succès |
| **400** | Bad Request | Données invalides |
| **401** | Unauthorized | Authentification requise |
| **404** | Not Found | Agent non trouvé |
| **500** | Internal Server Error | Erreur serveur |

---

## 🔍 Codes d'Erreur Spécifiques

| Code | Description |
|------|-------------|
| `AUTHENTICATION_ERROR` | Problème d'authentification |
| `INVALID_INPUT` | Données d'entrée invalides |
| `AGENT_NOT_FOUND` | Agent non trouvé |
| `EXECUTION_ERROR` | Erreur lors de l'exécution |
| `VALIDATION_ERROR` | Erreur de validation |

---

## 🛡️ Sécurité et Validation

### **Validation des Données**
- Schémas JSON stricts pour tous les inputs/outputs
- Validation des types de données
- Contrôle des valeurs (temperature: 0-2, max_tokens: 1-8192)
- Validation des slugs (lettres minuscules, chiffres, tirets uniquement)

### **Authentification**
- Token Bearer requis pour toutes les opérations
- Vérification de la validité du token
- Support des cookies de session

### **Gestion des Erreurs**
- Messages d'erreur détaillés
- Codes d'erreur spécifiques
- Logs de traçabilité complets
- Gestion des timeouts

---

## 🚀 Exemples d'Intégration

### **JavaScript/TypeScript**
```typescript
// Exécuter un agent
const response = await fetch('/api/v2/agents/johnny', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    input: {
      noteId: 'note-123',
      query: 'Analyse cette note',
      imageUrl: 'https://example.com/image.jpg'
    }
  })
});

const result = await response.json();
console.log(result.answer);
```

### **Python**
```python
import requests

# Mettre à jour un agent
response = requests.patch(
    'https://abrege.app/api/v2/agents/johnny',
    headers={'Authorization': f'Bearer {token}'},
    json={'temperature': 0.7}
)

result = response.json()
print(result['message'])
```

### **cURL**
```bash
# Créer un nouvel agent
curl -X POST "https://abrege.app/api/v2/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "slug": "mon-agent",
    "display_name": "Mon Agent",
    "description": "Description de mon agent",
    "model": "meta-llama/llama-4-scout-17b-16e-instruct"
  }'
```

---

## 📝 Notes Importantes

1. **Soft Delete** : La suppression désactive l'agent au lieu de le supprimer définitivement
2. **Cache** : Les modifications invalident automatiquement le cache
3. **Logs** : Toutes les opérations sont loggées avec des traceId uniques
4. **Multimodal** : Support natif des images via les modèles Llama 4
5. **Validation** : Validation stricte des schémas JSON à chaque opération

---

## 🔗 Liens Utiles

- [Documentation API v2 complète](./API-V2-DOCUMENTATION-COMPLETE.md)
- [Architecture des agents spécialisés](../architecture/ARCHITECTURE-AGENTS-SPECIALISES.md)
- [Guide d'intégration multimodale](./MULTIMODAL-INTEGRATION-GUIDE.md)
- [Schéma OpenAPI dynamique](./openapi-schema.md)

---

**🎉 Documentation complète des endpoints CRUD des agents spécialisés !**
