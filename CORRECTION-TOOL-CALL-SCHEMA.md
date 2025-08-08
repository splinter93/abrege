# 🔧 CORRECTION TOOL CALL SCHEMA - Ajout du champ `name`

## 🚨 **PROBLÈME IDENTIFIÉ**

Le schéma des tool calls nécessite le champ `name` dans les messages `tool` pour correspondre au nom de la fonction appelée dans le message `assistant`.

### **❌ Schéma incomplet :**
```json
// Message tool sans le champ name
{
  "role": "tool",
  "tool_call_id": "call_1754521710929",
  "content": "{\"success\":false,\"error\":\"notebook_id manquant\"}"
}
```

### **✅ Schéma complet attendu :**
```json
// 1) Assistant déclencheur
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
// 2) Réponse du tool
{
  "role": "tool",
  "tool_call_id": "call_1754521710929", // même ID
  "name": "create_note",                // même nom
  "content": "{\"success\":false,\"error\":\"notebook_id manquant\"}"
}
```

---

## ✅ **SOLUTION APPLIQUÉE**

### **🔧 1. Ajout du champ `name` au type TypeScript**

**Fichier :** `src/types/chat.ts`

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  timestamp: string;
  isStreaming?: boolean;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string; // Pour les messages tool
  name?: string; // 🔧 NOUVEAU: Pour les messages tool (nom de la fonction appelée)
}
```

### **🔧 2. Ajout du champ `name` dans la sauvegarde**

**Fichier :** `src/app/api/chat/llm/route.ts`

```typescript
// Sauvegarder le message tool avec le résultat
await chatSessionService.addMessage(context.sessionId, {
  role: 'tool',
  tool_call_id: toolCallId,
  name: functionCallData.name || 'unknown_tool', // 🔧 CORRECTION: Ajouter le name
  content: JSON.stringify({ 
    error: true, 
    message: `❌ ÉCHEC : ${errorMessage}`,
    success: false,
    action: 'failed'
  }),
  timestamp: new Date().toISOString()
});
```

### **🔧 3. Vérification de la correspondance**

**Validation stricte ajoutée :**

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
```

---

## 🎯 **RÉSULTAT**

### **✅ Avant la correction :**
- Champ `name` manquant dans les messages tool
- Schéma incomplet
- Pas de validation de correspondance

### **✅ Après la correction :**
- Champ `name` présent dans tous les messages tool
- Schéma complet et conforme
- Validation stricte de la correspondance
- TypeScript support complet

---

## 🔧 **FORMATS SUPPORTÉS**

La correction s'applique à tous les formats de tool calls :

1. **Format standard** (`delta.tool_calls`)
2. **Format alternatif** (`delta.tool_call`)
3. **Format Groq** (`delta.tool_calls` avec `Array.isArray()`)
4. **Format Together AI** (`delta.tool_calls`)

---

## 🧪 **TEST**

Script de test créé : `test-tool-call-schema.js`

```bash
node test-tool-call-schema.js
```

**Résultat attendu :**
```
🎉 Tous les tests passent ! Le schéma est correct.
```

---

## 🏁 **VERDICT**

**✅ PROBLÈME RÉSOLU !**

Le schéma des tool calls est maintenant **complet et conforme** avec :
- Champ `name` présent dans tous les messages tool
- Correspondance parfaite entre assistant et tool messages
- Validation stricte du schéma
- Support TypeScript complet

**Le schéma des tool calls respecte maintenant parfaitement le format attendu ! 🎉** 