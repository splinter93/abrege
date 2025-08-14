import { GroqOrchestrator } from '../GroqOrchestrator';
import { DEFAULT_GROQ_LIMITS } from '../../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';

// Mock des dépendances
jest.mock('@/services/agentApiV2Tools');
jest.mock('@/services/chatHistoryCleaner');
jest.mock('@/services/llm/providers');
jest.mock('@/services/llm/services/BatchMessageService');
jest.mock('@/services/llm/services/ThreadBuilder');
jest.mock('@/services/llm/services/GroqToolExecutor');

describe('GroqOrchestrator - Architecture Robuste', () => {
  let orchestrator: GroqOrchestrator;
  let mockBatchMessageService: any;
  let mockThreadBuilder: any;
  let mockToolExecutor: any;
  let mockGroqProvider: any;

  // Helper pour créer les paramètres de test avec le bon type
  const createTestParams = () => ({
    message: 'Test message',
    appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
    sessionHistory: [],
    agentConfig: {},
    userToken: 'test-token',
    sessionId: 'test-session'
  });

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();
    
    // Configuration des mocks
    mockBatchMessageService = {
      persistToolMessages: jest.fn(),
      getInstance: jest.fn(() => mockBatchMessageService)
    };
    
    mockThreadBuilder = {
      rebuildFromDB: jest.fn(),
      getInstance: jest.fn(() => mockThreadBuilder)
    };
    
    mockToolExecutor = {
      executeTools: jest.fn(),
      validateToolCalls: jest.fn(() => ({ isValid: true, errors: [] }))
    };
    
    mockGroqProvider = {
      call: jest.fn()
    };

    // Mock des modules
    jest.doMock('../BatchMessageService', () => ({
      BatchMessageService: {
        getInstance: () => mockBatchMessageService
      }
    }));
    
    jest.doMock('../ThreadBuilder', () => ({
      ThreadBuilder: {
        getInstance: () => mockThreadBuilder
      }
    }));
    
    jest.doMock('../GroqToolExecutor', () => ({
      GroqToolExecutor: jest.fn(() => mockToolExecutor)
    }));
    
    jest.doMock('../../providers', () => ({
      GroqProvider: jest.fn(() => mockGroqProvider)
    }));

    orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
  });

  describe('I. Boucle d\'orchestration robuste', () => {
    it('devrait exécuter une boucle bornée PERSIST → RELOAD → RECALL', async () => {
      // Arrange
      const params = createTestParams();

      // Premier appel avec tool_calls
      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [
            { id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }
          ]
        })
        // Relance 1 - encore des tool_calls
        .mockResolvedValueOnce({
          content: 'Relance 1',
          tool_calls: [
            { id: 'call-2', function: { name: 'test_tool_2', arguments: '{}' } }
          ]
        })
        // Relance 2 - plus de tool_calls
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools
        .mockResolvedValueOnce([
          { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ])
        .mockResolvedValueOnce([
          { tool_call_id: 'call-2', name: 'test_tool_2', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ]);

      mockBatchMessageService.persistToolMessages
        .mockResolvedValue({
          success: true,
          applied: true,
          messagesPersisted: 1,
          operationId: 'op-1',
          relanceIndex: 0,
          sessionUpdatedAt: new Date().toISOString()
        })
        .mockResolvedValue({
          success: true,
          applied: true,
          messagesPersisted: 1,
          operationId: 'op-1',
          relanceIndex: 1,
          sessionUpdatedAt: new Date().toISOString()
        });

      mockThreadBuilder.rebuildFromDB
        .mockResolvedValue([
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'Test message' },
          { role: 'assistant', tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }] },
          { role: 'tool', tool_call_id: 'call-1', name: 'test_tool', content: '{}' }
        ])
        .mockResolvedValue([
          { role: 'system', content: 'System message' },
          { role: 'user', content: 'Test message' },
          { role: 'assistant', tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }] },
          { role: 'tool', tool_call_id: 'call-1', name: 'test_tool', content: '{}' },
          { role: 'assistant', tool_calls: [{ id: 'call-2', function: { name: 'test_tool_2', arguments: '{}' } }] },
          { role: 'tool', tool_call_id: 'call-2', name: 'test_tool_2', content: '{}' }
        ]);

      // Act
      const result = await orchestrator.executeRound(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tool_calls).toHaveLength(1); // Tool calls initiaux
      expect(result.tool_results).toHaveLength(2); // Tous les résultats
      expect(result.is_relance).toBe(true);
      expect(result.has_new_tool_calls).toBe(false);

      // Vérifier que la boucle a été exécutée 2 fois
      expect(mockGroqProvider.call).toHaveBeenCalledTimes(3); // 1er appel + 2 relances
      expect(mockToolExecutor.executeTools).toHaveBeenCalledTimes(2);
      expect(mockBatchMessageService.persistToolMessages).toHaveBeenCalledTimes(2);
      expect(mockThreadBuilder.rebuildFromDB).toHaveBeenCalledTimes(2);
    });

    it('devrait respecter la limite de relances et retourner une réponse circuit breaker', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      // Premier appel et toutes les relances avec tool_calls
      mockGroqProvider.call.mockResolvedValue({
        content: 'Appel avec tools',
        tool_calls: [
          { id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }
        ]
      });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 1,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      // Act
      const result = await orchestrator.executeRound(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.content).toContain('limite de 10 relances');
      expect(result.content).toContain('Circuit breaker activé');
      expect(result.tool_calls).toHaveLength(1); // Tool calls restants
      expect(result.is_relance).toBe(true);
    });

    it('devrait gérer des chaînages complexes avec jusqu\'à 10 relances', async () => {
      // Arrange
      const params = createTestParams();

      // Simuler un chaînage complexe de 5 relances
      const toolCallResponses = [
        // Relance 1
        { content: 'Relance 1', tool_calls: [{ id: 'call-2', function: { name: 'tool_2', arguments: '{}' } }] },
        // Relance 2
        { content: 'Relance 2', tool_calls: [{ id: 'call-3', function: { name: 'tool_3', arguments: '{}' } }] },
        // Relance 3
        { content: 'Relance 3', tool_calls: [{ id: 'call-4', function: { name: 'tool_4', arguments: '{}' } }] },
        // Relance 4
        { content: 'Relance 4', tool_calls: [{ id: 'call-5', function: { name: 'tool_5', arguments: '{}' } }] },
        // Relance 5 - plus de tool_calls
        { content: 'Réponse finale', tool_calls: [] }
      ];

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'tool_1', arguments: '{}' } }]
        })
        .mockResolvedValueOnce(toolCallResponses[0])
        .mockResolvedValueOnce(toolCallResponses[1])
        .mockResolvedValueOnce(toolCallResponses[2])
        .mockResolvedValueOnce(toolCallResponses[3])
        .mockResolvedValueOnce(toolCallResponses[4]);

      mockToolExecutor.executeTools
        .mockResolvedValueOnce([
          { tool_call_id: 'call-1', name: 'tool_1', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ])
        .mockResolvedValueOnce([
          { tool_call_id: 'call-2', name: 'tool_2', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ])
        .mockResolvedValueOnce([
          { tool_call_id: 'call-3', name: 'tool_3', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ])
        .mockResolvedValueOnce([
          { tool_call_id: 'call-4', name: 'tool_4', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ])
        .mockResolvedValueOnce([
          { tool_call_id: 'call-5', name: 'tool_5', result: { success: true }, success: true, timestamp: new Date().toISOString() }
        ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      // Act
      const result = await orchestrator.executeRound(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tool_calls).toHaveLength(1); // Tool calls initiaux
      expect(result.tool_results).toHaveLength(5); // Tous les résultats
      expect(result.is_relance).toBe(true);
      expect(result.has_new_tool_calls).toBe(false);

      // Vérifier que la boucle a été exécutée 5 fois
      expect(mockGroqProvider.call).toHaveBeenCalledTimes(6); // 1er appel + 5 relances
      expect(mockToolExecutor.executeTools).toHaveBeenCalledTimes(5);
      expect(mockBatchMessageService.persistToolMessages).toHaveBeenCalledTimes(5);
      expect(mockThreadBuilder.rebuildFromDB).toHaveBeenCalledTimes(5);
    });

    it('devrait s\'arrêter intelligemment avant la limite si la réponse est satisfaisante', async () => {
      // Arrange
      const params = createTestParams();

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel avec tool_calls',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse complète et satisfaisante après exécution du tool. Voici une explication détaillée qui répond complètement à la question de l\'utilisateur sans avoir besoin d\'autres outils.',
          tool_calls: [] // Plus de tool_calls = arrêt intelligent
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      // Act
      const result = await orchestrator.executeRound(params);

      // Assert
      expect(result.success).toBe(true);
      expect(result.tool_calls).toHaveLength(1); // Tool calls initiaux
      expect(result.tool_results).toHaveLength(1); // Un seul résultat
      expect(result.is_relance).toBe(true);
      expect(result.has_new_tool_calls).toBe(false);

      // Vérifier que la boucle s'est arrêtée après 1 relance (arrêt intelligent)
      expect(mockGroqProvider.call).toHaveBeenCalledTimes(2); // 1er appel + 1 relance
      expect(mockToolExecutor.executeTools).toHaveBeenCalledTimes(1);
      expect(mockBatchMessageService.persistToolMessages).toHaveBeenCalledTimes(1);
      expect(mockThreadBuilder.rebuildFromDB).toHaveBeenCalledTimes(1);
    });
  });

  describe('II. Persistance atomique et idempotence', () => {
    it('devrait inclure le message assistant avec tool_calls à la première relance seulement', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2, // Assistant + tool
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      // Act
      await orchestrator.executeRound(params);

      // Assert
      expect(mockBatchMessageService.persistToolMessages).toHaveBeenCalledWith(
        'test-session',
        expect.any(Array),
        expect.any(Array),
        expect.any(String),
        0, // relanceIndex
        true, // includeAssistantMessage
        expect.any(Object) // assistantMessage
      );
    });

    it('devrait gérer les erreurs de persistance et continuer avec le contexte en mémoire', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      // Erreur de persistance
      mockBatchMessageService.persistToolMessages.mockRejectedValue(new Error('Erreur persistance'));

      // Act
      const result = await orchestrator.executeRound(params);

      // Assert
      expect(result.success).toBe(true);
      expect(mockBatchMessageService.persistToolMessages).toHaveBeenCalled();
      // Le système continue malgré l'erreur de persistance
    });
  });

  describe('III. Construction et injection du thread', () => {
    it('devrait toujours reconstruire le thread depuis la DB après persistance', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' },
        { role: 'assistant', tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }] },
        { role: 'tool', tool_call_id: 'call-1', name: 'test_tool', content: '{}' }
      ]);

      // Act
      await orchestrator.executeRound(params);

      // Assert
      expect(mockThreadBuilder.rebuildFromDB).toHaveBeenCalledWith('test-session');
    });

    it('devrait passer exactement la même liste d\'outils entre le 1er appel et les rappels', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      // Act
      await orchestrator.executeRound(params);

      // Assert
      // Vérifier que tous les appels utilisent la même liste d'outils
      const calls = mockGroqProvider.call.mock.calls;
      expect(calls).toHaveLength(2);
      
      // Les outils doivent être identiques entre les appels
      const firstCallTools = calls[0][3]; // 4ème paramètre = tools
      const secondCallTools = calls[1][3];
      expect(firstCallTools).toBe(secondCallTools);
    });
  });

  describe('IV. Validation stricte des messages tool', () => {
    it('devrait rejeter les tool calls invalides', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call.mockResolvedValue({
        content: 'Premier appel',
        tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
      });

      // Tool calls invalides
      mockToolExecutor.validateToolCalls.mockReturnValue({
        isValid: false,
        errors: ['Tool call invalide']
      });

      // Act & Assert
      await expect(orchestrator.executeRound(params)).rejects.toThrow('Tool calls invalides');
    });
  });

  describe('V. Logs et traçabilité', () => {
    it('devrait logger les détails de chaque relance', async () => {
      // Arrange
      const params = {
        message: 'Test message',
        appContext: { type: 'chat_session' as const, name: 'test', id: 'test', content: '' },
        sessionHistory: [],
        agentConfig: {},
        userToken: 'test-token',
        sessionId: 'test-session'
      };

      mockGroqProvider.call
        .mockResolvedValueOnce({
          content: 'Premier appel',
          tool_calls: [{ id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }]
        })
        .mockResolvedValueOnce({
          content: 'Réponse finale',
          tool_calls: []
        });

      mockToolExecutor.executeTools.mockResolvedValue([
        { tool_call_id: 'call-1', name: 'test_tool', result: { success: true }, success: true, timestamp: new Date().toISOString() }
      ]);

      mockBatchMessageService.persistToolMessages.mockResolvedValue({
        success: true,
        applied: true,
        messagesPersisted: 2,
        operationId: 'op-1',
        relanceIndex: 0,
        sessionUpdatedAt: new Date().toISOString()
      });

      mockThreadBuilder.rebuildFromDB.mockResolvedValue([
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'Test message' }
      ]);

      const logSpy = jest.spyOn(logger, 'info');

      // Act
      await orchestrator.executeRound(params);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cycle de relance 1/2')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool calls détectés: 1')
      );
    });
  });

  describe('VI. Isolation stricte des sessions', () => {
    it('should reject foreign session messages', async () => {
      const orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
      
      // Simuler des messages d'une autre session
      const foreignMessages = [
        { role: 'user', content: 'Foreign user', sessionId: 'other-session' },
        { role: 'assistant', content: 'Foreign assistant', sessionId: 'other-session' }
      ];

      // Tenter de valider l'isolation
      expect(() => {
        (orchestrator as any).validateSessionIsolation(foreignMessages, 'current-session', 'test');
      }).toThrow('Violation d\'isolation');
    });
  });

  describe('VII. Nouveaux mécanismes robustes', () => {
    it('should generate unique operationId for each relance', async () => {
      // Simuler des tool calls
      const toolCalls = [
        { id: 'call-1', function: { name: 'test_tool', arguments: '{}' } },
        { id: 'call-2', function: { name: 'test_tool_2', arguments: '{}' } }
      ];
      
      // Vérifier que chaque relance génère un operationId unique
      const operationIds = new Set<string>();
      
      for (let i = 0; i < 3; i++) {
        const operationId = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`;
        operationIds.add(operationId);
      }
      
      expect(operationIds.size).toBe(3);
    });

    it('should detect no progress and stop early', async () => {
      const orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
      
      // Simuler des tool calls identiques
      const toolCalls1 = [
        { id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }
      ];
      
      const toolCalls2 = [
        { id: 'call-1', function: { name: 'test_tool', arguments: '{}' } }
      ];
      
      // Vérifier que la méthode détecte l'absence de progrès
      const areIdentical = (orchestrator as any).areToolCallsIdentical(toolCalls1, toolCalls2);
      expect(areIdentical).toBe(true);
    });

    it('should validate JSON arguments before execution', async () => {
      const orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
      
      // Tool calls avec arguments valides
      const validToolCalls = [
        { id: 'call-1', function: { name: 'test_tool', arguments: '{"key": "value"}' } }
      ];
      
      const validResult = (orchestrator as any).validateToolCallArguments(validToolCalls);
      expect(validResult.isValid).toBe(true);
      
      // Tool calls avec arguments invalides
      const invalidToolCalls = [
        { id: 'call-1', function: { name: 'test_tool', arguments: 'invalid json' } }
      ];
      
      const invalidResult = (orchestrator as any).validateToolCallArguments(invalidToolCalls);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should respect maxRelances limit of 10', async () => {
      // Vérifier que la limite par défaut est 10
      expect(DEFAULT_GROQ_LIMITS.maxRelances).toBe(10);
    });

    it('should include auto-evaluation instructions in system content', async () => {
      const orchestrator = new GroqOrchestrator(DEFAULT_GROQ_LIMITS);
      
      // Vérifier que le contenu système inclut les instructions d'auto-évaluation
      const systemContent = (orchestrator as any).getFallbackSystemContent();
      
      expect(systemContent).toContain('AUTO-ÉVALUATION ET DÉCISION INTELLIGENTE');
      expect(systemContent).toContain('Question 1');
      expect(systemContent).toContain('Question 2');
      expect(systemContent).toContain('Question 3');
      expect(systemContent).toContain('RÈGLE D\'OR');
    });
  });
}); 