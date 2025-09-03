# Intégration du schéma OpenAPI V2 avec le système LLM

## Vue d'ensemble

Ce document décrit l'intégration complète du schéma OpenAPI V2 avec le système LLM d'Abrège, permettant aux modèles de langage d'utiliser automatiquement les outils de l'API V2.

## Architecture

### 1. Service de schéma OpenAPI (`openApiSchemaService.ts`)

**Rôle** : Service centralisé pour charger et gérer le schéma OpenAPI V2.

**Fonctionnalités** :
- Chargement du schéma depuis `openapi-v2-schema.json`
- Cache du schéma en mémoire
- Méthodes utilitaires pour explorer le schéma
- Pattern Singleton pour éviter les rechargements multiples

**Utilisation** :
```typescript
import { getOpenAPISchemaService } from '@/services/openApiSchemaService';

const schemaService = getOpenAPISchemaService();
const schema = schemaService.getSchema();
const endpoints = schemaService.getEndpoints();
```

### 2. Générateur de tools (`openApiToolsGenerator.ts`)

**Rôle** : Convertit le schéma OpenAPI V2 en tools compatibles avec les LLMs.

**Fonctionnalités** :
- Génération automatique des tools depuis les endpoints
- Filtrage des endpoints utiles pour les LLMs
- Mapping des noms d'endpoints vers des noms de tools lisibles
- Génération des paramètres au format JSON Schema

**Utilisation** :
```typescript
import { getOpenAPIV2Tools } from '@/services/openApiToolsGenerator';

const tools = getOpenAPIV2Tools();
// Retourne un tableau de tools au format OpenAI/Groq
```

### 3. Intégration avec AgentApiV2Tools (`agentApiV2Tools.ts`)

**Rôle** : Intègre les tools OpenAPI V2 dans le système d'exécution des tools.

**Fonctionnalités** :
- Chargement automatique des tools OpenAPI V2
- Mapping des noms de tools vers les endpoints API V2
- Exécution des requêtes HTTP vers l'API V2
- Gestion des erreurs et des réponses

### 4. Intégration avec les providers LLM

**Rôle** : Fournit les tools aux providers LLM (Groq, etc.).

**Implémentation** :
```typescript
// Dans groq.ts
getFunctionCallTools(): any[] {
  try {
    const { getOpenAPIV2Tools } = require('@/services/openApiToolsGenerator');
    const tools = getOpenAPIV2Tools();
    return tools;
  } catch (error) {
    logger.warn('Erreur lors du chargement des tools OpenAPI V2:', error);
    return [];
  }
}
```

## Endpoints API

### GET `/api/v2/openapi-schema`

Expose le schéma OpenAPI V2 complet.

**Réponse** :
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "API V2 Abrège",
    "version": "2.0.0"
  },
  "paths": { ... },
  "components": { ... }
}
```

### GET `/api/v2/tools`

Expose les tools OpenAPI V2 pour les LLMs.

**Réponse** :
```json
{
  "success": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_note",
        "description": "Créer une nouvelle note",
        "parameters": { ... }
      }
    }
  ],
  "count": 16,
  "generated_at": "2024-01-01T00:00:00.000Z"
}
```

## Tools disponibles

### Notes
- `create_note` - Créer une nouvelle note
- `get_note` - Récupérer une note
- `update_note` - Mettre à jour une note
- `delete_note` - Supprimer une note
- `add_content_to_note` - Ajouter du contenu à une note
- `move_note` - Déplacer une note
- `get_note_toc` - Récupérer la table des matières
- `get_note_stats` - Récupérer les statistiques d'une note
- `get_recent_notes` - Récupérer les notes récentes

### Classeurs
- `create_classeur` - Créer un nouveau classeur
- `list_classeurs` - Lister tous les classeurs
- `get_classeur_tree` - Récupérer l'arborescence d'un classeur

### Dossiers
- `create_folder` - Créer un nouveau dossier
- `get_folder_tree` - Récupérer l'arborescence d'un dossier

### Recherche
- `search_notes` - Rechercher dans le contenu
- `search_files` - Rechercher des fichiers

### Utilisateur
- `get_user_info` - Informations sur l'utilisateur actuel
- `get_platform_stats` - Statistiques globales

### Gestion unifiée
- `delete_resource` - Supprimer une ressource

## Tests

### Scripts de test disponibles

1. **`test-openapi-simple.ts`** - Test basique de lecture du schéma
2. **`test-llm-openapi-integration.ts`** - Test complet d'intégration LLM

### Exécution des tests

```bash
# Test simple
npx tsx src/scripts/test-openapi-simple.ts

# Test complet
npx tsx src/scripts/test-llm-openapi-integration.ts
```

### Résultats attendus

- ✅ Schéma chargé : API V2 Abrège v2.0.0
- ✅ 19 endpoints disponibles
- ✅ 16 tools générés
- ✅ 12/12 tools attendus trouvés
- ✅ 16/16 tools compatibles avec Groq
- ✅ Performance excellente (< 100ms)

## Configuration

### Variables d'environnement

Aucune variable d'environnement supplémentaire n'est requise. Le schéma est chargé depuis le fichier local `openapi-v2-schema.json`.

### Cache

- Le schéma est mis en cache en mémoire après le premier chargement
- Les endpoints API utilisent un cache HTTP de 30 minutes à 1 heure
- Le rechargement peut être forcé via `schemaService.reload()`

## Maintenance

### Ajout de nouveaux endpoints

1. Ajouter l'endpoint dans `openapi-v2-schema.json`
2. Mettre à jour la liste des endpoints utiles dans `openApiToolsGenerator.ts`
3. Ajouter le mapping dans `agentApiV2Tools.ts` si nécessaire
4. Tester avec les scripts de test

### Mise à jour du schéma

1. Remplacer `openapi-v2-schema.json`
2. Redémarrer l'application ou forcer le rechargement
3. Vérifier que les tests passent

## Dépannage

### Problèmes courants

1. **Schéma non trouvé** : Vérifier que `openapi-v2-schema.json` existe à la racine
2. **Tools non générés** : Vérifier les logs du `OpenAPIToolsGenerator`
3. **Erreurs de mapping** : Vérifier les mappings dans `agentApiV2Tools.ts`

### Logs utiles

```bash
# Logs du service de schéma
[OpenAPISchemaService] 🔧 Chargement du schéma OpenAPI V2...

# Logs du générateur de tools
[OpenAPIToolsGenerator] 🔧 Génération des tools depuis OpenAPI
[OpenAPIToolsGenerator] ✅ 16 tools générés

# Logs d'AgentApiV2Tools
[AgentApiV2Tools] 🔧 Tools OpenAPI V2 intégrés avec succès
```

## Performance

- **Chargement initial** : ~0ms (cache en mémoire)
- **Génération des tools** : ~0ms
- **Cache HTTP** : 30 minutes à 1 heure
- **Mémoire** : Minimal (schéma en cache)

## Sécurité

- Les tools utilisent l'authentification JWT existante
- Les endpoints API sont protégés par CORS
- Aucune donnée sensible n'est exposée dans les tools
- Validation des paramètres via JSON Schema
