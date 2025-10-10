# 🧠 Orchestrateur Agentique V2 - Style Claude/ChatGPT

## 🎯 Objectif

Implémenter un orchestrateur qui réplique la stratégie de Claude pour les tool calls :
- **Thinking interleaved** : Réflexion entre chaque outil
- **Communication transparente** : Expliquer ce qu'on fait
- **Gestion d'erreurs** : Retry intelligent avec fallback
- **Enchainement** : Continuer jusqu'à la fin de la tâche
- **Parallélisation** : Appels simultanés quand possible

## 📊 Comparaison : Actuel vs V2

### Version Actuelle (SimpleChatOrchestrator)

```typescript
while (toolCallsCount < maxToolCalls) {
  // 1. Appeler le LLM
  response = await this.callLLM(...);
  
  // 2. Exécuter les tools
  toolResults = await this.toolExecutor.executeSimple(toolCalls);
  
  // 3. Injecter dans l'historique
  updatedHistory = this.historyBuilder.buildSecondCallHistory(...);
  
  // 4. Recommencer
}
```

**Limitations :**
- ❌ Pas de thinking entre les outils
- ❌ Pas de communication en temps réel
- ❌ Retry basique (juste réinjecter l'erreur)
- ❌ Pas de parallélisation
- ❌ Pas de stratégie de fallback

### Version V2 (AgenticOrchestrator)

```typescript
while (toolCallsCount < maxToolCalls) {
  // 1. Appeler le LLM
  response = await this.callLLM(...);
  
  // 2. 🧠 THINKING : Analyser la réponse
  const analysis = this.analyzeResponse(response);
  await this.streamThinking(analysis); // Communiquer en temps réel
  
  // 3. 🔀 PARALLÉLISATION : Identifier les outils indépendants
  const { parallel, sequential } = this.categorizeToolCalls(toolCalls);
  
  // 4. ⚡ Exécuter en parallèle
  const parallelResults = await Promise.allSettled(
    parallel.map(tc => this.executeWithRetry(tc))
  );
  
  // 5. 🔁 RETRY : Gestion intelligente des erreurs
  const failedCalls = this.extractFailedCalls(parallelResults);
  if (failedCalls.length > 0) {
    await this.retryWithFallback(failedCalls);
  }
  
  // 6. 📝 Exécuter les séquentiels
  for (const tc of sequential) {
    await this.executeWithRetry(tc);
  }
  
  // 7. 💬 COMMUNICATION : Expliquer ce qu'on a fait
  await this.streamProgress(toolResults);
  
  // 8. Recommencer
}
```

## 🚀 Implémentation

### 1. Types améliorés

```typescript
// src/services/llm/types/agenticTypes.ts

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
  timestamp: string;
}

export interface ProgressUpdate {
  type: 'progress';
  action: string;
  tool?: string;
  status: 'started' | 'completed' | 'failed';
  timestamp: string;
}

export interface ToolCallStrategy {
  parallel: ToolCall[]; // Outils indépendants
  sequential: ToolCall[]; // Outils dépendants
}

export interface RetryStrategy {
  maxRetries: number;
  backoff: 'linear' | 'exponential';
  fallbackTools?: Record<string, string>; // tool -> fallback tool
}

export interface AgenticResponse {
  success: boolean;
  content: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  thinking: ThinkingBlock[];
  progress: ProgressUpdate[];
  reasoning?: string;
  error?: string;
}
```

### 2. Orchestrateur V2

```typescript
// src/services/llm/services/AgenticOrchestrator.ts

import { GroqProvider, LLMResponse } from '../providers/implementations/groq';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { GroqHistoryBuilder } from './GroqHistoryBuilder';
import { simpleLogger as logger } from '@/utils/logger';
import { 
  ThinkingBlock, 
  ProgressUpdate, 
  ToolCallStrategy,
  RetryStrategy,
  AgenticResponse 
} from '../types/agenticTypes';
import { ChatContext } from './SimpleChatOrchestrator';

export class AgenticOrchestrator {
  private toolExecutor: SimpleToolExecutor;
  private historyBuilder: GroqHistoryBuilder;
  private thinkingBlocks: ThinkingBlock[] = [];
  private progressUpdates: ProgressUpdate[] = [];

  constructor(
    private retryStrategy: RetryStrategy = {
      maxRetries: 3,
      backoff: 'exponential',
      fallbackTools: {
        'mcp_Notion_notion-fetch': 'searchContent', // Exemple de fallback
        'executeAgent': 'searchContent'
      }
    }
  ) {
    this.toolExecutor = new SimpleToolExecutor();
    this.historyBuilder = new GroqHistoryBuilder(DEFAULT_GROQ_LIMITS);
  }

  /**
   * 🧠 THINKING : Analyser la réponse du LLM
   */
  private async analyzeResponse(response: LLMResponse): Promise<ThinkingBlock> {
    const thinking: ThinkingBlock = {
      type: 'thinking',
      content: this.generateThinking(response),
      timestamp: new Date().toISOString()
    };
    
    this.thinkingBlocks.push(thinking);
    return thinking;
  }

  /**
   * Génère un bloc de thinking basé sur la réponse
   */
  private generateThinking(response: LLMResponse): string {
    const toolCalls = response.tool_calls || [];
    
    if (toolCalls.length === 0) {
      return "Le LLM a décidé de fournir une réponse finale sans utiliser d'outils.";
    }
    
    const toolNames = toolCalls.map(tc => tc.function.name).join(', ');
    const strategy = this.categorizeToolCalls(toolCalls);
    
    let thinking = `Le LLM a demandé ${toolCalls.length} outil(s) : ${toolNames}.\n\n`;
    
    if (strategy.parallel.length > 0) {
      thinking += `✅ ${strategy.parallel.length} appel(s) peuvent être exécutés en parallèle pour optimiser la performance.\n`;
    }
    
    if (strategy.sequential.length > 0) {
      thinking += `⏭️ ${strategy.sequential.length} appel(s) doivent être exécutés séquentiellement car ils ont des dépendances.\n`;
    }
    
    return thinking;
  }

  /**
   * 🔀 PARALLÉLISATION : Catégoriser les tool calls
   */
  private categorizeToolCalls(toolCalls: ToolCall[]): ToolCallStrategy {
    // Règles de dépendance : 
    // - Les opérations de lecture peuvent être parallèles
    // - Les opérations d'écriture doivent être séquentielles
    // - Si un tool dépend du résultat d'un autre, séquentiel
    
    const readOperations = new Set([
      'getNote', 'getClasseur', 'getFolder', 'searchContent',
      'mcp_Notion_notion-fetch', 'mcp_Notion_notion-search',
      'mcp_supabase_execute_sql'
    ]);
    
    const writeOperations = new Set([
      'createNote', 'updateNote', 'deleteNote',
      'mcp_Notion_notion-create-pages', 'mcp_Notion_notion-update-page',
      'mcp_supabase_apply_migration'
    ]);
    
    const parallel: ToolCall[] = [];
    const sequential: ToolCall[] = [];
    
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      
      // Les lectures sont parallélisables
      if (readOperations.has(toolName)) {
        parallel.push(tc);
      } 
      // Les écritures sont séquentielles
      else if (writeOperations.has(toolName)) {
        sequential.push(tc);
      }
      // Par défaut, considérer comme parallélisable
      else {
        parallel.push(tc);
      }
    }
    
    return { parallel, sequential };
  }

  /**
   * 🔁 RETRY : Exécuter un tool avec retry intelligent
   */
  private async executeWithRetry(
    toolCall: ToolCall,
    userToken: string,
    sessionId: string,
    retryCount = 0
  ): Promise<ToolResult> {
    try {
      this.emitProgress('started', toolCall.function.name);
      
      const results = await this.toolExecutor.executeSimple(
        [toolCall],
        userToken,
        sessionId
      );
      
      const result = results[0];
      
      if (result.success) {
        this.emitProgress('completed', toolCall.function.name);
        return result;
      }
      
      // ❌ Échec, tenter un retry
      if (retryCount < this.retryStrategy.maxRetries) {
        logger.warn(`[AgenticOrchestrator] ⚠️ Tool ${toolCall.function.name} failed, retrying (${retryCount + 1}/${this.retryStrategy.maxRetries})`);
        
        // Backoff
        const delay = this.calculateBackoff(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeWithRetry(toolCall, userToken, sessionId, retryCount + 1);
      }
      
      // ❌ Max retries atteint, tenter un fallback
      const fallbackTool = this.retryStrategy.fallbackTools?.[toolCall.function.name];
      if (fallbackTool) {
        logger.warn(`[AgenticOrchestrator] 🔄 Using fallback tool: ${fallbackTool}`);
        
        const fallbackCall: ToolCall = {
          ...toolCall,
          function: {
            ...toolCall.function,
            name: fallbackTool
          }
        };
        
        return this.executeWithRetry(fallbackCall, userToken, sessionId, 0);
      }
      
      // ❌ Aucun fallback, retourner l'erreur
      this.emitProgress('failed', toolCall.function.name);
      return result;
      
    } catch (error) {
      logger.error(`[AgenticOrchestrator] ❌ Error executing ${toolCall.function.name}:`, error);
      
      this.emitProgress('failed', toolCall.function.name);
      
      return {
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }),
        success: false
      };
    }
  }

  /**
   * Calculer le délai de backoff
   */
  private calculateBackoff(retryCount: number): number {
    if (this.retryStrategy.backoff === 'exponential') {
      return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
    }
    return 1000 * (retryCount + 1); // Linear
  }

  /**
   * 💬 COMMUNICATION : Émettre une mise à jour de progression
   */
  private emitProgress(status: 'started' | 'completed' | 'failed', tool: string): void {
    const update: ProgressUpdate = {
      type: 'progress',
      action: status === 'started' ? `Exécution de ${tool}...` 
            : status === 'completed' ? `✅ ${tool} terminé`
            : `❌ ${tool} a échoué`,
      tool,
      status,
      timestamp: new Date().toISOString()
    };
    
    this.progressUpdates.push(update);
    logger.dev(`[AgenticOrchestrator] 📝 ${update.action}`);
  }

  /**
   * 🚀 MAIN : Traiter un message avec la stratégie agentique complète
   */
  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<AgenticResponse> {
    const maxToolCalls = context.maxToolCalls ?? 10; // Augmenté pour les tâches complexes
    let toolCallsCount = 0;
    
    // Reset des états
    this.thinkingBlocks = [];
    this.progressUpdates = [];
    
    const llmProvider = this.createProviderFromAgent(context.agentConfig);
    
    let currentMessage = message;
    let updatedHistory = [...history];
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let isFirstPass = true;

    try {
      while (toolCallsCount < maxToolCalls) {
        // 1️⃣ Appeler le LLM
        logger.info(`[AgenticOrchestrator] 🤖 Appel LLM (iteration ${toolCallsCount + 1}/${maxToolCalls})`);
        
        let response: LLMResponse;
        try {
          response = await this.callLLM(currentMessage, updatedHistory, context, 'auto', llmProvider);
        } catch (llmError) {
          logger.error(`[AgenticOrchestrator] ❌ Erreur LLM:`, llmError);
          
          if (toolCallsCount === 0) throw llmError;
          
          // Injecter l'erreur et retry
          updatedHistory.push({
            id: `msg-error-${Date.now()}`,
            role: 'system',
            content: `⚠️ Erreur LLM: ${llmError instanceof Error ? llmError.message : String(llmError)}\n\nRéessaye avec une approche plus simple.`,
            timestamp: new Date().toISOString()
          });
          
          toolCallsCount++;
          continue;
        }
        
        const newToolCalls = this.convertToolCalls(response.tool_calls || []);
        
        // ✅ Terminé ?
        if (newToolCalls.length === 0) {
          logger.info(`[AgenticOrchestrator] ✅ LLM a terminé`);
          return {
            success: true,
            content: response.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            thinking: this.thinkingBlocks,
            progress: this.progressUpdates,
            reasoning: response.reasoning
          };
        }
        
        // 2️⃣ 🧠 THINKING : Analyser la stratégie
        const thinking = await this.analyzeResponse(response);
        logger.dev(`[AgenticOrchestrator] 🧠 ${thinking.content}`);
        
        // 3️⃣ Déduplication
        const dedupedToolCalls = this.deduplicateToolCalls(newToolCalls, allToolCalls);
        
        if (dedupedToolCalls.length === 0) {
          logger.warn(`[AgenticOrchestrator] ⚠️ Tous les tools sont des doublons`);
          const finalResponse = await this.callLLM(
            "Tu as déjà appelé ces outils. Donne ta réponse finale basée sur les résultats précédents.",
            updatedHistory,
            context,
            'auto',
            llmProvider
          );
          return {
            success: true,
            content: finalResponse.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            thinking: this.thinkingBlocks,
            progress: this.progressUpdates,
            reasoning: finalResponse.reasoning
          };
        }
        
        // 4️⃣ 🔀 PARALLÉLISATION : Catégoriser les outils
        const strategy = this.categorizeToolCalls(dedupedToolCalls);
        logger.dev(`[AgenticOrchestrator] 🔀 Stratégie: ${strategy.parallel.length} parallèle(s), ${strategy.sequential.length} séquentiel(s)`);
        
        // 5️⃣ ⚡ Exécuter en parallèle
        const parallelResults = await Promise.allSettled(
          strategy.parallel.map(tc => 
            this.executeWithRetry(tc, context.userToken, context.sessionId)
          )
        );
        
        const parallelToolResults = parallelResults.map((result, idx) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            logger.error(`[AgenticOrchestrator] ❌ Parallel tool failed:`, result.reason);
            return {
              tool_call_id: strategy.parallel[idx].id,
              name: strategy.parallel[idx].function.name,
              content: JSON.stringify({ error: String(result.reason) }),
              success: false
            };
          }
        });
        
        // 6️⃣ 📝 Exécuter en séquentiel
        const sequentialToolResults: ToolResult[] = [];
        for (const tc of strategy.sequential) {
          const result = await this.executeWithRetry(tc, context.userToken, context.sessionId);
          sequentialToolResults.push(result);
        }
        
        // 7️⃣ Collecter tous les résultats
        const toolResults = [...parallelToolResults, ...sequentialToolResults];
        allToolCalls.push(...dedupedToolCalls);
        allToolResults.push(...toolResults);
        
        // 8️⃣ 💬 Log du résumé
        const successCount = toolResults.filter(r => r.success).length;
        const failedCount = toolResults.filter(r => !r.success).length;
        logger.info(`[AgenticOrchestrator] 📊 Résultats: ${successCount} succès, ${failedCount} échec(s)`);
        
        // 9️⃣ Injecter dans l'historique
        const historyContext = {
          systemContent: '',
          userMessage: isFirstPass ? message : '',
          cleanedHistory: updatedHistory,
          toolCalls: dedupedToolCalls,
          toolResults: toolResults.map(r => ({ ...r, timestamp: new Date().toISOString() }))
        };
        
        const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
        updatedHistory = historyResult.messages;
        
        toolCallsCount++;
        currentMessage = '';
        isFirstPass = false;
      }
      
      // 🔟 Max iterations
      logger.warn(`[AgenticOrchestrator] ⚠️ Max iterations (${maxToolCalls}) atteint`);
      const finalResponse = await this.callLLM(
        "Maximum d'itérations atteint. Donne ta réponse finale basée sur ce que tu as accompli.",
        updatedHistory,
        context,
        'auto',
        llmProvider
      );
      
      return {
        success: true,
        content: finalResponse.content,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        thinking: this.thinkingBlocks,
        progress: this.progressUpdates,
        reasoning: finalResponse.reasoning
      };
      
    } catch (error) {
      logger.error(`[AgenticOrchestrator] ❌ Erreur fatale:`, error);
      
      return {
        success: false,
        content: `Erreur lors du traitement: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        thinking: this.thinkingBlocks,
        progress: this.progressUpdates,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // ... (Autres méthodes identiques à SimpleChatOrchestrator)
  
  private createProviderFromAgent(agentConfig?: AgentTemplateConfig): GroqProvider {
    // Identique
  }
  
  private async callLLM(...): Promise<LLMResponse> {
    // Identique
  }
  
  private deduplicateToolCalls(...): ToolCall[] {
    // Identique
  }
  
  private getToolCallKey(toolCall: ToolCall): string {
    // Identique
  }
  
  private convertToolCalls(rawToolCalls: any[]): ToolCall[] {
    // Identique
  }
}

