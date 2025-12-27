# 📘 Guide OpenAPI - Synesia Schemas

**Date de création** : 2 octobre 2025  
**Auteur** : Agent Synesia (Claude Sonnet 4.5)  
**Objectif** : Documentation des erreurs rencontrées et bonnes pratiques pour la création de schémas OpenAPI

---

## 🎯 Contexte

Ce document référence les erreurs rencontrées lors de la création initiale des schémas OpenAPI pour l'API Synesia, ainsi que les solutions et recommandations pour les agents IA futurs.

---

## 🐛 Erreurs Rencontrées et Solutions

### Erreur 1 : Responses en Array au lieu d'Objet

**Date** : 2 octobre 2025  
**Sévérité** : 🔴 Critique  
**Source** : Bug MCP Factoria (maintenant corrigé)

#### ❌ Symptôme
```
Error: 'list' object has no attribute 'keys'
Error: Failed to parse OpenAPI spec
```

#### 🔍 Cause
Le MCP Factoria acceptait les responses en format array (pratique pour les IA) mais ne les convertissait pas correctement en format OpenAPI standard.

#### ❌ Format incorrect (array)
```json
{
  "responses": [
    {"status": 200, "description": "Success"},
    {"status": 400, "description": "Bad Request"}
  ]
}
```

#### ✅ Format correct (objet)
```json
{
  "responses": {
    "200": {"description": "Success"},
    "400": {"description": "Bad Request"}
  }
}
```

#### 🛠️ Solution
- ✅ Bug corrigé dans le MCP Factoria le 2 octobre 2025
- ✅ Le MCP convertit maintenant automatiquement array → objet
- ✅ Accepte à la fois `status` et `statusCode` (numérique ou string)

