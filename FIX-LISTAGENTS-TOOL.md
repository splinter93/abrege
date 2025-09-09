# 🔧 Correction de l'outil listAgents

## ❌ Problème Identifié

L'outil `listAgents` n'était pas défini dans `ApiV2Tools.ts` et n'était pas mappé dans l'OpenAPI Tool Executor, ce qui causait l'erreur **"Tool non supporté: listAgents"**.

## ✅ Solution Appliquée

### 1. Ajout de l'outil manquant

**Fichier:** `src/services/llm/tools/ApiV2Tools.ts`

```typescript
// ============================================================================
// TOOLS POUR LES AGENTS SPÉCIALISÉS
// ============================================================================

{
  type: 'function',
  function: {
    name: 'listAgents',
    description: 'Lister tous les agents spécialisés disponibles',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
```

### 2. Ajout du mapping dans l'OpenAPI Tool Executor

**Fichier:** `src/services/llm/openApiToolExecutor.ts`

```typescript
// Agents spécialisés
'listAgents': { method: 'GET', path: '/api/v2/agents' }
```

### 3. Vérification de l'endpoint

**Fichier:** `src/app/api/v2/agents/route.ts` ✅
- Endpoint GET `/api/v2/agents` existant et fonctionnel
- Authentification V2 implémentée
- Retourne la liste des agents spécialisés avec métadonnées complètes

## 🎯 Résultat

L'outil `listAgents` est maintenant :
- ✅ **Défini** dans `ApiV2Tools.ts`
- ✅ **Mappé** dans l'OpenAPI Tool Executor
- ✅ **Endpoint** `/api/v2/agents` fonctionnel
- ✅ **Authentification** V2 implémentée

## 🚀 Test

L'outil `listAgents` devrait maintenant fonctionner correctement et retourner la liste des agents spécialisés disponibles au lieu de l'erreur "Tool non supporté".

### Réponse attendue

```json
{
  "success": true,
  "data": [
    {
      "id": "agent-id",
      "name": "Nom de l'agent",
      "slug": "slug-agent",
      "description": "Description de l'agent",
      "is_active": true,
      "agent_type": "chat",
      "model": "gpt-4",
      "provider": "openai",
      "capabilities": ["function_calls"],
      "temperature": 0.7,
      "max_tokens": 4000,
      "priority": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "metadata": {
    "timestamp": "2024-01-01T00:00:00Z",
    "executionTime": 150,
    "totalCount": 1
  }
}
```

---

**🔧 Correction appliquée avec succès !**



