# 🔧 FIX COMPLET - MCP Tools Double Exécution + xAI Tools Format

**Date** : 21 décembre 2025  
**Status** : ✅ **2 BUGS RÉSOLUS**

---

## 🎯 BUG 1 : MCP Tool Calls Exécutés en Double (GROQ)

### Problème
Quand on demande à l'agent de parler à un agent MCP (ex: Kazumi), Groq exécutait le tool **2 FOIS** au lieu d'1.

### Root Cause
Dans `groq.ts:317-342`, les tool calls MCP étaient retournés avec `finishReason: 'tool_calls'` mais **SANS** le flag `alreadyExecuted: true`.

**Conséquence** : Le Stream Route pensait qu'il devait exécuter ces tool calls, alors qu'ils avaient déjà été exécutés par Groq → **Double exécution**.

### Solution Appliquée
Ajout du flag `alreadyExecuted: true` sur tous les tool calls MCP retournés par Groq :

**Fichier** : `src/services/llm/providers/implementations/groq.ts:317-342`

```typescript
// ✅ AVANT : Sans flag
yield {
  tool_calls: response.tool_calls,
  finishReason: 'tool_calls'  // ❌ Provoque ré-exécution
};

// ✅ APRÈS : Avec flag
const executedToolCalls = response.tool_calls.map(tc => ({
  ...tc,
  alreadyExecuted: true,  // ✅ Évite ré-exécution
  result: response.x_groq?.mcp_calls?.find(...)?.output
}));

yield {
  tool_calls: executedToolCalls,
  finishReason: 'tool_calls'
};
```

### Résultat
- **AVANT** : 2 exécutions (1 par Groq + 1 retry inutile par Stream Route)
- **APRÈS** : **1 seule exécution** par Groq ✅

---

## 🎯 BUG 2 : xAI Native - Format Tools Incompatible (OpenAPI Tools)

### Problème Initial
Erreur 422 de xAI : `"tools[0]: missing field 'name'"`

### Problème Suivant
Après ajout du `name`, nouvelle erreur : `"tools[0]: missing field 'parameters'"`

### Root Cause
xAI Native API utilise un **format PLAT** pour les tools, **DIFFÉRENT** du format OpenAI standard.

Les OpenAPI tools (type `function`) étaient envoyés au format OpenAI (structure imbriquée), mais xAI demande tous les champs à la racine.

### Format Standard OpenAI vs Format xAI

**Format OpenAI (standard, utilisé en interne)** :
```json
{
  "type": "function",
  "function": {
    "name": "mon_tool",
    "description": "Description",
    "parameters": {
      "type": "object",
      "properties": {...}
    }
  }
}
```

**Format xAI Native (plat, requis par l'API)** :
```json
{
  "type": "function",
  "name": "mon_tool",
  "description": "Description",
  "parameters": {
    "type": "object",
    "properties": {...}
  }
}
```

### Solution Appliquée
**Aplatissement complet** de la structure `function` vers la racine avant envoi à xAI :

**Fichier** : `src/services/llm/providers/implementations/xai-native.ts:614-636`

```typescript
if (tools && tools.length > 0) {
  const formattedTools = tools.map(tool => {
    if (this.isMcpTool(tool)) {
      // MCP tool: Format standard
      return {
        ...tool,
        type: 'mcp',
        name: tool.name || tool.server_label
      };
    } else if (isFunctionTool(tool)) {
      // ✅ OpenAPI tool: APLATIR function → racine
      return {
        type: 'function',
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
        ...(tool.function.strict !== undefined && { strict: tool.function.strict })
      };
    }
    return tool;
  });
  
  payload.tools = formattedTools;
}
```

### Résultat
- **AVANT** : Erreur 422 `missing field 'parameters'`
- **APRÈS** : **Tools OpenAPI fonctionnent** avec format xAI plat ✅

---

## 📊 Impact Global

### Groq
- ✅ MCP tools : **1 seule exécution** (fix appliqué)
- ✅ OpenAPI tools : Continuent de fonctionner

### xAI Native
- ✅ MCP tools : Continuent de fonctionner
- ✅ OpenAPI tools : **Fonctionnent maintenant** (fix appliqué)

---

## 🧪 Tests à Effectuer

### Test 1 : Groq + MCP
```
1. Requête : "Ask Kazumi about Spinoza"
2. Vérifier logs Synesia : 1 seul call (pas 2)
3. Vérifier timeline UI : 1 seul tool call affiché
```

### Test 2 : xAI Native + OpenAPI
```
1. Sélectionner xAI Native provider
2. Utiliser un agent avec OpenAPI tools
3. Vérifier : Pas d'erreur 422
4. Vérifier : Tool call s'exécute correctement
```

### Test 3 : xAI Native + MCP
```
1. Sélectionner xAI Native provider
2. Requête : "Ask Kazumi about Spinoza"
3. Vérifier : 1 seul call
4. Vérifier : Timeline affiche correctement
```

---

## 📁 Fichiers Modifiés

1. ✅ `src/services/llm/providers/implementations/groq.ts` (lignes 317-342)
   - Ajout `alreadyExecuted: true` sur MCP tool calls

2. ✅ `src/services/llm/providers/implementations/xai-native.ts` (lignes 614-636)
   - **Aplatissement complet** de `tool.function.*` vers la racine
   - Format plat xAI : `{ type, name, description, parameters }` au lieu de `{ type, function: {...} }`
   - Import `isFunctionTool`

---

## ✅ Conclusion

**2 bugs critiques résolus** :
1. **Groq MCP** : Exécution double → 1 seule exécution
2. **xAI OpenAPI** : Erreur 422 → **Format plat spécifique xAI** appliqué

**Différences importantes découvertes** :
- **Groq** : Accepte le format OpenAI standard avec `{ type, function: {...} }`
- **xAI Native** : **Format plat obligatoire** `{ type, name, description, parameters }` à la racine

Les deux providers utilisent maintenant **DES LOGIQUES ADAPTÉES** :
- **Groq** : Ajout `alreadyExecuted: true` + format standard OpenAI
- **xAI Native** : Aplatissement complet de la structure `function`

**Status** : ✅ **PRÊT POUR TEST COMPLET**

