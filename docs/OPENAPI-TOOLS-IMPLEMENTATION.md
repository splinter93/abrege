# 🔧 Implémentation des Tools OpenAPI

## Vue d'ensemble

Les agents peuvent utiliser des tools OpenAPI externes (Pexels, Exa, etc.) pour étendre leurs capacités. Cette documentation décrit l'architecture complète de bout en bout.

---

## Architecture

### 1. Stockage des schémas OpenAPI

**Table `openapi_schemas`** :
- `id` : UUID unique
- `name` : Nom du schéma (ex: "Pexels Images")
- `content` : Schéma OpenAPI complet (JSONB)
- `api_key` : Clé API pour authentifier les appels (TEXT)
- `header` : Nom du header HTTP pour l'authentification (TEXT, ex: "Authorization", "x-api-key")
- `status` : Statut du schéma (active/inactive)
- `version` : Version du schéma

### 2. Association Agent ↔ Schéma

**Table `agents`** :
- `openapi_schema_id` : UUID référençant `openapi_schemas.id`
- Un agent peut avoir un seul schéma OpenAPI assigné
- Le schéma est chargé automatiquement lors de l'exécution de l'agent

---

## Flux d'exécution

### Étape 1 : Configuration de l'agent
```typescript
// L'agent est configuré avec un schéma OpenAPI
agent.openapi_schema_id = "6dc09226-2e61-43af-bfb0-6d72a4470b13"; // Pexels Images
```

### Étape 2 : Chargement du schéma
```typescript
// SimpleOrchestrator.configureOpenApiExecutor()
// 1. Récupère le schéma depuis la BDD (content, api_key, header)
// 2. Extrait l'URL de base : https://api.pexels.com/v1
// 3. Extrait les endpoints : get__search => GET /search
// 4. Configure l'exécuteur OpenAPI
```

### Étape 3 : Extraction des endpoints
```typescript
// SimpleOrchestrator.extractEndpointsFromSchema()
// Parse le schéma OpenAPI pour extraire :
// - operationId : "get__search"
// - method : "GET" ou "POST"
// - path : "/search"
// - apiKey : depuis schema.api_key
// - headerName : depuis schema.header ou auto-détecté
```

### Étape 4 : Détection du type de tools
```typescript
// SimpleOrchestrator.isOpenApiTools()
// Vérifie si les tool calls existent dans les endpoints OpenAPI configurés
// Si oui : utilise OpenApiToolExecutor
// Si non : utilise SimpleToolExecutor (MCP tools)
```

### Étape 5 : Exécution du tool
```typescript
// OpenApiToolExecutor.executeToolCall()
// 1. Parser les arguments JSON
// 2. Construire l'URL : baseUrl + path + query params (si GET)
// 3. Construire les headers : { [headerName]: apiKey }
// 4. Faire l'appel HTTP avec timeout (30s)
// 5. Retourner le résultat JSON
```

---

## Configuration des schémas

### Pexels Images

```sql
-- URL de base
content.servers[0].url = "https://api.pexels.com/v1"

-- Header d'authentification
header = "Authorization"

-- Clé API (à ajouter)
api_key = "VOTRE_CLE_PEXELS"

-- Endpoints disponibles
- get__search : GET /search
- get__curated : GET /curated
- get__popular : GET /popular
```

### Exa Web Search

```sql
-- URL de base
content.servers[0].url = "https://api.exa.ai"

-- Header d'authentification
header = "x-api-key"

-- Clé API (à ajouter)
api_key = "VOTRE_CLE_EXA"

-- Endpoints disponibles
- answer : POST /answer
- search : POST /search
- getContents : POST /contents
- research : POST /research
- findSimilar : POST /findSimilar
```

---

## Gestion des erreurs

### Validation stricte

1. **URL de base** : Validation avec `new URL()` avant utilisation
2. **Arguments** : Validation JSON + nettoyage des valeurs null/undefined
3. **Timeout** : 30 secondes max par appel HTTP
4. **Endpoints manquants** : Erreur claire avec liste des endpoints disponibles

### Logs de débogage

