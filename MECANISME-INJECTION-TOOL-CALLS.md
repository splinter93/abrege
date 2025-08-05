# 🔧 Mécanisme d'Injection des Tool Calls - API v2 Scrivia

## 🎯 Vue d'ensemble

Le mécanisme d'injection des tool calls garantit que **tous les tool calls LLM** sont correctement enregistrés dans l'historique de conversation, selon le format standard DeepSeek.

---

## ✅ **FONCTIONNEMENT COMPLET**

### **🔄 Flux d'exécution :**

1. **Détection du tool call** ✅
2. **Validation des arguments** ✅
3. **Exécution du tool** ✅
4. **Sauvegarde dans l'historique** ✅
5. **Relance du LLM** ✅

---

## 📋 **FORMAT DES MESSAGES (DeepSeek Standard)**

### **📝 Message Assistant avec Tool Call :**
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "call_1234567890",
    "type": "function",
    "function": {
      "name": "create_note",
      "arguments": "{\"source_title\":\"Ma note\",\"notebook_id\":\"classeur-123\"}"
    }
  }],
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### **🔧 Message Tool avec Résultat :**
```json
{
  "role": "tool",
  "tool_call_id": "call_1234567890",
  "content": "{\"success\":true,\"note\":{\"id\":\"note-456\",\"title\":\"Ma note\"}}",
  "timestamp": "2024-01-01T12:00:01.000Z"
}
```

---

## 🔧 **IMPLÉMENTATION TECHNIQUE**

### **📝 Code d'injection (src/app/api/chat/llm/route.ts) :**

```typescript
// 1. Créer le message assistant avec tool call
const toolCallId = `call_${Date.now()}`;
const toolMessage = {
  role: 'assistant' as const,
  content: null,
  tool_calls: [{
    id: toolCallId,
    type: 'function',
    function: {
      name: functionCallData.name,
      arguments: functionCallData.arguments
    }
  }]
};

// 2. Créer le message tool avec le résultat
const toolResultMessage = {
  role: 'tool' as const,
  tool_call_id: toolCallId,
  content: JSON.stringify(result)
};

// 3. Sauvegarder dans la base de données
await chatSessionService.addMessage(context.sessionId, {
  role: 'assistant',
  content: null,
  tool_calls: [{
    id: toolCallId,
    type: 'function',
    function: {
      name: functionCallData.name,
      arguments: functionCallData.arguments
    }
  }],
  timestamp: new Date().toISOString()
});

await chatSessionService.addMessage(context.sessionId, {
  role: 'tool',
  tool_call_id: toolCallId,
  content: JSON.stringify(result),
  timestamp: new Date().toISOString()
});
```

---

## 🎯 **TOOLS SUPPORTÉS (28 total)**

### **📝 Notes (16 tools) :**
- `create_note` ✅
- `update_note` ✅
- `delete_note` ✅
- `get_note_content` ✅
- `get_note_metadata` ✅
- `add_content_to_note` ✅
- `insert_content_to_note` ✅
- `add_content_to_section` ✅
- `clear_section` ✅
- `erase_section` ✅
- `get_table_of_contents` ✅
- `get_note_statistics` ✅
- `merge_note` ✅
- `move_note` ✅
- `publish_note` ✅
- `get_note_insights` ✅

### **📁 Dossiers (5 tools) :**
- `create_folder` ✅
- `update_folder` ✅
- `delete_folder` ✅
- `get_folder_tree` ✅
- `move_folder` ✅

### **📚 Classeurs (6 tools) :**
- `create_notebook` ✅
- `update_notebook` ✅
- `delete_notebook` ✅
- `get_tree` ✅
- `reorder_notebooks` ✅
- `get_notebooks` ✅

### **🔧 Utilitaires (1 tool) :**
- `generate_slug` ✅

---

## 🔒 **MÉCANISMES DE SÉCURITÉ**