export const agenticOrchestrator = new AgenticOrchestrator();
```

## 📈 Avantages de la V2

### 1. **Thinking Interleaved**
```typescript
// Avant (V1)
response = await this.callLLM(...);
toolResults = await executeTools(...);

// Après (V2)
response = await this.callLLM(...);
thinking = await this.analyzeResponse(response); // 🧠 Analyse
strategy = this.categorizeToolCalls(response.tool_calls); // 🔀 Planification
toolResults = await executeToolsInParallel(strategy.parallel); // ⚡ Exécution
```

### 2. **Communication Transparente**
```typescript
// Chaque étape est loggée et peut être streamée
this.emitProgress('started', 'getNote');
// ... exécution ...
this.emitProgress('completed', 'getNote');

// Le frontend peut afficher en temps réel :
// "🔧 Exécution de getNote..."
// "✅ getNote terminé"
```

### 3. **Retry Intelligent**
```typescript
// V1 : Erreur → Message dans l'historique
// V2 : Erreur → Retry (3x) → Fallback → Message

try {
  return await execute(tool);
} catch {
  if (retryCount < 3) {
    await sleep(backoff);
    return retry(tool, retryCount + 1);
  }
  if (fallbackExists(tool)) {
    return execute(fallback(tool));
  }
  return error;
}
```

### 4. **Parallélisation**
```typescript
// V1 : Séquentiel (lent)
for (const tool of tools) {
  results.push(await execute(tool));
}

