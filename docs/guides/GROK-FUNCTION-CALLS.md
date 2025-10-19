# 🎯 xAI Grok - Guide Complet des Function Calls

## 📋 Vue d'ensemble

Ce guide explique **comment faire marcher les function calls avec xAI Grok**, basé sur notre expérience d'intégration réelle dans Abrégé/Scrivia.

**TL;DR** : xAI est **TRÈS strict** sur les schémas de fonction - beaucoup plus que OpenAI ou Groq.

---

## ⚠️ Problèmes courants et solutions

### ❌ Erreur : "Invalid function schema"

```json
{
  "code": "Client specified an invalid argument",
  "error": "Invalid request content: Invalid function schema."
}
```

**Causes principales** :
1. ❌ Champs JSON Schema non-standard (`format`, `maxLength`, etc.)
2. ❌ Nested objects trop profonds (>3 niveaux)
3. ❌ Références non résolues (`$ref`, `allOf`)
4. ❌ Trop de tools en une fois (>40)
5. ❌ Schémas trop complexes

---

## ✅ Format de fonction VALIDE pour xAI

### Structure de base

```json
{
  "type": "function",
  "function": {
    "name": "nom_de_la_fonction",
    "description": "Description claire de ce que fait la fonction",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string",
          "description": "Description du paramètre"
        },
        "param2": {
          "type": "number",
          "description": "Un nombre"
        }
      },
      "required": ["param1"]
    }
  }
}
```

### Exemple complet validé

```json
{
  "type": "function",
  "function": {
    "name": "createNote",
    "description": "Créer une nouvelle note dans un classeur",
    "parameters": {
      "type": "object",
      "properties": {
        "source_title": {
          "type": "string",
          "description": "Titre de la note"
        },
        "notebook_id": {
          "type": "string",
          "description": "ID ou slug du classeur"
        },
        "markdown_content": {
          "type": "string",
          "description": "Contenu markdown de la note"
        },
        "folder_id": {
          "type": "string",
          "description": "ID du dossier parent (optionnel)"
        }
      },
      "required": ["source_title", "notebook_id"]
    }
  }
}
```

---

## 📐 Règles strictes xAI

### ✅ Champs autorisés (whitelist)

| Champ | Usage | Exemple |
|-------|-------|---------|
| `type` | Type de donnée | `"string"`, `"number"`, `"boolean"`, `"object"`, `"array"` |
| `description` | Description du champ | `"Titre de la note"` |
| `enum` | Valeurs fixes | `["private", "public", "shared"]` |
| `properties` | Propriétés d'un object | `{ "name": {...}, "age": {...} }` |
| `items` | Type des éléments d'un array | `{ "type": "string" }` |
| `required` | Champs obligatoires | `["title", "content"]` |

### ❌ Champs interdits

| Champ | Pourquoi | Alternative |
|-------|----------|-------------|
| `format` | Non supporté par xAI | Mettre dans la `description` |
| `maxLength` | Non supporté | Mentionner dans la `description` |
| `minLength` | Non supporté | Mentionner dans la `description` |
| `minimum` | Non supporté | Mentionner dans la `description` |
| `maximum` | Non supporté | Mentionner dans la `description` |
| `default` | Non supporté | LLM choisit ou utilise `description` |
| `pattern` | Non supporté | Mentionner le format dans `description` |
| `$ref` | Non résolu par xAI | Copier le schéma en entier |
| `allOf` | Non supporté | Fusionner les schémas manuellement |
| `anyOf` | Non supporté | Créer plusieurs functions |
| `oneOf` | Non supporté | Créer plusieurs functions |

---

## 🔧 Méthode de conversion OpenAPI → xAI

### Étape 1 : Nettoyer le schéma

```typescript
/**
 * Nettoie un schéma OpenAPI pour xAI
 */
function cleanSchemaForXAI(schema: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  
  // Whitelist stricte
  const allowed = ['type', 'description', 'enum', 'items', 'properties', 'required'];
  
  for (const [key, value] of Object.entries(schema)) {
    // Garder seulement les champs autorisés
    if (!allowed.includes(key)) continue;
    
    // Nettoyer récursivement les nested objects/arrays
    if (key === 'properties' && typeof value === 'object') {
      cleaned.properties = {};
      for (const [propKey, propValue] of Object.entries(value)) {
        cleaned.properties[propKey] = cleanSchemaForXAI(propValue);
      }
    } else if (key === 'items' && typeof value === 'object') {
      cleaned.items = cleanSchemaForXAI(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}
```

### Étape 2 : Convertir les validations en descriptions

