# Endpoint Content Apply - Documentation Complète

## 📝 POST /api/v2/note/{ref}/content:apply

Endpoint LLM-friendly pour appliquer des opérations de contenu sur une note avec une précision chirurgicale.

## 🎯 Vue d'ensemble

Cet endpoint permet d'appliquer des opérations de contenu complexes sur une note en utilisant différents types de cibles :
- **Headings** : Cibler par titre (chemin, niveau, ID)
- **Regex** : Cibler par expression régulière
- **Position** : Cibler par position (début, fin, offset)
- **Anchor** : Cibler par ancre sémantique

## 🔧 Opérations supportées

| Opération | Description |
|-----------|-------------|
| `insert` | Insérer du contenu à une position |
| `replace` | Remplacer du contenu existant |
| `delete` | Supprimer du contenu |
| `upsert_section` | Créer ou mettre à jour une section |

## 📋 Types de cibles

### 1. Heading Target
```json
{
  "type": "heading",
  "heading": {
    "path": ["API", "Endpoints"],
    "level": 3,
    "heading_id": "api-endpoints"
  }
}
```

### 2. Regex Target
```json
{
  "type": "regex",
  "regex": {
    "pattern": "```mermaid[\\s\\S]*?```",
    "flags": "m",
    "nth": -1
  }
}
```

### 3. Position Target
```json
{
  "type": "position",
  "position": {
    "mode": "offset",
    "offset": 128
  }
}
```

### 4. Anchor Target
```json
{
  "type": "anchor",
  "anchor": {
    "name": "after_toc"
  }
}
```

## 🎯 Positions relatives

| Position | Description |
|----------|-------------|
| `before` | Avant la cible |
| `after` | Après la cible |
| `inside_start` | Au début de la cible |
| `inside_end` | À la fin de la cible |
| `at` | À la position exacte |
| `replace_match` | Remplacer la correspondance |

## 🔒 Sécurité et validation

### Headers requis
- `If-Match: W/"etag"` (optionnel) - Validation de version
- `X-Note-Version: 42` (optionnel) - Version alternative

### Limites de sécurité
- **Contenu** : 100,000 caractères max
- **Regex pattern** : 1,000 caractères max
- **Opérations** : 50 max par requête
- **Timeout regex** : 5 secondes

## 📊 Exemple complet

```bash
curl -X POST "https://api.abrege.com/api/v2/note/my-note/content:apply" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "If-Match: W/\"abc123\"" \
  -d '{
    "ops": [
      {
        "id": "op-1",
        "action": "insert",
        "target": {
          "type": "heading",
          "heading": {
            "path": ["API", "Endpoints"],
            "level": 3,
            "heading_id": "api-endpoints"
          }
        },
        "where": "after",
        "content": "### Nouveau bloc\nTexte…",
        "options": {
          "ensure_heading": true,
          "surround_with_blank_lines": 1,
          "dedent": true
        }
      }
    ],
    "dry_run": true,
    "transaction": "all_or_nothing",
    "conflict_strategy": "fail",
    "return": "diff",
    "idempotency_key": "uuid"
  }'
```

## 📤 Réponse

```json
{
  "data": {
    "note_id": "uuid",
    "ops_results": [
      {
        "id": "op-1",
        "status": "applied",
        "matches": 1,
        "range_before": {"start": 123, "end": 456},
        "range_after": {"start": 123, "end": 612},
        "preview": "...### Nouveau bloc\nTexte…"
      }
    ],
    "etag": "W/\"md5\"",
    "diff": "@@ -128,0 +128,42 @@\n+### Nouveau bloc..."
  },
  "meta": {
    "dry_run": true,
    "char_diff": {"added": 42, "removed": 0},
    "execution_time": 150
  }
}
```

## 🚨 Codes d'erreur

| Code | Status | Description |
|------|--------|-------------|
| `TARGET_NOT_FOUND` | 404 | Cible non trouvée |
| `AMBIGUOUS_MATCH` | 409 | Correspondance ambiguë |
| `REGEX_COMPILE_ERROR` | 400 | Erreur de compilation regex |
| `REGEX_TIMEOUT` | 408 | Timeout regex |
| `PRECONDITION_FAILED` | 412 | Version obsolète (ETag) |
| `PARTIAL_APPLY` | 207 | Application partielle |
| `CONTENT_TOO_LARGE` | 413 | Contenu trop volumineux |

## 🧪 Cas d'usage LLM

### 1. Insertion de section
```json
{
  "ops": [{
    "id": "add-section",
    "action": "insert",
    "target": {
      "type": "heading",
      "heading": {
        "path": ["Introduction"],
        "level": 2
      }
    },
    "where": "after",
    "content": "## Nouvelle section\nContenu..."
  }]
}
```

### 2. Remplacement de code
```json
{
  "ops": [{
    "id": "update-code",
    "action": "replace",
    "target": {
      "type": "regex",
      "regex": {
        "pattern": "```javascript\\n.*?\\n```",
        "flags": "s"
      }
    },
    "where": "replace_match",
    "content": "```javascript\n// Code mis à jour\n```"
  }]
}
```

### 3. Ajout en fin de document
```json
{
  "ops": [{
    "id": "append-content",
    "action": "insert",
    "target": {
      "type": "anchor",
      "anchor": { "name": "doc_end" }
    },
    "where": "at",
    "content": "\n\n---\n\n*Note modifiée automatiquement*"
  }]
}
```

## 🔄 Mode transaction

- **`all_or_nothing`** (défaut) : Toutes les opérations réussissent ou aucune
- **`best_effort`** : Applique le maximum d'opérations possibles

## 🎭 Mode dry-run

Par défaut, `dry_run: true` pour permettre aux LLM de tester avant d'appliquer.

## 📈 Métriques

L'endpoint retourne des métriques détaillées :
- **char_diff** : Caractères ajoutés/supprimés
- **execution_time** : Temps d'exécution en ms
- **ops_results** : Résultat détaillé de chaque opération

## 🚀 Intégration LLM

Cet endpoint est optimisé pour les agents IA avec :
- **Dry-run par défaut** : Sécurité maximale
- **ETag validation** : Évite les conflits
- **Opérations atomiques** : Contrôle précis
- **Résultats détaillés** : Feedback complet
- **Gestion d'erreurs** : Codes spécifiques

## 🔧 Développement

### Structure des fichiers
```
src/
├── app/api/v2/note/[ref]/content:apply/route.ts
├── utils/contentApplyUtils.ts
└── utils/v2ValidationSchemas.ts
```

### Tests
```bash
# Test simple
node test-simple-content-apply.js

# Test complet
node test-content-apply-endpoint.js
```

### OpenAPI
L'endpoint est intégré dans le schéma OpenAPI v2 :
```
GET /api/v2/openapi-schema
```