// V2 : Parallèle (rapide)
const results = await Promise.allSettled(
  tools.map(t => execute(t))
);
```

### 5. **Enchainement Robuste**
```typescript
// V1 : S'arrête à la première erreur majeure
// V2 : Continue même avec des erreurs partielles

const successfulResults = results.filter(r => r.success);
const failedResults = results.filter(r => !r.success);

// Continue avec les résultats réussis
if (successfulResults.length > 0) {
  injectIntoHistory(successfulResults);
  continue; // Demander au LLM de gérer les échecs
}
```

## 🎯 Plan de Migration

### Phase 1 : Types (10 min)
1. Créer `src/services/llm/types/agenticTypes.ts`
2. Ajouter `ThinkingBlock`, `ProgressUpdate`, `ToolCallStrategy`, `RetryStrategy`

### Phase 2 : Orchestrateur (30 min)
1. Créer `src/services/llm/services/AgenticOrchestrator.ts`
2. Copier depuis `SimpleChatOrchestrator.ts`
3. Ajouter les méthodes : `analyzeResponse`, `categorizeToolCalls`, `executeWithRetry`, `emitProgress`

### Phase 3 : Tests (20 min)
1. Tester avec quelques tool calls simples
2. Tester la parallélisation
3. Tester le retry/fallback

### Phase 4 : Intégration (10 min)
1. Remplacer `simpleChatOrchestrator` par `agenticOrchestrator` dans `groqGptOss120b.ts`
2. Adapter le type de retour si nécessaire

## ✅ Résultat Attendu

```typescript
// Avant : LLM → Tools → LLM → Tools → Réponse (lent, peu robuste)
// Après : LLM → 🧠 Thinking → 🔀 Planification → ⚡ Parallélisation → 🔁 Retry → 💬 Communication → LLM → Réponse

