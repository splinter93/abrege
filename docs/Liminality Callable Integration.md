# Intégration des callables dans les requêtes LLM Exec

Documentation à l’usage du client (autre projet) qui appelle l’API Synesia **LLM Exec**. Objectif : vérifier que l’injection des **callables** dans les requêtes est correcte et que le flux (round + stream) est bien géré.

**Avec ce document, un développeur a tout pour implémenter un chat externe et afficher les appels vers un callable** : endpoints et auth (§1–2), format de la requête et des callables (§3–4), format SSE et procédure pour récupérer les tool calls dans le stream (§6), événements à écouter et exemples de payloads pour l’affichage (§7), checklist de vérification (§8) et exemple cURL (§9).

---

## 1. Endpoints concernés

| Endpoint | Méthode | Usage |
|----------|---------|--------|
| `/llm-exec/round` | POST | Round complet, réponse JSON (non-streaming). |
| `/llm-exec/round/stream` | POST | Round en streaming (SSE). |

Pour un chat avec callables, les deux sont utilisables ; le **stream** est recommandé pour l’UX (texte progressif + événements d’outils).

---

## 2. Authentification

Le **project_id** est requis côté Synesia (résolution des callables, runs, etc.). Il doit être fourni via l’un des mécanismes suivants.

### Option A : Clé API (recommandé)

- Header : **`x-api-key`**
- Valeur : clé du projet (format type `apiKey.25.xxxx` ou équivalent).
- Le serveur dérive le `project_id` à partir de cette clé.

```http
x-api-key: apiKey.25.OGIwMzllY2MtYWIxZS00Y2E2LTg4MjQtMGQ4OTFiMWFmZDA1
```

### Option B : Bearer + project

- Header : **`Authorization: Bearer <token>`**
- Header : **`x-project-id: <uuid_du_projet>`**

Si le client utilise un autre schéma (ex. préfixe "Entity"), l’erreur typique sera du type : *"Invalid authorization format. Must start with Bearer or Entity"*. Il faut alors adapter les headers côté client pour qu’ils correspondent à ce que Synesia attend.

---

## 3. Corps de la requête (body)

Body JSON commun pour `/llm-exec/round` et `/llm-exec/round/stream`.

### Champs obligatoires

- **`model`** (string) : slug du modèle, ex. `groq/gpt-oss-120b`, `openai/gpt-4o-mini`.
- **`messages`** (array) : liste de messages (au moins un), chacun avec `role` et `content` (pour user/assistant/system).

### Champs optionnels utiles pour les callables

- **`tools`** (array) : liste d’outils exposés au modèle. Pour les callables, voir §4.
- **`instructions`** (string) : instructions système (prompt système) pour guider l’agent sur l’usage des outils.
- **`config`** (object) : ex. `{ "max_loops": 10 }` pour limiter les tours d’orchestration.

Exemple minimal **avec** callable :

```json
{
  "model": "groq/gpt-oss-120b",
  "messages": [
    { "role": "user", "content": "Demande à Tim d'envoyer un message Telegram à K pour lui demander s'il va bien." }
  ],
  "tools": [
    { "type": "callable", "callable_id": "c89f020d-404b-4429-be25-ec7dec0e7a56" }
  ],
  "instructions": "You have access to Tim. When the user asks Tim to do something, call Tim with that request and then confirm the result to the user."
}
```

---

## 4. Injection des callables dans `tools`

### Format d’un outil callable

Un callable est un outil dont le type est **`callable`** et qui référence un callable Synesia par son identifiant.

```json
{
  "type": "callable",
  "callable_id": "<uuid_ou_slug>"
}
```

- **`type`** : doit être exactement **`"callable"`**.
- **`callable_id`** (string) :
  - soit un **UUID** du callable (ex. `c89f020d-404b-4429-be25-ec7dec0e7a56`) ;
  - soit un **slug** si le callable en a un (ex. `tim`).
  - L’UUID ou le slug se récupère dans l’interface Synesia (détail du callable) ou via l’API projet.

Aucun autre champ n’est nécessaire pour l’injection côté requête. Le nom, la description et le schéma d’entrée du tool sont **récupérés côté Synesia** à partir du callable (vue `project_available_callables_view`, projet = celui dérivé de l’auth).

### Règles côté Synesia (pour comprendre les erreurs)

- Le callable doit **exister** et être **disponible pour le projet** (même `project_id` que celui de la clé / du token).
- Le callable doit avoir une **description** ; sinon Synesia renverra une erreur du type *"Callable X must have a description"*.
- Un callable peut être un **agent**, un **script**, une **pipeline**, etc. Lorsque le modèle appelle ce “tool”, Synesia exécute le callable (ex. `ExecutionService.execute(callable_id, args, project_id, ...)`) et renvoie le résultat comme **tool_response** au modèle.