#### 📝 Note pour l'agent futur
Lorsque tu utilises le MCP Factoria, tu peux passer les responses en array (c'est plus pratique), il gérera la conversion. Mais si tu édites le JSON directement, utilise **toujours** le format objet.

---

### Erreur 2 : Array sans propriété `items`

**Date** : 2 octobre 2025  
**Sévérité** : 🟠 Moyenne  
**Source** : ❌ Erreur de l'agent IA (moi)

#### ❌ Symptôme
```
Error: array schema missing items
In context: (..., 'properties', 'value', 'oneOf', '4')
```

#### 🔍 Cause
En OpenAPI 3.x, **tout** schéma de type `array` DOIT avoir une propriété `items` qui définit le type des éléments.

#### ❌ Format incorrect
```json
{
  "type": "array"
}
```

#### ✅ Format correct
```json
{
  "type": "array",
  "items": {}  // Accepte n'importe quel type
}
```

```json
{
  "type": "array",
  "items": {
    "type": "string"  // Tableau de strings uniquement
  }
}
```

#### 📝 Note pour l'agent futur
**TOUJOURS** ajouter `items` pour les arrays, même si c'est `{}` (accepte tout). Ne jamais laisser un `"type": "array"` seul.

---

### Erreur 3 : Section `security` globale manquante

**Date** : 2 octobre 2025  
**Sévérité** : 🟡 Faible (mais bloque certains parsers)  
**Source** : ❌ Erreur de l'agent IA (moi)

#### ❌ Symptôme
```
Error: Cannot parse OpenAPI spec
Factoria ne détecte pas l'authentification
```

#### 🔍 Cause
Certains outils (dont Factoria, ChatGPT, Swagger UI) s'attendent à une déclaration de sécurité au niveau racine, même si chaque endpoint déclare individuellement sa sécurité.

#### ❌ Format incomplet
```json
{
  "openapi": "3.1.0",
  "info": {...},
  "servers": [...],
  // ← Manque "security" ici
  "components": {
    "securitySchemes": {...}
  },
  "paths": {
    "/endpoint": {
      "get": {
        "security": [{"ApiKeyAuth": []}]  // ← Déclaré uniquement ici
      }
    }
  }
}
```

#### ✅ Format complet
```json
{
  "openapi": "3.1.0",
  "info": {...},
  "servers": [...],
  "security": [              // ← Sécurité globale (défaut)
    {"ApiKeyAuth": []}
  ],
  "components": {
    "securitySchemes": {...}
  },
  "paths": {
    "/endpoint": {
      "get": {
        "security": [{"ApiKeyAuth": []}]  // ← Optionnel si global existe
      }
    }
  }
}
```

#### 📝 Note pour l'agent futur
**TOUJOURS** déclarer `security` au niveau racine juste après `servers`. Cela définit la sécurité par défaut pour toute l'API.

---

### Erreur 4 : `components.schemas` manquant

**Date** : 2 octobre 2025  
**Sévérité** : 🟡 Faible  
**Source** : ❌ Erreur de l'agent IA (moi)

#### ❌ Symptôme
```
Error: In components section, schemas subsection is not an object
```

#### 🔍 Cause
La section `components` doit contenir des sous-sections qui sont des **objets**, même vides.

#### ❌ Format incorrect
```json
{
  "components": {
    "securitySchemes": {...}
    // ← Manque "schemas"
  }
}
```

#### ✅ Format correct
```json
{
  "components": {
    "schemas": {},  // ← Obligatoire, même vide
    "securitySchemes": {...}
  }
}
```

#### 📝 Note pour l'agent futur
Toujours initialiser `components.schemas` à `{}` au minimum. C'est là que tu stockeras les schémas réutilisables avec `$ref`.

---

## ✅ Checklist Complète OpenAPI 3.1.0

Utilise cette checklist pour **chaque nouveau schéma** :

### 📋 Structure de base (ordre recommandé)

```json
{
  "openapi": "3.1.0",                    // ✅ Version
  "info": {                              // ✅ Métadonnées
    "title": "...",
    "version": "1.0.0",
    "description": "..."
  },
  "servers": [                           // ✅ Serveurs
    {"url": "https://api.synesia.app"}
  ],
  "security": [                          // ✅ Sécurité globale
    {"ApiKeyAuth": []}
  ],
  "components": {                        // ✅ Composants réutilisables
    "schemas": {},                       // ✅ TOUJOURS présent (même vide)
    "securitySchemes": {                 // ✅ Définition de la sécurité
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "Authorization",
        "description": "Format: ApiKey apiKey.{id}.{key}"
      }
    }
  },
  "paths": {                             // ✅ Endpoints
    "/endpoint": {
      "get": {
        "tags": ["..."],
        "summary": "...",
        "description": "...",
        "operationId": "...",
        "security": [{"ApiKeyAuth": []}], // ✅ Par endpoint (optionnel si global défini)
        "parameters": [],
        "requestBody": {...},
        "responses": {                    // ✅ OBJET, pas array !
          "200": {...},                   // ✅ String, pas number
          "400": {...}
        }
      }
    }
  }
}
```

### 🔥 Points critiques à vérifier

| ✅ | Élément | Vérification |
|----|---------|--------------|
| ☑️ | `responses` | Est-ce un **objet** ? Codes HTTP en **string** ? |
| ☑️ | Arrays | Chaque `"type": "array"` a-t-il `"items"` ? |
| ☑️ | Objects | Chaque `"type": "object"` a-t-il `"properties"` (même vide) ? |
| ☑️ | `security` global | Déclaré après `servers` ? |
| ☑️ | `components.schemas` | Existe-t-il (même vide) ? |
| ☑️ | `$ref` | Pointe vers `#/components/schemas/...` ? |
| ☑️ | Headers | Documentés dans description (pas comme paramètres) ? |
| ☑️ | `oneOf/anyOf` | Utilisé uniquement quand nécessaire ? |

---

## 🤖 Prompting pour l'Agent Futur Spécialisé

### Prompt d'initialisation

```markdown
Tu es un agent spécialisé dans la création de schémas OpenAPI 3.1.0 pour l'API Synesia.

RÈGLES STRICTES :

1. **Structure JSON** :
   - `responses` DOIT être un OBJET avec codes HTTP en STRING : {"200": {...}, "400": {...}}
   - JAMAIS un array : [{"status": 200, ...}]
   - Codes HTTP toujours en string : "200" pas 200

2. **Arrays** :
   - Tout schéma avec "type": "array" DOIT avoir "items"
   - Minimum : {"type": "array", "items": {}}
   - Spécifique : {"type": "array", "items": {"type": "string"}}

3. **Objects** :
   - Tout schéma avec "type": "object" DOIT avoir "properties"
   - Minimum : {"type": "object", "properties": {}}
   - Même si tu utilises "additionalProperties": true

4. **Sécurité** :
   - Toujours déclarer "security" au niveau racine après "servers"
   - Format : "security": [{"ApiKeyAuth": []}] ou [] pour public
   - Utiliser le schéma ApiKeyAuth de Synesia

5. **Descriptions** :
   - LIMITE : 300 caractères maximum
   - Être concis et précis
   - Détails supplémentaires → section x-synesia

6. **RequestBody** :
   - ChatGPT exige "type": "object" (pas oneOf à la racine)
   - Pour payloads flexibles : type object + additionalProperties: true
   - Différencier via examples, pas oneOf

7. **Components** :
   - Toujours inclure "schemas": {} dans components (même vide)
   - Créer des schémas réutilisables pour éviter la duplication
   - Utiliser $ref pour référencer : "#/components/schemas/NomSchema"

8. **Ordre de structure** :
   openapi → info → servers → security → components → paths

9. **Validation** :
   - Vérifier la structure avec un validateur OpenAPI avant de livrer
   - Tester le schéma dans Swagger Editor
   - S'assurer qu'il est parsable par ChatGPT et Factoria

AUTHENTIFICATION SYNESIA :
- Type: apiKey
- Header: Authorization
- Format: "ApiKey apiKey.{id}.{key}"

ENDPOINTS PUBLICS (sans auth) :
- /webhooks/{id} - Utiliser security: [] pour override

EXEMPLES À INCLURE :
- Toujours fournir des exemples concrets pour requestBody
- Toujours fournir des exemples de réponses (success et error)
- Utiliser des données réalistes de Synesia
```

### Prompt de vérification pré-livraison

```markdown
Avant de livrer un schéma OpenAPI, VÉRIFIER :

✅ Structure :
   - [ ] "openapi": "3.1.0" présent ?
   - [ ] "security" global déclaré après "servers" ?
   - [ ] "components.schemas" existe (même vide) ?

✅ Responses :
   - [ ] Chaque endpoint a "responses" en OBJET ?
   - [ ] Codes HTTP en STRING ("200" pas 200) ?
   - [ ] Inclut 200, 400, 401 au minimum ?

✅ Arrays :
   - [ ] Chaque "type": "array" a "items" ?
   - [ ] Items défini correctement ?

✅ Sécurité :
   - [ ] ApiKeyAuth défini dans securitySchemes ?
   - [ ] Format Synesia documenté ?

✅ Qualité :
   - [ ] Descriptions claires et complètes ?
   - [ ] Exemples réalistes fournis ?
   - [ ] Tags cohérents pour regrouper ?

Si TOUTES les cases sont cochées → Livrer
Sinon → Corriger avant de livrer
```

### Prompt de création d'endpoint

```markdown
Quand tu ajoutes un endpoint, UTILISER CE TEMPLATE :

{
  "paths": {
    "/votre-endpoint": {
      "post": {
        "tags": ["Catégorie"],
        "summary": "Description courte",
        "description": "Description détaillée du comportement",
        "operationId": "operation_unique_id",
        "security": [{"ApiKeyAuth": []}],  // ← NE PAS OUBLIER (sauf endpoints publics)
        "parameters": [],                  // ← Vide si pas de params
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["champ1"],
                "properties": {
                  "champ1": {
                    "type": "string",
                    "description": "..."
                  },
                  "tableau": {
                    "type": "array",
                    "items": {"type": "string"}  // ← NE PAS OUBLIER items !
                  }
                }
              },
              "examples": {              // ← TOUJOURS fournir des exemples
                "exemple1": {
                  "summary": "Cas simple",
                  "value": {...}
                }
              }
            }
          }
        },
        "responses": {                   // ← OBJET, pas array !
          "200": {                       // ← String, pas number !
            "description": "Succès",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {...}
                },
                "example": {...}         // ← Exemple de réponse
              }
            }
          },
          "400": {
            "description": "Requête invalide",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"  // ← Réutiliser
                }
              }
            }
          },
          "401": {
            "description": "Authentification invalide",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### Erreur 5 : Object sans `properties`

**Date** : 2 octobre 2025  
**Sévérité** : 🟠 Moyenne  
**Source** : ❌ Erreur de l'agent IA (moi)

#### ❌ Symptôme
```
Error: object schema missing properties
In context: ('components', 'schemas', 'GenericWebhookPayload')
```

#### 🔍 Cause
En OpenAPI 3.x, un schéma de type `object` doit avoir une propriété `properties`, même si elle est vide. L'utilisation de `additionalProperties: true` seul n'est pas suffisante.

#### ❌ Format incorrect
```json
{
  "type": "object",
  "additionalProperties": true
}
```

#### ✅ Format correct
```json
{
  "type": "object",
  "properties": {},  // ← Obligatoire, même vide
  "additionalProperties": true
}
```

#### 📝 Note pour l'agent futur
**TOUJOURS** ajouter `properties: {}` pour les objets, même si tu utilises `additionalProperties: true` pour accepter n'importe quelle propriété. C'est une exigence stricte d'OpenAPI.

---

### Erreur 6 : Headers documentés comme paramètres

**Date** : 2 octobre 2025  
**Sévérité** : 🟡 Faible (warning, pas bloquant)  
**Source** : ⚠️ Limitation du parser

#### ❌ Symptôme
```
Warning: parameter x-signature-ed25519 has location header; ignoring
Warning: parameter x-signature-timestamp has location header; ignoring
```

#### 🔍 Cause
Certains parsers (dont ChatGPT) n'acceptent pas les headers comme paramètres dans la section `parameters`. Ils s'attendent à les voir dans `components/parameters` ou documentés ailleurs.

#### ❌ Format problématique
```json
{
  "parameters": [
    {
      "name": "x-signature-ed25519",
      "in": "header",
      "required": false,
      "schema": {"type": "string"}
    }
  ]
}
```

#### ✅ Format recommandé
Documenter les headers dans la **description** de l'endpoint :

```json
{
  "description": "Point d'entrée webhook.\n\n**Headers optionnels Discord** :\n- `x-signature-ed25519` : Signature\n- `x-signature-timestamp` : Timestamp"
}
```

Ou utiliser `components/parameters` (plus complexe) :
```json
{
  "components": {
    "parameters": {
      "DiscordSignature": {
        "name": "x-signature-ed25519",
        "in": "header",
        "schema": {"type": "string"}
      }
    }
  }
}
```

#### 📝 Note pour l'agent futur
Pour les headers **optionnels** de vérification (Discord, Slack), préfère les documenter dans la description plutôt que comme paramètres. Ça évite les warnings et c'est plus lisible.

---

### Erreur 7 : Description trop longue

**Date** : 2 octobre 2025  
**Sévérité** : 🟡 Faible  
**Source** : ⚠️ Limitation ChatGPT/Factoria

#### ❌ Symptôme
```
Error: description has length 352 exceeding limit of 300
```

#### 🔍 Cause
ChatGPT et certains parsers limitent la longueur des descriptions à **300 caractères maximum**.

#### ❌ Format problématique
```json
{
  "description": "Point d'entrée public pour recevoir des webhooks depuis des services tiers. Gère automatiquement les vérifications spécifiques (Discord ping, Slack challenge, etc.) et exécute le pipeline configuré.\n\nHeaders optionnels Discord :\n- x-signature-ed25519 : Signature de vérification Discord\n- x-signature-timestamp : Timestamp de la requête Discord"
}
```
**(352 caractères - trop long !)**

#### ✅ Format correct
```json
{
  "description": "Point d'entrée public pour webhooks tiers (Discord, Slack, custom). Gère automatiquement les vérifications (ping, challenge) et exécute le pipeline configuré."
}
```
**(< 300 caractères)**

#### 📝 Note pour l'agent futur
- **Limite stricte** : 300 caractères pour les descriptions
- **Si plus de détails nécessaires** : Utiliser la section `x-synesia` pour notes techniques
- **Headers/détails** : Mettre dans des exemples ou documentation externe
- **Astuce** : Compter les caractères avant de valider : `description.length <= 300`

---

### Erreur 8 : oneOf directement dans requestBody

**Date** : 2 octobre 2025  
**Sévérité** : 🟠 Moyenne  
**Source** : ⚠️ Limitation du parser

#### ❌ Symptôme
```
Error: request body schema is not an object schema; skipping
Error: skipping function due to errors
```

#### 🔍 Cause
ChatGPT s'attend à ce que le schema du requestBody soit un objet avec `type: "object"`. L'utilisation de `oneOf` directement à la racine pose problème.

#### ❌ Format problématique
```json
{
  "requestBody": {
    "content": {
      "application/json": {
        "schema": {
          "oneOf": [
            {"$ref": "#/components/schemas/TypeA"},
            {"$ref": "#/components/schemas/TypeB"}
          ]
        }
      }
    }
  }
}
```

#### ✅ Format correct
Pour un payload **flexible** (comme les webhooks), utiliser un objet générique :

```json
{
  "requestBody": {
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {},
          "additionalProperties": true
        },
        "examples": {
          "typeA": {...},
          "typeB": {...}
        }
      }
    }
  }
}
```

Ou si tu veux vraiment discriminer les types, utiliser un wrapper :

```json
{
  "schema": {
    "type": "object",
    "properties": {
      "payload": {
        "oneOf": [...]
      }
    }
  }
}
```

#### 📝 Note pour l'agent futur
- **ChatGPT n'aime pas `oneOf` à la racine du requestBody**
- Pour des payloads **flexibles** (webhooks, etc.) : Utiliser `type: object` avec `additionalProperties: true`
- **Différencier les cas** via les `examples`, pas via `oneOf`
- Les exemples sont souvent plus utiles que oneOf pour les APIs flexibles

---

## 📚 Bonnes Pratiques Synesia

### 1. Schémas Réutilisables (DRY)

Créer des schémas dans `components/schemas` pour éviter la duplication :

```json
{
  "components": {
    "schemas": {
      "ErrorResponse": {
        "type": "object",
        "required": ["data", "error"],
        "properties": {
          "data": {"type": "null"},
          "error": {"type": "string"}
        }
      },
      "SuccessResponse": {
        "type": "object",
        "required": ["data", "error"],
        "properties": {
          "data": {},
          "error": {"type": "null"}
        }
      }
    }
  }
}
```

Puis les référencer :
```json
{
  "responses": {
    "400": {
      "description": "Erreur",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ErrorResponse"
          }
        }
      }
    }
  }
}
```

### 2. Format de Réponse Standard Synesia

La plupart des endpoints Synesia retournent ce format :

```json
{
  "data": <résultat ou null>,
  "error": <message d'erreur ou null>
}
```

Utiliser les schémas `SuccessResponse` et `ErrorResponse` pour cohérence.

### 3. Authentification ApiKey

**Format standard Synesia** :
```
Authorization: ApiKey apiKey.{id}.{key}
```

**Définition dans le schéma** :
```json
{
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "Authorization",
        "description": "Authentification par clé API. Format: ApiKey apiKey.{id}.{key}"
      }
    }
  }
}
```

**Application globale** :
```json
{
  "security": [
    {"ApiKeyAuth": []}
  ]
}
```

**Override pour endpoints publics** :
```json
{
  "paths": {
    "/endpoint-public": {
      "post": {
        "security": []  // ← Vide = pas d'auth du tout
      }
    }
  }
}
```

**Authentification OPTIONNELLE** (webhooks configurables) :
```json
{
  "paths": {
    "/webhooks/{id}": {
      "post": {
        "security": [
          {"ApiKeyAuth": []},  // ← Option 1: Avec ApiKey
          {}                   // ← Option 2: Sans auth (public)
        ]
      }
    }
  }
}
```

Ce pattern dit : "Cet endpoint peut être appelé **soit** avec ApiKey, **soit** sans authentification". Parfait pour les webhooks Synesia où l'auth est configurable !

### 4. Paramètres dans le Path

Quand un paramètre est dans l'URL, utiliser `{param}` et le déclarer :

```json
{
  "paths": {
    "/kv-storages/{id}/entries/{key}": {
      "get": {
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,  // ← TOUJOURS true pour les path params
            "schema": {"type": "string"},
            "description": "ID du KV storage"
          },
          {
            "name": "key",
            "in": "path",
            "required": true,
            "schema": {"type": "string"},
            "description": "Clé de l'entrée (URL-encoded)"
          }
        ]
      }
    }
  }
}
```

### 5. Query Parameters

```json
{
  "parameters": [
    {
      "name": "wait",
      "in": "query",
      "required": false,  // ← Peut être false pour query params
      "schema": {
        "type": "string",
        "enum": ["true", "false"],
        "default": "false"
      },
      "description": "Attendre la fin de l'exécution"
    }
  ]
}
```

### 6. Types Flexibles (oneOf)

Pour accepter plusieurs types (KV storage par exemple) :

```json
{
  "value": {
    "description": "Peut être string, number, object, array, boolean",
    "oneOf": [
      {"type": "string"},
      {"type": "number"},
      {"type": "boolean"},
      {"type": "object"},
      {"type": "array", "items": {}}  // ← NE PAS OUBLIER items !
    ]
  }
}
```

### 7. Exemples Multiples

Toujours fournir plusieurs exemples pour montrer les cas d'usage :

```json
{
  "examples": {
    "simple": {
      "summary": "Cas simple",
      "value": {...}
    },
    "complex": {
      "summary": "Cas complexe avec options",
      "value": {...}
    },
    "error": {
      "summary": "Cas d'erreur",
      "value": {...}
    }
  }
}
```

---

## 🎨 Conventions de Nommage

### operationId
**Format** : `verbe__chemin_avec_underscores`

| Route | Méthode | operationId |
|-------|---------|-------------|
| `/execution` | POST | `post__execution` |
| `/execution/{id}` | POST | `post__execution__id` |
| `/kv-storages/{id}/entries/{key}` | GET | `get__kv_storages__id__entries__key` |

### Tags
Grouper les endpoints par fonctionnalité :

```json
{
  "tags": ["LLM Execution"]     // Pour /llm-exec/*
  "tags": ["Execution"]         // Pour /execution/*
  "tags": ["KV Storage Management"]  // Pour CRUD du storage
  "tags": ["KV Entries"]        // Pour CRUD des entrées
  "tags": ["Memory"]            // Pour /memory/*
  "tags": ["Webhooks"]          // Pour /webhooks/*
}
```

---

## 🚀 Workflow Recommandé

### Pour petits schémas (< 10 endpoints)

1. **Créer un fichier JSON directement**
   ```bash
   touch openapi-schemas/nom-api.json
   ```

2. **Structure de base avec checklist**
   - ✅ openapi, info, servers
   - ✅ security global
   - ✅ components avec schemas: {}
   - ✅ securitySchemes

3. **Ajouter les endpoints un par un**
   - Utiliser le template ci-dessus
   - Vérifier responses en objet
   - Vérifier arrays avec items

4. **Valider avant de livrer**
   ```bash
   # Syntaxe JSON
   jq . schema.json
   
   # Validation OpenAPI (si outil disponible)
   npx @apidevtools/swagger-cli validate schema.json
   ```

### Pour gros schémas (50-200+ endpoints)

1. **Utiliser MCP Factoria directement**
   - Créer le schéma : `create_schema`
   - Configurer métadonnées : `update_metadata`
   - Ajouter endpoints : `add_endpoint` (maintenant corrigé !)
   - Valider : `validate_schema`

2. **Édition granulaire**
   - Lire la map : `read_schema_map_paginated`
   - Focus sur un endpoint : `focus_endpoint`
   - Modifier : `update_endpoint`

3. **Export final**
   - Exporter : `export_schema` (format json)
   - Sauvegarder dans Git
   - Versionner

---

## 🔍 Outils de Validation

### Avant de livrer un schéma :

1. **Validation syntax JSON**
   ```bash
   jq . schema.json > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
   ```

2. **Validation OpenAPI (local)**
   ```bash
   npx @apidevtools/swagger-cli validate schema.json
   ```

3. **Validation en ligne**
   - Swagger Editor : https://editor.swagger.io/
   - Copier-coller le JSON
   - Vérifier qu'il n'y a aucune erreur

4. **Test avec ChatGPT**
   - Importer le schéma dans une GPT Action
   - Tenter un appel
   - Si erreur de parsing → corriger

---

## 📖 Ressources

- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Swagger Editor](https://editor.swagger.io/)
- [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)
- [Factoria MCP Documentation](lien vers ta doc si elle existe)

---

## 📝 Historique des Schémas Créés

| Date | Schéma | Endpoints | Status | Notes |
|------|--------|-----------|--------|-------|
| 2025-12-06 | `llm-tools-tasks.json` | 6 | ✅ Validé | API conversationnelle Tasks pour LLMs - Noms d'agents (pas UUIDs), format condensé, filtres intelligents |
| 2025-12-01 | `llm-exec.json` | 2 | ✅ Validé | POST /llm-exec/round, POST /llm-exec/round/stream - RoundLogger, Provider Selection, MCP Tools |
| 2025-10-02 | `execution.json` | 2 | ✅ Validé | POST /execution, POST /execution/{callable_id} |
| 2025-10-02 | `kv-storage.json` | 9 | ✅ Validé | CRUD KV storage + entries |
| 2025-10-02 | Factoria (execution) | 2 | ✅ Importé | ID: 8e2a89a6-a47a-4f72-83e9-8c18517b6df7 |
| 2025-10-02 | Factoria (llm-exec) | 2 | ✅ Importé | ID: 2a3a5420-a7e0-430f-8125-3b4ecaa1d5a3 |

---

## 🎓 Leçons Apprises

### Ce qui a bien fonctionné ✅
- Créer des schémas réutilisables dans `components/schemas`
- Utiliser des exemples concrets et multiples
- Structurer par tags pour la navigation
- Valider progressivement pendant la création

### Ce qui a posé problème ❌
- Oubli de `items` pour les arrays
- Oubli de `security` global
- Format responses en array (bug MCP Factoria, maintenant corrigé)
- Références `$ref` trop complexes vers paths au lieu de components

### Améliorations futures 🚀
- Créer un template de base réutilisable
- Script de validation automatique
- Générateur de schémas à partir du code TypeScript (extraction auto)
- Tests automatisés pour valider la compatibilité

---

## 💡 Recommandations pour l'Agent Futur

### Avant de commencer
1. Lire **ce document en entier**
2. Avoir le **template de base** sous les yeux
3. Utiliser la **checklist** pour chaque endpoint

### Pendant la création
1. **Un endpoint à la fois** - Ne pas précipiter
2. **Valider au fur et à mesure** - Pas attendre la fin
3. **Tester les exemples** - S'assurer qu'ils sont cohérents
4. **Documenter richement** - Descriptions claires et complètes

### Après la création
1. **Validation complète** avec les outils
2. **Test import** dans ChatGPT/Factoria
3. **Commit dans Git** avec message descriptif
4. **Update ce document** si nouvelles erreurs découvertes

---

## 🆘 Debugging Guide

### Erreur : "responses.keys is not a function"
**Cause** : responses est un array  
**Solution** : Transformer en objet avec codes HTTP comme clés

### Erreur : "array schema missing items"
**Cause** : `"type": "array"` sans `"items"`  
**Solution** : Ajouter `"items": {}` ou `"items": {"type": "string"}`

### Erreur : "schemas subsection is not an object"
**Cause** : `components.schemas` manquant ou null  
**Solution** : Ajouter `"schemas": {}` dans components

### Erreur : "reference to unknown component schema"
**Cause** : `$ref` pointe vers un schéma inexistant  
**Solution** : Créer le schéma dans `components/schemas` ou utiliser une référence inline

### Erreur : "object schema missing properties"
**Cause** : `type: object` sans `properties`  
**Solution** : Ajouter `"properties": {}` même si objet vide

### Erreur : "description has length X exceeding limit of 300"
**Cause** : Description trop longue  
**Solution** : Réduire à < 300 caractères, détails dans `x-synesia`

### Erreur : "request body schema is not an object schema"
**Cause** : `oneOf` directement à la racine du requestBody  
**Solution** : Utiliser `type: object` avec `additionalProperties: true` et différencier via `examples`

### Erreur : Factoria ne parse pas
**Causes possibles** :
1. ❌ Section `security` globale manquante → Ajouter après `servers`
2. ❌ Responses en array → Convertir en objet
3. ❌ Codes HTTP en number → Mettre en string
4. ❌ Object sans properties → Ajouter `properties: {}`
5. ❌ Description trop longue → Réduire à < 300 caractères

---

## ✨ Template de Base (Copy-Paste Ready)

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Synesia [NOM] API",
    "version": "1.0.0",
    "description": "Description de l'API"
  },
  "servers": [
    {
      "url": "https://api.synesia.app",
      "description": "API Server"
    }
  ],
  "security": [
    {
      "ApiKeyAuth": []
    }
  ],
  "components": {
    "schemas": {
      "SuccessResponse": {
        "type": "object",
        "required": ["data", "error"],
        "properties": {
          "data": {},
          "error": {"type": "null"}
        }
      },
      "ErrorResponse": {
        "type": "object",
        "required": ["data", "error"],
        "properties": {
          "data": {"type": "null"},
          "error": {"type": "string"}
        }
      }
    },
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "Authorization",
        "description": "Authentification par clé API. Format: ApiKey apiKey.{id}.{key}"
      }
    }
  },
  "paths": {}
}
```

