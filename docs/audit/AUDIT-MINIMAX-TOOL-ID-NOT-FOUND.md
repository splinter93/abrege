# Audit : Minimax midstream error — tool result's tool id not found

**Erreur observée :**
```
Minimax midstream error: invalid params, tool result's tool id(call_function_ufa6idzez2tr_1) not found
```

**Contexte :** Nouveau modèle Minimax via Liminality (Synesia LLM Exec). L’erreur survient sur les tools, lors du renvoi des tool results au modèle (round suivant).

**Constat important :** Tous les autres modèles sous le provider Liminality fonctionnent correctement avec les tools. Seuls certains modèles (ex. Minimax) déclenchent l’erreur → le problème est **spécifique au backend concerné** (ou à l’adaptation Synesia vers ce backend), pas à notre format de payload Liminality en général.

**Modèles concernés (à remonter à Synesia) :**
- Minimax (internal name utilisé : `openrouter/minimax-m2.1`, `openrouter/minimax-m2.7`)
- Xiaomi MiMo-V2-Pro (internal name : `openrouter/mimo-v2-pro`)

---

## 1. Résumé de la chaîne côté Abrège

| Étape | Fichier / composant | Comportement |
|-------|---------------------|--------------|
| 1 | **LiminalityProvider** (`liminality.ts`) | Reçoit l’event stream `done` avec `event.messages[last].role === 'tool_request'` et `lastMessage.tool_calls[]`. Chaque `tc` a `id` (ex. `call_function_ufa6idzez2tr_1`). |
| 2 | `convertStreamEvent('done')` | Mappe `validToolCalls` → `ToolCall[]` avec **`id: tc.id`** (l’id vient tel quel de l’API Synesia / Minimax). |
| 3 | **Stream route** | Reçoit le chunk avec `tool_calls`, pousse un message `assistant` avec ces `tool_calls`, exécute les tools, puis pour chaque résultat pousse un message `role: 'tool'` avec **`tool_call_id: toolCall.id`** (donc le même id qu’en 1). |
| 4 | **LiminalityProvider.convertChatMessagesToApiFormat()** | Pour chaque message `role === 'tool'` : message Liminality en `role: 'tool_response'` et **`tool_calls: [{ tool_call_id: toolMsg.tool_call_id, content, tool_name }]`** (un seul élément par message tool). |
| 5 | Payload envoyé à Liminality | `messages` contient notamment un message `tool_response` par résultat, avec `tool_call_id` = l’id reçu à l’étape 1. |

**Conclusion chaîne :** On ne génère pas nous-mêmes l’id, on ne le modifie pas. On renvoie exactement l’id reçu dans le stream (`tc.id` du `done`).

---

## 2. Points de risque identifiés

### 2.1 Format du message tool_response (notre payload → Synesia → Minimax)

- **Côté nous :** On envoie un message par résultat avec `role: 'tool_response'` et `tool_calls: [{ tool_call_id, content, tool_name }]` (et on supprime `content` au niveau racine).
- **Spécification Synesia (LLM-EXEC-API-GUIDE) :** Les rôles sont `user|assistant|system|tool_request|tool_response`. La structure exacte d’un message `tool_response` (champ racine vs tableau `tool_calls`) n’est pas détaillée dans les docs parcourues.
- **Hypothèse :** Minimax (API sous-jacente) attend peut‑être un format de type OpenAI pour les tool results : **un champ racine `tool_call_id`** (et `content`) plutôt qu’un tableau `tool_calls` avec `tool_call_id` à l’intérieur. Si Synesia transmet notre structure telle quelle à Minimax sans l’adapter, Minimax pourrait ne pas “reconnaître” l’id (d’où “not found”).

**Piste à vérifier :** Doc ou exemples Synesia pour le format exact d’un message `tool_response` (champs requis, nom des champs, un message par tool ou un message avec plusieurs résultats).

### 2.2 Fallback `tool_call_id` dans StreamOrchestrator

- **Fichier :** `src/services/streaming/StreamOrchestrator.ts` (l.399)  
  `tool_call_id: chunk.toolCallId || \`call_${Date.now()}\``
- Ce fallback n’est utilisé que pour les chunks **tool_result** traités par l’orchestrateur (ex. `internal_tool.done`). La route stream principale construit les messages à partir des **tool_calls du chunk `done`** et utilise toujours `toolCall.id` (pas ce fallback). Donc pour le flux principal Liminality, ce fallback n’est pas en cause.

### 2.3 Mélange MCP / callables / OpenAPI

- Pour les tools **déjà exécutés** (MCP, callables Synesia), on ajoute quand même des messages `tool` avec `tool_call_id: mcpTool.id` / `toolCall.id`.
- Les ids viennent du même `done` (même source). Aucune incohérence évidente côté nous ; le risque serait plutôt côté Synesia/Minimax si certains de ces tools sont exécutés côté serveur et que leurs résultats sont aussi renvoyés, créant un doublon ou un décalage d’id.

