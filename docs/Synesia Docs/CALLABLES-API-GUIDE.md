# Synesia Callables API - Guide Complet

> **API pour lister et découvrir tous les callables disponibles dans un projet**

---

## 📋 Table des Matières

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Authentification](#authentification)
- [Endpoint](#endpoint)
- [Types de Callables](#types-de-callables)
- [Structure des Données](#structure-des-données)
- [Exemples Complets](#exemples-complets)
- [Gestion d'Erreurs](#gestion-derreurs)
- [Cas d'Usage](#cas-dusage)
- [Bonnes Pratiques](#bonnes-pratiques)

---

## 🎯 Introduction

L'API Callables permet de **lister tous les callables disponibles** dans un projet Synesia. Un callable est une fonctionnalité exécutable (agent, script, requête HTTP, pipeline) que vous pouvez appeler via l'API d'exécution.

### Cas d'Usage

- 🔍 **Découverte** : Lister tous les callables disponibles dans un projet
- 🔧 **Intégration** : Construire des interfaces dynamiques basées sur les callables disponibles
- 📊 **Documentation** : Générer automatiquement la documentation des callables
- 🎨 **UI Builder** : Créer des formulaires dynamiques basés sur les schémas d'input
- 🔗 **Orchestration** : Découvrir les callables pour les chaîner ensemble

---

## 🚀 Quick Start

### 1. Configuration de Base

```bash
# URL de base de l'API
BASE_URL=https://api.synesia.app

# Authentification (méthode 1 : API Key)
API_KEY=apiKey.12345.abcdef123456

# Authentification (méthode 2 : Bearer Token)
BEARER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROJECT_ID=550e8400-e29b-41d4-a716-446655440000
```

### 2. Premier Appel

```bash
# Avec API Key (recommandé pour outils externes)
curl -X GET "${BASE_URL}/execution" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json"
```

**Réponse :**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "agent",
      "name": "Assistant Client",
      "description": "Agent conversationnel pour le support client",
      "icon": null,
      "group_name": null,
      "input_schema": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string",
            "description": "Message de l'utilisateur"
          }
        }
      },
      "output_schema": {
        "type": "string"
      },
      "customization": {},
      "auth": "NONE",
      "oauth_system_id": null,
      "is_owner": true,
      "slug": "assistant-client"
    }
  ]
}
```

---

## 🔐 Authentification

L'API supporte **deux méthodes d'authentification** :

### Méthode 1 : API Key (Recommandée pour outils externes)

```bash
curl -X GET "${BASE_URL}/execution" \
  -H "x-api-key: apiKey.12345.abcdef123456"
```

**Format de l'API Key :** `apiKey.<id>.<key>`

- L'API Key contient automatiquement le `project_id`
- Pas besoin d'envoyer `x-project-id` séparément
- **Recommandé pour** : Intégrations externes, scripts, outils CLI

### Méthode 2 : Bearer Token (Pour applications web)

```bash
curl -X GET "${BASE_URL}/execution" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "x-project-id: ${PROJECT_ID}"
```

**Format du Bearer Token :** JWT valide

- Nécessite le header `x-project-id` en plus
- **Recommandé pour** : Applications web avec authentification utilisateur

---

## 📡 Endpoint

### GET /execution

Liste tous les callables disponibles pour le projet authentifié.

**URL :** `GET /execution`

**Headers requis :**
```
x-api-key: apiKey.12345.abcdef123456
# OU
Authorization: Bearer <jwt_token>
x-project-id: <project_uuid>
```

**Réponse succès (200) :**
```json
{
  "data": [
    {
      "id": "string (UUID)",
      "type": "agent | script | request | callable-pipeline",
      "name": "string",
      "description": "string | null",
      "icon": "string | null",
      "group_name": "string | null",
      "input_schema": "object (JSON Schema)",
      "output_schema": "object (JSON Schema)",
      "customization": "object",
      "auth": "OAUTH | NONE",
      "oauth_system_id": "string (UUID) | null",
      "is_owner": "boolean",
      "slug": "string | null"
    }
  ]
}
```

**Caractéristiques :**
- ✅ Liste triée par nom (ordre alphabétique)
- ✅ Inclut les callables du projet ET des packages installés
- ✅ Retourne les métadonnées complètes (schémas, auth, etc.)
- ✅ Indique la propriété (`is_owner`)

---

## 🏷️ Types de Callables

### Agent (`agent`)

Agent conversationnel avec IA, supportant outils et connaissances.

**Exemple :**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "agent",
  "name": "Assistant Marketing",
  "description": "Agent spécialisé en marketing digital",
  "input_schema": {
    "type": "object",
    "properties": {
      "message": { "type": "string" },
      "context": { "type": "string" }
    }
  }
}
```

### Script (`script`)

Script déployé (Deno, AWS Lambda) exécutable à la demande.

**Exemple :**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "script",
  "name": "Process Data",
  "description": "Script de traitement de données",
  "input_schema": {
    "type": "object",
    "properties": {
      "data": { "type": "array" }
    }
  }
}
```

### Request (`request`)

Requête HTTP configurable (GET, POST, etc.) vers une API externe.

**Exemple :**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "type": "request",
  "name": "Fetch Weather",
  "description": "Récupère la météo depuis une API",
  "input_schema": {
    "type": "object",
    "properties": {
      "city": { "type": "string" }
    }
  }
}
```

### Callable Pipeline (`callable-pipeline`)

Pipeline de callables chaînés avec logique conditionnelle.

**Exemple :**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "type": "callable-pipeline",
  "name": "Data Processing Pipeline",
  "description": "Pipeline de traitement de données",
  "input_schema": {
    "type": "object",
    "properties": {
      "input_data": { "type": "object" }
    }
  }
}
```

---

## 📊 Structure des Données

### CallableListItem

| Propriété | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `id` | `string` (UUID) | Identifiant unique du callable | `"550e8400-e29b-41d4-a716-446655440000"` |
| `type` | `string` | Type du callable | `"agent"`, `"script"`, `"request"`, `"callable-pipeline"` |
| `name` | `string` | Nom du callable | `"Assistant Client"` |
| `description` | `string \| null` | Description optionnelle | `"Agent conversationnel pour le support"` |
| `icon` | `string \| null` | Nom de l'icône optionnelle | `"Chat"`, `null` |
| `group_name` | `string \| null` | Nom du groupe optionnel | `"Support"`, `null` |
| `input_schema` | `object` | Schéma JSON des inputs (JSON Schema) | Voir [Schémas](#schémas) |
| `output_schema` | `object` | Schéma JSON des outputs (JSON Schema) | Voir [Schémas](#schémas) |
| `customization` | `object` | Données de personnalisation (structure dépend du type) | `{}` |
| `auth` | `"OAUTH" \| "NONE"` | Type d'authentification requis | `"NONE"`, `"OAUTH"` |
| `oauth_system_id` | `string (UUID) \| null` | ID du système OAuth si `auth="OAUTH"` | `null`, `"990e8400-..."` |
| `is_owner` | `boolean` | Indique si l'utilisateur est propriétaire | `true`, `false` |
| `slug` | `string \| null` | Slug unique optionnel pour accès par nom | `"assistant-client"`, `null` |

### Schémas

Les `input_schema` et `output_schema` suivent le format **JSON Schema**.

**Exemple d'input_schema :**
```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "Message de l'utilisateur"
    },
    "temperature": {
      "type": "number",
      "minimum": 0,
      "maximum": 2,
      "default": 0.7,
      "description": "Température de génération"
    }
  },
  "required": ["message"]
}
```

**Exemple d'output_schema :**
```json
{
  "type": "object",
  "properties": {
    "response": {
      "type": "string"
    },
    "confidence": {
      "type": "number"
    }
  }
}
```

---

## 💻 Exemples Complets

### JavaScript/TypeScript

```typescript
interface CallableListItem {
  id: string;
  type: 'agent' | 'script' | 'request' | 'callable-pipeline';
  name: string;
  description: string | null;
  icon: string | null;
  group_name: string | null;
  input_schema: unknown;
  output_schema: unknown;
  customization: unknown;
  auth: 'OAUTH' | 'NONE';
  oauth_system_id: string | null;
  is_owner: boolean;
  slug: string | null;
}