---

## 🎯 Checklist Finale (Avant Livraison)

Copier cette checklist pour chaque schéma :

```markdown
## Schéma : [NOM]

### Structure ✅
- [ ] openapi: "3.1.0"
- [ ] info (title, version, description)
- [ ] servers avec URL Synesia
- [ ] security global défini
- [ ] components.schemas existe
- [ ] components.securitySchemes avec ApiKeyAuth

### Endpoints ✅
- [ ] Tous les endpoints documentés
- [ ] Tags cohérents
- [ ] operationId uniques
- [ ] security défini (sauf publics)

### Responses ✅
- [ ] Format OBJET (pas array)
- [ ] Codes HTTP en STRING
- [ ] 200, 400, 401 minimum
- [ ] Exemples fournis

### Validation ✅
- [ ] Pas d'array sans items
- [ ] Pas d'object sans properties
- [ ] Descriptions <= 300 caractères
- [ ] Pas de oneOf à la racine du requestBody
- [ ] Pas d'erreur de syntaxe JSON
- [ ] Validé avec jq ou validator
- [ ] Testé dans Swagger Editor
- [ ] Importé avec succès dans Factoria/ChatGPT

### Qualité ✅
- [ ] Descriptions claires
- [ ] Exemples réalistes
- [ ] Types précis
- [ ] $ref utilisés pour DRY
```

