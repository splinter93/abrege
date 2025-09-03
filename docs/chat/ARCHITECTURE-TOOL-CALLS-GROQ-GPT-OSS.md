# 🚀 Architecture Complète du Système de Tool Calls - Groq GPT OSS

## 📋 Vue d'ensemble

Ce document détaille l'architecture complète du système de tool calls pour le modèle GPT OSS de Groq dans l'application Abrège. Le système implémente un chaînage d'outils robuste avec persistance atomique, gestion de l'historique LLM, et réinjection intelligente des tool calls.

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUX PRINCIPAL                                │
│                                                                             │
│  User Message → GroqOrchestrator.executeRound()                            │
│       ↓                                                                     │
│  1er appel LLM → tool_calls détectés                                       │
│       ↓                                                                     │
│  Boucle bornée (max 10 relances):                                          │
│       ↓                                                                     │
│  1. executeTools(toolCalls) → toolResults                                  │
│       ↓                                                                     │
│  2. ToolCallPersistenceService.persistToolMessages()                       │
│       ↓                                                                     │
│  3. ThreadBuilder.rebuildFromDB()                                          │
│       ↓                                                                     │
│  4. callLLMWithResults() → Nouveaux tool_calls ou réponse finale           │
│       ↓                                                                     │
│  Réponse finale ou circuit breaker                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Fichiers Impliqués

### 🎼 **Orchestrateur Principal**
- **`src/services/llm/services/GroqOrchestrator.ts`** - Orchestrateur principal du système
- **`src/services/llm/groqGptOss120b.ts`** - Point d'entrée de l'API

### 🔧 **Exécution des Tools**
- **`src/services/llm/services/GroqToolExecutor.ts`** - Exécuteur de tool calls
- **`src/services/llm/toolCallManager.ts`** - Gestionnaire de tool calls
- **`src/services/llm/services/ToolCallPersistenceService.ts`** - Persistance des tool calls

### 🏗️ **Construction de l'Historique**
- **`src/services/llm/services/GroqHistoryBuilder.ts`** - Constructeur d'historique
- **`src/services/llm/services/README-ARCHITECTURE-ROBUSTE.md`** - Documentation architecture

### 🔌 **Provider Groq**
- **`src/services/llm/providers/implementations/groq.ts`** - Implémentation du provider Groq

### 🎯 **Interface Utilisateur**
- **`src/components/chat/ChatFullscreenV2.tsx`** - Interface chat plein écran
- **`src/components/chat/ChatWidget.tsx`** - Widget de chat
- **`src/hooks/useChatResponse.ts`** - Hook de gestion des réponses

### 📊 **Types et Configuration**
- **`src/services/llm/types/groqTypes.ts`** - Types TypeScript pour Groq
- **`src/services/llm/config.ts`** - Configuration LLM
- **`src/services/llm/types.ts`** - Types généraux

## 🔄 Système de Tool Calls

### 1. **Détection et Validation**

```typescript
// Dans GroqOrchestrator.callLLM()
const tools = await this.getToolsWithGating(agentConfig);
const response = await configuredProvider.call(message, sessionIdentity, messages, tools);

// Validation des tool calls
toolCalls = Array.isArray(response.tool_calls) ? response.tool_calls : [];
toolCalls = this.deduplicateToolCalls(toolCalls);
```

### 2. **Exécution Parallèle**

```typescript
// Dans GroqToolExecutor.executeTools()
const executionPromises = toolCalls.map((toolCall, index) =>
  this.executeSingleTool(toolCall, userToken, maxRetries, batchId, index + 1, toolCalls.length)
);

const results = await Promise.allSettled(executionPromises);
```

### 3. **Configuration Groq Optimisée**

```typescript
// Dans GroqProvider.preparePayload()
payload.tools = validatedTools;
payload.tool_choice = 'auto';
payload.parallel_tool_calls = true; // ✅ Tool calls parallèles
payload.max_tokens = Math.max(this.config.maxTokens, 4000); // ✅ Plus de tokens pour les réponses avec tools
```

## 🔄 Réinjection des Tool Calls

### 1. **Construction de l'Historique avec Tool Results**

```typescript
// Dans GroqHistoryBuilder.buildSecondCallHistory()
const assistantMessage: ChatMessage = {
  role: 'assistant',
  content: null,
  tool_calls: toolCalls,
  timestamp: new Date().toISOString()
};

const toolMessages = this.buildToolMessages(toolResults, validationErrors);
const finalMessages = this.insertToolMessages([...baseMessages, assistantMessage], toolMessages);
```

### 2. **Format des Messages Tool**