### 2.4 Ordre et nombre de messages

- On envoie : 1 message `assistant` avec `tool_calls` puis **N messages** `tool_response` (un par tool).
- Si Minimax ou Synesia attend un seul message `tool_response` contenant **plusieurs** résultats (tableau de paires id/contenu), ou un ordre strict (ex. un bloc assistant puis un seul bloc tool avec tous les résultats), notre envoi d’un message par résultat pourrait être considéré invalide. L’erreur “tool id … not found” peut alors être la traduction côté Minimax d’un rejet de la structure.

---

## 3. Origine probable de l’erreur

- **Côté Abrège :** On transmet bien l’id reçu (`call_function_ufa6idzez2tr_1`) sans le modifier. Aucune substitution, aucun id généré localement pour ce flux.
- **Côté Synesia / Minimax :** L’erreur “tool result's tool id(…) not found” est très probablement levée par **Minimax** (ou par la couche Synesia qui parle à Minimax). Causes plausibles :
  1. **Format du message tool result** : Minimax attend un schéma différent (ex. `tool_call_id` et `content` au niveau du message, pas dans un tableau `tool_calls`).
  2. **Mapping Synesia → Minimax** : Synesia pourrait renommer ou restructurer les champs pour Minimax ; si le `tool_call_id` n’est pas transmis au bon endroit, Minimax ne “trouve” pas l’id.
  3. **Spécificité Minimax** : Le préfixe `call_function_…` est typique de Minimax ; l’API Minimax peut exiger un format ou un placement particulier pour les tool results (à confirmer dans la doc Minimax / OpenRouter si utilisé).

---

## 4. Recommandations (sans correction immédiate)

1. **Vérifier la doc Synesia**  
   - Format exact attendu pour un message `role: tool_response` (champs, structure, un ou plusieurs résultats par message).  
   - Exemples de requêtes multi-tours avec tools pour le modèle Minimax (ou un modèle similaire).

2. **Vérifier la doc Minimax / OpenRouter**  
   - Format des tool calls et **tool results** (noms de champs, niveau dans le message).  
   - Comparer avec notre structure actuelle : `tool_calls: [{ tool_call_id, content, tool_name }]`.

3. **Logging ciblé**  
   - Logger le payload exact envoyé à Liminality pour le round qui suit les tool calls (au moins la partie `messages` : rôles et pour chaque message `tool_response` les clés présentes et la valeur de `tool_call_id`).  
   - Permet de confirmer que l’id envoyé est bien `call_function_ufa6idzez2tr_1` et de partager un exemple avec Synesia si besoin.

4. **Remonter à Synesia**  
   - Le message d’erreur indique clairement l’id qu’on envoie. Demander à Synesia :  
     - quel format exact Minimax attend pour les tool results ;  
     - si leur couche adapte notre payload pour Minimax et, si oui, comment `tool_call_id` est transmis.

5. **Option technique à explorer (après validation doc)**  
   - Si Minimax attend un format type OpenAI (message avec `tool_call_id` et `content` à la racine), adapter **uniquement pour Liminality** la construction du message tool dans `convertChatMessagesToApiFormat` (ou via un flag modèle/provider) pour envoyer ce format, **si et seulement si** la doc Synesia/Minimax le confirme.

---

## 5. Fichiers concernés (référence)

| Fichier | Rôle |
|---------|------|
| `src/services/llm/providers/implementations/liminality.ts` | Récupération `tc.id` dans le `done`, conversion messages → `tool_response` avec `tool_calls: [{ tool_call_id, content, tool_name }]`. |
| `src/services/llm/types/liminalityTypes.ts` | `LiminalityMessage` (role `tool_response`, `tool_calls` avec `tool_call_id`, etc.). |
| `src/app/api/chat/llm/stream/route.ts` | Construction des messages `role: 'tool'` avec `tool_call_id: toolCall.id` et envoi au provider. |
| `src/services/streaming/StreamOrchestrator.ts` | Fallback `call_${Date.now()}` pour chunks tool_result (hors flux principal du round Liminality). |

---

**Statut :** Audit uniquement — pas de correction appliquée.

**Implication (autres modèles Liminality OK) :** Aucune modification côté Abrège n’est justifiée pour le flux générique. La cause est soit un bug / spécificité de l’adaptateur Synesia→Minimax, soit un format de tool result attendu par l’API Minimax et non encore géré par Synesia. Suite recommandée : remonter à Synesia en précisant que seul Minimax est concerné ; si besoin, une adaptation **spécifique au modèle Minimax** (ex. format de message tool différent) ne serait à envisager qu’après validation par Synesia.