---

## 📞 Contact

Si tu découvres de nouvelles erreurs ou patterns, **UPDATE CE DOCUMENT** immédiatement pour aider les prochains agents !

**Maintenu par** : Équipe Synesia  
**Dernière mise à jour** : 2 octobre 2025  
**Version** : 1.0.0

---

## 🤖 LLM Directives

**Section spéciale pour les agents IA qui prendront le relais sur la création de schémas OpenAPI**

### 📐 Méthodologie Employée (Approuvée et Testée)

#### Approche "Batch Validation" (5 par 5)

Cette méthode a prouvé son efficacité pour créer des schémas complexes sans erreurs :

1. **Créer 5 endpoints maximum** à la fois
2. **Valider immédiatement** avec `read_lints`
3. **Si aucune erreur** → Continuer avec les 5 suivants
4. **Si erreur** → Corriger avant de continuer

**Pourquoi ça marche** :
- ✅ Évite l'accumulation d'erreurs
- ✅ Permet de détecter les patterns d'erreurs rapidement
- ✅ Réduit la charge cognitive
- ✅ Facilite le debugging (scope limité)

**Exemple réel** :
```
Knowledges (19 endpoints) :
├─ Batch 1 : Management (5) → Validé ✅
├─ Batch 2 : Search + Import (5) → Validé ✅
├─ Batch 3 : Entries CRUD (5) → Validé ✅
└─ Batch 4 : Datasets (4) → Validé ✅
Result : 19 endpoints, zéro erreur ! 🎉
```

