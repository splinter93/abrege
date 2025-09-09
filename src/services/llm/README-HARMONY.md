# 🎼 Service Harmony - Format GPT-OSS

## 📋 Vue d'ensemble

Ce service implémente le **format Harmony** pour GPT-OSS, une structure standardisée développée par OpenAI pour optimiser les interactions avec les modèles de la série GPT-OSS.

## 🏗️ Architecture Harmony

```
src/services/llm/
├── 📁 types/
│   └── harmonyTypes.ts           # Types stricts Harmony
├── 📁 services/
│   ├── HarmonyFormatter.ts       # Formatage et parsing Harmony
│   ├── HarmonyBuilder.ts         # Construction de messages Harmony
│   ├── HarmonyHistoryBuilder.ts  # Construction d'historique Harmony
│   └── HarmonyOrchestrator.ts    # Orchestrateur Harmony complet
├── 📁 providers/
│   └── implementations/
│       └── groqHarmony.ts        # Provider Groq avec support Harmony
└── groqHarmonyGptOss.ts          # Point d'entrée Harmony
```

## 🎯 Format Harmony

### **Tokens spéciaux**
```typescript
<|start|>role<|channel|>channel<|message|>
Contenu du message
<|end|>
```

### **Rôles supportés**
- `system` - Instructions globales et contraintes
- `developer` - Instructions spécifiques et définitions d'outils
- `user` - Messages utilisateur
- `assistant` - Réponses du modèle
- `tool` - Résultats des outils

### **Canaux supportés**
- `analysis` - Raisonnement interne (chaîne de pensée)
- `commentary` - Appels d'outils et préambules
- `final` - Réponses destinées à l'utilisateur

## 🚀 Utilisation

### **1. Point d'entrée principal**
```typescript
import { handleGroqHarmonyGptOss } from './groqHarmonyGptOss';

const result = await handleGroqHarmonyGptOss({
  message: "Quel temps fait-il à Paris ?",
  sessionId: "session-123",
  userToken: "user-token",
  agentConfig: { name: "weather-agent" }
});
```

### **2. Orchestrateur Harmony**
```typescript
import { HarmonyOrchestrator } from './services/HarmonyOrchestrator';

const orchestrator = new HarmonyOrchestrator();
const result = await orchestrator.executeRound(params);
```

### **3. Construction de messages**
```typescript
import { HarmonyBuilder } from './services/HarmonyBuilder';

const builder = new HarmonyBuilder();

// Message système
const systemMsg = builder.buildSystemMessage("Instructions système");

// Message developer avec outils
const devMsg = builder.buildDeveloperMessage(
  "Utilise les outils disponibles",
  [
    {
      name: "get_weather",
      description: "Obtient la météo",
      parameters: { location: "string" }
    }
  ]
);

// Message assistant avec canal
const assistantMsg = builder.buildAssistantFinalMessage("Réponse finale");
```

### **4. Formatage Harmony**
```typescript
import { HarmonyFormatter } from './services/HarmonyFormatter';

const formatter = new HarmonyFormatter();

// Formater un message
const formatted = formatter.formatMessage({
  role: 'system',
  content: 'Instructions'
});

// Parser un message Harmony
const parsed = formatter.parseMessage(formatted);
```

## 🔧 Configuration

### **Configuration Harmony**
```typescript
const harmonyConfig = {
  enableAnalysisChannel: true,    // Canal analysis activé
  enableCommentaryChannel: true,  // Canal commentary activé
  enableFinalChannel: true,       // Canal final activé
  strictValidation: true,         // Validation stricte
  maxMessageLength: 50000,        // Longueur max des messages
  preserveRawTokens: false,       // Conserver les tokens bruts
};
```

### **Configuration Provider**
```typescript
const providerConfig = {
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  maxTokens: 8000,
  reasoningEffort: 'low',
  enableHarmonyFormat: true,
  strictHarmonyValidation: true,
};
```

## 📝 Exemples de format Harmony

### **Message système**
```
<|start|>system<|message|>
Vous êtes ChatGPT, un modèle de langage développé par OpenAI.
<|end|>
```

### **Message developer avec outils**
```
<|start|>developer<|message|>
# Instructions
Toujours répondre en devinettes.

# Outils
namespace functions {
  // Obtient la localisation de l'utilisateur.
  type get_location = () => any;
  // Obtient la météo actuelle pour un lieu donné.
  type get_current_weather = (_: {
    location: string,
    format?: "celsius" | "fahrenheit",
  }) => any;
}
<|end|>
```

### **Message assistant avec canal**
```
<|start|>assistant<|channel|>analysis<|message|>
Je dois d'abord obtenir la localisation de l'utilisateur, puis la météo.
<|end|>

<|start|>assistant<|channel|>final<|message|>
Il fait beau à Paris aujourd'hui !
<|end|>
```

## 🧪 Tests

### **Tests automatiques**
```typescript
import { testHarmonyImplementation } from './groqHarmonyGptOss';

const testResults = await testHarmonyImplementation();
console.log('Tests Harmony:', testResults);
```

### **Tests manuels**
```typescript
// Test de formatage
const formatter = new HarmonyFormatter();
const message = { role: 'user', content: 'Hello' };
const formatted = formatter.formatMessage(message);
console.log('Formatted:', formatted.formattedMessage);

// Test de parsing
const parsed = formatter.parseMessage(formatted.formattedMessage);
console.log('Parsed:', parsed.parsedMessage);
```

## 🔍 Validation

### **Validation stricte**
- Tous les messages sont validés avec Zod
- Types stricts, zéro `any`
- Validation des rôles et canaux
- Contrôle de la longueur des messages

### **Gestion d'erreurs**
```typescript
try {
  const result = await orchestrator.executeRound(params);
} catch (error) {
  if (error instanceof HarmonyValidationError) {
    console.error('Erreur de validation:', error.validationErrors);
  } else if (error instanceof HarmonyParseError) {
    console.error('Erreur de parsing:', error.rawInput);
  }
}
```

## 📊 Monitoring

### **Logs détaillés**
```typescript
logger.info('[HarmonyOrchestrator] 🚀 round Harmony start', {
  sessionId,
  messageLength,
  historyLength,
  toolsCount
});
```

### **Métriques**
```typescript
const metrics = provider.getMetrics();
console.log('Métriques Harmony:', metrics);
```

## 🚀 Avantages

1. **Compatibilité GPT-OSS** : Format natif optimisé
2. **Performance** : Structure optimisée pour l'entraînement
3. **Raisonnement explicite** : Séparation claire CoT/réponse
4. **Maintenabilité** : Standard ouvert et documenté
5. **Typage strict** : Zéro `any`, validation complète
6. **Production-ready** : Code robuste et testé

## 🔄 Migration

### **Depuis GroqOrchestrator**
```typescript
// Ancien
import { GroqOrchestrator } from './services/GroqOrchestrator';

// Nouveau
import { HarmonyOrchestrator } from './services/HarmonyOrchestrator';
```

### **Compatibilité**
- L'ancien `GroqOrchestrator` reste fonctionnel
- Migration progressive possible
- Même interface publique
- Même format de réponse

## 📚 Références

- [Format Harmony OpenAI](https://cookbook.openai.com/articles/openai-harmony)
- [Bibliothèque Harmony](https://github.com/openai/harmony)
- [GPT-OSS Documentation](https://openai.com/research/gpt-oss)
