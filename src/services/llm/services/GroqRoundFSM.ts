import type { 
  RoundState, 
  RoundContext, 
  FSMConfig, 
  RoundData,
  RoundMetrics,
  GroqRoundResult
} from '../types/groqTypes';
import type { LLMResponse, ToolResult } from '../types/strictTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Machine à états finis pour l'orchestration des rounds Groq
 * Garantit une séquence stricte : CALL_MODEL_1 → EXECUTE_TOOLS → PERSIST → RELOAD → CALL_MODEL_2
 */
export class GroqRoundFSM {
  private config: FSMConfig;
  private context: RoundContext;
  private data: RoundData;
  private metrics: RoundMetrics;
  private stateHandlers: Map<RoundState, () => Promise<RoundState>>;

  constructor(sessionId: string, config: FSMConfig) {
    this.config = config;
    this.context = this.createInitialContext(sessionId);
    this.data = this.createInitialData();
    this.metrics = this.createInitialMetrics(sessionId);
    this.stateHandlers = this.createStateHandlers();
  }

  /**
   * Crée le contexte initial du round
   */
  private createInitialContext(sessionId: string): RoundContext {
    return {
      roundId: `round-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      currentState: 'IDLE',
      previousState: 'IDLE',
      stateHistory: [{ state: 'IDLE', timestamp: new Date().toISOString() }],
      lockAcquired: false,
      lockExpiresAt: new Date(Date.now() + this.config.lockTimeoutMs).toISOString()
    };
  }

  /**
   * Crée les données initiales du round
   */
  private createInitialData(): RoundData {
    return {
      userMessage: '',
      systemContent: '',
      firstResponse: null,
      toolCalls: [],
      toolResults: [],
      secondResponse: null,
      finalResult: {
        success: false,
        sessionId: '',
      } as GroqRoundResult
    };
  }

  /**
   * Crée les métriques initiales du round
   */
  private createInitialMetrics(sessionId: string): RoundMetrics {
    return {
      roundId: this.context.roundId,
      sessionId,
      startTime: new Date().toISOString(),
      toolCallsCount: 0,
      toolResultsCount: 0,
      stateTransitions: 0,
      errors: [],
      conflicts409: 0,
      appliedFalse: 0
    };
  }

  /**
   * Crée les gestionnaires d'états
   */
  private createStateHandlers(): Map<RoundState, () => Promise<RoundState>> {
    const handlers = new Map<RoundState, () => Promise<RoundState>>();
    
    handlers.set('IDLE', this.handleIdle.bind(this));
    handlers.set('CALL_MODEL_1', this.handleCallModel1.bind(this));
    handlers.set('EXECUTE_TOOLS', this.handleExecuteTools.bind(this));
    handlers.set('PERSIST_TOOLS_BATCH', this.handlePersistToolsBatch.bind(this));
    handlers.set('RELOAD_THREAD', this.handleReloadThread.bind(this));
    handlers.set('CALL_MODEL_2', this.handleCallModel2.bind(this));
    handlers.set('DONE', this.handleDone.bind(this));
    handlers.set('ERROR', this.handleError.bind(this));

    return handlers;
  }

  /**
   * Exécute la FSM avec les données fournies
   */
  async executeRound(userMessage: string, systemContent: string): Promise<RoundData> {
    try {
      logger.info(`[GroqRoundFSM] 🚀 Début du round ${this.context.roundId}`);
      
      // Initialiser les données
      this.data.userMessage = userMessage;
      this.data.systemContent = systemContent;

      // Démarrer la FSM
      await this.transitionTo('CALL_MODEL_1');

      // Exécuter la séquence d'états
      while (this.context.currentState !== 'DONE' && this.context.currentState !== 'ERROR') {
        const nextState = await this.executeCurrentState();
        await this.transitionTo(nextState);
      }

      if (this.context.currentState === 'ERROR') {
        throw new Error(`Round terminé avec erreur: ${this.metrics.errors.join(', ')}`);
      }

      logger.info(`[GroqRoundFSM] ✅ Round ${this.context.roundId} terminé avec succès`);
      return this.data;

    } catch (error) {
      logger.error(`[GroqRoundFSM] ❌ Erreur dans le round ${this.context.roundId}:`, error);
      await this.transitionTo('ERROR');
      throw error;
    }
  }

  /**
   * Exécute l'état actuel et retourne le prochain état
   */
  private async executeCurrentState(): Promise<RoundState> {
    const handler = this.stateHandlers.get(this.context.currentState);
    if (!handler) {
      throw new Error(`Aucun gestionnaire pour l'état ${this.context.currentState}`);
    }

    try {
      logger.dev(`[GroqRoundFSM] 🔄 Exécution de l'état ${this.context.currentState}`);
      const nextState = await handler();
      return nextState;
    } catch (error) {
      logger.error(`[GroqRoundFSM] ❌ Erreur dans l'état ${this.context.currentState}:`, error);
      this.metrics.errors.push(`${this.context.currentState}: ${error}`);
      return 'ERROR';
    }
  }

