# Knowledge API (Search & Query)

Base URL : `https://api.synesia.app`

Auth : header `Authorization: ApiKey apiKey.{id}.{key}` (pas de `x-project-id` requis avec ApiKey).

## Endpoints

### 1) POST `/knowledges/{knowledge_id}/search` — recherche brute
- **Body** : `{ "query": string (1..10000) }`
- **Réponse** : `{ context?: string, entries: KnowledgeQueryEntry[] }`
- **Entrée** `KnowledgeQueryEntry` : `{ id, content, score?, metadata?, dataset_id? }`
- **Usage** : retourne uniquement les chunks, aucune synthèse LLM.

### 2) POST `/knowledges/{knowledge_id}/query` — QA avec synthèse LLM
- **Body** :
  ```json
  {
    "query": "Question...",
    "overrides": {
      "top_k": 1..100,
      "top_n": 1..100,
      "llm": { "model_id": "...", "instruction": "...", "max_tokens": 1..4096 }
    },
    "debug": false
  }
  ```
- **Réponse** :
  ```json
  {
    "answer": "réponse LLM",
    "entries": [KnowledgeQueryEntry...],
    "usage": { "llm_model_id": "...", "top_k": 5, "top_n": 5, "total_entries_considered": 5 },
    "debug": { "raw_retrieval_config": {...}, "applied_overrides": {...}, "intermediate_results_count": 5 },
    "llm_error": "présent uniquement si fallback"
  }
  ```
- **Comportement** : toujours synthèse LLM. Fallback si l’appel LLM échoue → retourne les entries + `llm_error`. Modèle par défaut si aucun configuré : `gpt-oss-120b`.

## Exemples cURL

Recherche brute :
```bash
curl -X POST "https://api.synesia.app/knowledges/{id}/search" \
  -H "Authorization: ApiKey apiKey.{id}.{key}" \
  -H "Content-Type: application/json" \
  -d '{"query":"Qu est-ce que Scrivia ?"}'
```

QA avec synthèse LLM + override :
```bash
curl -X POST "https://api.synesia.app/knowledges/{id}/query" \
  -H "Authorization: ApiKey apiKey.{id}.{key}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Qu est-ce que Synesia ?",
    "overrides": { "top_k": 5, "llm": { "model_id": "gpt-oss-120b" } },
    "debug": true
  }'
```

## Notes importantes
- `top_k`/`top_n` validés (1..100). `instruction` max 2000 chars. `query` max 10000 chars.
- Debug facultatif pour ne pas polluer les réponses normales.
- `llm_error` renseigné uniquement en cas de fallback après échec de la synthèse.