### Exemple avec plusieurs outils (dont un callable)

```json
{
  "model": "groq/gpt-oss-120b",
  "messages": [ { "role": "user", "content": "Ask Tim to say hello to K on Telegram." } ],
  "tools": [
    { "type": "callable", "callable_id": "c89f020d-404b-4429-be25-ec7dec0e7a56" }
  ],
  "instructions": "You have access to Tim. Call Tim when the user asks to contact or message someone."
}
```

Ne pas mélanger avec d’autres types d’outils si vous voulez uniquement des callables ; pour ajouter d’autres outils (MCP, OpenAPI, etc.), voir le schéma `InputTool` dans l’OpenAPI Synesia (`openapi-schemas/llm-exec.json`).

---

## 5. Comportement côté Synesia (résumé)

1. Le serveur reçoit `tools` avec des entrées `{ "type": "callable", "callable_id": "..." }`.
2. Pour chaque callable, il charge **name**, **description**, **input_schema** depuis la base (vue projet).
3. Il convertit chaque callable en un outil “managed” exposé au LLM (nom dérivé du name/slug, description, paramètres dérivés de `input_schema`).
4. Lorsque le modèle renvoie un **tool_call** dont le nom correspond à ce callable, Synesia exécute le callable (agent, script, pipeline, etc.) avec les arguments fournis par le modèle.
5. Le résultat (succès ou erreur) est renvoyé comme **tool_response** au modèle ; le round continue (tour suivant) jusqu’à ce que le modèle renvoie une réponse finale (sans tool_call) ou que `max_loops` soit atteint.

Donc côté client : il suffit d’envoyer **model**, **messages** et **tools** (avec les callables au format ci-dessus). Pas besoin d’envoyer le schéma ou la description du callable ; Synesia s’en charge.

---

## 6. Streaming : `/llm-exec/round/stream`

### Headers de la requête

- **Content-Type**: `application/json`
- **x-api-key** (ou Authorization + x-project-id) comme en §2.
- Pas de header particulier pour accepter le stream : la réponse est en **text/event-stream** (SSE).

### Format de la réponse (SSE)

Chaque événement est envoyé sous la forme d’une ligne **`data: <json>`** suivie d’un double saut de ligne (`\n\n`). Le client reçoit un flux **text/event-stream** ; comme la requête est un **POST** (avec body), il faut utiliser **fetch** (ou équivalent) avec lecture du body en stream (**ReadableStream**), et non `EventSource` (réservé au GET).

**Récupérer les tool calls dans le stream :**

1. Ouvrir la connexion **POST** vers `/llm-exec/round/stream` avec le body JSON (model, messages, tools, etc.).
2. Lire **response.body** en stream ; décoder les chunks en texte UTF-8.
3. Découper le flux par événements SSE : repérer les blocs séparés par `\n\n`, puis pour chaque bloc prendre la ligne qui commence par `data: ` et parser la suite comme **JSON**.
4. Dans chaque objet parsé, utiliser le champ **`type`** pour dispatcher :
   - `internal_tool.start` → début d’un tool call : stocker `tool_call_id`, `name`, `arguments` et afficher un bloc « en cours ».
   - `internal_tool.done` → fin d’un tool call : associer au `tool_call_id` et afficher `result`.
   - `internal_tool.error` → échec : associer au même `tool_call_id` et afficher `error`.
5. Utiliser **`tool_call_id`** pour faire le lien entre `.start`, `.done` et `.error` (un même appel est identifié par ce champ).

Les événements pertinents pour les callables et le texte final :

| Type d’événement | Description |
|------------------|-------------|
| `start` | Début du round. |
| `tool_block.start` | Début d’un bloc d’exécution d’outils (un ou plusieurs tool_calls). |
| `internal_tool.start` | Début de l’exécution d’un outil (ex. callable) : `tool_call_id`, `name`, `arguments`. |
| `internal_tool.done` | Fin de l’outil : `tool_call_id`, `name`, `result` (réponse du callable ou message d’erreur). |
| `internal_tool.error` | Erreur lors de l’exécution de l’outil : `tool_call_id`, `name`, `error`. |
| `tool_block.done` | Fin du bloc d’outils. |
| `text.start` / `text.delta` / `text.done` | Réponse texte du modèle (streaming). |
| `done` | Fin du round : contient `complete`, `usage`, `messages` (historique complet). |

