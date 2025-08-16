# 🚀 Migration vers Groq Responses API

## 📋 **Résumé de la Migration**

Cette migration implémente le nouveau **GroqResponsesProvider** qui utilise l'API Responses de Groq, offrant de nouvelles fonctionnalités puissantes :

- **Browser Search** : Recherche web en temps réel
- **Code Execution** : Exécution Python pour calculs et analyse
- **Images** : Support des inputs visuels
- **Structured Outputs** : Validation JSON stricte

## 🎯 **Changements Principaux**

### **1. Nouveau Provider : GroqResponsesProvider**

**Fichier :** `src/services/llm/providers/implementations/groqResponses.ts`

**Fonctionnalités :**
- ✅ Conversion automatique `messages` → `input`
- ✅ Support Browser Search et Code Execution
- ✅ Gestion des built-in tools
- ✅ Compatibilité avec l'API existante

### **2. Différences avec l'API Chat**

| Aspect | Chat API | Responses API |
|--------|----------|---------------|
| **Endpoint** | `/chat/completions` | `/responses` |
| **Input** | `messages[]` | `input: string` |
| **Output** | `choice.message.content` | `output_text` |
| **Streaming** | ✅ Supporté | ❌ Non supporté |
| **Reasoning** | ✅ Supporté | ❌ Non supporté |
| **Browser Search** | ❌ Non supporté | ✅ Supporté |
| **Code Execution** | ❌ Non supporté | ✅ Supporté |
| **Images** | ❌ Non supporté | ✅ Supporté |

### **3. Structure du Payload**

**Avant (Chat API) :**
```typescript
{
  model: 'openai/gpt-oss-120b',
  messages: [
    { role: 'system', content: '...' },
    { role: 'user', content: '...' }
  ],
  temperature: 0.7,
  max_completion_tokens: 8000,
  tools: [...],
  tool_choice: 'auto'
}
```

**Après (Responses API) :**
```typescript
{
  model: 'openai/gpt-oss-120b',
  input: "Message utilisateur", // ← Conversion automatique
  temperature: 0.7,
  max_completion_tokens: 8000,
  tools: [
    ...customTools,
    { type: "browser_search" },     // ← Built-in tools
    { type: "code_interpreter" }
  ],
  tool_choice: 'auto'
}
```

## 🔧 **Implémentation Technique**

### **1. Conversion Messages → Input**

```typescript
private convertMessagesToInput(messages: any[]): string {
  // Prend le dernier message utilisateur
  const lastUserMessage = messages
    .filter(msg => msg.role === 'user')
    .pop();
  
  return lastUserMessage?.content || '';
}
```

### **2. Built-in Tools**

```typescript
private getBuiltInTools(): any[] {
  const builtInTools: any[] = [];

  // Browser Search
  if (this.config.enableBrowserSearch && this.supportsBrowserSearch()) {
    builtInTools.push({ type: "browser_search" });
  }

  // Code Execution
  if (this.config.enableCodeExecution && this.supportsCodeExecution()) {
    builtInTools.push({
      type: "code_interpreter",
      container: { "type": "auto" }
    });
  }

  return builtInTools;
}
```

### **3. Extraction de Réponse**

```typescript
private extractResponsesResponse(response: any): any {
  return {
    content: response.output_text || '', // ← Nouveau champ
    model: response.model,
    usage: response.usage,
    tool_calls: response.tool_calls || []
  };
}
```

## 🧪 **Tests et Validation**

### **1. Page de Test**

**URL :** `/test-groq-responses`

**Fonctionnalités testées :**
- ✅ Création et validation du provider
- ✅ Test de connexion API
- ✅ Test des function calls
- ✅ Test Browser Search
- ✅ Test Code Execution

### **2. Composant de Test**

**Fichier :** `src/components/test/TestGroqResponsesProvider.tsx`

**Tests disponibles :**
- **Test Complet** : Validation complète du provider
- **Test Browser Search** : Recherche web en temps réel
- **Test Code Execution** : Exécution Python

## 📊 **Modèles Supportés**

### **Browser Search + Code Execution**
- `openai/gpt-oss-20b` ✅
- `openai/gpt-oss-120b` ✅

### **Images**
- `llama-3.3-70b-versatile` ✅

### **Structured Outputs**
- `moonshotai/kimi-k2-instruct` ✅

## 🚀 **Utilisation**

### **1. Configuration de Base**

```typescript
import { GroqResponsesProvider } from '@/services/llm/providers/implementations/groqResponses';

const provider = new GroqResponsesProvider({
  model: 'openai/gpt-oss-20b',
  enableBrowserSearch: true,
  enableCodeExecution: true
});
```

### **2. Appel Simple**

```typescript
const result = await provider.call(
  'Quelle est la météo à Paris ?',
  context,
  history
);
```

### **3. Avec Built-in Tools**

```typescript
const provider = new GroqResponsesProvider({
  enableBrowserSearch: true,
  enableCodeExecution: true
});

// Les built-in tools sont automatiquement ajoutés
const result = await provider.call(message, context, history);
```

## ⚠️ **Limitations Actuelles**

### **1. Conversion d'Historique**

**Problème :** La conversion `messages` → `input` ne prend que le dernier message utilisateur.

**Solution future :** Implémenter une conversion intelligente de l'historique complet.

### **2. Compatibilité Types**

**Problème :** Conflit entre les types `ChatMessage` de différents modules.

**Solution :** Unifier les types ou créer des adaptateurs.

### **3. Streaming**

**Problème :** L'API Responses ne supporte pas le streaming.

**Solution :** Utiliser l'API Chat pour les cas nécessitant du streaming.

## 🔄 **Migration Progressive**

### **Phase 1 : ✅ Implémentation**
- [x] Création du GroqResponsesProvider
- [x] Support des built-in tools
- [x] Tests de base

### **Phase 2 : 🔄 Intégration**
- [ ] Feature flag pour basculement
- [ ] Adaptation des services existants
- [ ] Tests d'intégration

### **Phase 3 : 🚀 Déploiement**
- [ ] Déploiement progressif
- [ ] Monitoring des métriques
- [ ] Optimisation des performances

## 📈 **Avantages Attendus**

### **1. Nouvelles Fonctionnalités**
- **Browser Search** : Agents avec accès web en temps réel
- **Code Execution** : Calculs complexes et analyse de données
- **Images** : Support visuel pour les agents

### **2. Performance**
- **Même vitesse** que l'API Chat
- **Même coût** que l'API Chat
- **Plus de capacités** sans impact

### **3. Flexibilité**
- **Fallback** vers l'API Chat si nécessaire
- **Configuration** flexible des fonctionnalités
- **Compatibilité** avec l'existant

## 🎯 **Prochaines Étapes**

1. **Résoudre les conflits de types** dans le ProviderManager
2. **Implémenter la conversion d'historique** complète
3. **Ajouter le feature flag** pour le basculement
4. **Créer des tests d'intégration** complets
5. **Déployer progressivement** en production

---

**Status :** ✅ Phase 1 terminée - Provider fonctionnel et testé
**Prochaine étape :** 🔄 Phase 2 - Intégration avec les services existants 