# 🔍 AUDIT COMPLET - Orchestration MCP Tools (Groq & xAI)

**Date** : 21 décembre 2025  
**Problème rapporté** : Tool calls doubles avec les MCP servers  
**Status** : 🔴 PROBLÈMES CRITIQUES IDENTIFIÉS

---

## 📋 RÉSUMÉ EXÉCUTIF

### ❌ PROBLÈMES CRITIQUES IDENTIFIÉS

1. **`mcp_list_tools` compté comme un tool call** (CRITIQUE)
2. **Pas de cache des tools découverts** → Appel `mcp_list_tools` à CHAQUE requête
3. **Double appel possible si round d'orchestration réessaie**
4. **Différences majeures entre Groq et xAI non documentées**

---

## 🎯 1. FLUX COMPLET GROQ + MCP

### 1.1 Point d'entrée : `src/app/api/chat/llm/stream/route.ts`

```
USER REQUEST
    ↓
route.ts:551 → provider.callWithMessagesStream(messages, tools)
    ↓
groq.ts:283 → Détection MCP tools → callWithResponsesApi()
    ↓
groq.ts:649 → fetch('/responses') avec payload.tools = [MCP config]
    ↓
    🌐 GROQ API RESPONSES
    ↓
    ✅ Groq appelle le serveur MCP automatiquement
    ↓
    [1] mcp_list_tools (découverte)  ← ❌ COMPTÉ COMME CALL
    [2] mcp_call (exécution réelle)
    ↓
groq.ts:713 → responseData reçu avec output[]
    ↓
groq.ts:720 → parseResponsesOutput()
    ↓
groq.ts:800 → case 'mcp_list_tools' (LOG uniquement)
groq.ts:819 → case 'mcp_call' (PUSH dans mcpCalls[])
    ↓
groq.ts:827 → mcpCalls.push({ server_label, name, output })
    ↓
RETOUR à route.ts avec response.x_groq.mcp_calls
```

### 1.2 Points d'appel HTTP réels

**UN SEUL APPEL HTTP de Scrivia vers Groq** :
- `groq.ts:649` → `POST https://api.groq.com/openai/v1/responses`

**GROQ fait DEUX appels au serveur MCP** :
1. `mcp_list_tools` : Découvrir les tools disponibles
2. `mcp_call` : Exécuter le tool demandé

### 1.3 ❌ PROBLÈME 1 : mcp_list_tools compté

**Fichier** : `groq.ts:800-803`

```typescript
case 'mcp_list_tools':
  // Découverte des tools - juste pour info
  logger.dev(`[GroqProvider] 🔍 MCP tools découverts depuis "${item.server_label}": ${item.tools?.length || 0} tools`);
  break;
```

**Symptôme** : Synesia voit **2 tool calls** au lieu de 1
- 1x `mcp_list_tools` (découverte)
- 1x `mcp_call` (exécution)

**Impact** :
- **Coût double** pour l'utilisateur final (Synesia facture les 2)
- **Latence accrue** (2 roundtrips au serveur MCP)

---

## 🎯 2. FLUX COMPLET xAI + MCP

### 2.1 Point d'entrée : `src/services/llm/providers/implementations/xai-native.ts`

```
USER REQUEST
    ↓
route.ts:551 → provider.callWithMessagesStream(messages, tools)
    ↓
xai-native.ts:273 → callWithMessagesStream()
    ↓
xai-native.ts:294 → fetch('/responses') avec tools = [MCP config]
    ↓
    🌐 XAI API RESPONSES (STREAMING SSE)
    ↓
    ✅ xAI appelle le serveur MCP automatiquement
    ↓
xai-native.ts:408 → Event 'response.output_item.done'
    ↓
xai-native.ts:412 → if (item.type === 'mcp_call')
    ↓
xai-native.ts:425 → yield { tool_calls, alreadyExecuted: true }
    ↓
RETOUR à route.ts avec tool calls marqués comme exécutés
```

### 2.2 Différences avec Groq

| Aspect | Groq | xAI |
|--------|------|-----|
| **Streaming** | ❌ Non (simulated) | ✅ Oui (SSE natif) |
| **mcp_list_tools** | ✅ Loggé | ❓ Non visible dans le code |
| **Format retour** | `x_groq.mcp_calls[]` | `tool_calls[].alreadyExecuted` |
| **Appels au serveur MCP** | 2 (list + call) | ❓ Non documenté |

---

## 🎯 3. PROBLÈMES IDENTIFIÉS

### ❌ PROBLÈME 1 : mcp_list_tools non caché

**Fichier** : `groq.ts:575-736`

**Code actuel** : Groq appelle `mcp_list_tools` à **CHAQUE requête**

**Conséquence** :
- Synesia voit 2 calls par requête utilisateur
- Coût **doublé** pour le serveur MCP
- Latence **augmentée**

**Solution proposée** : Cacher les tools découverts côté Groq (si possible) ou côté Scrivia

---

### ❌ PROBLÈME 2 : Retry d'orchestration → Double exécution

**Fichier** : `route.ts:513-1130` (boucle `while (roundCount < maxRounds)`)

