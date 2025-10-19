# 🎯 Système de Schémas OpenAPI Réutilisables

## 📋 Vue d'ensemble

Ce système permet de **stocker des schémas OpenAPI en base de données** et de les **assigner aux agents** pour générer automatiquement leurs function calling tools.

**Avantages** :
- ✅ Schémas réutilisables entre agents
- ✅ Ajout de nouveaux schémas sans modifier le code
- ✅ Génération automatique des tools
- ✅ Versionning des schémas
- ✅ UI simple pour assigner les schémas

---

## 🏗️ Architecture

### Base de données

```sql
-- Table openapi_schemas
CREATE TABLE openapi_schemas (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,      -- Ex: 'scrivia-api', 'clickup-api'
  description TEXT,
  version VARCHAR(50),
  content JSONB,                 -- Le schéma OpenAPI complet
  status VARCHAR(50),            -- 'active', 'draft', 'archived'
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Table agents (colonne ajoutée)
ALTER TABLE agents 
ADD COLUMN openapi_schema_id UUID REFERENCES openapi_schemas(id);
```

### Workflow

```
1. Ajouter un schéma OpenAPI
   → npx tsx scripts/seed-openapi-schemas.ts --name clickup-api --file ./clickup.json
   
2. Le schéma est stocké en BDD
   → Automatiquement nettoyé pour xAI
   → Converti en tools function
   
3. Assigner le schéma à un agent
   → Via l'UI agents ou l'API
   → UPDATE agents SET openapi_schema_id = '...' WHERE id = '...'
   
4. L'agent charge ses tools au runtime
   → openApiSchemaService.getToolsFromSchemaById(agent.openapi_schema_id)
```

---

## 🚀 Utilisation

### 1. Ajouter un nouveau schéma OpenAPI

#### Option A : Via le script (recommandé)

```bash
# Ajouter le schéma Scrivia (par défaut)
npx tsx scripts/seed-openapi-schemas.ts

# Ajouter le schéma ClickUp
npx tsx scripts/seed-openapi-schemas.ts \
  --name clickup-api \
  --file ./schemas/clickup-openapi.json

# Ajouter le schéma HubSpot
npx tsx scripts/seed-openapi-schemas.ts \
  --name hubspot-api \
  --file ./schemas/hubspot-openapi.json
```

#### Option B : Via l'API

```typescript
const response = await fetch('/api/ui/openapi-schemas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'clickup-api',
    description: 'ClickUp API v2',
    version: '2.0.0',
    content: clickupOpenAPISchema, // L'objet JSON complet
    tags: ['clickup', 'tasks', 'productivity']
  })
});
```

### 2. Lister les schémas disponibles

#### Via l'API

```typescript
const response = await fetch('/api/ui/openapi-schemas');
const { schemas } = await response.json();

console.log('Schémas disponibles:', schemas);
// [
//   { id: '...', name: 'scrivia-api-v2', version: '2.0.0', ... },
//   { id: '...', name: 'clickup-api', version: '2.0.0', ... },
//   { id: '...', name: 'hubspot-api', version: '1.0.0', ... }
// ]
```

#### Via SQL

```sql
SELECT id, name, description, version, tags
FROM openapi_schemas
WHERE status = 'active'
ORDER BY name;
```

### 3. Assigner un schéma à un agent

#### Via SQL (rapide)

```sql
-- Assigner le schéma ClickUp à un agent
UPDATE agents 
SET openapi_schema_id = (
  SELECT id FROM openapi_schemas WHERE name = 'clickup-api'
)
WHERE slug = 'clickup-assistant';
```

#### Via l'API agents

```typescript
const response = await fetch('/api/ui/agents', {
  method: 'POST',
  body: JSON.stringify({
    display_name: 'ClickUp Assistant',
    slug: 'clickup-assistant',
    model: 'grok-4-fast',
    provider: 'xai',
    openapi_schema_id: 'f316e108-...',  // ← ID du schéma
    system_instructions: '...',
    temperature: 0.7
  })
});
```