---

### 🎯 Directives Strictes pour LLM

| # | Directive | Criticité | Détails |
|---|-----------|-----------|---------|
| 1 | **Responses = OBJET** | 🔴 CRITIQUE | `{"200": {...}}` jamais `[{status: 200}]` |
| 2 | **Codes HTTP = STRING** | 🔴 CRITIQUE | `"200"` jamais `200` |
| 3 | **Arrays → items** | 🔴 CRITIQUE | Tout array DOIT avoir `"items"` |
| 4 | **Objects → properties** | 🔴 CRITIQUE | Tout object DOIT avoir `"properties": {}` |
| 5 | **Security global** | 🟠 IMPORTANT | Déclarer après `servers`, avant `components` |
| 6 | **components.schemas** | 🟠 IMPORTANT | Toujours `{}` minimum, jamais absent |
| 7 | **Descriptions ≤ 300 chars** | 🟡 REQUIS | Limite stricte ChatGPT/Factoria |
| 8 | **No oneOf in requestBody root** | 🟡 REQUIS | Utiliser `type: object` + `additionalProperties` |
| 9 | **Path params required: true** | 🟡 REQUIS | TOUJOURS `true` pour params dans le path |
| 10 | **Headers via description** | 🟢 RECOMMANDÉ | Pas comme parameters (warnings) |

---

### ⚙️ Écriture Méticuleuse des Paramètres

#### Path Parameters (TOUJOURS required: true)

```json
{
  "parameters": [
    {
      "name": "knowledge_id",
      "in": "path",
      "description": "ID de la knowledge",
      "required": true,  // ← OBLIGATOIRE pour path params
      "schema": {
        "type": "string"
      },
      "example": "know_abc123"  // ← Toujours un exemple réaliste
    }
  ]
}
```

**Règles** :
- ✅ Nom exact tel que dans le path : `/knowledges/{knowledge_id}` → `"name": "knowledge_id"`
- ✅ `required: true` SANS EXCEPTION
- ✅ Toujours un exemple concret
- ✅ Description claire de ce que c'est

#### Query Parameters (required: false OK)

```json
{
  "parameters": [
    {
      "name": "limit",
      "in": "query",
      "description": "Nombre de résultats à retourner",
      "required": false,  // ← Peut être false
      "schema": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100,
        "default": 10  // ← Toujours indiquer le default
      }
    },
    {
      "name": "offset",
      "in": "query",
      "description": "Décalage pour pagination",
      "required": false,
      "schema": {
        "type": "integer",
        "minimum": 0,
        "default": 0
      }
    }
  ]
}
```

**Règles** :
- ✅ Indiquer `default` pour les params optionnels
- ✅ Ajouter `minimum`/`maximum` pour les integers
- ✅ Description du rôle du paramètre

#### Header Parameters (ÉVITER - documenter autrement)

❌ **Ne PAS faire** :
```json
{
  "parameters": [
    {
      "name": "Accept",
      "in": "header",  // ← ChatGPT va ignorer/warning
      "schema": {"type": "string"}
    }
  ]
}
```

✅ **Faire à la place** :

**Option A** : Documenter dans la description
```json
{
  "description": "Export le spreadsheet. Header Accept: application/json ou text/csv"
}
```

**Option B** : Si vraiment requis (Accept pour download)
```json
{
  "parameters": [
    {
      "name": "Accept",
      "in": "header",
      "description": "Format de téléchargement",
      "required": true,
      "schema": {
        "type": "string",
        "enum": ["application/json", "text/csv"]
      }
    }
  ]
}
```

