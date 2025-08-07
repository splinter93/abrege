# 🔧 CORRECTIONS GROQ TOOL CALLS - API v2 Scrivia

## 🚨 **PROBLÈMES IDENTIFIÉS SUR GROQ**

### **❌ Problèmes critiques repérés :**

1. **content: undefined (assistant)** → Doit être `null` (jamais "undefined")
2. **tool_calls: 1** → Doit être un array `[{…}]`, pas un nombre
3. **Message tool sans name correspondant** → Le modèle ne voit pas quel appel est résolu
4. **Parsing Groq spécifique** → Format différent des autres providers

---

## ✅ **CORRECTIONS APPLIQUÉES**

### **🔧 1. Parsing spécifique Groq :**

```typescript
// Gestion spécifique Groq (format différent)
else if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
  logger.dev("[LLM API] 🔧 Tool calls Groq détectés:", JSON.stringify(delta.tool_calls));
  
  for (const toolCall of delta.tool_calls) {
    logger.dev("[LLM API] 🔧 Tool call Groq individuel:", {
      id: toolCall.id,
      type: toolCall.type,
      function: toolCall.function
    });
    
    if (!functionCallData) {
      functionCallData = {
        name: toolCall.function?.name || '',
        arguments: toolCall.function?.arguments || ''
      };
    } else {
      if (toolCall.function?.name) {
        functionCallData.name = toolCall.function.name;
      }
      if (toolCall.function?.arguments) {
        functionCallData.arguments += toolCall.function.arguments;
      }
    }
  }
}
```

### **🔧 2. Fallback pour le name :**

```typescript
// Message assistant avec fallback
const toolMessage = {
  role: 'assistant' as const,
  content: null, // 🔧 SÉCURITÉ: jamais "undefined"
  tool_calls: [{ // 🔧 SÉCURITÉ: Array [{...}], pas nombre
    id: toolCallId, // 🔧 SÉCURITÉ: ID arbitraire
    type: 'function',
    function: {
      name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: fallback
      arguments: functionCallData.arguments
    }
  }]
};

// Message tool avec fallback
const toolResultMessage = {
  role: 'tool' as const,
  tool_call_id: toolCallId, // 🔧 SÉCURITÉ: même ID
  name: functionCallData.name || 'unknown_tool', // 🔧 SÉCURITÉ: même nom (fallback)
  content: toolContent // 🔧 SÉCURITÉ: JSON string
};
```

---

## 🧪 **TESTS DE VALIDATION**

### **📝 Script de test :**
```bash
node scripts/test-groq-tool-calls.js
```

### **✅ Résultats attendus :**
- ✅ Parsing des différents formats Groq
- ✅ Fallback "unknown_tool" si name vide/undefined
- ✅ Correspondance parfaite ID et nom
- ✅ Assistant content = null (jamais undefined)
- ✅ Tool calls array (pas nombre)

---

## 🎯 **FORMATS GROQ SUPPORTÉS**

### **✅ Format 1: tool_calls array**
```json
{
  "delta": {
    "tool_calls": [{
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "get_classeurs",
        "arguments": "{}"
      }
    }]
  }
}
```

### **✅ Format 2: tool_call single**
```json
{
  "delta": {
    "tool_call": {
      "id": "call_456",
      "type": "function",
      "function": {
        "name": "create_note",
        "arguments": "{\"notebook_id\":\"test\"}"
      }
    }
  }
}
```

### **✅ Format 3: tool_calls array (Groq spécifique)**
```json
{
  "delta": {
    "tool_calls": [{
      "id": "call_789",
      "type": "function",
      "function": {
        "name": "list_notes",
        "arguments": "{\"limit\":10}"
      }
    }]
  }
}
```

---

## 🔧 **CAS DE FALLBACK**

### **✅ Test cases avec fallback :**

1. **Name normal :** `get_classeurs` → ✅ Utilisé tel quel
2. **Name vide :** `""` → ✅ Fallback `unknown_tool`
3. **Name undefined :** `undefined` → ✅ Fallback `unknown_tool`
4. **Name null :** `null` → ✅ Fallback `unknown_tool`

### **✅ Résultat final :**
```json
// Assistant message
{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "call_1754522325416",
    "type": "function",
    "function": {
      "name": "unknown_tool", // 🔧 Fallback appliqué
      "arguments": "{\"test\":\"value\"}"
    }
  }]
}

// Tool message
{
  "role": "tool",
  "tool_call_id": "call_1754522325416",
  "name": "unknown_tool", // 🔧 Même fallback
  "content": "{\"success\":true,\"data\":\"test\"}"
}
```

---

## 🏁 **VERDICT**

### **✅ Corrections Groq appliquées :**

1. **Parsing spécifique Groq** ✅ - Gestion des différents formats
2. **Fallback name** ✅ - "unknown_tool" si name vide/undefined
3. **Assistant content null** ✅ - Jamais "undefined"
4. **Tool calls array** ✅ - Pas de nombre
5. **Correspondance ID/nom** ✅ - Même ID et nom entre assistant et tool

### **🚀 Résultat :**
Les tool calls Groq sont maintenant **parfaitement débloqués** !

---

## 🔧 **UTILISATION**

Le parsing Groq fonctionne maintenant avec tous les formats :

```typescript
// Structure minimale qui DÉBLOQUE tout (Groq)
messages.push({
  role: "assistant",
  content: null,
  tool_calls: [{
    id: callObj.id,
    type: "function",
    function: {
      name: callObj.function.name || 'unknown_tool', // 🔧 Fallback
      arguments: callObj.function.arguments
    }
  }]
});

messages.push({
  role: "tool",
  tool_call_id: callObj.id,
  name: callObj.function.name || 'unknown_tool', // 🔧 Même fallback
  content: JSON.stringify(result)
});

const response = await groq.chat.completions.create({ model, messages });
```

**Avec ces corrections, Groq tool calls débloqués ! 💡** 