```typescript
// Structure d'un message tool
{
  role: 'tool',
  content: JSON.stringify(result),
  tool_call_id: toolCallId,
  name: toolName,
  timestamp: new Date().toISOString()
}
```

### 3. **Réinjection dans le Contexte**

```typescript
// Dans GroqOrchestrator.callLLMWithResults()
const conversationContext = this.buildConversationContext(cleanedHistory, toolCalls, toolResults);
const messages = this.buildMessagesWithResultsIntelligent(
  mergedSystem,
  message,
  cleanedHistory,
  toolCalls,
  toolResults
);
```

## 📚 Gestion de l'Historique LLM

### 1. **Persistance Atomique**

```typescript
// Dans ToolCallPersistenceService
async persistToolCalls(toolCalls: ToolCall[]): Promise<void> {
  for (const toolCall of toolCalls) {
    const message: ToolCallMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [toolCall],
      timestamp: new Date().toISOString()
    };
    await this.persistMessage(message);
  }
}
```

### 2. **Rechargement depuis la Base de Données**

```typescript
// Le thread est rechargé depuis la DB après persistance
const threadBuilder = new ThreadBuilder();
const rebuiltThread = await threadBuilder.rebuildFromDB(sessionId);
```

### 3. **Isolation des Sessions**

```typescript
// Filtrage strict par sessionId
private filterSessionHistory(history: any[], sessionId: string): any[] {
  return history.filter(msg => {
    if (msg.role === 'system') return true;
    if (msg.sessionId === sessionId) return true;
    if (msg.sessionId && msg.sessionId !== sessionId) {
      logger.warn(`🔒 Message d'autre session filtré:`, {
        sessionId: msg.sessionId,
        currentSession: sessionId,
        role: msg.role
      });
      return false;
    }
    return true;
  });
}
```

## 🔄 Boucle de Relances Intelligente

### 1. **Limite de Relances**

```typescript
// Boucle principale dans executeRound()
let relances = 0;
const maxRelances = this.limits.maxRelances; // 10 par défaut

while (relances < maxRelances && toolCalls.length > 0) {
  // Exécution des tools
  const toolResults = await this.toolExecutor.executeTools(toolCalls, context);
  
  // Persistance
  await persistenceService.persistToolResults(toolResults);
  
  // Relance avec résultats
  const { response, isRelance, hasNewToolCalls } = await this.callLLMWithResults(
    message, sessionHistory, toolCalls, toolResults, agentConfig, sessionId, userToken, relances, traceId
  );
  
  toolCalls = response.tool_calls || [];
  relances++;
}
```

### 2. **Arrêt Intelligent**

```typescript
// Critères d'arrêt automatique
const shouldStop = this.evaluateEarlyStopping(response, relances, toolCalls);
if (shouldStop) {
  logger.info(`[GroqOrchestrator] 🧠 Arrêt intelligent après ${relances} relances`);
  break;
}
```

### 3. **Circuit Breaker**

```typescript
// Si limite atteinte avec encore des tool calls
if (relances >= maxRelances && toolCalls.length > 0) {
  return this.createCircuitBreakerResponse(sessionId, toolCalls, relances);
}
```

## 🎯 Gestion des Erreurs

### 1. **Exécution Robuste**

```typescript
// Utilisation de Promise.allSettled pour éviter les blocages
const results = await Promise.allSettled(executionPromises);
const processedResults = results.map((result, index) => {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    // Créer un résultat d'erreur
    return {
      tool_call_id: toolCalls[index].id,
      name: toolCalls[index].function?.name || 'unknown',
      result: { success: false, error: result.reason?.message || 'Erreur inconnue' },
      success: false,
      timestamp: new Date().toISOString()
    };
  }
});
```

### 2. **Retry avec Timeout**

```typescript
// Dans ToolCallManager.executeToolCall()
const toolCallPromise = agentApiV2Tools.executeTool(func.name, args, userToken);
const timeoutPromise = new Promise((resolve) => { 
  setTimeout(() => resolve({ success: false, error: 'Timeout tool call (10s)' }), 10000); 
});
const rawResult = await Promise.race([toolCallPromise, timeoutPromise]);
```

## 🔧 Configuration et Limites

### 1. **Limites par Défaut**

```typescript
export const DEFAULT_GROQ_LIMITS: GroqLimits = {
  maxToolCalls: 10,        // Maximum de tool calls par round
  maxRelances: 10,         // Maximum de relances
  maxContextMessages: 30,  // Maximum de messages de contexte
  maxRetries: 3,           // Maximum de tentatives par tool
  timeoutMs: 10000         // Timeout par tool call
};
```

### 2. **Configuration Groq**

```typescript
const DEFAULT_GROQ_CONFIG: GroqConfig = {
  model: 'gpt-4o-mini',
  maxTokens: 4000,
  temperature: 0.7,
  parallelToolCalls: true,    // ✅ Tool calls parallèles
  reasoningEffort: 'medium',  // Effort de raisonnement
  serviceTier: 'fast'         // Niveau de service
};
```

## 🎨 Interface Utilisateur

### 1. **Gestion des Tool Calls dans le Chat**

```typescript
// Dans ChatFullscreenV2.handleToolCalls()
const handleToolCalls = useCallback(async (toolCalls: any[], toolName: string) => {
  // Vérification d'authentification
  if (!user) {
    await addMessage({
      role: 'assistant',
      content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
      timestamp: new Date().toISOString()
    }, { persist: false });
    return;
  }

  // Ajout des tool calls au debugger
  addToolCalls(toolCalls);
  
  // Ajout du message assistant avec tool calls
  await addMessage({
    role: 'assistant',
    content: null,
    tool_calls: toolCalls,
    timestamp: new Date().toISOString()
  });
}, [addMessage, user, addToolCalls]);
```

### 2. **Gestion des Tool Results**

```typescript
// Dans ChatFullscreenV2.handleToolResult()
const handleToolResult = useCallback(async (
  toolName: string,
  result: any,
  success: boolean,
  toolCallId: string
) => {
  // Mise à jour du debugger
  updateToolResult(toolCallId, result, success);
  
  // Ajout du message tool
  await addMessage({
    role: 'tool',
    content: JSON.stringify(result),
    tool_call_id: toolCallId,
    name: toolName,
    timestamp: new Date().toISOString()
  });
}, [addMessage, updateToolResult]);
```

## 🔍 Debugging et Monitoring

### 1. **Logs Détaillés**

```typescript
// Logs de séquence pour debugging
logger.dev(`[GroqOrchestrator] 🔧 Tools (callLLM):`, {
  toolsCount: tools.length,
  toolNames: tools.slice(0, 5).map(t => t.function?.name || 'unknown')
});