```typescript
// Configuration
[SimpleOrchestrator] ✅ Exécuteur OpenAPI configuré avec URL: https://api.pexels.com/v1
[SimpleOrchestrator] ✅ 3 endpoints extraits du schéma
[SimpleOrchestrator] ✅ Header: Authorization, API Key: ✅ Configurée

// Exécution
[OpenApiToolExecutor] 🔧 Endpoint trouvé: GET /search
[OpenApiToolExecutor] 🔧 URL finale: https://api.pexels.com/v1/search?query=nature&per_page=10
[OpenApiToolExecutor] 🔑 Clé API ajoutée au header "Authorization"
[OpenApiToolExecutor] ✅ OpenAPI tool executed: get__search (245ms)
```

---

## Sécurité

### Clés API

**Actuellement** : Stockées en clair dans `openapi_schemas.api_key`

**Prochainement** : Chiffrement avec Supabase Vault
```sql
-- Migration future pour chiffrer les clés
ALTER TABLE openapi_schemas 
ADD COLUMN api_key_encrypted TEXT;

-- Utiliser la fonction encrypt() de Supabase
UPDATE openapi_schemas
SET api_key_encrypted = encrypt(api_key, 'vault_key_id');
```

### Validation des données

- ✅ Validation de tous les paramètres d'entrée
- ✅ Nettoyage des valeurs null/undefined
- ✅ Validation des URLs avant appel HTTP
- ✅ Timeout pour éviter les appels infinis
- ✅ Gestion stricte des erreurs HTTP

---

## Support multi-providers

### xAI
- Utilise **uniquement** les tools OpenAPI si configurés
- Fallback sur les tools minimaux si pas de schéma

### Groq / OpenAI
- **Combine** les tools OpenAPI + MCP tools
- Permet d'utiliser à la fois les APIs externes et les tools internes

---

## Ajout d'un nouveau schéma OpenAPI

### 1. Créer le schéma dans la BDD

```sql
INSERT INTO openapi_schemas (name, content, api_key, header, status, version)
VALUES (
  'Mon API',
  '{
    "openapi": "3.1.0",
    "servers": [{"url": "https://api.example.com/v1"}],
    "paths": {
      "/endpoint": {
        "get": {
          "operationId": "myOperation",
          "summary": "Description",
          "parameters": [...]
        }
      }
    }
  }'::jsonb,
  'VOTRE_CLE_API',
  'Authorization',
  'active',
  '1.0.0'
);
```

### 2. Assigner le schéma à un agent

```sql
UPDATE agents
SET openapi_schema_id = 'ID_DU_SCHEMA'
WHERE slug = 'mon-agent';
```

### 3. Mettre à jour la détection (si nouveau type d'API)

Si l'API utilise un header d'authentification non standard, ajoutez-le dans `detectHeaderNameFromUrl` :

```typescript
private detectHeaderNameFromUrl(baseUrl: string): string {
  if (baseUrl.includes('pexels.com')) return 'Authorization';
  if (baseUrl.includes('exa.ai')) return 'x-api-key';
  if (baseUrl.includes('example.com')) return 'X-API-Key'; // Nouveau
  return 'Authorization'; // Défaut
}
```

---

## Tests

### Test manuel

1. Configurer la clé API :
```sql
UPDATE openapi_schemas SET api_key = 'VOTRE_CLE' WHERE name = 'Pexels Images';
```

2. Tester l'agent dans le chat :
```
"Trouve-moi des images de nature"
```

3. Vérifier les logs :
```
[OpenApiToolExecutor] ✅ OpenAPI tool executed: get__search (245ms)
```

### Validation des données

- Les schémas OpenAPI doivent être valides selon OpenAPI 3.x
- Les operationId doivent être uniques par schéma
- L'URL de base doit être une URL valide
- La clé API doit être présente pour les APIs authentifiées

---

## Limitations actuelles

1. **Pas de rate limiting** : Les appels externes ne sont pas limités
2. **Pas de cache** : Chaque appel fait une requête HTTP
3. **Pas de retry** : Pas de réessai automatique en cas d'échec temporaire
4. **Clés en clair** : Les clés API ne sont pas encore chiffrées

## Améliorations futures

- [ ] Chiffrement des clés API avec Supabase Vault
- [ ] Cache des résultats avec TTL configurable
- [ ] Rate limiting par API externe
- [ ] Retry automatique avec backoff exponentiel
- [ ] Support des webhooks pour les APIs asynchrones
- [ ] Validation des schémas avec JSON Schema validator