Exemple d’enchaînement typique avec un callable :

1. `start`
2. `tool_block.start`
3. `internal_tool.start` (name = nom du callable, ex. `tim`, arguments = ce que le modèle a passés)
4. `internal_tool.done` (result = réponse du callable) ou `internal_tool.error` (error = message d’erreur)
5. `tool_block.done`
6. `text.start` puis `text.delta` (plusieurs) puis `text.done` (réponse finale de l’agent)
7. `done` avec `complete: true` et `messages` contenant tout l’historique (user, tool_request, tool_response, assistant)

Côté client, il faut :

- Parser chaque ligne `data: <json>`.
- Gérer **internal_tool.start** / **internal_tool.done** / **internal_tool.error** pour afficher l’état des appels callable (chargement, succès, erreur).
- Accumuler **text.delta** (ou utiliser **text.done**) pour afficher la réponse finale.
- Utiliser **done** pour considérer le round terminé et éventuellement mettre à jour l’historique à partir de `messages`.

---

## 7. Afficher les appels callable comme des « tool calls » dans le chat

**Oui** : un chat externe peut récupérer et afficher le tool call lorsque l’agent appelle un callable. En **stream** (`/llm-exec/round/stream`), les événements SSE `internal_tool.start`, `internal_tool.done` et `internal_tool.error` exposent chaque appel (nom, arguments, résultat). En **non-stream** (`/llm-exec/round`), la réponse JSON finale contient `messages` avec l’historique complet (messages assistant avec tool_calls + tool_response). Il suffit d’écouter le stream ou de parser `messages` pour afficher ces appels dans l’UI.

Quand l’agent appelle un callable, tout s’exécute **côté Synesia** (llm-exec). Votre chat ne reçoit pas de structure « tool_call » au sens brut OpenAI : il reçoit soit le **stream SSE** (événements par événement), soit le **JSON final** avec `messages`. Pour que l’utilisateur voie un **tool call** (ex. « Agent appelle Tim » puis le résultat), il faut **écouter les événements SSE** et les traduire en blocs « tool call » dans votre UI.

### Événements à écouter

| Événement SSE | Rôle | Données utiles | Action UI suggérée |
|---------------|------|----------------|--------------------|
| **`internal_tool.start`** | Début d’un appel (callable ou autre outil) | `tool_call_id`, `name`, `arguments` | Afficher un bloc « Tool call : &lt;name&gt; » (ex. « Appel de Tim »), optionnellement les `arguments`, état « en cours ». |
| **`internal_tool.done`** | Fin réussie | `tool_call_id`, `name`, `result` | Associer au bloc identifié par `tool_call_id`, afficher le `result`, passer en état « terminé ». |
| **`internal_tool.error`** | Échec de l’outil | `tool_call_id`, `name`, `error` | Associer au même bloc, afficher l’erreur, état « erreur ». |

Le **`tool_call_id`** permet de faire le lien entre `.start`, `.done` et `.error` pour un même appel. Le champ **`block_id`** (optionnel) identifie le bloc d’outils ; utile pour grouper plusieurs appels dans l’UI.

**À noter :** dans un même round, plusieurs tool calls peuvent se succéder (plusieurs `internal_tool.start` / `.done` d’affilée dans un même `tool_block`). En cas d’échec, le serveur envoie à la fois **`internal_tool.error`** et **`internal_tool.done`** pour le même `tool_call_id` (`.done` contient alors le message d’erreur dans `result`). Il suffit de gérer les trois types d’événements et de mettre à jour le bloc correspondant.

### Exemple de structure côté client

Pour chaque **`internal_tool.start`** :

- Créer un objet « tool call » dans votre state (ex. `{ id: tool_call_id, name, arguments, status: 'running', result: null }`).
- Afficher dans le chat un bloc du type : « 🔧 Appel de **tim** » (ou le `name` reçu).

Pour **`internal_tool.done`** avec le même `tool_call_id` :

- Mettre à jour le bloc : `status: 'done'`, `result: event.result`.
- Afficher le résultat (texte ou JSON tronqué) sous le libellé du tool call.

Pour **`internal_tool.error`** avec le même `tool_call_id` :

- Mettre à jour le bloc : `status: 'error'`, afficher `event.error`.

### Exemple de payload (à parser depuis `data: ...`)

**Début d’appel :**
```json
{
  "type": "internal_tool.start",
  "tool_call_id": "fc_9f594179-b783-437f-84fe-51a14a433f25",
  "block_id": "tool_block_xxx",
  "name": "tim",
  "arguments": { "value": "Envoie un message Telegram à K pour lui demander s'il va bien." }
}
```

