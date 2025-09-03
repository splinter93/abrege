# 🚨 LIMITATION GPT-OSS : FUNCTION CALLING NON SUPPORTÉ

## 🎯 **PROBLÈME IDENTIFIÉ**

**GPT-OSS (Together AI) ne supporte PAS encore les function calls** selon la [documentation officielle](https://docs.together.ai/docs/gpt-oss).

---

## 📊 **PREUVE DE LA LIMITATION**

### **🔍 DOCUMENTATION TOGETHER AI**

> **Current Limitations** - The following features are not yet supported, but will be added soon:
> - GPT-OSS 20B model not supported currently
> - Some sampling parameters not supported: Repetition penalty
> - **Function calling support not available yet** ← **PROBLÈME ICI**
> - JSON mode is currently not supported

### **🔍 LOGS DU TERMINAL**

```
[DEV] [LLM API] 📥 Chunk Together AI: {
  "choices": [{
    "delta": {
      "content": "We need to call the get_notebooks, not fabricate. The previous assistant response pretended to have called but didn't actually. We must call the function."
    }
  }]
}
```

**Le modèle simule les function calls en texte au lieu de les utiliser réellement !**

---

## 🛠️ **SOLUTIONS POSSIBLES**

### **1. 🚫 DÉSACTIVER LES TOOLS POUR GPT-OSS**

```typescript
// Dans src/app/api/chat/llm/route.ts
if (currentProvider.id === 'together' && config.model.includes('gpt-oss')) {
  // ❌ GPT-OSS ne supporte pas les function calls
  const tools = undefined;
  const payload = {
    model: config.model,
    messages,
    stream: true,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
    top_p: config.top_p
    // Pas de tools pour GPT-OSS
  };
}
```

### **2. 🔄 UTILISER UN AUTRE MODÈLE TOGETHER AI**

```typescript
// Modèles Together AI qui supportent les function calls
const supportedModels = [
  'meta-llama/Llama-3.1-405B-Instruct',
  'meta-llama/Llama-3.1-70B-Instruct',
  'deepseek-ai/deepseek-coder-33b-instruct',
  'microsoft/WizardLM-2-8x22B'
];
```

### **3. 🎯 LOGIQUE CONDITIONNELLE**

```typescript
// Vérifier si le modèle supporte les function calls
const supportsFunctionCalling = !config.model.includes('gpt-oss');

const tools = agentConfig?.api_v2_capabilities?.length > 0 && supportsFunctionCalling
  ? agentApiV2Tools.getToolsForFunctionCalling(agentConfig.api_v2_capabilities)
  : undefined;

const payload = {
  model: config.model,
  messages,
  stream: true,
  temperature: config.temperature,
  max_tokens: config.max_tokens,
  top_p: config.top_p,
  ...(tools && { tools, tool_choice: 'auto' })
};
```

---

## 🎯 **RECOMMANDATIONS**

### **✅ SOLUTION IMMÉDIATE**

1. **Désactiver les tools pour GPT-OSS** dans le code
2. **Afficher un message d'information** à l'utilisateur
3. **Suggérer un autre modèle** qui supporte les function calls

### **✅ SOLUTION LONG TERME**

1. **Attendre la mise à jour** de Together AI pour GPT-OSS
2. **Utiliser un autre modèle** en attendant
3. **Implémenter une logique de fallback**

---

## 📋 **IMPACT SUR LE SYSTÈME**

### **🚫 FONCTIONNALITÉS PERDUES AVEC GPT-OSS**

- ❌ Création de notes via function calling
- ❌ Modification de notes via function calling
- ❌ Déplacement de notes via function calling
- ❌ Suppression de notes via function calling
- ❌ Création de dossiers via function calling

### **✅ FONCTIONNALITÉS CONSERVÉES**

- ✅ Réponses textuelles normales
- ✅ Raisonnement avancé (chain-of-thought)
- ✅ Analyse de code
- ✅ Planification stratégique
- ✅ Analyse de documents complexes

---

## 🚀 **PLAN D'ACTION**

### **1. 🔧 CORRECTION IMMÉDIATE**

```typescript
// Ajouter cette logique dans route.ts
const isGptOss = config.model.includes('gpt-oss');
const supportsFunctionCalling = !isGptOss;

if (isGptOss) {
  logger.dev("[LLM API] ⚠️ GPT-OSS détecté - Function calling non supporté");
}
```

### **2. 📝 MESSAGE UTILISATEUR**

```typescript
if (isGptOss && agentConfig?.api_v2_capabilities?.length > 0) {
  // Ajouter un message système
  messages.unshift({
    role: 'system',
    content: '⚠️ Note: GPT-OSS ne supporte pas encore les function calls. Les actions seront décrites en texte.'
  });
}
```

### **3. 🔄 FALLBACK AUTOMATIQUE**

```typescript
// Suggérer un autre modèle si function calls requis
if (isGptOss && agentConfig?.api_v2_capabilities?.length > 0) {
  logger.dev("[LLM API] 💡 Suggestion: Utiliser un autre modèle pour les function calls");
}
```

---

## 🎯 **CONCLUSION**

**Le problème n'est pas dans notre code mais dans les limitations de GPT-OSS !**

- ✅ **DeepSeek** : Function calling supporté
- ✅ **Autres modèles Together AI** : Function calling supporté  
- ❌ **GPT-OSS** : Function calling non supporté (limitation officielle)

**Solution :** Désactiver les tools pour GPT-OSS et informer l'utilisateur de cette limitation. 