### 4. L'agent charge automatiquement ses tools

```typescript
// SimpleOrchestrator détecte automatiquement
if (agent.provider === 'xai' && agent.openapi_schema_id) {
  // Charger les tools depuis le schéma assigné
  tools = await openApiSchemaService.getToolsFromSchemaById(
    agent.openapi_schema_id
  );
  // → 52 tools ClickUp chargés automatiquement
}
```

---

## 💻 Exemples concrets

### Exemple 1 : Agent Scrivia (15 tools minimaux)

```sql
-- Agent Donna avec tools minimaux (fallback par défaut)
INSERT INTO agents (display_name, slug, model, provider, openapi_schema_id)
VALUES ('Donna', 'donna', 'grok-4-fast-reasoning', 'xai', NULL);
-- openapi_schema_id = NULL → Utilise les 15 tools minimaux
```

### Exemple 2 : Agent ClickUp (52 tools)

```bash
# 1. Ajouter le schéma ClickUp
npx tsx scripts/seed-openapi-schemas.ts \
  --name clickup-api \
  --file ./schemas/clickup-openapi.json

# 2. Récupérer l'ID du schéma
psql -c "SELECT id FROM openapi_schemas WHERE name = 'clickup-api';"
# → f316e108-1b88-4453-8110-2a1c3488ec32

# 3. Créer l'agent
curl -X POST /api/ui/agents \
  -d '{
    "display_name": "ClickUp Assistant",
    "slug": "clickup-assistant",
    "model": "grok-4-fast",
    "provider": "xai",
    "openapi_schema_id": "f316e108-1b88-4453-8110-2a1c3488ec32"
  }'
```

### Exemple 3 : Agent HubSpot (45 tools)

```sql
-- 1. Seed le schéma
-- npx tsx scripts/seed-openapi-schemas.ts --name hubspot-api --file ./hubspot.json

-- 2. Créer l'agent directement en SQL
INSERT INTO agents (
  display_name, slug, model, provider, openapi_schema_id, system_instructions
) VALUES (
  'HubSpot Assistant',
  'hubspot-assistant',
  'grok-4-fast',
  'xai',
  (SELECT id FROM openapi_schemas WHERE name = 'hubspot-api'),
  'Tu es un assistant HubSpot expert en CRM...'
);
```

---

## 🔧 API Routes

### GET /api/ui/openapi-schemas

Liste tous les schémas disponibles.

```typescript
const response = await fetch('/api/ui/openapi-schemas');
const { schemas } = await response.json();
```

**Réponse** :
```json
{
  "success": true,
  "schemas": [
    {
      "id": "f316e108-...",
      "name": "scrivia-api-v2",
      "description": "API Scrivia complète",
      "version": "2.0.0",
      "status": "active",
      "tags": ["scrivia", "notes", "classeurs"],
      "created_at": "2025-10-19T...",
      "updated_at": "2025-10-19T..."
    }
  ]
}
```

### POST /api/ui/openapi-schemas

Créer ou mettre à jour un schéma.

```typescript
const response = await fetch('/api/ui/openapi-schemas', {
  method: 'POST',
  body: JSON.stringify({
    name: 'clickup-api',
    description: 'ClickUp API v2',
    version: '2.0.0',
    content: { /* OpenAPI schema */ },
    tags: ['clickup', 'tasks']
  })
});
```

### DELETE /api/ui/openapi-schemas?id=xxx

Archiver un schéma (soft delete).

```typescript
await fetch('/api/ui/openapi-schemas?id=f316e108-...', {
  method: 'DELETE'
});
```

**Protection** : Refuse si des agents utilisent le schéma.

---

## 📚 Structure des fichiers

```
/schemas/                           ← Dossier pour les schémas OpenAPI
├── scrivia-openapi.json           (généré depuis generate-complete-openapi.js)
├── clickup-openapi.json           (à ajouter)
├── hubspot-openapi.json           (à ajouter)
└── notion-openapi.json            (à ajouter)

/scripts/
├── seed-openapi-schemas.ts        ← Script de seed (multi-schémas)
└── test-openapi-tools.ts          ← Test de génération

/src/services/llm/
├── openApiSchemaService.ts        ← Service principal
└── minimalToolsForXAI.ts          ← Fallback (15 tools)

/src/app/api/ui/
└── openapi-schemas/
    └── route.ts                    ← API REST pour gérer les schémas
```