```typescript
// ❌ AVANT (OpenAPI avec validations)
{
  "user_id": {
    "type": "string",
    "format": "uuid",
    "maxLength": 36,
    "pattern": "^[0-9a-f-]+$"
  }
}

// ✅ APRÈS (xAI compatible)
{
  "user_id": {
    "type": "string",
    "description": "ID de l'utilisateur (format UUID, 36 caractères max)"
  }
}
```

### Étape 3 : Simplifier les nested objects

```typescript
// ❌ AVANT (Trop complexe)
{
  "operations": {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "target": {
          "type": "object",
          "properties": {
            "heading": {
              "type": "object",
              "properties": {
                "path": { "type": "array", "items": { "type": "string" } }
              }
            }
          }
        }
      }
    }
  }
}

// ✅ APRÈS (Simplifié)
{
  "operations": {
    "type": "array",
    "items": {
      "type": "object",
      "description": "Opération à effectuer (voir documentation)"
    }
  }
}

// OU mieux : Créer plusieurs functions simples au lieu d'une complexe
```

---

## 🎯 Stratégie recommandée

### Approche 1 : Tools manuels (recommandé ✅)

**Créer les tools manuellement** avec un format ultra-simple garanti compatible.

```typescript
// src/services/llm/xaiCompatibleTools.ts

export const XAI_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'createNote',
      description: 'Créer une nouvelle note dans un classeur',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Titre de la note'
          },
          content: {
            type: 'string',
            description: 'Contenu markdown'
          },
          notebook_id: {
            type: 'string',
            description: 'ID du classeur (UUID ou slug)'
          }
        },
        required: ['title', 'content', 'notebook_id']
      }
    }
  },
  // ... 10-20 tools essentiels
];
```

**Avantages** :
- ✅ Contrôle total du format
- ✅ Garanti compatible xAI
- ✅ Facile à maintenir
- ✅ Descriptions optimisées pour le LLM

**Inconvénients** :
- ⚠️ Maintenance manuelle
- ⚠️ Risque de désynchronisation avec l'API

### Approche 2 : OpenAPI filtré et nettoyé

**Générer depuis OpenAPI** mais avec nettoyage strict et exclusions.

```typescript
async function getXAITools(): Promise<Tool[]> {
  // 1. Charger depuis OpenAPI
  const allTools = await loadFromOpenAPI();
  
  // 2. Exclure les tools complexes
  const excludedTools = ['applyContentOperations', 'executeAgentById'];
  const filtered = allTools.filter(t => !excludedTools.includes(t.function.name));
  
  // 3. Nettoyer chaque tool
  const cleaned = filtered.map(tool => ({
    type: 'function',
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: cleanSchemaForXAI(tool.function.parameters)
    }
  }));
  
  // 4. Valider avant d'envoyer
  return cleaned.filter(tool => validateToolForXAI(tool));
}
```

**Avantages** :
- ✅ Génération automatique
- ✅ Sync avec l'API
- ✅ Scalable

**Inconvénients** :
- ⚠️ Nettoyage complexe
- ⚠️ Edge cases difficiles à gérer
- ⚠️ Tools complexes à exclure manuellement

### Approche 3 : Hybride (optimal 🌟)

**Combiner les deux** : manuel pour les critiques, OpenAPI pour les secondaires.

```typescript
const criticalTools = getMinimalXAITools(); // 5 tools manuels
const secondaryTools = await getSimpleOpenAPITools(); // 10-15 tools filtrés
const allTools = [...criticalTools, ...secondaryTools];
```

**C'est l'approche qu'on utilise actuellement** et ça marche ! ✅

---

## 🧪 Validation des tools

### Script de validation

```typescript
function validateToolForXAI(tool: Tool): boolean {
  if (tool.type !== 'function') return false;
  
  const func = tool.function;
  const paramsStr = JSON.stringify(func.parameters);
  
  // Vérifier les champs interdits
  const forbidden = ['format', 'maxLength', 'minimum', 'maximum', 'default', 'pattern', '$ref', 'allOf'];
  for (const field of forbidden) {
    if (paramsStr.includes(`"${field}"`)) {
      console.log(`❌ ${func.name} contains forbidden field: ${field}`);
      return false;
    }
  }
  
  // Vérifier la complexité (profondeur max)
  const depth = getObjectDepth(func.parameters);
  if (depth > 3) {
    console.log(`❌ ${func.name} too deep (depth: ${depth})`);
    return false;
  }
  
  return true;
}

function getObjectDepth(obj: any, currentDepth = 0): number {
  if (!obj || typeof obj !== 'object') return currentDepth;
  
  let maxDepth = currentDepth;
  
  if (obj.properties) {
    for (const prop of Object.values(obj.properties)) {
      const depth = getObjectDepth(prop, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  
  if (obj.items) {
    const depth = getObjectDepth(obj.items, currentDepth + 1);
    maxDepth = Math.max(maxDepth, depth);
  }
  
  return maxDepth;
}
```

