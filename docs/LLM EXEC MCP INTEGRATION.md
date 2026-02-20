# Intégration des outils MCP dans les requêtes LLM Exec

Comment envoyer des **serveurs MCP** (Model Context Protocol) dans les requêtes vers les endpoints **`/llm-exec/round`** et **`/llm-exec/round/stream`**, pour que le modèle puisse appeler les tools exposés par ces serveurs.

---

## 1. Contexte

Un outil de type **MCP** dans le body `tools` représente **un serveur MCP** (URL + auth). Synesia :

- se connecte au serveur,
- récupère la liste des tools (via le protocole MCP),
- les expose au LLM comme outils disponibles,
- exécute les tool calls du modèle en appelant le serveur MCP.

Un seul objet `tools[]` avec `type: "mcp"` peut donc exposer **plusieurs** tools (tous ceux du serveur, ou un sous-ensemble via `allowed_tools`).

---

## 2. Format d’un outil MCP dans `tools`

Chaque entrée MCP dans le tableau **`tools`** doit être un objet avec les champs suivants.

| Champ | Type | Obligatoire | Description |
|--------|------|-------------|-------------|
| **`type`** | `string` | Oui | Toujours **`"mcp"`**. |
| **`server_label`** | `string` | Oui | Nom / libellé du serveur (ex. `"Mon MCP"`, `"system"`). Utilisé côté Synesia pour les logs et la résolution des clés d’auth (onglet Authentication = nom du tool). |
| **`server_url`** | `string` | Oui | URL de base du serveur MCP (ex. `"https://mcp.example.com"` ou `"http://localhost:3000"`). |
| **`allowed_tools`** | `string[]` | Oui | Liste des noms de tools MCP autorisés. **Tableau vide** `[]` = **tous** les tools du serveur sont exposés au LLM. Liste non vide = seuls les noms listés sont exposés. Le champ doit être présent (ne pas l’omettre). |
| **`require_approval`** | `string` | Oui | Valeur parmi **`"always"`**, **`"never"`**, **`"auto"`**. Comportement d’approbation avant exécution (à respecter côté client si l’UI gère l’approbation). |
| **`headers`** | `object` | Non | En-têtes HTTP envoyés à chaque appel au serveur MCP (auth, etc.). Voir §3. |

### Comportement de `allowed_tools`

| Cas | Comportement |
|-----|--------------|
| **`allowed_tools: []`** | **Tous** les tools retournés par le serveur MCP sont exposés au LLM. Le LLM voit donc bien des tools (ceux du serveur). |
| **`allowed_tools` omis** | Non supporté : le champ est obligatoire pour `type: "mcp"`. L’omettre peut provoquer une erreur côté serveur. Toujours envoyer au minimum `[]`. |
| **Aucun tool exposé au LLM** | Soit ne pas inclure d’entrée MCP dans `tools`, soit envoyer une liste de noms dans `allowed_tools` qui ne correspond à aucun tool retourné par le serveur (filtrage vide). Si le serveur MCP renvoie une liste vide, le LLM ne voit aucun tool pour ce serveur. |

---

## 3. Headers (authentification du serveur MCP)

Le champ **`headers`** est un objet dont chaque clé est un nom d’en-tête HTTP et la valeur est soit une chaîne, soit une référence à un secret stocké dans le projet.

### Valeur littérale

```json
"headers": {
  "Authorization": "Bearer my-token",
  "X-Custom-Header": "value"
}
```

### Référence à un secret (clé API du projet)

Pour ne pas envoyer de secret en clair, on peut référencer une clé configurée dans Synesia (onglet Authentication du projet, sous le nom du tool / `server_label`) :

```json
"headers": {
  "Authorization": { "secret_key": "MCP_TOKEN" }
}
```

- **`secret_key`** : identifiant de la clé côté Synesia (nom du secret).
- La clé doit être configurée pour le **projet** (dérivé de `x-api-key` ou de `x-project-id`) et associée au bon service (nom du tool = `server_label`).
- Si le header est **`Authorization`** et que la valeur résolue ne commence pas par `Bearer `, Synesia ajoute automatiquement le préfixe `Bearer `.

En l’absence de `headers` ou si l’objet est vide, les appels au serveur MCP sont faits sans en-têtes supplémentaires.

---

## 4. Exemple minimal (sans auth)