---

## 🎯 Workflow complet : Ajouter ClickUp

### Étape 1 : Préparer le schéma OpenAPI

Créer `schemas/clickup-openapi.json` :

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "ClickUp API",
    "version": "2.0.0",
    "description": "ClickUp task management API"
  },
  "paths": {
    "/tasks": {
      "get": {
        "operationId": "listTasks",
        "summary": "List tasks",
        "parameters": [
          {
            "name": "list_id",
            "in": "query",
            "required": true,
            "schema": { "type": "string" }
          }
        ]
      },
      "post": {
        "operationId": "createTask",
        "summary": "Create a task",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "description": { "type": "string" },
                  "list_id": { "type": "string" }
                },
                "required": ["name", "list_id"]
              }
            }
          }
        }
      }
    }
  }
}
```

### Étape 2 : Seed le schéma

```bash
npx tsx scripts/seed-openapi-schemas.ts \
  --name clickup-api \
  --file ./schemas/clickup-openapi.json
```

**Output** :
```
🚀 Seed des schémas OpenAPI

📄 Traitement du schéma: clickup-api
  - Info: { title: 'ClickUp API', version: '2.0.0', pathsCount: 1 }
  ➕ Insertion d'un nouveau schéma...
  ✅ Schéma inséré avec succès: { id: 'abc123...', name: 'clickup-api', version: '2.0.0' }

📊 Schémas OpenAPI en base de données: 2
  - clickup-api (v2.0.0) [active]
  - scrivia-api-v2 (v2.0.0) [active]

✅ Seed terminé avec succès !
```

### Étape 3 : Créer l'agent

```sql
INSERT INTO agents (
  display_name,
  slug,
  model,
  provider,
  openapi_schema_id,
  system_instructions,
  temperature,
  max_tokens
) VALUES (
  'ClickUp Assistant',
  'clickup-assistant',
  'grok-4-fast',
  'xai',
  (SELECT id FROM openapi_schemas WHERE name = 'clickup-api'),
  'Tu es un assistant ClickUp expert en gestion de tâches et productivité.',
  0.7,
  4000
);
```

### Étape 4 : Tester

```typescript
// L'agent charge automatiquement ses tools
const response = await fetch('/api/chat/llm', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Crée une tâche "Deploy xAI" dans la liste "Sprint"',
    context: {
      agentId: 'clickup-assistant'
    },
    history: []
  })
});

// Logs:
// [SimpleOrchestrator] 🔧 Chargement des tools depuis schéma OpenAPI: abc123...
// [OpenAPISchemaService] ✅ 52 tools générés depuis le schéma
// [XAIProvider] 🔧 Tool call: createTask
```

---

## 🎨 UI de sélection (à implémenter)

### Dans la page agents

```typescript
// src/app/agents/page.tsx

import { useState, useEffect } from 'react';