### **🛡️ Anti-boucle infinie :**
```typescript
// Relancer le LLM SANS tools pour éviter la boucle infinie
const finalPayload = {
  model: config.model,
  messages: updatedMessages,
  stream: true,
  temperature: config.temperature,
  max_tokens: config.max_tokens,
  top_p: config.top_p
  // 🔧 ANTI-BOUCLE: Pas de tools lors de la relance
};
```

### **⏱️ Timeout de sécurité :**
```typescript
// Timeout de 15 secondes pour les tool calls
const toolCallPromise = agentApiV2Tools.executeTool(
  functionCallData.name, 
  functionArgs, 
  userToken
);

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout tool call (15s)')), 15000);
});

const result = await Promise.race([toolCallPromise, timeoutPromise]);
```

### **🧹 Validation des arguments :**
```typescript
// Nettoyer et valider les arguments JSON
const functionArgs = cleanAndParseFunctionArgs(functionCallData.arguments);
```

---

## 📊 **GESTION DES ERREURS**

### **❌ Erreur de tool call :**
```typescript
try {
  const result = await toolCallPromise;
  // Sauvegarder le succès
} catch (error) {
  // Sauvegarder l'erreur dans l'historique
  await chatSessionService.addMessage(context.sessionId, {
    role: 'tool',
    tool_call_id: toolCallId,
    content: JSON.stringify({ 
      error: true, 
      message: error.message 
    }),
    timestamp: new Date().toISOString()
  });
}
```

### **🔄 Relance avec erreur :**
- Le LLM est relancé même en cas d'erreur
- L'erreur est incluse dans l'historique
- L'utilisateur peut voir ce qui s'est passé

---

## 🧪 **TEST DU MÉCANISME**

### **📋 Script de test :**
```bash
node scripts/test-tool-calls-injection.js
```

### **✅ Résultats attendus :**
```
🔧 Test du mécanisme d'injection des tool calls - API v2 Scrivia

📋 Tools disponibles (28):
  1. create_note
  2. update_note
  3. delete_note
  ...

🔧 Test du mécanisme d'injection:
  1. create_note:
     ✅ Tool call détecté
     ✅ Arguments validés
     ✅ Tool exécuté
     ✅ Message assistant avec tool_calls sauvegardé
     ✅ Message tool avec résultat sauvegardé
     ✅ Historique mis à jour
     ✅ LLM relancé sans tools (anti-boucle)

🔒 Mécanismes de sécurité:
  ✅ Anti-boucle: Pas de tools lors de la relance
  ✅ Timeout: 15 secondes max par tool call
  ✅ Validation: Arguments JSON nettoyés
  ✅ Sauvegarde: Messages tool dans la DB
  ✅ Erreurs: Gestion des échecs de tool calls

🎉 PARFAIT ! Le mécanisme d'injection fonctionne pour tous les tool calls !
```

---

## 🎉 **RÉSULTAT FINAL**

### **✅ COUVERTURE COMPLÈTE :**
- **28 tools LLM** supportés ✅
- **Format DeepSeek** respecté ✅
- **Sauvegarde DB** fonctionnelle ✅
- **Anti-boucle** implémenté ✅
- **Gestion erreurs** robuste ✅

### **✅ BÉNÉFICES :**
- **Historique complet** de tous les tool calls
- **Debug facilité** avec traçabilité complète
- **Conformité DeepSeek** pour l'interopérabilité
- **Sécurité maximale** avec anti-boucle et timeout
- **Robustesse** avec gestion d'erreurs

---

## 🚀 **PRÊT POUR LA PRODUCTION**

**✅ Le mécanisme d'injection fonctionne parfaitement pour tous les tool calls !**

- **28 tools supportés** ✅
- **Format standard DeepSeek** ✅
- **Sauvegarde complète** ✅
- **Sécurité maximale** ✅
- **Debug facilité** ✅

---

*Documentation générée le 2024-01-01 - Version 1.0*

**Référence :** [DeepSeek Function Calling Documentation](https://api-docs.deepseek.com/guides/function_calling) 