```json
{
  "model": "groq/llama-3-1-70b-versatile",
  "messages": [
    { "role": "user", "content": "Utilise un tool pour me donner la date actuelle." }
  ],
  "tools": [
    {
      "type": "mcp",
      "server_label": "system",
      "server_url": "https://mcp.example.com",
      "allowed_tools": ["get_current_date"],
      "require_approval": "never",
      "headers": {}
    }
  ]
}
```

---

## 5. Exemple avec plusieurs tools autorisés et headers

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [ { "role": "user", "content": "Cherche des infos sur le projet et résume." } ],
  "tools": [
    {
      "type": "mcp",
      "server_label": "Mon serveur MCP",
      "server_url": "https://mcp.mondomaine.com",
      "allowed_tools": ["search", "read_file"],
      "require_approval": "auto",
      "headers": {
        "Authorization": { "secret_key": "MCP_API_KEY" }
      }
    }
  ]
}
```

Pour exposer **tous** les tools du serveur, mettre **`allowed_tools`** à **`[]`**.

---

## 6. Exemple avec plusieurs serveurs MCP

On peut envoyer plusieurs entrées MCP dans **`tools`** (plusieurs serveurs) :

```json
{
  "model": "groq/gpt-oss-120b",
  "messages": [ { "role": "user", "content": "Donne-moi la date puis le résultat d'une recherche." } ],
  "tools": [
    {
      "type": "mcp",
      "server_label": "date-server",
      "server_url": "https://mcp-date.example.com",
      "allowed_tools": ["get_current_date"],
      "require_approval": "never",
      "headers": {}
    },
    {
      "type": "mcp",
      "server_label": "search-server",
      "server_url": "https://mcp-search.example.com",
      "allowed_tools": [],
      "require_approval": "never",
      "headers": {
        "X-API-Key": { "secret_key": "SEARCH_MCP_KEY" }
      }
    }
  ]
}
```

Chaque serveur est identifié par **`server_label`** et **`server_url`** ; les noms des tools exposés au LLM viennent du protocole MCP (noms retournés par le serveur), donc pas de collision si les noms diffèrent entre serveurs.

---

## 7. Comportement côté Synesia (résumé)

1. Pour chaque entrée **`type: "mcp"`**, Synesia appelle le serveur MCP à **`server_url`** (avec **`headers`** résolus) pour récupérer la liste des tools.
2. La liste est filtrée selon **`allowed_tools`** (vide = tout garder).
3. Ces tools sont exposés au LLM avec leur **name**, **description** et **inputSchema** fournis par le serveur.
4. Quand le modèle renvoie un **tool_call** sur un de ces noms, Synesia exécute l’outil via le serveur MCP et renvoie le résultat comme **tool_response** au modèle.
5. En cas d’échec (réseau, serveur injoignable, secret manquant), une erreur est remontée (ex. 400 avec message explicite).

---

## 8. Erreurs fréquentes

- **`allowed_tools` omis** : pour une entrée `type: "mcp"`, le champ **`allowed_tools`** est obligatoire. L’omettre peut provoquer une erreur côté serveur. Toujours envoyer au minimum **`[]`** pour exposer tous les tools du serveur.
- **`Failed to fetch tools from MCP server X`** : le serveur n’est pas joignable, ou l’URL est incorrecte, ou les headers (auth) sont refusés.
- **`No API key configured for MCP tool "X" header "Y"`** : un **`headers`** utilise **`{ "secret_key": "..." }`** mais aucune clé n’est configurée pour ce projet / ce tool (server_label) / ce header. Il faut configurer la clé dans l’onglet Authentication du projet (ou envoyer la valeur en clair dans **`headers`** si acceptable).
- **`Invalid authorization format`** : problème d’auth **de la requête vers Synesia** (x-api-key ou Bearer + x-project-id), pas des headers MCP. Voir la doc d’auth LLM Exec.

---

## 9. Mélanger MCP et autres types d’outils

Le tableau **`tools`** peut contenir à la fois des MCP et des callables (ou d’autres types) :

```json
"tools": [
  { "type": "callable", "callable_id": "c89f020d-404b-4429-be25-ec7dec0e7a56" },
  {
    "type": "mcp",
    "server_label": "system",
    "server_url": "https://mcp.example.com",
    "allowed_tools": ["get_current_date"],
    "require_approval": "never",
    "headers": {}
  }
]
```

Même règles d’auth (x-api-key ou Bearer + x-project-id) et même flux de round/stream que pour les callables ; seuls le format et le sens des champs changent pour les entrées MCP.

---

## 10. Références

- Types serveur : **`apps/server/src/features/llm-exec/llm-exec.types.ts`** (`InputMCPTool`).
- Conversion MCP → kit : **`apps/server/src/features/llm-exec/converters/mcp-tool.converter.ts`**.
- Schéma OpenAPI : **`openapi-schemas/llm-exec.json`** (composant **InputTool**, exemples avec `type: "mcp"`).

---

## 11. Conformité implémentation Abrège (Liminality)

*Audit réalisé par rapport à ce document — vérification que les MCP sont correctement envoyés aux agents passant par le provider Liminality.*

### 11.1 Format MCP envoyé à l’API

| Exigence doc (§2) | Implémentation | Statut |
|-------------------|----------------|--------|
| **`type: "mcp"`** | `LiminalityToolsAdapter.convertMcpTool()` fixe `type: 'mcp'` | ✅ Conforme |
| **`server_label`** (obligatoire) | Déduit de `tool.server_label` ou `tool.name`, défaut `'mcp-server'` | ✅ Conforme |
| **`server_url`** (obligatoire) | `tool.server_url` (string), défaut `''` si absent | ✅ Conforme |
| **`allowed_tools`** (obligatoire, jamais omis) | Toujours présent : tableau de strings ou `[]` si absent/invalide (doc : `[]` = tous les tools) | ✅ Conforme |
| **`require_approval`** (obligatoire) | Toujours présent : `'always' \| 'never' \| 'auto'`, défaut `'auto'` si invalide | ✅ Conforme |
| **`headers`** (optionnel) | Passés tels quels si présents ; types `string \| { secret_key: string }` supportés (`liminalityTypes.LiminalityMCPHeaderValue`) | ✅ Conforme |

### 11.2 Chaîne d’appel (stream)

1. **Route** `src/app/api/chat/llm/stream/route.ts` : chargement des tools via `mcpConfigService.buildHybridTools(agentId, userToken, openApiTools)` → retourne OpenAPI + **McpServerConfig** (type `mcp`, `server_label`, `server_url`, `headers`, `require_approval`, `allowed_tools`).
2. Pour **Liminality**, la route appelle `provider.callWithMessagesStream(currentMessages, tools, synesiaCallables)` avec ces `tools` (dont les MCP).
3. **LiminalityProvider** (`src/services/llm/providers/implementations/liminality.ts`) appelle `LiminalityToolsAdapter.convert(tools)` puis envoie le payload à `/llm-exec/round/stream` avec les tools convertis.
4. Les outils MCP sont donc bien inclus dans le payload et conformes au format décrit aux §2–3.

### 11.3 Source des champs MCP (base de données)

- **mcpConfigService** lit `mcp_servers` via `agent_mcp_servers` et remplit `server_label`, `server_url`, `headers` (depuis `header` + `api_key`), `require_approval`, `allowed_tools`.
- Les colonnes **`require_approval`** et **`allowed_tools`** (et **`server_description`**) doivent exister sur `mcp_servers`. La migration initiale ne les contenait pas.
- **Correction apportée** : migration **`20250220000000_add_mcp_servers_llm_exec_columns.sql`** ajoutant `server_description`, `require_approval`, `allowed_tools` à `mcp_servers`. À appliquer si votre schéma ne les a pas encore (ex. déploiement local ; Factoria peut déjà les avoir).

### 11.4 Synthèse

- **Conformité** : l’implémentation est **conforme** au document pour le provider Liminality : les champs obligatoires sont toujours envoyés, `allowed_tools` et `require_approval` sont gérés selon la spec, et les tools MCP sont bien visibles par les agents Liminality.
- **Action requise** : appliquer la migration **`20250220000000_add_mcp_servers_llm_exec_columns.sql`** si les colonnes `require_approval` et `allowed_tools` (et optionnellement `server_description`) n’existent pas encore sur `mcp_servers`.
- **Aucune autre correction** n’est nécessaire pour que les MCP soient correctement envoyés et que les tools MCP soient exposés au LLM via Liminality.