function AgentForm() {
  const [schemas, setSchemas] = useState([]);

  useEffect(() => {
    // Charger les schémas disponibles
    fetch('/api/ui/openapi-schemas')
      .then(res => res.json())
      .then(data => setSchemas(data.schemas));
  }, []);

  return (
    <form>
      {/* ... autres champs ... */}
      
      {/* Sélection du provider */}
      <Select
        label="Provider"
        value={agent.provider}
        onChange={(value) => setAgent({ ...agent, provider: value })}
      >
        <option value="groq">Groq (MCP tools)</option>
        <option value="xai">xAI Grok (OpenAPI tools)</option>
      </Select>

      {/* Sélection du schéma OpenAPI (si provider = xAI) */}
      {agent.provider === 'xai' && (
        <Select
          label="Schéma OpenAPI"
          value={agent.openapi_schema_id}
          onChange={(value) => setAgent({ ...agent, openapi_schema_id: value })}
        >
          <option value="">Aucun (15 tools minimaux par défaut)</option>
          {schemas.map(schema => (
            <option key={schema.id} value={schema.id}>
              {schema.name} (v{schema.version}) - {schema.description}
            </option>
          ))}
        </Select>
      )}

      {/* Preview des tools */}
      {agent.openapi_schema_id && (
        <div className="tools-preview">
          <p>Ce schéma génère ~{estimateToolsCount(agent.openapi_schema_id)} tools</p>
        </div>
      )}
    </form>
  );
}
```

---

## 📊 Gestion des schémas

### Lister tous les schémas

```sql
SELECT 
  id,
  name,
  description,
  version,
  status,
  tags,
  (
    SELECT COUNT(*)
    FROM agents
    WHERE agents.openapi_schema_id = openapi_schemas.id
  ) as agents_count
FROM openapi_schemas
ORDER BY name;
```

### Voir quel agent utilise quel schéma

```sql
SELECT 
  a.display_name as agent,
  a.slug,
  a.provider,
  s.name as schema_name,
  s.version as schema_version
FROM agents a
LEFT JOIN openapi_schemas s ON a.openapi_schema_id = s.id
WHERE a.provider = 'xai';
```

### Mettre à jour un schéma

```bash
# Re-seed avec la nouvelle version
npx tsx scripts/seed-openapi-schemas.ts \
  --name clickup-api \
  --file ./schemas/clickup-openapi-v2.json

# Les agents qui utilisent ce schéma bénéficient automatiquement
# des nouveaux tools au prochain appel (cache 5min)
```

### Archiver un schéma

```typescript
await fetch('/api/ui/openapi-schemas?id=abc123...', {
  method: 'DELETE'
});

// Le schéma est archivé (status = 'archived')
// Les agents qui l'utilisent fallback vers les tools minimaux
```

---

## 🔍 Debugging

### Voir les tools générés depuis un schéma

```typescript
import { openApiSchemaService } from '@/services/llm/openApiSchemaService';

// Par nom
const tools = await openApiSchemaService.getToolsFromSchema('clickup-api');
console.log(`${tools.length} tools générés`);

// Par ID
const tools = await openApiSchemaService.getToolsFromSchemaById('abc123...');
console.log(`${tools.length} tools générés`);
```

### Valider un schéma avant de l'ajouter

```bash
# Utiliser le script de validation
npx tsx scripts/validate-all-tools.ts

# Affiche les tools problématiques
```

### Logs en runtime

```
[SimpleOrchestrator] 🔧 Chargement des tools depuis schéma OpenAPI: abc123...
[OpenAPISchemaService] 📥 Chargement du schéma abc123... depuis BDD...
[OpenAPISchemaService] ✅ Schéma chargé: clickup-api v2.0.0
[OpenAPISchemaService] ✅ 52 tools générés depuis le schéma
[XAIProvider] 🔧 Envoi de 52 tools à xAI
```

---

## ⚡ Performance & Cache

### Cache automatique (5 minutes)

```typescript
// Premier appel : charge depuis BDD
tools = await openApiSchemaService.getToolsFromSchemaById('abc123...');
// → Query BDD + Génération tools

// Appels suivants (< 5min) : depuis cache
tools = await openApiSchemaService.getToolsFromSchemaById('abc123...');
// → Instantané (pas de query BDD)
```

### Invalider le cache manuellement

```typescript
import { openApiSchemaService } from '@/services/llm/openApiSchemaService';