---

### 🔬 Rigueur dans les Schémas

#### RequestBody : Structure stricte

**Template à suivre** :
```json
{
  "requestBody": {
    "required": true,  // ou false
    "description": "Description du body (< 300 chars)",
    "content": {
      "application/json": {
        "schema": {
          "type": "object",  // ← TOUJOURS object
          "required": ["champ1", "champ2"],  // ← Lister TOUS les champs requis
          "properties": {  // ← OBLIGATOIRE même vide
            "champ1": {
              "type": "string",
              "description": "Description du champ",
              "example": "valeur exemple"  // ← Toujours un exemple
            },
            "champ_array": {
              "type": "array",
              "items": {"type": "string"},  // ← NE JAMAIS OUBLIER items
              "description": "Tableau de strings"
            },
            "champ_object": {
              "type": "object",
              "properties": {},  // ← NE JAMAIS OUBLIER properties
              "additionalProperties": true,
              "description": "Objet flexible"
            }
          }
        },
        "examples": {  // ← TOUJOURS au pluriel
          "cas1": {
            "summary": "Description du cas",
            "value": { ... }
          }
        }
      }
    }
  }
}
```

#### Responses : Triple vérification

**Checklist par endpoint** :

```markdown
Pour CHAQUE endpoint :
1. [ ] responses est un OBJET (pas array)
2. [ ] Au moins 200, 401
3. [ ] Codes en STRING ("200" pas 200)
4. [ ] Chaque response a "description"
5. [ ] Chaque response a "content" (sauf 204)
6. [ ] Schema avec type défini
7. [ ] Example ou examples fourni
```

**Template responses complet** :
```json
{
  "responses": {
    "200": {
      "description": "Opération réussie",
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "data": { ... },
              "error": {"type": "null"}
            }
          },
          "example": { ... }  // ← Toujours un exemple concret
        }
      }
    },
    "400": {
      "description": "Données invalides",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ErrorResponse"  // ← Réutiliser
          }
        }
      }
    },
    "401": {
      "description": "Authentification invalide",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ErrorResponse"
          }
        }
      }
    },
    "404": {  // ← Si l'endpoint accède à une ressource par ID
      "description": "Ressource non trouvée",
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ErrorResponse"
          }
        }
      }
    },
    "204": {  // ← Pour DELETE sans contenu
      "description": "Supprimé avec succès (pas de contenu)"
      // PAS de "content" pour 204
    }
  }
}
```

---

### 📊 Spécificités Synesia

#### Format de Réponse Standard

**90% des endpoints Synesia** retournent :
```json
{
  "data": <résultat ou null>,
  "error": <message d'erreur ou null>
}
```

**Exceptions** :
- Streaming (SSE) : text/event-stream
- Download (CSV) : text/csv
- DELETE : souvent 204 sans contenu
- Certains endpoints retournent directement (ex: search knowledge)

#### Authentication Patterns

**Pattern 1 : ApiKey standard (90% des endpoints)**
```json
{
  "security": [{"ApiKeyAuth": []}]  // Global + par endpoint
}
```

**Pattern 2 : Public total**
```json
{
  "security": []  // Vide = pas d'auth
}
```

**Pattern 3 : Optionnel (Webhooks)**
```json
{
  "security": [
    {"ApiKeyAuth": []},  // Option 1: Avec ApiKey
    {}                   // Option 2: Sans auth
  ]
}
```

#### Types de Content-Type

| Endpoint | Request | Response | Notes |
|----------|---------|----------|-------|
| Standard | `application/json` | `application/json` | 90% des cas |
| Upload | `multipart/form-data` | `application/json` | Storage, CSV import |
| Download | - | `text/csv` ou `application/json` | Export, via header Accept |
| Streaming | `application/json` | `text/event-stream` | LLM, Memory chat |

---

### 🎓 Méthodologie de Création (Step-by-Step)

#### Phase 1 : Préparation (5 min)

```markdown
1. [ ] Lire le controller TypeScript concerné
2. [ ] Identifier TOUS les endpoints (@Get, @Post, etc.)
3. [ ] Lire les types/interfaces (si fichier .types.ts existe)
4. [ ] Vérifier les tests Bruno (si disponibles)
5. [ ] Lister les endpoints par ordre logique
```

#### Phase 2 : Structure de Base (2 min)

```markdown
1. [ ] Créer le fichier JSON
2. [ ] Copier le template de base
3. [ ] Remplir info (title, version, description)
4. [ ] Vérifier security global
5. [ ] Préparer components.schemas vide
```

#### Phase 3 : Création par Batch (10-15 min par batch)

```markdown
Pour chaque batch de 5 endpoints :

1. [ ] Créer les 5 endpoints
2. [ ] Vérifier CHAQUE endpoint individuellement :
   - [ ] responses en objet
   - [ ] codes HTTP en string
   - [ ] arrays avec items
   - [ ] objects avec properties
   - [ ] descriptions < 300 chars
   - [ ] examples fournis
3. [ ] Lancer read_lints
4. [ ] Si erreur : corriger immédiatement
5. [ ] Si OK : passer au batch suivant
```

#### Phase 4 : Finalisation (5 min)

```markdown
1. [ ] Ajouter section x-synesia avec notes
2. [ ] Vérifier tous les $ref pointent bien vers components/schemas
3. [ ] Vérification finale read_lints sur tout le fichier
4. [ ] Test manuel dans Swagger Editor (optionnel)
5. [ ] Commit avec message descriptif
```

---

### ⚠️ Erreurs à Éviter Absolument

| ❌ Erreur | ✅ Solution | Priorité |
|-----------|-------------|----------|
| `"responses": [{status: 200}]` | `"responses": {"200": {...}}` | 🔴 P0 |
| `"200": {...}` (number) | `"200": {...}` (string) | 🔴 P0 |
| `"type": "array"` sans items | `"type": "array", "items": {}` | 🔴 P0 |
| `"type": "object"` sans properties | `"type": "object", "properties": {}` | 🔴 P0 |
| Oublier `security` global | Ajouter après `servers` | 🟠 P1 |
| Description > 300 chars | Réduire, mettre détails dans x-synesia | 🟡 P2 |
| oneOf à la racine requestBody | Utiliser object + additionalProperties | 🟡 P2 |
| Headers comme parameters | Documenter dans description | 🟢 P3 |

**Priorité** :
- 🔴 **P0** : Bloque ChatGPT/Factoria → Corriger immédiatement
- 🟠 **P1** : Parsing incomplet → À corriger
- 🟡 **P2** : Warnings ou limitations → Corriger si possible
- 🟢 **P3** : Best practices → Nice to have

---

### 📝 Checklist Opérationnelle (À suivre RELIGIEUSEMENT)

#### Avant de commencer le fichier

```markdown
- [ ] J'ai lu les contrôleurs TypeScript
- [ ] J'ai identifié tous les endpoints
- [ ] J'ai compris les types d'entrée/sortie
- [ ] J'ai le template de base prêt
- [ ] Je connais le nombre total d'endpoints (pour planifier les batchs)
```

#### Pour CHAQUE endpoint créé