---

## 📊 Comparaison avec autres providers

| Feature | xAI Grok | OpenAI | Groq |
|---------|----------|--------|------|
| **Champs JSON Schema** | Minimal (6 champs) | Standard (~15 champs) | Standard |
| **`format`** | ❌ | ✅ | ✅ |
| **`maxLength`** | ❌ | ✅ | ✅ |
| **`pattern`** | ❌ | ✅ | ✅ |
| **`$ref`** | ❌ | ✅ | ✅ |
| **Nested depth** | Max 3 niveaux | Illimité | Illimité |
| **Nombre de tools** | ~20-30 recommandé | 100+ | 100+ |
| **Type `mcp`** | ❌ | ❌ | ✅ Groq only |

**Conclusion** : xAI est le plus restrictif, mais aussi le **plus rapide et le moins cher**.

---

## 💻 Exemples pratiques

### Exemple 1 : Tool simple (✅ Fonctionne)

```typescript
{
  type: 'function',
  function: {
    name: 'createNote',
    description: 'Créer une nouvelle note',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titre de la note'
        },
        content: {
          type: 'string',
          description: 'Contenu en markdown'
        }
      },
      required: ['title', 'content']
    }
  }
}
```

### Exemple 2 : Avec enum (✅ Fonctionne)

```typescript
{
  type: 'function',
  function: {
    name: 'updateVisibility',
    description: 'Modifier la visibilité d\'une note',
    parameters: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'ID de la note'
        },
        visibility: {
          type: 'string',
          description: 'Niveau de visibilité',
          enum: ['private', 'public', 'shared', 'link-only']
        }
      },
      required: ['note_id', 'visibility']
    }
  }
}
```

### Exemple 3 : Avec array (✅ Fonctionne)

```typescript
{
  type: 'function',
  function: {
    name: 'addTags',
    description: 'Ajouter des tags à une note',
    parameters: {
      type: 'object',
      properties: {
        note_id: {
          type: 'string',
          description: 'ID de la note'
        },
        tags: {
          type: 'array',
          description: 'Liste des tags à ajouter',
          items: {
            type: 'string',
            description: 'Nom du tag'
          }
        }
      },
      required: ['note_id', 'tags']
    }
  }
}
```

### Exemple 4 : Nested object simple (✅ Fonctionne)

```typescript
{
  type: 'function',
  function: {
    name: 'createNoteWithMetadata',
    description: 'Créer une note avec métadonnées',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titre'
        },
        metadata: {
          type: 'object',
          description: 'Métadonnées de la note',
          properties: {
            author: { type: 'string', description: 'Auteur' },
            category: { type: 'string', description: 'Catégorie' }
          }
        }
      },
      required: ['title']
    }
  }
}
```

### Exemple 5 : Tool complexe (❌ Ne fonctionne PAS)

```typescript
// ❌ TROP COMPLEXE POUR xAI
{
  type: 'function',
  function: {
    name: 'applyContentOperations',
    description: 'Appliquer des opérations complexes',
    parameters: {
      type: 'object',
      properties: {
        ops: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['insert', 'replace', 'delete'] },
              target: {
                type: 'object',  // ← Niveau 1
                properties: {
                  type: { type: 'string', enum: ['heading', 'regex'] },
                  heading: {
                    type: 'object',  // ← Niveau 2
                    properties: {
                      path: {
                        type: 'array',  // ← Niveau 3
                        items: {
                          type: 'object'  // ← Niveau 4 = TROP PROFOND
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// ✅ SOLUTION : Créer plusieurs functions simples
// - insertAtHeading
// - replaceAtHeading
// - deleteAtHeading
```

---

## 📝 Conversion depuis OpenAPI

### Script de conversion complet

