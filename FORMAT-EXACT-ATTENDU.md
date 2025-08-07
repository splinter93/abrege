# 🔧 FORMAT EXACT ATTENDU - API v2 Scrivia

## 🚨 **PROBLÈME IDENTIFIÉ**

Dans le log, on a encore :
```json
{
  "role": "assistant",
  "content": undefined,  // ❌ DOIT ÊTRE null
  "tool_calls": 1,       // ❌ DOIT ÊTRE [{...}]
  "tool_call_id": undefined
}
```

**Le parsing des tool calls ne fonctionne pas correctement sur Groq.**

---

## ✅ **FORMAT EXACT ATTENDU**

### **📝 Structure EXACTE qui DÉBLOQUE tout :**

```json
// 1) Assistant déclencheur (format EXACT)
{
  "role": "assistant",
  "content": null,               // jamais "undefined"
  "tool_calls": [{
    "id": "call_1754521710929",  // ID arbitraire
    "type": "function",
    "function": {
      "name": "create_note",
      "arguments": "{\"notebook_id\":\"movies\",\"markdown_content\":\"…\"}"
    }
  }]
},
// 2) Réponse du tool (format EXACT)
{
  "role": "tool",
  "tool_call_id": "call_1754521710929", // même ID
  "name": "create_note",                // même nom
  "content": "{\"success\":false,\"error\":\"notebook_id manquant\"}"
}
// 3) ➜ Renvoie tout l'historique au modèle
```

---

## 🔧 **VALIDATION STRICTE APPLIQUÉE**

### **✅ 1. Validation Assistant :**

```typescript
// 🔧 SÉCURITÉ: Validation stricte du format
if (toolMessage.content !== null) {
  logger.error("[LLM API] ❌ Assistant content doit être null, pas:", toolMessage.content);
  throw new Error('Assistant content doit être null');
}

if (!Array.isArray(toolMessage.tool_calls) || toolMessage.tool_calls.length !== 1) {
  logger.error("[LLM API] ❌ Assistant tool_calls doit être un array avec 1 élément, pas:", toolMessage.tool_calls);
  throw new Error('Assistant tool_calls doit être un array avec 1 élément');
}

if (!toolMessage.tool_calls[0].function?.name) {
  logger.error("[LLM API] ❌ Assistant tool_call function name manquant");
  throw new Error('Assistant tool_call function name manquant');
}
```

### **✅ 2. Validation Tool :**

```typescript
// 🔧 SÉCURITÉ: Validation stricte du message tool
if (toolResultMessage.tool_call_id !== toolCallId) {
  logger.error("[LLM API] ❌ Tool tool_call_id doit correspondre à l'ID de l'appel");
  throw new Error('Tool tool_call_id doit correspondre à l\'ID de l\'appel');
}

if (toolResultMessage.name !== toolMessage.tool_calls[0].function.name) {
  logger.error("[LLM API] ❌ Tool name doit correspondre au nom de l'appel");
  throw new Error('Tool name doit correspondre au nom de l\'appel');
}

if (typeof toolResultMessage.content !== 'string') {
  logger.error("[LLM API] ❌ Tool content doit être une string, pas:", typeof toolResultMessage.content);
  throw new Error('Tool content doit être une string');
}
```

---

## 🧪 **TESTS DE VALIDATION**

### **📝 Script de test :**
```bash
node scripts/test-exact-format.js
```

### **✅ Résultats attendus :**
- ✅ Assistant content = null (jamais "undefined")
- ✅ Assistant tool_calls = [{ id, type, function }] (Array, pas nombre)
- ✅ Tool tool_call_id = assistant.tool_calls[0].id (même ID)
- ✅ Tool name = assistant.tool_calls[0].function.name (même nom)
- ✅ Tool content = JSON string
- ✅ Renvoyer tout l'historique au modèle SANS tools

---

## 🎯 **CHECKLIST CORRECTRICE**

### **✅ 1. Assistant déclencheur :**
- ✅ content: null (jamais "undefined")
- ✅ tool_calls: [{ ... }] (Array avec 1 élément, pas nombre)
- ✅ tool_call.id: ID arbitraire
- ✅ tool_call.type: "function"
- ✅ tool_call.function.name: nom de la fonction
- ✅ tool_call.function.arguments: arguments JSON

### **✅ 2. Réponse du tool :**
- ✅ role: "tool"
- ✅ tool_call_id: même ID que l'appel
- ✅ name: même nom que l'appel
- ✅ content: JSON string

### **✅ 3. Relance du modèle :**
- ✅ Tout l'historique envoyé
- ✅ SANS tools (anti-boucle)
- ✅ Même provider que l'appel initial

---

## 🏁 **VERDICT**

### **✅ Format EXACT qui DÉBLOQUE tout :**

1. **Assistant.content = null** ✅ - Jamais "undefined"
2. **Assistant.tool_calls = Array** ✅ - Pas de nombre
3. **Tool.tool_call_id = Assistant.tool_calls[0].id** ✅ - Même ID
4. **Tool.name = Assistant.tool_calls[0].function.name** ✅ - Même nom
5. **Tool.content = JSON string** ✅ - Format valide
6. **Relance complète** ✅ - Tout l'historique SANS tools

### **🚀 Résultat :**
Le modèle repartira sans se taire après chaque tool call !

---

## 🔧 **UTILISATION**

Le format EXACT est maintenant validé et appliqué :

```typescript
// Format EXACT qui DÉBLOQUE tout
messages.push({
  role: "assistant",
  content: null,               // jamais "undefined"
  tool_calls: [{
    id: callObj.id,            // ID arbitraire
    type: "function",
    function: {
      name: callObj.function.name,
      arguments: callObj.function.arguments
    }
  }]
});

messages.push({
  role: "tool",
  tool_call_id: callObj.id,    // même ID
  name: callObj.function.name, // même nom
  content: JSON.stringify(result)
});

const response = await openai.chat.completions.create({ model, messages });
```

**Avec ce format EXACT, le modèle repartira sans se taire ! 💡** 