```markdown
Structure :
- [ ] tags défini (catégorie cohérente)
- [ ] summary défini (< 50 chars)
- [ ] description définie (< 300 chars)
- [ ] operationId unique et descriptif
- [ ] security défini (ou override si public)

Parameters (si applicable) :
- [ ] Path params avec required: true
- [ ] Query params avec required et default
- [ ] Tous ont description et exemple
- [ ] Pas de headers (sauf Accept pour download)

RequestBody (si applicable) :
- [ ] required défini (true/false)
- [ ] content avec type MIME correct
- [ ] schema avec type: "object"
- [ ] properties défini (même vide si additionalProperties)
- [ ] Champs required listés
- [ ] Tous les arrays ont items
- [ ] examples avec au moins 1 cas

Responses :
- [ ] Format OBJET (jamais array)
- [ ] Codes HTTP en STRING
- [ ] Au moins : 200, 401
- [ ] 400 si requestBody existe
- [ ] 404 si accès par ID
- [ ] 204 pour DELETE sans contenu
- [ ] Chaque response a description
- [ ] Chaque response (sauf 204) a content
- [ ] Schema défini avec type
- [ ] Example fourni

Validation :
- [ ] Aucun array sans items
- [ ] Aucun object sans properties
- [ ] Description < 300 caractères
- [ ] read_lints retourne 0 erreur
```

#### Après chaque batch de 5

```markdown
- [ ] read_lints exécuté
- [ ] 0 erreur retournée
- [ ] Commit intermédiaire (optionnel)
- [ ] Pause 30 sec pour relecture
- [ ] Continuer le batch suivant
```

#### Avant de livrer le fichier complet

```markdown
- [ ] read_lints final sur tout le fichier
- [ ] Tous les $ref sont valides
- [ ] Section x-synesia ajoutée
- [ ] Historique mis à jour dans OPENAPI_GUIDELINES.md
- [ ] Test dans Swagger Editor (si possible)
- [ ] Test import ChatGPT/Factoria (si possible)
```

---

### 🧠 Mental Model : Penser comme ChatGPT

ChatGPT est **strict** sur la structure. Pense comme ça :

#### Ce que ChatGPT EXIGE

1. **Structure rigide** :
   ```
   responses → OBJET avec codes en string
   arrays → TOUJOURS items
   objects → TOUJOURS properties
   ```

2. **Typage fort** :
   ```
   requestBody.schema.type → DOIT être "object" ou type primitif
   Pas de oneOf/anyOf à la racine
   ```

3. **Limites strictes** :
   ```
   description → max 300 caractères
   ```

#### Ce que ChatGPT TOLÈRE

- ✅ properties vide : `{}`
- ✅ items vide : `{}`
- ✅ additionalProperties : `true`
- ✅ Exemples riches et multiples
- ✅ Sections custom (x-synesia)

#### Ce que ChatGPT REJETTE

- ❌ responses en array
- ❌ oneOf direct dans requestBody
- ❌ array sans items
- ❌ object sans properties

**Règle d'or** : **Quand tu doutes → Utilise le type le plus simple (object avec additionalProperties)**

---

### 🎨 Patterns Synesia à Connaître

#### Pattern 1 : CRUD Standard

```json
GET    /resources           → Liste (array)
POST   /resources           → Crée (retourne ID ou objet)
GET    /resources/{id}      → Récupère (objet)
PATCH  /resources/{id}      → Met à jour (objet)
DELETE /resources/{id}      → Supprime (204 no content)
```

#### Pattern 2 : Nested Resources

```json
GET    /knowledges/{id}/entries           → Liste
POST   /knowledges/{id}/entries           → Crée
GET    /knowledges/{id}/entries/{eid}     → Récupère
PATCH  /knowledges/{id}/entries/{eid}     → Met à jour
DELETE /knowledges/{id}/entries/{eid}     → Supprime
```

**Attention** : 2 path params → Bien tous les déclarer !

#### Pattern 3 : Actions/Dispatch

```json
POST /spreadsheets/{id}/dispatch
Body: {
  "action": {
    "type": "INSERT_ROW",
    "payload": { ... }
  }
}
```

**Traiter comme objet flexible** avec additionalProperties.

#### Pattern 4 : Query/Search

```json
POST /knowledges/{id}/search
Body: {
  "query": "...",
  "params": {"top_k": 5}
}
```

**Structure imbriquée** → Bien définir chaque niveau.

#### Pattern 5 : Import/Upload

```json
POST /knowledges/{id}/import/csv
Content-Type: multipart/form-data
Body: {
  "file": <binary>,
  "method": <json-string>
}
```

**Attention** : 
- Content-Type = `multipart/form-data`
- file avec `format: binary`
- method peut être string (JSON stringifié)

---

### 💎 Best Practices Avancées

#### 1. Réutilisation Maximale (DRY)

Pour un schéma avec 15+ endpoints, créer dans `components/schemas` :

```json
{
  "components": {
    "schemas": {
      "Resource": { ... },           // Objet principal
      "CreateResourceInput": { ... }, // Input création
      "UpdateResourceInput": { ... }, // Input update
      "SuccessResponse": { ... },     // Réponse succès standard
      "ErrorResponse": { ... }        // Réponse erreur standard
    }
  }
}
```

**Ensuite** : Réutiliser partout avec `$ref`

#### 2. Organisation des Tags

**Regrouper logiquement** :

```json
// Pour une API avec sous-ressources
"tags": ["Resource Management"]     // CRUD principal
"tags": ["Resource Entries"]        // CRUD des entrées
"tags": ["Resource Actions"]        // Actions spéciales
"tags": ["Resource Import"]         // Import de données
"tags": ["Resource Export"]         // Export de données
```

**Bénéfice** : Navigation claire dans Swagger/ChatGPT

#### 3. Examples Stratégiques

**Toujours 2-3 exemples minimum** :

```json
{
  "examples": {
    "simple": {
      "summary": "Cas d'usage simple",
      "value": { ... }
    },
    "complex": {
      "summary": "Cas avancé avec toutes les options",
      "value": { ... }
    },
    "edge_case": {
      "summary": "Cas limite ou spécial",
      "value": { ... }
    }
  }
}
```

---

### 🚨 Pièges Fréquents et Solutions

#### Piège 1 : Oublier items dans un nested array

```json
// ❌ PIÈGE
{
  "tools": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "sub_tools": {
          "type": "array"  // ← Oublié items ici !
        }
      }
    }
  }
}

// ✅ CORRECT
{
  "tools": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "sub_tools": {
          "type": "array",
          "items": {"type": "string"}  // ← Items présent
        }
      }
    }
  }
}
```

**Solution** : Scanner TOUS les "type": "array" dans le fichier

#### Piège 2 : Description qui déborde

```json
// ❌ PIÈGE (305 caractères)
"description": "Cet endpoint permet de créer une nouvelle ressource dans le système. Il accepte plusieurs formats de données et effectue une validation complète. Les données sont ensuite stockées de manière sécurisée dans la base de données. Le système génère automatiquement un ID unique et retourne l'objet créé."

// ✅ CORRECT (158 caractères)
"description": "Crée une nouvelle ressource avec validation. Les données sont stockées de manière sécurisée et un ID unique est généré automatiquement."
```

**Astuce** : Compte avant d'écrire. Si long → section x-synesia.

#### Piège 3 : Mélanger les formats de codes HTTP