logger.dev(`[GroqOrchestrator] 📥 Provider response:`, {
  hasContent: !!response?.content,
  contentLength: response?.content?.length || 0,
  hasToolCalls: !!(response as any)?.tool_calls,
  toolCallsCount: (response as any)?.tool_calls?.length || 0,
  traceId
});
```

### 2. **Traçabilité**

```typescript
// Trace ID unique pour chaque round
const traceId = `trace-${sessionId}-${startTime}`;

// Logs avec trace ID pour suivi
logger.info(`[GroqOrchestrator] 🚀 round start s=${sessionId} trace=${traceId}`);
```

## 🚀 Avantages de l'Architecture

### 1. **Robustesse**
- Gestion des erreurs avec retry automatique
- Circuit breaker pour éviter les boucles infinies
- Timeout sur les tool calls

### 2. **Performance**
- Exécution parallèle des tool calls
- Limite de relances pour éviter les chaînages excessifs
- Arrêt intelligent basé sur la qualité de réponse

### 3. **Cohérence**
- Persistance atomique des tool calls
- Thread DB comme source de vérité
- Isolation stricte entre sessions

### 4. **Maintenabilité**
- Architecture modulaire avec séparation des responsabilités
- Types TypeScript stricts
- Logs détaillés pour debugging

### 5. **Sécurité**
- Validation stricte des tool calls
- Tokens d'authentification requis
- Isolation des sessions utilisateur

## 📊 Métriques et Monitoring

### 1. **Métriques de Performance**
- Nombre de tool calls par round
- Temps d'exécution des tools
- Taux de succès des tool calls
- Nombre de relances nécessaires

### 2. **Métriques de Qualité**
- Ratio relances/résultats
- Taux d'arrêt intelligent
- Taux d'utilisation du circuit breaker

### 3. **Logs de Séquence**
- Séquence claire des messages
- Multi-tool enchaînement sans confusion
- Pas de réordre ni de doublons

## 🔮 Évolutions Futures

### 1. **Optimisations Possibles**
- Cache des résultats de tool calls
- Prédiction des tool calls nécessaires
- Optimisation des prompts système

### 2. **Nouvelles Fonctionnalités**
- Support de nouveaux modèles Groq
- Tool calls conditionnels
- Streaming des tool results

### 3. **Monitoring Avancé**
- Dashboard de métriques en temps réel
- Alertes sur les performances
- Analyse prédictive des erreurs

---

*Ce document est maintenu à jour avec l'évolution du système. Pour toute question ou suggestion d'amélioration, consultez l'équipe de développement.*
