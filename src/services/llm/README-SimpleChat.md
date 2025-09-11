# SimpleChat - Système de Tools Intelligent

Un système de chat simple et intelligent avec relance automatique, style ChatGPT.

## 🚀 Fonctionnalités

- **Tools intelligents** : Exécution automatique des outils
- **Relance automatique** : En cas d'erreur, le système relance intelligemment
- **Multi-tool calls** : Exécution de plusieurs outils en parallèle
- **Gestion d'erreurs** : Analyse et correction automatique des erreurs
- **Réponse finale** : Synthèse intelligente des résultats

## 📁 Structure

```
src/services/llm/
├── services/
│   ├── SimpleToolExecutor.ts      # Exécuteur de tools intelligent
│   └── SimpleChatOrchestrator.ts  # Orchestrateur de chat
├── executors/
│   └── ApiV2ToolExecutor.ts       # Exécuteur API V2 simplifié
├── examples/
│   └── SimpleChatExample.ts       # Exemples d'utilisation
└── README-SimpleChat.md           # Cette documentation
```

## 🎯 Utilisation

### 1. Chat Simple

```typescript
import { simpleChatOrchestrator } from '@/services/llm/services/SimpleChatOrchestrator';

const response = await simpleChatOrchestrator.processMessage(
  "Crée une note sur 'Mon projet' dans mon premier classeur",
  [], // historique
  {
    userToken: 'your-token',
    sessionId: 'session-123',
    maxRetries: 3,
    maxToolCalls: 5
  }
);

console.log(response.content); // Réponse finale
console.log(response.toolCalls); // Outils utilisés
console.log(response.toolResults); // Résultats des outils
```

### 2. Exécution de Tools Seule

```typescript
import { simpleToolExecutor } from '@/services/llm/services/SimpleToolExecutor';

const toolCalls = [
  {
    id: 'call-1',
    type: 'function',
    function: {
      name: 'createNote',
      arguments: JSON.stringify({
        source_title: 'Ma note',
        notebook_id: 'classeur-123'
      })
    }
  }
];

const results = await simpleToolExecutor.executeWithRetry(
  toolCalls,
  { userToken: 'token', sessionId: 'session' },
  llmCallback // Fonction de callback pour les relances
);
```

## 🔄 Flux de Fonctionnement

1. **Message utilisateur** → LLM
2. **LLM** → Génère des tool calls
3. **Exécution** → Tools en parallèle
4. **Analyse** → Résultats et erreurs
5. **Relance** → Si erreur, demande au LLM de corriger
6. **Réponse finale** → Synthèse des résultats

## 🛠️ Configuration

### Limites par défaut
- `maxRetries`: 3 tentatives
- `maxToolCalls`: 10 outils max
- `maxContextMessages`: 25 messages d'historique

### Types d'erreurs gérées
- `TIMEOUT` → Relance automatique
- `NETWORK_ERROR` → Relance automatique  
- `SERVER_ERROR` → Relance automatique
- `NOT_FOUND` → Demande d'alternative
- `PERMISSION_ERROR` → Demande de correction
- `AUTH_ERROR` → Arrêt et signalement

## 📊 Exemples

### Exemple 1 : Création de note
```typescript
const response = await simpleChatOrchestrator.processMessage(
  "Crée une note 'Réunion' dans mon classeur 'Travail'",
  history,
  context
);
// → Exécute createNote automatiquement
// → Retourne confirmation ou erreur
```

### Exemple 2 : Recherche complexe
```typescript
const response = await simpleChatOrchestrator.processMessage(
  "Trouve toutes mes notes sur 'projet' et crée un résumé",
  history,
  context
);
// → Exécute searchContent
// → Exécute createNote avec le résumé
// → Retourne le résumé final
```

### Exemple 3 : Gestion d'erreur
```typescript
const response = await simpleChatOrchestrator.processMessage(
  "Supprime la note 'inexistante'",
  history,
  context
);
// → Exécute deleteResource
// → Détecte l'erreur 404
// → Demande au LLM de proposer une alternative
// → Retourne suggestion intelligente
```

## 🎨 Avantages

- **Simple** : Interface claire et intuitive
- **Intelligent** : Relance automatique et gestion d'erreurs
- **Robuste** : Gestion des timeouts et erreurs réseau
- **Extensible** : Facile d'ajouter de nouveaux outils
- **Efficace** : Exécution parallèle des outils

## 🔧 Développement

### Ajouter un nouvel outil
1. Ajouter dans `ApiV2ToolExecutor.ts`
2. Ajouter dans `openApiToolsGenerator.ts`
3. Tester avec `SimpleChatExample.ts`

### Personnaliser la relance
Modifier `SimpleToolExecutor.analyzeResults()` pour ajuster la logique de relance.

### Ajouter des types d'erreurs
Modifier `SimpleToolExecutor.categorizeError()` pour gérer de nouveaux types d'erreurs.

## 🚀 Production Ready

- ✅ Gestion d'erreurs complète
- ✅ Logging détaillé
- ✅ Types TypeScript stricts
- ✅ Tests d'exemple
- ✅ Documentation complète
- ✅ Performance optimisée