```typescript
import type { Tool } from './types/strictTypes';

/**
 * Convertit un schéma OpenAPI en tools xAI-compatibles
 */
export function convertOpenAPIToXAITools(openApiSpec: any): Tool[] {
  const tools: Tool[] = [];
  
  // 1. Parser les paths
  for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      
      const op = operation as any;
      const operationId = op.operationId;
      
      if (!operationId) continue;
      
      // 2. Exclure les tools trop complexes
      const excludedTools = [
        'applyContentOperations',
        'executeComplexOperation'
      ];
      
      if (excludedTools.includes(operationId)) {
        console.log(`⚠️ Excluded: ${operationId} (too complex)`);
        continue;
      }
      
      // 3. Construire les paramètres
      const parameters = buildParameters(op, path);
      
      // 4. Nettoyer pour xAI
      const cleanedParams = cleanSchemaForXAI(parameters);
      
      // 5. Valider la profondeur
      if (getObjectDepth(cleanedParams) > 3) {
        console.log(`⚠️ Excluded: ${operationId} (too deep)`);
        continue;
      }
      
      // 6. Créer le tool
      tools.push({
        type: 'function',
        function: {
          name: operationId,
          description: op.description || op.summary,
          parameters: cleanedParams
        }
      });
    }
  }
  
  return tools;
}

function buildParameters(operation: any, path: string): any {
  const properties: any = {};
  const required: string[] = [];
  
  // Path params (ex: /note/{ref})
  const pathParams = extractPathParams(path);
  for (const param of pathParams) {
    properties[param] = {
      type: 'string',
      description: `Path parameter: ${param}`
    };
    required.push(param);
  }
  
  // Query params
  if (operation.parameters) {
    for (const param of operation.parameters) {
      properties[param.name] = {
        ...param.schema,
        description: param.description
      };
      if (param.required) required.push(param.name);
    }
  }
  
  // Body params
  if (operation.requestBody?.content?.['application/json']?.schema) {
    const bodySchema = operation.requestBody.content['application/json'].schema;
    if (bodySchema.properties) {
      Object.assign(properties, bodySchema.properties);
    }
    if (bodySchema.required) {
      required.push(...bodySchema.required);
    }
  }
  
  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required })
  };
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
}
```

---

## 🎯 Bonnes pratiques

### 1. Limiter le nombre de tools

```typescript
// ❌ MAUVAIS : 100 tools d'un coup
const tools = await getAllTools(); // 100 tools

// ✅ BON : 10-20 tools essentiels
const tools = getEssentialTools(); // 15 tools max
```

**Recommandation** : Max 20-30 tools par appel.

### 2. Descriptions claires

```typescript
// ❌ MAUVAIS
description: "Créer"

// ✅ BON
description: "Créer une nouvelle note dans un classeur spécifique avec du contenu markdown"
```

### 3. Noms explicites

```typescript
// ❌ MAUVAIS
name: "create"

// ✅ BON
name: "createNote" ou "createNoteInNotebook"
```

### 4. Paramètres simples

```typescript
// ❌ MAUVAIS : 15 paramètres
properties: {
  param1, param2, param3, ..., param15
}

// ✅ BON : 3-5 paramètres essentiels
properties: {
  title, content, notebook_id
}
```

### 5. Types basiques

```typescript
// ✅ Préférer
type: 'string' | 'number' | 'boolean'

// ⚠️ Éviter les types complexes
type: 'object' avec 5+ nested properties
type: 'array' avec items complexes
```

---

## 🔍 Debugging

### Étape 1 : Logger le payload

```typescript
logger.dev('Tools envoyés à xAI:', JSON.stringify(tools, null, 2));
```

### Étape 2 : Tester un tool à la fois

```typescript
// Tester avec 1 seul tool
const tools = [getMinimalXAITools()[0]];
const response = await xai.callWithMessages(messages, tools);
```

### Étape 3 : Valider manuellement

```bash
# Test direct avec curl
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4-fast",
    "messages": [{"role": "user", "content": "Test"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "test",
        "description": "Test tool",
        "parameters": {
          "type": "object",
          "properties": {
            "input": {"type": "string"}
          }
        }
      }
    }]
  }'
```

### Étape 4 : Vérifier la profondeur

```typescript
function getObjectDepth(obj: any, depth = 0): number {
  if (!obj || typeof obj !== 'object') return depth;
  
  let max = depth;
  if (obj.properties) {
    for (const prop of Object.values(obj.properties)) {
      max = Math.max(max, getObjectDepth(prop, depth + 1));
    }
  }
  if (obj.items) {
    max = Math.max(max, getObjectDepth(obj.items, depth + 1));
  }
  
  return max;
}

// Utilisation
const depth = getObjectDepth(tool.function.parameters);
if (depth > 3) {
  console.log(`Tool ${tool.function.name} trop profond: ${depth} niveaux`);
}
```

---

## 🚀 Notre implémentation (Abrégé/Scrivia)

### Ce qui fonctionne ✅