**Fin d’appel (succès) :**
```json
{
  "type": "internal_tool.done",
  "tool_call_id": "fc_9f594179-b783-437f-84fe-51a14a433f25",
  "block_id": "tool_block_xxx",
  "name": "tim",
  "result": "My dear companion, the telegram has winged its way to K..."
}
```

**Fin d’appel (erreur) :**
```json
{
  "type": "internal_tool.error",
  "tool_call_id": "fc_9f594179-b783-437f-84fe-51a14a433f25",
  "block_id": "tool_block_xxx",
  "name": "tim",
  "error": "Invalid tool results: ..."
}
```

### En résumé

- **Sans** gestion de `internal_tool.*` : le callable s’exécute bien côté Synesia, mais votre chat n’a rien à afficher pour cet appel.
- **Avec** gestion de ces trois types d’événements et affichage de blocs « tool call » par `tool_call_id`, l’utilisateur voit clairement que l’agent a appelé un outil (callable) et quel en est le résultat.

---

## 8. Vérification de l’implémentation client (checklist)

Checklist pour l’agent développeur sur l’autre projet :

- [ ] **Auth** : Envoi de **x-api-key** (ou Bearer + **x-project-id**) sur chaque requête vers `/llm-exec/round` et `/llm-exec/round/stream`. Pas d’auth = 401.
- [ ] **Body** : Envoi de **model** et **messages** ; pour les callables, envoi de **tools** avec des objets `{ "type": "callable", "callable_id": "<id_ou_slug>" }`. Pas de champ `callable_id` ou mauvais type = le callable ne sera pas reconnu.
- [ ] **URL** : Utilisation de la bonne base (ex. `https://api.synesia.com` ou `http://localhost:3001` selon l’environnement ; l’URL de base est fournie par Synesia ou configurée dans votre projet) et du chemin exact `/llm-exec/round` ou `/llm-exec/round/stream` (pas de typo, pas de slash en trop).
- [ ] **Stream** : Pour le stream, lecture du body en SSE (lignes `data: ...`), parsing JSON de chaque événement, et gestion au minimum de `internal_tool.start`, `internal_tool.done`, `internal_tool.error`, `text.delta`/`text.done`, et `done`.
- [ ] **Affichage des tool calls** : Pour que l’utilisateur voie les appels callable comme des tool calls, réagir aux événements `internal_tool.start` / `internal_tool.done` / `internal_tool.error` et afficher des blocs « tool call » dans le chat (voir §7).
- [ ] **Timeout** : Les callables (surtout les agents) peuvent prendre du temps (plusieurs secondes à dizaines de secondes). Prévoir un timeout côté client/proxy suffisant (ex. 2–5 minutes) pour ne pas couper la connexion avant la fin du round.
- [ ] **Erreurs** : En cas d’erreur (4xx/5xx ou événement `error` dans le stream), afficher ou logger le message d’erreur pour faciliter le debug (ex. callable introuvable, validation, timeout).

---

## 9. Exemple cURL complet (stream + callable)

```bash
curl -s -N -X POST "http://localhost:3001/llm-exec/round/stream" \
  -H "Content-Type: application/json" \
  -H "x-api-key: apiKey.25.XXXX" \
  -d '{
    "model": "groq/gpt-oss-120b",
    "messages": [
      {"role": "user", "content": "Demande à Tim d'\''envoyer un message sur Telegram à K pour lui demander s'\''il va bien."}
    ],
    "tools": [
      {"type": "callable", "callable_id": "c89f020d-404b-4429-be25-ec7dec0e7a56"}
    ],
    "instructions": "You have access to Tim. When the user asks Tim to send a Telegram message, call Tim with that request and confirm the result to the user."
  }'
```

Remplacer `apiKey.25.XXXX` et éventuellement le `callable_id` par les valeurs du projet. On obtient une suite d’événements SSE ; la réponse finale utile pour l’utilisateur se trouve dans les `text.delta` / `text.done` et dans le dernier message assistant de l’événement `done.messages`.

---

## 10. Références

- Schéma OpenAPI : `openapi-schemas/llm-exec.json` (définition de `InputTool`, endpoints, sécurité).
- Types serveur : `apps/server/src/features/llm-exec/llm-exec.types.ts` (`InputCallableTool` = `{ type: 'callable', callable_id: string }`).
- Conversion callable → outil LLM : `apps/server/src/features/llm-exec/converters/callable-tool.converter.ts`.
- Script de test local : `scripts/call-llm-exec-stream.sh` (exemple d’appel stream avec un callable).