async function listCallables(apiKey: string): Promise<CallableListItem[]> {
  const response = await fetch('https://api.synesia.app/execution', {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// Utilisation
const callables = await listCallables('apiKey.12345.abcdef123456');
console.log(`Found ${callables.length} callables`);

// Filtrer par type
const agents = callables.filter(c => c.type === 'agent');
console.log(`Found ${agents.length} agents`);

// Trouver un callable par slug
const assistant = callables.find(c => c.slug === 'assistant-client');
if (assistant) {
  console.log(`Found assistant: ${assistant.name}`);
}
```

### Python

```python
import requests
from typing import List, Dict, Any, Optional

def list_callables(api_key: str) -> List[Dict[str, Any]]:
    """
    Liste tous les callables disponibles pour le projet.
    
    Args:
        api_key: Clé API au format 'apiKey.<id>.<key>'
    
    Returns:
        Liste des callables avec leurs métadonnées
    """
    url = "https://api.synesia.app/execution"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    result = response.json()
    return result["data"]

# Utilisation
callables = list_callables("apiKey.12345.abcdef123456")
print(f"Found {len(callables)} callables")

# Filtrer par type
agents = [c for c in callables if c["type"] == "agent"]
print(f"Found {len(agents)} agents")

# Trouver un callable par slug
assistant = next((c for c in callables if c.get("slug") == "assistant-client"), None)
if assistant:
    print(f"Found assistant: {assistant['name']}")
```

### cURL

```bash
#!/bin/bash

# Configuration
BASE_URL="https://api.synesia.app"
API_KEY="apiKey.12345.abcdef123456"

# Lister les callables
echo "Fetching callables..."
response=$(curl -s -X GET "${BASE_URL}/execution" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json")

# Vérifier le statut
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/execution" \
  -H "x-api-key: ${API_KEY}")

if [ "$http_code" -eq 200 ]; then
  echo "✅ Success!"
  echo "$response" | jq '.data | length' | xargs echo "Total callables:"
  echo "$response" | jq '.data[] | {name, type, slug}'
else
  echo "❌ Error: HTTP $http_code"
  echo "$response"
fi
```

### Node.js avec Axios

```javascript
const axios = require('axios');

async function listCallables(apiKey) {
  try {
    const response = await axios.get('https://api.synesia.app/execution', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    return response.data.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `API Error ${error.response.status}: ${error.response.data.error?.message || error.message}`
      );
    }
    throw error;
  }
}

// Utilisation
(async () => {
  try {
    const callables = await listCallables('apiKey.12345.abcdef123456');
    console.log(`Found ${callables.length} callables`);

    // Grouper par type
    const byType = callables.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {});
    console.log('By type:', byType);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
```

---

## ⚠️ Gestion d'Erreurs

### Codes de Statut HTTP

| Code | Signification | Description |
|------|---------------|-------------|
| `200` | ✅ Succès | Liste des callables retournée avec succès |
| `404` | ❌ Non trouvé | Projet introuvable ou erreur de base de données |
| `500` | ❌ Erreur serveur | Erreur interne du serveur |
| `401` | ❌ Non autorisé | Authentification invalide ou manquante |

### Format d'Erreur

```json
{
  "data": null,
  "error": {
    "message": "Failed to list callables for project 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Exemples de Gestion d'Erreurs

**JavaScript/TypeScript :**
```typescript
async function listCallablesSafe(apiKey: string) {
  try {
    const response = await fetch('https://api.synesia.app/execution', {
      headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Python :**
```python
import requests
from requests.exceptions import RequestException

def list_callables_safe(api_key: str):
    try:
        response = requests.get(
            "https://api.synesia.app/execution",
            headers={"x-api-key": api_key},
            timeout=10
        )
        response.raise_for_status()
        return {"success": True, "data": response.json()["data"]}
    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        return {
            "success": False,
            "error": error_data.get("error", {}).get("message", str(e))
        }
    except RequestException as e:
        return {"success": False, "error": str(e)}
```

---

## 🎯 Cas d'Usage

### 1. Interface de Sélection Dynamique

Créer un sélecteur de callables dans votre application :

```typescript
async function buildCallableSelector(apiKey: string) {
  const callables = await listCallables(apiKey);
  
  // Grouper par type
  const grouped = callables.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, CallableListItem[]>);

  // Créer l'interface
  return Object.entries(grouped).map(([type, items]) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    options: items.map(c => ({
      value: c.id,
      label: c.name,
      description: c.description,
    })),
  }));
}
```

### 2. Génération de Documentation

Générer automatiquement la documentation des callables :

```typescript
function generateCallableDocs(callables: CallableListItem[]): string {
  return callables.map(c => `
## ${c.name}

**Type:** ${c.type}  
**ID:** \`${c.id}\`  
${c.slug ? `**Slug:** \`${c.slug}\`` : ''}

${c.description || 'No description'}

### Input Schema
\`\`\`json
${JSON.stringify(c.input_schema, null, 2)}
\`\`\`

### Output Schema
\`\`\`json
${JSON.stringify(c.output_schema, null, 2)}
\`\`\`
  `).join('\n\n');
}
```

### 3. Validation de Schémas

Valider les inputs avant d'appeler un callable :

```typescript
import Ajv from 'ajv';

function validateCallableInput(
  callable: CallableListItem,
  input: unknown
): { valid: boolean; errors?: string[] } {
  const ajv = new Ajv();
  const validate = ajv.compile(callable.input_schema as object);
  
  const valid = validate(input);
  if (!valid) {
    return {
      valid: false,
      errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`),
    };
  }
  
  return { valid: true };
}
```

### 4. Découverte de Callables pour Orchestration

Découvrir les callables disponibles pour les chaîner :

```typescript
async function discoverCallableChain(apiKey: string, startType: string) {
  const callables = await listCallables(apiKey);
  
  // Trouver les callables compatibles
  const compatible = callables.filter(c => {
    // Logique de compatibilité basée sur les schémas
    return c.type !== startType;
  });
  
  return compatible.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    canChain: true, // Logique de validation à implémenter
  }));
}
```

---

## ✅ Bonnes Pratiques

### 1. Cache les Résultats

Les callables ne changent pas fréquemment. Mettez en cache la liste :

```typescript
let callablesCache: {
  data: CallableListItem[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedCallables(apiKey: string) {
  const now = Date.now();
  
  if (callablesCache && (now - callablesCache.timestamp) < CACHE_TTL) {
    return callablesCache.data;
  }
  
  const callables = await listCallables(apiKey);
  callablesCache = { data: callables, timestamp: now };
  
  return callables;
}
```

### 2. Gestion des Erreurs Robuste

Toujours gérer les erreurs réseau et API :

```typescript
async function listCallablesWithRetry(
  apiKey: string,
  maxRetries = 3
): Promise<CallableListItem[]> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await listCallables(apiKey);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Filtrage Efficace

Utilisez le filtrage côté client pour des performances optimales :

```typescript
function filterCallables(
  callables: CallableListItem[],
  filters: {
    type?: string;
    hasSlug?: boolean;
    isOwner?: boolean;
    auth?: 'OAUTH' | 'NONE';
  }
): CallableListItem[] {
  return callables.filter(c => {
    if (filters.type && c.type !== filters.type) return false;
    if (filters.hasSlug !== undefined && !!c.slug !== filters.hasSlug) return false;
    if (filters.isOwner !== undefined && c.is_owner !== filters.isOwner) return false;
    if (filters.auth && c.auth !== filters.auth) return false;
    return true;
  });
}
```

### 4. Utilisation du Slug

Préférez le slug pour l'accès par nom (plus lisible) :

```typescript
function findCallableBySlug(
  callables: CallableListItem[],
  slug: string
): CallableListItem | undefined {
  return callables.find(c => c.slug === slug);
}

// Plus lisible que par ID
const assistant = findCallableBySlug(callables, 'assistant-client');
```

### 5. Validation des Schémas

Validez toujours les schémas avant utilisation :

```typescript
function isValidJSONSchema(schema: unknown): boolean {
  if (typeof schema !== 'object' || schema === null) return false;
  const s = schema as Record<string, unknown>;
  return typeof s.type === 'string';
}

function getValidCallables(callables: CallableListItem[]) {
  return callables.filter(c => 
    isValidJSONSchema(c.input_schema) && 
    isValidJSONSchema(c.output_schema)
  );
}
```

---

## 🔗 Liens Utiles

- **Exécution de callables** : `POST /execution` ou `POST /execution/{callable_id}`
- **Documentation LLM Exec** : Voir `docs/LLM-EXEC-API-GUIDE.md`
- **API Knowledge** : Voir `docs/KNOWLEDGE-API-GUIDE.md`
- **API Memory** : Voir `docs/MEMORY-API-GUIDE.md`

---

## 📝 Notes Importantes

1. **Tri** : Les callables sont toujours triés par nom (ordre alphabétique)
2. **Packages** : Les callables des packages installés sont inclus avec `is_owner: false`
3. **Schémas** : Les `input_schema` et `output_schema` suivent JSON Schema Draft 7
4. **Slug** : Le slug est optionnel et peut être `null` pour les callables sans nom personnalisé
5. **Auth** : Les callables avec `auth: "OAUTH"` nécessitent une configuration OAuth avant exécution

---

**Version :** 1.0  
**Dernière mise à jour :** 2025-01-28