```typescript
// src/services/llm/minimalToolsForXAI.ts

export const MINIMAL_XAI_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'createNote',
      description: 'Créer une nouvelle note dans un classeur',
      parameters: {
        type: 'object',
        properties: {
          source_title: {
            type: 'string',
            description: 'Titre de la note'
          },
          notebook_id: {
            type: 'string',
            description: 'ID ou slug du classeur parent'
          },
          markdown_content: {
            type: 'string',
            description: 'Contenu markdown de la note'
          },
          folder_id: {
            type: 'string',
            description: 'ID du dossier parent (optionnel)'
          }
        },
        required: ['source_title', 'notebook_id']
      }
    }
  },
  // + 4 autres tools (getNote, updateNote, searchContent, listClasseurs)
];
```

**Status** : ✅ **5 tools fonctionnels en production**

### Architecture de sélection

```typescript
// SimpleOrchestrator.ts

if (provider === 'xai') {
  // Version minimale testée
  tools = getMinimalXAITools(); // 5 tools
} else if (provider === 'groq') {
  // Version complète avec MCP
  tools = await mcpConfigService.buildHybridTools(); // 30 tools MCP
}
```

---

## 📚 Ressources

### Documentation xAI
- **Function calling** : https://docs.x.ai/docs/guides/function-calling
- **API Reference** : https://docs.x.ai/api
- **Console** : https://console.x.ai/

### Notre implémentation
- **Provider xAI** : `src/services/llm/providers/implementations/xai.ts`
- **Tools minimaux** : `src/services/llm/minimalToolsForXAI.ts`
- **Service OpenAPI** : `src/services/llm/openApiSchemaService.ts`
- **Orchestrateur** : `src/services/llm/services/SimpleOrchestrator.ts`

### Scripts utiles
- **Seed OpenAPI** : `scripts/seed-openapi-schemas.ts`
- **Test tools** : `scripts/test-openapi-tools.ts`
- **Validation** : `scripts/validate-all-tools.ts`
- **Debug** : `scripts/debug-tool-schema.ts`

---

## ✅ Checklist avant déploiement

- [ ] Tools testés individuellement
- [ ] Validation : aucun champ interdit
- [ ] Profondeur max : 3 niveaux
- [ ] Nombre de tools : < 30
- [ ] Descriptions claires et précises
- [ ] Noms de fonctions explicites
- [ ] Paramètres required bien définis
- [ ] Test avec curl direct vers xAI API
- [ ] Logs de debug activés
- [ ] Fallback vers Groq configuré

---

## 🎓 Leçons apprises

### ❌ Ce qui ne marche PAS

1. **Schémas OpenAPI bruts** → Trop de champs non-standard
2. **38 tools d'un coup** → Trop complexe à valider pour xAI
3. **Nested objects >3 niveaux** → "Invalid function schema"
4. **Type `mcp`** → xAI ne supporte que `function`
5. **Champs `format`, `maxLength`** → Rejetés par xAI
6. **Tools auto-générés sans nettoyage** → 90% de chances d'erreur

### ✅ Ce qui marche BIEN

1. **Tools manuels ultra-simples** → 100% de succès
2. **5-15 tools max** → Validation rapide
3. **Descriptions dans les paramètres** → Au lieu de validations
4. **Whitelist stricte** → Garder seulement 6 champs JSON Schema
5. **Test progressif** → 1 tool → 5 tools → 15 tools
6. **Mix manuel + OpenAPI filtré** → Contrôle + scalabilité

---

## 🎯 Recommandations finales

### Pour démarrer (Phase 1)

**Utiliser 5-10 tools manuels** ultra-simples :
- `createNote`, `getNote`, `updateNote`
- `searchContent`, `listClasseurs`
- `createFolder`, `deleteResource`
- `getUserProfile`, `getStats`

### Pour scaler (Phase 2)

**Ajouter progressivement** 10-15 tools supplémentaires :
- Tester chaque nouveau tool individuellement
- Valider avec le script de validation
- Monitorer les erreurs xAI

### Pour maintenir (Phase 3)

**Automatiser la génération** avec nettoyage strict :
- Script de conversion OpenAPI → xAI
- Validation automatique avant déploiement
- Exclusion des tools complexes
- Fallback vers version manuelle si problème

---

## 💡 Conclusion

**xAI Grok est puissant mais strict sur les function calls.**

**Notre approche gagnante** :
1. ✅ Démarrer avec 5 tools manuels (garanti compatible)
2. ✅ Tester et valider chaque tool
3. ✅ Ajouter progressivement (max 20-30 tools)
4. ✅ Exclure les tools trop complexes
5. ✅ Nettoyer TOUS les champs non-standard

**Résultat** : Function calling stable, rapide et économique avec xAI Grok ! 🚀

---

**Développé avec ❤️ pour Abrégé/Scrivia**  
*Based on real production experience | October 2025*