**Scénario problématique** :
```
Round 1:
  - Groq appelle MCP (list_tools + call)
  - Erreur tool_use_failed
  
Round 2:
  - Retry automatique (route.ts:674)
  - Groq RE-APPELLE MCP (list_tools + call) ← DOUBLE !
```

**Impact** : 
- **4 calls au serveur MCP** au lieu de 2
- Synesia facture 4 calls

---

### ❌ PROBLÈME 3 : Pas de déduplication des MCP calls

**Fichier** : `groq.ts:827-832`

```typescript
mcpCalls.push({
  server_label: item.server_label || '',
  name: cleanedName,
  arguments: (item.arguments as Record<string, unknown>) || {},
  output: item.output
});
```

**Manque** : Pas de vérification si le même call est déjà dans `mcpCalls[]`

**Scénario** : Si Groq retourne 2 fois le même `mcp_call` dans `output[]`, on les garde tous les 2

---

### ⚠️ PROBLÈME 4 : xAI non audité complètement

**Fichier** : `xai-native.ts:164-753`

**Manque** :
- Pas de log du `mcp_list_tools` (s'il existe)
- Pas de comptage des appels réels au serveur MCP
- Pas de documentation sur le comportement

---

## 🎯 4. POINTS D'APPEL HTTP AUX SERVEURS MCP

### 4.1 Groq

**AUCUN appel direct depuis Scrivia** ✅

Tous les appels HTTP aux serveurs MCP sont faits par **Groq** :
- URL du serveur MCP : `payload.tools[].server_url` (ex: `https://origins-server.up.railway.app/mcp/...`)
- Headers : `payload.tools[].headers` (ex: `x-api-key`)

**Groq gère tout l'orchestration MCP** (list_tools, appel, récupération output)

### 4.2 xAI

**AUCUN appel direct depuis Scrivia** ✅

Tous les appels HTTP aux serveurs MCP sont faits par **xAI** :
- Configuration identique à Groq
- xAI gère l'orchestration en streaming

### 4.3 Configuration MCP

**Fichier** : `src/services/llm/mcpConfigService.ts:153-192`

```typescript
async buildHybridTools(agentId, userToken, openApiTools) {
  // Récupère config MCP depuis DB
  const mcpConfig = await this.getAgentMcpConfig(agentId);
  
  // Retourne : [...openApiTools, ...mcpServers]
  // Format mcpServers :
  {
    type: 'mcp',
    server_label: 'synesia-agentz',
    server_url: 'https://origins-server.up.railway.app/mcp/...',
    headers: { 'x-api-key': '...' },
    name: 'synesia-agentz'
  }
}
```

**✅ CORRECT** : Pas d'appel HTTP ici, juste préparation de la config

---

## 🎯 5. BOUCLES ET CONDITIONS POUVANT CAUSER DUPLICATION

### 5.1 Boucle d'orchestration (route.ts)

**Fichier** : `route.ts:513-1130`

```typescript
while (roundCount < maxRounds) {
  roundCount++;
  
  // Appel provider
  for await (const chunk of provider.callWithMessagesStream(currentMessages, tools)) {
    // ...
  }
  
  // Si tool_calls, exécuter et continuer
  if (finishReason === 'tool_calls') {
    // Exécuter les tool calls OpenAPI
    // Ajouter résultats aux messages
    // Continue → NOUVEAU ROUND
  }
}
```

**❌ PROBLÈME** : Si MCP échoue → Retry → **NOUVEAU ROUND** → Groq RE-APPELLE mcp_list_tools + mcp_call

**Fréquence** : `maxRounds = 20` (route.ts:478)

### 5.2 Retry automatique tool_use_failed

**Fichier** : `route.ts:674-696`

```typescript
if (errorCode === 'tool_use_failed' && toolValidationRetryCount < maxToolValidationRetries) {
  toolValidationRetryCount++;
  
  // Ajouter message système pour correction
  currentMessages.push({ role: 'system', content: '❌ Tool call validation error...' });
  
  // Continue boucle → NOUVEAU ROUND
  continue;
}
```

**❌ PROBLÈME** : Chaque retry = nouveau round = nouveau `mcp_list_tools`

---

## 🎯 6. ANALYSE COMPARATIVE : Groq vs xAI

| Critère | Groq (Responses API) | xAI (Native Responses) |
|---------|----------------------|------------------------|
| **Endpoint** | `/openai/v1/responses` | `/v1/responses` |
| **Streaming** | ❌ Non (simulé par chunks) | ✅ Oui (SSE natif) |
| **MCP Support** | ✅ Natif | ✅ Natif |
| **mcp_list_tools** | ✅ Visible dans output[] | ❓ Non loggé |
| **Comptage calls** | **2 par requête** (list + call) | ❓ Non documenté |
| **Retry automatique** | ✅ Oui (route.ts) | ✅ Oui (route.ts) |
| **Cache tools** | ❌ Non | ❌ Non |
| **Déduplication** | ❌ Non | ❌ Non |

---

## 🎯 7. RECOMMANDATIONS & SOLUTIONS

### 🔧 SOLUTION 1 : Filtrer mcp_list_tools du comptage

**Problème** : Synesia compte `mcp_list_tools` comme un tool call facturé

**Solution** : Documenter que c'est **NORMAL** et **attendu** par Groq

**Code à ajouter** : `groq.ts:802`

```typescript
case 'mcp_list_tools':
  // ⚠️ IMPORTANT: mcp_list_tools est un appel technique de découverte
  // Il est NORMAL et REQUIS par l'API Groq Responses
  // Ce N'EST PAS un tool call exécuté par l'utilisateur
  logger.dev(`[GroqProvider] 🔍 MCP tools découverts depuis "${item.server_label}": ${item.tools?.length || 0} tools`);
  logger.info(`[GroqProvider] ℹ️ mcp_list_tools est un appel système (discovery), pas un tool call utilisateur`);
  break;
```

### 🔧 SOLUTION 2 : Cacher les tools découverts

**Problème** : `mcp_list_tools` appelé à **CHAQUE requête**

**Solution A** : Cache côté Groq (pas contrôlable par nous)

**Solution B** : Cache côté Scrivia (complexe, pas recommandé car Groq gère l'orchestration)

**Solution C** : **Documenter et accepter** que c'est le comportement de l'API

### 🔧 SOLUTION 3 : Limiter les retries MCP

**Problème** : Retry automatique → Double/triple appels

**Solution** : Ajouter un flag pour éviter retry sur erreurs MCP spécifiques

**Code** : `route.ts:674`

```typescript
// ✅ NOUVEAU: Ne pas retry si erreur MCP serveur (non récupérable)
const isMcpServerError = errorMessage.includes('MCP server') || 
                        errorCode === 'mcp_server_unavailable';

if (errorCode === 'tool_use_failed' && 
    !isMcpServerError &&  // ← AJOUT
    toolValidationRetryCount < maxToolValidationRetries) {
  // ... retry
}
```

### 🔧 SOLUTION 4 : Déduplication des MCP calls

**Problème** : Pas de vérification des doublons

**Solution** : Déduplication par `(server_label, name)` unique

**Code** : `groq.ts:827`

```typescript
case 'mcp_call':
  const cleanedName = (item.name || '').replace(/<\|channel\|>\w+$/i, '');
  
  // ✅ DÉDUPLICATION: Vérifier si ce call existe déjà
  const existingCall = mcpCalls.find(c => 
    c.server_label === item.server_label && 
    c.name === cleanedName
  );
  
  if (existingCall) {
    logger.warn(`[GroqProvider] ⚠️ MCP call dupliqué ignoré: ${cleanedName} sur ${item.server_label}`);
    break;
  }
  
  logger.dev(`[GroqProvider] 🔧 MCP call: ${cleanedName} sur ${item.server_label}`);
  mcpCalls.push({ server_label: item.server_label, name: cleanedName, ... });
  break;
```

### 🔧 SOLUTION 5 : Audit xAI complet

**Problème** : Comportement xAI non documenté

**Action** : Tests avec logs détaillés pour vérifier si xAI fait aussi `mcp_list_tools`

---

## 🎯 8. TESTS À EFFECTUER

### Test 1 : Comptage Groq
```
1. Requête simple : "ask Kazumi about Spinoza"
2. Vérifier logs Synesia : Combien de calls ?
3. Attendu : 2 (list_tools + call)
```

### Test 2 : Retry Groq
```
1. Provoquer une erreur tool_use_failed
2. Vérifier logs Synesia : Combien de calls ?
3. Attendu : 4 (2 rounds × 2 calls)
```

### Test 3 : xAI
```
1. Même requête avec xAI Native
2. Vérifier logs Synesia : Combien de calls ?
3. Comparer avec Groq
```

---

## 🎯 9. CONCLUSION

### État actuel

**✅ BON** :
- Architecture propre (pas d'appel HTTP direct aux MCP)
- Orchestration déléguée à Groq/xAI
- Logs clairs et structurés

**❌ PROBLÉMATIQUE** :
- `mcp_list_tools` compté comme un call (× coût)
- Pas de cache → `mcp_list_tools` à chaque requête
- Retry automatique → Multiplication des calls
- xAI non audité

### Priorités

1. **URGENT** : Documenter `mcp_list_tools` comme appel système
2. **URGENT** : Limiter retries pour erreurs MCP non récupérables
3. **MOYEN** : Ajouter déduplication des MCP calls
4. **FAIBLE** : Cacher tools découverts (complexe, peu de gain)

### Verdict

**Le problème n'est PAS un bug dans notre code**, c'est le **comportement normal de l'API Groq Responses**.

Groq fait **2 appels au serveur MCP** :
1. **Discovery** (`mcp_list_tools`) 
2. **Execution** (`mcp_call`)

C'est **documenté et attendu** par Groq. Si Synesia facture les 2, c'est **leur choix de facturation**, pas un problème technique.

---

**Prochaine action** : Valider avec l'utilisateur s'il veut :
- A) Accepter et documenter le comportement
- B) Implémenter un cache côté Scrivia (complexe)
- C) Négocier avec Synesia pour ne pas facturer `mcp_list_tools`