// Exemple de log :
// [AgenticOrchestrator] 🤖 Appel LLM (iteration 1/10)
// [AgenticOrchestrator] 🧠 Le LLM a demandé 3 outils : getNote, getClasseur, searchContent
// [AgenticOrchestrator] 🔀 Stratégie: 3 parallèle(s), 0 séquentiel(s)
// [AgenticOrchestrator] 📝 Exécution de getNote...
// [AgenticOrchestrator] 📝 Exécution de getClasseur...
// [AgenticOrchestrator] 📝 Exécution de searchContent...
// [AgenticOrchestrator] 📝 ✅ getNote terminé
// [AgenticOrchestrator] 📝 ✅ getClasseur terminé
// [AgenticOrchestrator] 📝 ✅ searchContent terminé
// [AgenticOrchestrator] 📊 Résultats: 3 succès, 0 échec(s)
// [AgenticOrchestrator] ✅ LLM a terminé
```

## 🔥 Next Steps

1. **Streaming** : Stream les `ThinkingBlock` et `ProgressUpdate` vers le frontend
2. **Cache** : Mettre en cache les résultats des tools pour éviter les appels redondants
3. **Priorité** : Ajouter un système de priorité pour les tools (critique > important > optionnel)
4. **Timeout** : Ajouter des timeouts par tool
5. **Métriques** : Logger les temps d'exécution, taux de succès, etc.

---

**TL;DR** : L'AgenticOrchestrator V2 transforme ton système de tool calls basique en une machine de guerre qui réfléchit, planifie, parallélise, retry intelligemment, et communique de manière transparente. Exactement comme je fonctionne. 🚀

