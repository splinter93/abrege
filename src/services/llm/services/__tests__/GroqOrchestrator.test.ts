import { GroqOrchestrator } from '../GroqOrchestrator';
import { DEFAULT_GROQ_LIMITS } from '../../types/groqTypes';

// Mock des dépendances
jest.mock('../GroqHistoryBuilder');
jest.mock('../GroqToolExecutor');
jest.mock('../GroqErrorHandler');
jest.mock('@/services/chatHistoryCleaner');
jest.mock('@/services/agentApiV2Tools');

describe('GroqOrchestrator', () => {
  let orchestrator: GroqOrchestrator;
  let mockHistoryBuilder: any;
  let mockToolExecutor: any;
  let mockErrorHandler: any;

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();
    
    // Créer l'orchestrateur
    orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
    
    // Récupérer les instances mockées
    mockHistoryBuilder = (orchestrator as any).historyBuilder;
    mockToolExecutor = (orchestrator as any).toolExecutor;
    mockErrorHandler = (orchestrator as any).errorHandler;
  });

  describe('executeRound', () => {
    const mockParams = {
      message: 'Test message',
      appContext: { type: 'chat_session' as const, name: 'test', id: '123', content: '' },
      sessionHistory: [],
      agentConfig: {},
      userToken: 'test-token',
      sessionId: 'test-session'
    };

    it('should execute a complete round successfully', async () => {
      // Mock des réponses
      const mockFirstResponse = { content: 'Test response', tool_calls: [] };
      const mockSecondResponse = { content: 'Final response' };
      
      // Mock des méthodes
      jest.spyOn(orchestrator as any, 'executeFirstCall').mockResolvedValue(mockFirstResponse);
      jest.spyOn(orchestrator as any, 'executeSecondCall').mockResolvedValue(mockSecondResponse);
      jest.spyOn(orchestrator as any, 'createDirectResponse').mockReturnValue({
        success: true,
        content: 'Test response',
        sessionId: 'test-session'
      });

      // Exécuter
      const result = await orchestrator.executeRound(mockParams);

      // Vérifications
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('test-session');
    });

    it('should handle tool calls correctly', async () => {
      // Mock des réponses avec tool calls
      const mockFirstResponse = { 
        content: 'Test response', 
        tool_calls: [{ id: '1', function: { name: 'test', arguments: '{}' } }] 
      };
      const mockToolResults = [{ tool_call_id: '1', name: 'test', success: true }];
      const mockSecondResponse = { content: 'Final response' };
      
      // Mock des méthodes
      jest.spyOn(orchestrator as any, 'executeFirstCall').mockResolvedValue(mockFirstResponse);
      jest.spyOn(orchestrator as any, 'executeTools').mockResolvedValue(mockToolResults);
      jest.spyOn(orchestrator as any, 'executeSecondCall').mockResolvedValue(mockSecondResponse);
      jest.spyOn(orchestrator as any, 'processFinalResponse').mockReturnValue({
        success: true,
        content: 'Final response',
        sessionId: 'test-session',
        is_relance: true
      });

      // Exécuter
      const result = await orchestrator.executeRound(mockParams);

      // Vérifications
      expect(result.success).toBe(true);
      expect(result.is_relance).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock d'une erreur
      const mockError = new Error('Test error');
      jest.spyOn(orchestrator as any, 'executeFirstCall').mockRejectedValue(mockError);

      // Exécuter
      const result = await orchestrator.executeRound(mockParams);

      // Vérifications
      expect(result.success).toBe(false);
      expect(result.error).toBe('Erreur interne du serveur');
      expect(result.details).toBe('Test error');
    });
  });

  describe('configuration', () => {
    it('should use default limits', () => {
      expect(DEFAULT_GROQ_LIMITS.maxToolCalls).toBe(10);
      expect(DEFAULT_GROQ_LIMITS.maxRelances).toBe(2);
      expect(DEFAULT_GROQ_LIMITS.maxContextMessages).toBe(25);
      expect(DEFAULT_GROQ_LIMITS.maxHistoryMessages).toBe(40);
    });

    it('should allow custom limits', () => {
      const customLimits = {
        maxToolCalls: 5,
        maxRelances: 1,
        maxContextMessages: 15,
        maxHistoryMessages: 30
      };
      
      const customOrchestrator = new GroqOrchestrator(customLimits);
      expect((customOrchestrator as any).limits).toEqual(customLimits);
    });
  });
}); 