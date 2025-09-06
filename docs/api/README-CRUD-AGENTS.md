# 📚 Documentation Endpoints CRUD - Agents Spécialisés

## 🎯 Vue d'ensemble

Cette section contient la documentation complète des endpoints CRUD (Create, Read, Update, Delete) pour la gestion des agents spécialisés dans l'API v2 d'Abrège.

## 📋 Documents Disponibles

### 📖 **Documentation Complète**
- **[ENDPOINTS-CRUD-AGENTS-SPECIALISES.md](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md)**
  - Documentation détaillée de tous les endpoints
  - Exemples de requêtes et réponses
  - Codes d'erreur et validation
  - Intégration dans différents langages

### ⚡ **Guide de Démarrage Rapide**
- **[QUICKSTART-CRUD-AGENTS.md](./QUICKSTART-CRUD-AGENTS.md)**
  - Démarrage en 5 minutes
  - Exemples pratiques
  - Intégration JavaScript/Python
  - Résolution des erreurs courantes

### 📖 **Référence Rapide**
- **[REFERENCE-CRUD-AGENTS.md](./REFERENCE-CRUD-AGENTS.md)**
  - Tableau de référence des endpoints
  - Exemples cURL/JavaScript/Python
  - Codes de réponse et erreurs
  - Validation des paramètres

## 🚀 Endpoints Disponibles

| Méthode | Endpoint | Description | Documentation |
|---------|----------|-------------|---------------|
| `GET` | `/api/v2/agents/{agentId}` | Récupérer un agent | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#1-get-apiv2agentsagentid---récupérer-un-agent) |
| `POST` | `/api/v2/agents/{agentId}` | Exécuter un agent | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#2-post-apiv2agentsagentid---exécuter-un-agent) |
| `PUT` | `/api/v2/agents/{agentId}` | Mise à jour complète | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#3-put-apiv2agentsagentid---mise-à-jour-complète) |
| `PATCH` | `/api/v2/agents/{agentId}` | Mise à jour partielle | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#4-patch-apiv2agentsagentid---mise-à-jour-partielle) |
| `DELETE` | `/api/v2/agents/{agentId}` | Supprimer un agent | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#5-delete-apiv2agentsagentid---supprimer-un-agent) |
| `HEAD` | `/api/v2/agents/{agentId}` | Vérifier existence | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#6-head-apiv2agentsagentid---vérifier-lexistence) |
| `GET` | `/api/v2/agents` | Liste tous les agents | [Détails](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md#get-apiv2agents---liste-tous-les-agents) |

## 🤖 Agents Pré-configurés

| Agent | Slug | Modèle | Capacités | Usage |
|-------|------|--------|-----------|-------|
| **Johnny Query** | `johnny` | Llama 4 Scout | Texte + Images | Analyse de notes et d'images |
| **Formateur** | `formatter` | Llama 4 Scout | Texte + Images | Mise en forme de documents |
| **Vision** | `vision` | Llama 4 Maverick | Texte + Images | Analyse d'images complexes |

## 🔧 Fonctionnalités Clés

- ✅ **CRUD Complet** - Create, Read, Update, Delete
- ✅ **Support Multimodal** - Texte + Images
- ✅ **Validation Stricte** - Schémas JSON stricts
- ✅ **Authentification** - Bearer token requis
- ✅ **Cache Intelligent** - Invalidation automatique
- ✅ **Logs Détaillés** - Traçabilité complète
- ✅ **Soft Delete** - Suppression sécurisée
- ✅ **Types Stricts** - TypeScript strict

## 🚀 Démarrage Rapide

### 1. **Authentification**
```bash
Authorization: Bearer <votre-token>
```

### 2. **Exécuter un agent**
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

### 3. **Mettre à jour un agent**
```bash
PATCH /api/v2/agents/johnny
{
  "temperature": 0.7
}
```

## 📊 Codes de Réponse

| Code | Description | Cas d'usage |
|------|-------------|-------------|
| `200` | Succès | Opération réussie |
| `201` | Créé | Agent créé |
| `400` | Bad Request | Données invalides |
| `401` | Unauthorized | Auth requise |
| `404` | Not Found | Agent non trouvé |
| `500` | Server Error | Erreur serveur |

## 🔍 Codes d'Erreur

| Code | Description |
|------|-------------|
| `AUTHENTICATION_ERROR` | Problème d'authentification |
| `INVALID_INPUT` | Données d'entrée invalides |
| `AGENT_NOT_FOUND` | Agent non trouvé |
| `EXECUTION_ERROR` | Erreur d'exécution |
| `VALIDATION_ERROR` | Erreur de validation |

## 🛠️ Intégration

### **JavaScript/TypeScript**
```javascript
const response = await fetch('/api/v2/agents/johnny', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    input: { noteId: '123', query: 'test' }
  })
});
```

### **Python**
```python
import requests

response = requests.post(
    'https://abrege.app/api/v2/agents/johnny',
    headers={'Authorization': f'Bearer {token}'},
    json={'input': {'noteId': '123', 'query': 'test'}}
)
```

### **cURL**
```bash
curl -X POST "https://abrege.app/api/v2/agents/johnny" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": {"noteId": "123", "query": "test"}}'
```

## 📚 Liens Utiles

- [Documentation API v2 complète](./API-V2-DOCUMENTATION-COMPLETE.md)
- [Architecture des agents spécialisés](../architecture/ARCHITECTURE-AGENTS-SPECIALISES.md)
- [Guide d'intégration multimodale](./MULTIMODAL-INTEGRATION-GUIDE.md)
- [Schéma OpenAPI dynamique](./openapi-schema.md)

## 🎯 Prochaines Étapes

1. **Lisez** la [documentation complète](./ENDPOINTS-CRUD-AGENTS-SPECIALISES.md)
2. **Testez** avec le [guide de démarrage rapide](./QUICKSTART-CRUD-AGENTS.md)
3. **Consultez** la [référence rapide](./REFERENCE-CRUD-AGENTS.md) pendant le développement
4. **Intégrez** dans votre application

---

**🎉 Documentation complète des endpoints CRUD des agents spécialisés !**

*Dernière mise à jour : 15 janvier 2024*