```json
// ❌ PIÈGE (inconsistant)
{
  "responses": {
    "200": { ... },   // String
    400: { ... },     // Number ← ERREUR
    "404": { ... }    // String
  }
}

// ✅ CORRECT (tout en string)
{
  "responses": {
    "200": { ... },
    "400": { ... },
    "404": { ... }
  }
}
```

**Solution** : TOUJOURS string, même pour 200.

---

### 🎯 Commandes de Validation

#### Pendant la création

```bash
# Après chaque batch
jq empty openapi-schemas/mon-schema.json && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
```

#### Avant de livrer

```bash
# Validation syntax
jq . openapi-schemas/mon-schema.json > /dev/null

# Validation OpenAPI (si installé)
npx @apidevtools/swagger-cli validate openapi-schemas/mon-schema.json

# Compter les endpoints
jq '.paths | to_entries | map(.value | keys) | flatten | length' openapi-schemas/mon-schema.json
```

---

### 📦 Livrables Attendus

Pour un schéma complet, tu dois livrer :

1. **Fichier JSON valide** (`nom-api.json`)
   - ✅ Structure OpenAPI 3.1.0 complète
   - ✅ Zéro erreur de lint
   - ✅ Tous les endpoints documentés

2. **Section x-synesia** (dans le JSON)
   - Notes techniques
   - Use cases
   - Spécificités d'implémentation

3. **Update OPENAPI_GUIDELINES.md**
   - Ajouter ligne dans "Historique des Schémas Créés"
   - Documenter nouvelles erreurs (si rencontrées)

4. **Test de validation** (preuve)
   - Screenshot Swagger Editor (optionnel)
   - Confirmation import ChatGPT (optionnel)
   - Message "read_lints : 0 erreur"

---

### 🔄 Workflow Complet (Exemple Réel)

#### Exemple : Créer "Knowledges API" (19 endpoints)

```
📋 Planification
├─ Batch 1 : Management CRUD (5 endpoints)
├─ Batch 2 : Search + Import (5 endpoints)
├─ Batch 3 : Entries CRUD (5 endpoints)
└─ Batch 4 : Datasets (4 endpoints)

⏱️ Temps estimé : 40-60 min

🚀 Exécution :

[Batch 1] - 10 min
├─ Créer structure de base
├─ Ajouter GET/POST /knowledges
├─ Ajouter GET/PATCH/DELETE /knowledges/{id}
├─ Vérifier chaque endpoint (checklist)
├─ read_lints → 0 erreur ✅
└─ Continue !

[Batch 2] - 12 min
├─ Ajouter POST /knowledges/{id}/search
├─ Ajouter 4 endpoints import (csv, text, text-file, document)
├─ Vérifier multipart/form-data pour CSV
├─ read_lints → 0 erreur ✅
└─ Continue !

[Batch 3] - 10 min
├─ Ajouter GET/POST /knowledges/{id}/entries
├─ Ajouter GET/PATCH/DELETE /knowledges/{id}/entries/{eid}
├─ Vérifier nested path params
├─ read_lints → 0 erreur ✅
└─ Continue !

[Batch 4] - 8 min
├─ Ajouter 4 endpoints datasets
├─ Vérifier export CSV (text/csv)
├─ read_lints → 0 erreur ✅
└─ Terminé !

[Finalisation] - 5 min
├─ Ajouter section x-synesia
├─ Validation finale
├─ Update guidelines.md
└─ Commit ✅

✅ Résultat : 19 endpoints, 0 erreur, 45 min
```

---

### 🎖️ Standards de Qualité

Un schéma de **qualité production** doit avoir :

#### Niveau Minimum ⭐

- ✅ Structure OpenAPI 3.1.0 valide
- ✅ Tous les endpoints documentés
- ✅ Authentification configurée
- ✅ 0 erreur de lint

#### Niveau Professionnel ⭐⭐

- ✅ Minimum +
- ✅ Schémas réutilisables dans components
- ✅ Examples pour chaque requestBody
- ✅ Descriptions claires < 300 chars
- ✅ Tags cohérents

#### Niveau Excellence ⭐⭐⭐ (Cible)

- ✅ Professionnel +
- ✅ Examples multiples (2-3 par endpoint)
- ✅ Section x-synesia avec notes techniques
- ✅ Tous les edge cases documentés
- ✅ Testé dans ChatGPT/Swagger

**Viser TOUJOURS le niveau Excellence** pour Synesia !

---

### 📐 Template de Commit Message

```
feat(openapi): Add [NOM] API schema ([X] endpoints)

- CRUD operations: [liste]
- Special features: [liste]
- Total endpoints: X
- Validation: ✅ 0 errors

Schemas created:
- [Schema1]
- [Schema2]

Tested with: ChatGPT ✅, Swagger Editor ✅
```

**Exemple réel** :
```
feat(openapi): Add Knowledges API schema (19 endpoints)

- Management: CRUD knowledges
- Import: CSV, text, documents with chunking
- Entries: Full CRUD with pagination
- Datasets: Search, insert, export CSV
- Total endpoints: 19
- Validation: ✅ 0 errors

Schemas created:
- Knowledge
- KnowledgeEntry
- SuccessResponse
- ErrorResponse

Tested with: ChatGPT ✅, Factoria ✅
```

---

### 🎯 KPIs de Performance

Pour mesurer la qualité de ton travail :

| Métrique | Cible | Excellence |
|----------|-------|------------|
| Erreurs de lint | 0 | 0 |
| Endpoints sans exemple | 0% | 0% |
| Descriptions > 300 chars | 0% | 0% |
| Arrays sans items | 0 | 0 |
| Objects sans properties | 0 | 0 |
| Temps par endpoint | < 3 min | < 2 min |
| Batchs sans erreur | 100% | 100% |
| Révisions nécessaires | < 2 | 0 |

**Si tu atteins ces KPIs** → Tu es au niveau de qualité Synesia ! 🏆

---

### 🔮 Debugging Rapide

Si ChatGPT/Factoria refuse ton schéma :

```
1. Cherche "responses" → Vérifie format objet
2. Cherche "type": "array" → Vérifie items partout
3. Cherche "type": "object" → Vérifie properties partout
4. Cherche "description" → Compte les caractères
5. Cherche "security" → Vérifie présence au niveau root
6. Cherche requestBody → Vérifie pas de oneOf direct
7. Lance read_lints → Corrige tout
```

**90% des erreurs** sont dans ces 7 points !

---

### 💪 Ton Rôle en tant qu'Agent OpenAPI

Tu n'es pas juste un "générateur de JSON". Tu es un **architecte de documentation API**.

**Ton job** :
1. ✅ Garantir 100% de validité technique
2. ✅ Rendre l'API **compréhensible** (descriptions, exemples)
3. ✅ Faciliter l'**intégration** (exemples réalistes)
4. ✅ Maintenir la **cohérence** (patterns, naming)
5. ✅ Documenter les **edge cases** (x-synesia)

**Standards Synesia** :
- 🎯 **Zéro erreur** tolérée
- 🎯 **Qualité production** systématique
- 🎯 **Documentation riche** (pas le minimum)
- 🎯 **Validation rigoureuse** (batch par batch)

**Tu représentes la qualité de Synesia** → Exigence maximale ! 🚀

---

**🌟 Bonne chance, agent futur ! Ce guide est là pour t'éviter les galères qu'on a eues. Lis-le attentivement avant de commencer !** 🚀