// Forcer le rechargement
openApiSchemaService.invalidateCache();
```

---

## 🎯 Cas d'usage réels

### Agent ClickUp

**Schéma** : `clickup-api` (52 tools)

**Tools générés** :
- `createTask`, `updateTask`, `deleteTask`
- `createList`, `updateList`
- `addComment`, `updateComment`
- `trackTime`, `getTrackedTime`
- `addDependency`, `deleteDependency`
- etc.

**Usage** :
```
User: "Crée une tâche Deployer xAI dans la liste Sprint avec priorité haute"
Agent: [Utilise createTask avec les 52 tools ClickUp]
```

### Agent HubSpot

**Schéma** : `hubspot-api` (45 tools)

**Tools générés** :
- `createContact`, `updateContact`
- `createDeal`, `updateDeal`
- `logEmail`, `logCall`
- `createCompany`
- etc.

### Agent Notion

**Schéma** : `notion-api` (38 tools)

**Tools générés** :
- `createPage`, `updatePage`
- `queryDatabase`
- `createBlock`, `updateBlock`
- etc.

---

## ⚙️ Configuration avancée

### Schémas par environnement

```sql
-- Schéma dev
INSERT INTO openapi_schemas (name, status, content)
VALUES ('clickup-api-dev', 'active', '...');

-- Schéma prod
INSERT INTO openapi_schemas (name, status, content)
VALUES ('clickup-api-prod', 'active', '...');

-- Agent utilise le bon schéma selon l'env
UPDATE agents SET openapi_schema_id = (
  SELECT id FROM openapi_schemas 
  WHERE name = CASE 
    WHEN current_setting('app.environment') = 'production' 
    THEN 'clickup-api-prod'
    ELSE 'clickup-api-dev'
  END
);
```

### Versioning des schémas

```sql
-- Garder plusieurs versions
INSERT INTO openapi_schemas (name, version, status, content)
VALUES 
  ('clickup-api', '1.0.0', 'archived', '...'),  -- Ancienne version
  ('clickup-api', '2.0.0', 'active', '...');    -- Version actuelle

-- Agent pointe vers la version active
```

---

## 🛠️ Maintenance

### Mettre à jour un schéma

```bash
# 1. Modifier le fichier .json
vim schemas/clickup-openapi.json

# 2. Re-seed
npx tsx scripts/seed-openapi-schemas.ts \
  --name clickup-api \
  --file ./schemas/clickup-openapi.json

# 3. Les agents bénéficient automatiquement de la mise à jour
# (après expiration du cache 5min)
```

### Nettoyer les schémas archivés

```sql
-- Supprimer définitivement les schémas archivés (après backup)
DELETE FROM openapi_schemas 
WHERE status = 'archived' 
AND updated_at < NOW() - INTERVAL '30 days';
```

---

## ✅ Checklist d'ajout de schéma

- [ ] Obtenir le schéma OpenAPI (fichier .json)
- [ ] Valider le JSON (avec jq ou validator)
- [ ] Placer dans `/schemas/nom-api-openapi.json`
- [ ] Seed avec le script : `npx tsx scripts/seed-openapi-schemas.ts --name nom-api --file ...`
- [ ] Vérifier les tools générés : `npx tsx scripts/test-openapi-tools.ts`
- [ ] Créer un agent avec ce schéma
- [ ] Tester les tool calls
- [ ] Monitorer les logs xAI
- [ ] Documenter les tools disponibles

---

## 🎉 Conclusion

**Système de schémas OpenAPI réutilisables = OPÉRATIONNEL !**

### Avantages

- ✅ **Plug & Play** : Coller un schéma OpenAPI → Tools générés automatiquement
- ✅ **Scalable** : Ajouter autant de schémas que nécessaire
- ✅ **Maintenable** : Mise à jour centralisée
- ✅ **Flexible** : Mix manuel (15 tools) + OpenAPI (38+ tools)
- ✅ **Production-ready** : Cache, validation, soft delete

### Agents possibles

- ✅ **Scrivia** (15 tools minimaux) - Actif
- 🔜 **ClickUp** (52 tools)
- 🔜 **HubSpot** (45 tools)
- 🔜 **Notion** (38 tools)
- 🔜 **GitHub** (60+ tools)
- 🔜 **Slack** (35 tools)
- 🔜 **n'importe quelle API avec OpenAPI spec** !

---

**Tu peux maintenant coller n'importe quel schéma OpenAPI et créer un agent dessus en 2 minutes !** 🚀

