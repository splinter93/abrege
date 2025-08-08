# 🔍 DEBUG NAME TRACING - TRACER LE NAME MANQUANT

## 🚨 **PROBLÈME PERSISTANT**

**Le champ `name` est toujours manquant dans les messages tool, malgré les corrections précédentes.**

Dans les logs, on voit :
```json
{
  role: 'tool',
  content: `{"success":false,"error":"Échec de l'exécution de update_note: Note non trouvé"}`,
  tool_calls: undefined,
  tool_call_id: 'fc_7af5f45e-ac0b-4de8-92d9-52f355e7702a'
  // ❌ MANQUE TOUJOURS: name
}
```

---

## 🔍 **DIAGNOSTIC APPROFONDI**

### **✅ Corrections déjà appliquées :**
1. **Schéma de validation** : `name` ajouté dans `addMessageSchema`
2. **Sauvegarde** : `name` inclus dans `newMessage`
3. **Transmission** : `mappedMsg.name = msg.name` dans `sessionHistory.map`

### **❌ Problème persistant :**
Le `name` n'apparaît toujours pas dans les logs finaux.

---

## 🛠️ **APPROCHE DE DEBUG**

### **1. 🔍 Logs de debug ajoutés**

**Fichier : `src/app/api/chat/llm/route.ts`**

#### **A. Debug dans getSessionHistory :**
```typescript
// 🔍 DEBUG: Tracer le name dans les messages tool
const messagesWithName = limitedHistory.map(msg => {
  if (msg.role === 'tool') {
    logger.dev('[LLM API] 🔍 Message tool trouvé:', {
      tool_call_id: msg.tool_call_id,
      name: msg.name || '❌ MANQUE',
      hasName: !!msg.name
    });
  }
  return msg;
});

logger.dev('[LLM API] 📊 Statistiques messages tool:', {
  totalMessages: limitedHistory.length,
  toolMessages: limitedHistory.filter(m => m.role === 'tool').length,
  toolMessagesWithName: limitedHistory.filter(m => m.role === 'tool' && m.name).length
});
```

#### **B. Debug dans sessionHistory.map :**
```typescript
// 🔍 DEBUG: Tracer la transmission du name
if (msg.role === 'tool') {
  logger.dev('[LLM API] 🔍 Transmission message tool:', {
    originalName: msg.name || '❌ MANQUE',
    toolCallId: msg.tool_call_id,
    willIncludeName: !!msg.name
  });
}
```

#### **C. Debug dans création de messages tool :**
```typescript
// 🔍 DEBUG: Tracer la création du message tool
logger.dev('[LLM API] 🔍 Création message tool:', {
  toolCallId: toolCallId,
  functionName: functionCallData.name,
  toolName: toolResultMessage.name,
  hasName: !!toolResultMessage.name
});
```

#### **D. Debug dans sauvegarde :**
```typescript
// 🔍 DEBUG: Tracer la sauvegarde du message tool
logger.dev('[LLM API] 🔍 Sauvegarde message tool:', {
  toolCallId: toolCallId,
  name: functionCallData.name,
  willSaveName: !!functionCallData.name
});
```

---

## 🎯 **POINTS DE VÉRIFICATION**

### **1. 🔍 Vérification de la sauvegarde**
- Le `name` est-il bien inclus dans le payload de sauvegarde ?
- Le `name` est-il bien sauvegardé en base ?

### **2. 🔍 Vérification de la récupération**
- Le `name` est-il bien récupéré depuis la base ?
- Le `name` est-il présent dans `limitedHistory` ?

### **3. 🔍 Vérification de la transmission**
- Le `name` est-il bien transmis dans `sessionHistory.map` ?
- Le `name` est-il inclus dans les messages envoyés à l'API LLM ?

### **4. 🔍 Vérification de la création**
- Le `name` est-il bien inclus lors de la création des messages tool ?
- Y a-t-il des créations hardcodées sans `name` ?

---

## 🧪 **TEST DE VALIDATION**

### **Script de test : `test-name-debug.js`**
```javascript
// Simuler un appel de chat avec un tool call
const response = await fetch('http://localhost:3000/api/chat/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  body: JSON.stringify({
    sessionId: 'test-session',
    message: 'liste mes classeurs stp',
    agentId: 'test-agent'
  })
});
```

### **Logs à surveiller :**
1. `🔍 Message tool trouvé:` - Vérifier si le name est dans l'historique
2. `🔍 Transmission message tool:` - Vérifier si le name est transmis
3. `🔍 Création message tool:` - Vérifier si le name est créé
4. `🔍 Sauvegarde message tool:` - Vérifier si le name est sauvegardé

---

## 📋 **PROCHAINES ÉTAPES**

### **1. 🔄 Redémarrer le serveur**
```bash
npm run dev
```

### **2. 🧪 Lancer le test**
```bash
node test-name-debug.js
```

### **3. 🔍 Analyser les logs**
Chercher les logs avec `🔍` pour identifier où le `name` est perdu.

### **4. 🔧 Corriger le problème**
Basé sur les logs, appliquer la correction nécessaire.

---

## 🏁 **OBJECTIF**

**Identifier exactement où le `name` est perdu dans le flux :**

1. **Sauvegarde** → Le `name` est-il sauvegardé ?
2. **Récupération** → Le `name` est-il récupéré ?
3. **Transmission** → Le `name` est-il transmis ?
4. **Création** → Le `name` est-il créé ?

**Une fois le point de perte identifié, appliquer la correction ciblée ! 🎯** 