  /**
   * Transition vers un nouvel état
   */
  private async transitionTo(newState: RoundState): Promise<void> {
    // Validation des transitions
    if (!this.isValidTransition(this.context.currentState, newState)) {
      throw new Error(`Transition invalide: ${this.context.currentState} → ${newState}`);
    }

    // Mettre à jour le contexte
    this.context.previousState = this.context.currentState;
    this.context.currentState = newState;
    this.context.stateHistory.push({ 
      state: newState, 
      timestamp: new Date().toISOString() 
    });

    // Mettre à jour les métriques
    this.metrics.stateTransitions++;

    logger.dev(`[GroqRoundFSM] 🔄 Transition: ${this.context.previousState} → ${newState}`);
  }

  /**
   * Valide une transition d'état
   */
  private isValidTransition(from: RoundState, to: RoundState): boolean {
    const validTransitions: Record<RoundState, RoundState[]> = {
      'IDLE': ['CALL_MODEL_1', 'ERROR'],
      'CALL_MODEL_1': ['EXECUTE_TOOLS', 'DONE', 'ERROR'],
      'EXECUTE_TOOLS': ['PERSIST_TOOLS_BATCH', 'ERROR'],
      'PERSIST_TOOLS_BATCH': ['RELOAD_THREAD', 'ERROR'],
      'RELOAD_THREAD': ['CALL_MODEL_2', 'ERROR'],
      'CALL_MODEL_2': ['DONE', 'ERROR'],
      'DONE': [],
      'ERROR': []
    };

    return validTransitions[from]?.includes(to) || false;
  }

  // 🎯 GESTIONNAIRES D'ÉTATS

  /**
   * État IDLE - Attente
   */
  private async handleIdle(): Promise<RoundState> {
    // Cet état ne devrait jamais être exécuté directement
    throw new Error('État IDLE ne peut pas être exécuté');
  }

  /**
   * État CALL_MODEL_1 - Premier appel au modèle
   */
  private async handleCallModel1(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 🚀 Premier appel au modèle`);
    
    // Simulation de l'appel au modèle (sera injecté par l'orchestrateur)
    // this.data.firstResponse = await this.callModel1();
    
    // Vérifier s'il y a des tool calls
    if (this.data.toolCalls && this.data.toolCalls.length > 0) {
      this.metrics.toolCallsCount = this.data.toolCalls.length;
      logger.info(`[GroqRoundFSM] 🔧 ${this.metrics.toolCallsCount} tool calls détectés`);
      return 'EXECUTE_TOOLS';
    } else {
      logger.info(`[GroqRoundFSM] ✅ Réponse directe sans tools`);
      return 'DONE';
    }
  }

  /**
   * État EXECUTE_TOOLS - Exécution des tools
   */
  private async handleExecuteTools(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 🔧 Exécution des ${this.metrics.toolCallsCount} tools`);
    
    // Simulation de l'exécution des tools (sera injecté par l'orchestrateur)
    // this.data.toolResults = await this.executeTools(this.data.toolCalls);
    
    this.metrics.toolResultsCount = this.data.toolResults.length;
    logger.info(`[GroqRoundFSM] ✅ ${this.metrics.toolResultsCount} tools exécutés`);
    
