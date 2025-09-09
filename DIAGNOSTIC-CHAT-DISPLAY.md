# 🐛 Diagnostic Chat Display - Problèmes Reasoning et Tool Calls

## 📋 Problèmes identifiés

### 1. **Reasoning non affiché** 🧠
- Le reasoning n'apparaît pas dans l'interface
- Les canaux Harmony ne sont pas visibles

### 2. **Tool calls non persistants** 🔧
- Les tool calls ne s'affichent qu'après rechargement de page
- Message temporaire avec `persist: false`

## ✅ Solutions appliquées

### 1. **Types ChatMessage étendus**
```typescript
export type ChatMessage = {
  // ... propriétés existantes
  reasoning?: string | null;
  // 🎼 Canaux Harmony séparés
  harmony_analysis?: string;
  harmony_commentary?: string;
  harmony_final?: string;
  // ... autres propriétés
};
```

### 2. **Tool calls persistants**
```typescript
// Avant
await addMessage(toolCallMessage, { persist: false });

// Après
await addMessage(toolCallMessage, { persist: true });
```

### 3. **Debug ajouté**
```typescript
// Dans ChatMessageOptimized.tsx
if (role === 'assistant' && reasoning) {
  console.log('[ChatMessageOptimized] 🧠 Reasoning détecté:', {
    reasoning: reasoning.substring(0, 100) + '...',
    hasHarmonyAnalysis: !!(validatedProps.message as any).harmony_analysis,
    // ...
  });
}

// Dans HarmonyReasoningMessage.tsx
console.log('[HarmonyReasoningMessage] 🎼 Rendu:', {
  channel,
  reasoning: reasoning?.substring(0, 50) + '...',
  hasReasoning: !!reasoning
});
```

## 🔍 Diagnostic étape par étape

### **Étape 1: Vérifier les logs**
1. Ouvrir la console du navigateur (F12)
2. Aller sur `/chat-fullscreen-v2`
3. Activer le toggle Harmony 🎼
4. Envoyer un message
5. Vérifier les logs :
   - `[ChatMessageOptimized] 🧠 Reasoning détecté`
   - `[HarmonyReasoningMessage] 🎼 Rendu`
   - `[useChatResponseHarmony] 🎯 Données Harmony extraites`

### **Étape 2: Inspecter le DOM**
1. Clic droit sur un message assistant
2. "Inspecter l'élément"
3. Chercher les classes :
   - `.reasoning-message`
   - `.harmony-reasoning-message`
   - `.harmony-reasoning-content`

### **Étape 3: Vérifier les CSS**
1. Dans l'inspecteur, onglet "Styles"
2. Vérifier que les styles sont appliqués :
   - `src/components/chat/ReasoningMessage.css`
   - `src/components/chat/HarmonyReasoningMessage.css`

### **Étape 4: Vérifier les données**
1. Dans la console, vérifier les messages :
```javascript
// Vérifier les messages dans le store
console.log('Messages:', window.__CHAT_STORE__?.getState()?.sessions);

// Vérifier un message spécifique
const message = document.querySelector('.chat-message-assistant');
console.log('Message DOM:', message);
```

## 🚨 Problèmes courants et solutions

### **Problème 1: Reasoning non affiché**
**Cause :** Le `reasoning` n'est pas passé dans le message
**Solution :**
```typescript
// Vérifier dans handleComplete
const messageToAdd = {
  role: 'assistant' as const,
  content: safeContent,
  reasoning: fullReasoning, // ✅ Doit être présent
  // ...
};
```

### **Problème 2: Tool calls non persistants**
**Cause :** Message temporaire avec `persist: false`
**Solution :**
```typescript
// Changé de persist: false à persist: true
await addMessage(toolCallMessage, { persist: true });
```

### **Problème 3: CSS non chargé**
**Cause :** Import CSS manquant
**Solution :**
```css
/* Dans src/components/chat/index.css */
@import './ReasoningMessage.css';
@import './HarmonyReasoningMessage.css';
```

### **Problème 4: Canaux Harmony non affichés**
**Cause :** Propriétés Harmony manquantes dans le type
**Solution :**
```typescript
// Ajout des propriétés dans ChatMessage
harmony_analysis?: string;
harmony_commentary?: string;
harmony_final?: string;
```

## 🧪 Tests de validation

### **Test 1: Reasoning standard**
```bash
# 1. Désactiver Harmony (toggle OFF)
# 2. Envoyer un message
# 3. Vérifier l'affichage du reasoning standard
```

### **Test 2: Canaux Harmony**
```bash
# 1. Activer Harmony (toggle ON)
# 2. Envoyer un message avec des outils
# 3. Vérifier l'affichage des canaux séparés
```

### **Test 3: Tool calls**
```bash
# 1. Envoyer un message nécessitant des outils
# 2. Vérifier l'affichage immédiat des tool calls
# 3. Vérifier la persistance après rechargement
```

## 📊 Logs de debug attendus

### **Logs Harmony réussis :**
```
[HarmonyOrchestrator] 🎼 Appel Harmony Groq OSS pour session session-123
[useChatResponseHarmony] 🎯 Données Harmony extraites: {
  hasHarmonyAnalysis: true,
  hasHarmonyCommentary: true,
  hasHarmonyFinal: true
}
[ChatMessageOptimized] 🧠 Reasoning détecté: {
  reasoning: "Je vais analyser cette question...",
  hasHarmonyAnalysis: true
}
[HarmonyReasoningMessage] 🎼 Rendu: {
  channel: "analysis",
  hasReasoning: true
}
```

### **Logs d'erreur à surveiller :**
```
❌ [ChatMessageOptimized] message is undefined
❌ [HarmonyReasoningMessage] reasoning is null
❌ [useChatResponseHarmony] Réponse Harmony invalide
```

## 🎯 Résolution finale

Si les problèmes persistent :

1. **Vérifier la compilation TypeScript**
2. **Redémarrer le serveur de développement**
3. **Vider le cache du navigateur**
4. **Vérifier les erreurs dans la console**
5. **Tester avec un message simple sans outils**

## 📞 Support

En cas de problème persistant :
1. Copier les logs de la console
2. Vérifier la structure des messages dans le DOM
3. Tester avec les deux modes (Standard/Harmony)
4. Documenter le comportement observé