    return 'PERSIST_TOOLS_BATCH';
  }

  /**
   * État PERSIST_TOOLS_BATCH - Persistance des résultats des tools
   */
  private async handlePersistToolsBatch(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 💾 Persistance des résultats des tools`);
    
    // Simulation de la persistance (sera injecté par l'orchestrateur)
    // await this.persistToolsBatch();
    
    logger.info(`[GroqRoundFSM] ✅ Résultats des tools persistés`);
    return 'RELOAD_THREAD';
  }

  /**
   * État RELOAD_THREAD - Rechargement du thread depuis la DB
   */
  private async handleReloadThread(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 🔄 Rechargement du thread depuis la DB`);
    
    // Simulation du rechargement (sera injecté par l'orchestrateur)
    // await this.reloadThread();
    
    logger.info(`[GroqRoundFSM] ✅ Thread rechargé depuis la DB`);
    return 'CALL_MODEL_2';
  }

  /**
   * État CALL_MODEL_2 - Second appel au modèle
   */
  private async handleCallModel2(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 🔄 Second appel au modèle avec les résultats des tools`);
    
    // Simulation du second appel (sera injecté par l'orchestrateur)
    // this.data.secondResponse = await this.callModel2();
    
    logger.info(`[GroqRoundFSM] ✅ Second appel au modèle terminé`);
    return 'DONE';
  }

  /**
   * État DONE - Round terminé avec succès
   */
  private async handleDone(): Promise<RoundState> {
    logger.info(`[GroqRoundFSM] 🎉 Round terminé avec succès`);
    
    // Finaliser les métriques
    this.metrics.endTime = new Date().toISOString();
    this.metrics.durationMs = Date.now() - new Date(this.metrics.startTime).getTime();
    
    return 'DONE';
  }

  /**
   * État ERROR - Round terminé avec erreur
   */
  private async handleError(): Promise<RoundState> {
    logger.error(`[GroqRoundFSM] 💥 Round terminé avec erreur`);
    
    // Finaliser les métriques d'erreur
    this.metrics.endTime = new Date().toISOString();
    this.metrics.durationMs = Date.now() - new Date(this.metrics.startTime).getTime();
    
    return 'ERROR';
  }

  // 🎯 MÉTHODES PUBLIQUES

  /**
   * Obtient le contexte actuel du round
   */
  getContext(): RoundContext {
    return { ...this.context };
  }

  /**
   * Obtient les données du round
   */
  getData(): RoundData {
    return { ...this.data };
  }

  /**
   * Obtient les métriques du round
   */
  getMetrics(): RoundMetrics {
    return { ...this.metrics };
  }

  /**
   * Vérifie si le round est terminé
   */
  isComplete(): boolean {
    return this.context.currentState === 'DONE' || this.context.currentState === 'ERROR';
  }

  /**
   * Vérifie si le round est en erreur
   */
  hasError(): boolean {
    return this.context.currentState === 'ERROR';
  }

  /**
   * Obtient l'état actuel
   */
  getCurrentState(): RoundState {
    return this.context.currentState;
  }

  /**
   * Force une transition vers un état (pour les tests)
   */
  forceTransition(state: RoundState): void {
    this.context.currentState = state;
    this.context.stateHistory.push({ 
      state, 
      timestamp: new Date().toISOString(),
      reason: 'forced'
    });
  }

  /**
   * Injecte des données externes (utilisé par l'orchestrateur)
   */
  injectData(data: Partial<RoundData>): void {
    this.data = { ...this.data, ...data };
  }

  /**
   * Injecte une réponse du premier appel
   */
  injectFirstResponse(response: LLMResponse): void {
    this.data.firstResponse = response;
    this.data.toolCalls = response.tool_calls || [];
  }

  /**
   * Injecte les résultats des tools
   */
  injectToolResults(results: ToolResult[]): void {
    this.data.toolResults = results;
  }

  /**
   * Injecte la réponse du second appel
   */
  injectSecondResponse(response: LLMResponse): void {
    this.data.secondResponse = response;
  }

  /**
   * Injecte le résultat final
   */
  injectFinalResult(result: GroqRoundResult): void {
    this.data.finalResult = result;
  }
} 