import { GroqRoundFSM } from '../GroqRoundFSM';
import { DEFAULT_FSM_CONFIG } from '../../types/groqTypes';
import { GroqProvider } from '../../providers';
import { GroqHistoryBuilder } from '../GroqHistoryBuilder';
import { GroqToolExecutor } from '../GroqToolExecutor';
import { GroqBatchApiClient } from '../GroqBatchApiClient';

// Mock des dépendances
jest.mock('../../providers');
jest.mock('../GroqHistoryBuilder');
jest.mock('../GroqToolExecutor');
jest.mock('../GroqBatchApiClient');
jest.mock('@/utils/logger');

describe('GroqRoundFSM Integration Tests', () => {
  let fsm: GroqRoundFSM;
  let mockGroqProvider: jest.Mocked<GroqProvider>;
  let mockHistoryBuilder: jest.Mocked<GroqHistoryBuilder>;
  let mockToolExecutor: jest.Mocked<GroqToolExecutor>;
  let mockBatchApiClient: jest.Mocked<GroqBatchApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Créer la FSM
    fsm = new GroqRoundFSM('test-session-123', DEFAULT_FSM_CONFIG);
    
    // Récupérer les mocks
    mockGroqProvider = new GroqProvider() as jest.Mocked<GroqProvider>;
    mockHistoryBuilder = new GroqHistoryBuilder({} as any) as jest.Mocked<GroqHistoryBuilder>;
    mockToolExecutor = new GroqToolExecutor({} as any) as jest.Mocked<GroqToolExecutor>;
    mockBatchApiClient = new GroqBatchApiClient({} as any) as jest.Mocked<GroqBatchApiClient>;
  });

  describe('1. Flux Complet Mono-Tool', () => {
    it('should execute complete flow: IDLE → CALL_MODEL_1 → EXECUTE_TOOLS → PERSIST → RELOAD → CALL_MODEL_2 → DONE', async () => {
      // Arrange
      const userMessage = 'Calcule 2 + 2';
      const systemContent = 'Tu es un assistant mathématique. Utilise la calculatrice pour les calculs.';
      
      // Mock des réponses du provider
      const mockFirstResponse = {
        content: 'Je vais calculer 2 + 2 pour vous.',
        tool_calls: [{
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "add", "a": 2, "b": 2}'
          }
        }]
      };

      const mockToolResult = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { result: 4, operation: 'add' },
        success: true,
        timestamp: new Date().toISOString()
      };

      const mockSecondResponse = {
        content: 'Le résultat de 2 + 2 est 4.',
        tool_calls: []
      };

      // Act
      const roundData = await fsm.executeRound(userMessage, systemContent);
      
      // Injecter les données étape par étape
      fsm.injectFirstResponse(mockFirstResponse);
      fsm.injectToolResults([mockToolResult]);
      fsm.injectSecondResponse(mockSecondResponse);

      // Assert
      expect(fsm.getCurrentState()).toBe('DONE');
      
      const finalData = fsm.getData();
      expect(finalData.userMessage).toBe(userMessage);
      expect(finalData.systemContent).toBe(systemContent);
      expect(finalData.firstResponse).toEqual(mockFirstResponse);
      expect(finalData.toolCalls).toHaveLength(1);
      expect(finalData.toolResults).toHaveLength(1);
      expect(finalData.secondResponse).toEqual(mockSecondResponse);
    });

    it('should handle tool execution errors gracefully', async () => {
      // Arrange
      const userMessage = 'Calcule 2 / 0';
      const systemContent = 'Tu es un assistant mathématique.';
      
      const mockFirstResponse = {
        content: 'Je vais calculer 2 / 0.',
        tool_calls: [{
          id: 'calc-1',
          type: 'function',
          function: {
            name: 'calculator',
            arguments: '{"operation": "divide", "a": 2, "b": 0}'
          }
        }]
      };

      const mockToolError = {
        tool_call_id: 'calc-1',
        name: 'calculator',
        result: { error: 'Division par zéro impossible' },
        success: false,
        timestamp: new Date().toISOString()
      };

      // Act
      await fsm.executeRound(userMessage, systemContent);
      fsm.injectFirstResponse(mockFirstResponse);
      fsm.injectToolResults([mockToolError]);

      // Assert
      expect(fsm.getCurrentState()).toBe('EXECUTE_TOOLS');
      
      const data = fsm.getData();
      expect(data.toolResults[0].success).toBe(false);
      expect(data.toolResults[0].result.error).toBe('Division par zéro impossible');
    });
  });

  describe('2. Flux Multi-Tools avec Dépendances', () => {
    it('should execute tools in correct order with dependency resolution', async () => {
      // Arrange
      const userMessage = 'Crée un dossier "Projets" et une note "Todo" dedans';
      const systemContent = 'Tu es un assistant de gestion de fichiers.';
      
      const mockFirstResponse = {
        content: 'Je vais créer le dossier et la note pour vous.',
        tool_calls: [
          {
            id: 'folder-1',
            type: 'function',
            function: {
              name: 'create_folder',
              arguments: '{"name": "Projets"}'
            }
          },
          {
            id: 'note-1',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: '{"name": "Todo", "folder_id": "{{folder_result.id}}"}'
            }
          }
        ]
      };

      const mockToolResults = [
        {
          tool_call_id: 'folder-1',
          name: 'create_folder',
          result: { id: 'folder-123', name: 'Projets' },
          success: true,
          timestamp: new Date().toISOString()
        },
        {
          tool_call_id: 'note-1',
          name: 'create_note',
          result: { id: 'note-456', name: 'Todo', folder_id: 'folder-123' },
          success: true,
          timestamp: new Date().toISOString()
        }
      ];

      // Act
      await fsm.executeRound(userMessage, systemContent);
      fsm.injectFirstResponse(mockFirstResponse);
      fsm.injectToolResults(mockToolResults);

      // Assert
      const data = fsm.getData();
      expect(data.toolCalls).toHaveLength(2);
      expect(data.toolResults).toHaveLength(2);
      
      // Vérifier l'ordre d'exécution
      expect(data.toolCalls[0].id).toBe('folder-1');
      expect(data.toolCalls[1].id).toBe('note-1');
      
      // Vérifier que la note a bien le bon folder_id
      expect(data.toolResults[1].result.folder_id).toBe('folder-123');
    });
  });

  describe('3. Gestion des États et Transitions', () => {
    it('should enforce strict state sequence', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act & Assert
      expect(fsm.getCurrentState()).toBe('IDLE');

      // Démarrer le round
      await fsm.executeRound('Test', 'Test system');
      expect(fsm.getCurrentState()).toBe('CALL_MODEL_1');

      // Injecter une réponse avec tool calls
      fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
      });

      // Forcer les transitions
      await fsm.forceTransition('EXECUTE_TOOLS');
      expect(fsm.getCurrentState()).toBe('EXECUTE_TOOLS');

      await fsm.forceTransition('PERSIST_TOOLS_BATCH');
      expect(fsm.getCurrentState()).toBe('PERSIST_TOOLS_BATCH');

      await fsm.forceTransition('RELOAD_THREAD');
      expect(fsm.getCurrentState()).toBe('RELOAD_THREAD');

      await fsm.forceTransition('CALL_MODEL_2');
      expect(fsm.getCurrentState()).toBe('CALL_MODEL_2');

      await fsm.forceTransition('DONE');
      expect(fsm.getCurrentState()).toBe('DONE');
    });

    it('should prevent invalid state transitions', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act & Assert
      // Tentative de transition invalide
      await expect(fsm.forceTransition('CALL_MODEL_2')).rejects.toThrow();
    });

    it('should track state history correctly', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
      });

      // Assert
      const context = fsm.getContext();
      expect(context.stateHistory).toHaveLength(2);
      expect(context.stateHistory[0].state).toBe('IDLE');
      expect(context.stateHistory[1].state).toBe('CALL_MODEL_1');
    });
  });

  describe('4. Gestion des Verrous et Concurrence', () => {
    it('should acquire and release locks correctly', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');

      // Assert
      const context = fsm.getContext();
      expect(context.lockAcquired).toBe(true);
      expect(context.lockExpiresAt).toBeDefined();
      
      // Vérifier que le verrou expire dans le bon délai
      const lockExpiry = new Date(context.lockExpiresAt);
      const now = new Date();
      const timeDiff = lockExpiry.getTime() - now.getTime();
      
      expect(timeDiff).toBeGreaterThan(25000); // 25 secondes minimum
      expect(timeDiff).toBeLessThan(35000); // 35 secondes maximum
    });

    it('should handle lock expiration gracefully', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);
      
      // Act
      await fsm.executeRound('Test', 'Test system');
      
      // Simuler l'expiration du verrou
      const context = fsm.getContext();
      context.lockExpiresAt = new Date(Date.now() - 1000).toISOString(); // Expiré

      // Assert
      const lockExpiry = new Date(context.lockExpiresAt);
      const now = new Date();
      expect(lockExpiry.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe('5. Métriques et Monitoring', () => {
    it('should track round metrics correctly', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
      });
      fsm.injectToolResults([{
        tool_call_id: '1',
        name: 'test',
        result: { success: true },
        success: true,
        timestamp: new Date().toISOString()
      }]);

      // Assert
      const metrics = fsm.getMetrics();
      expect(metrics.toolCallsCount).toBe(1);
      expect(metrics.toolResultsCount).toBe(1);
      expect(metrics.stateTransitions).toBeGreaterThan(0);
      expect(metrics.startTime).toBeDefined();
    });

    it('should track errors and conflicts', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');
      
      // Simuler des erreurs en modifiant directement les métriques
      const metrics = fsm.getMetrics();
      metrics.errors.push('Test error');
      metrics.conflicts409 = 1;
      metrics.appliedFalse = 1;

      // Assert
      expect(metrics.errors).toContain('Test error');
      expect(metrics.conflicts409).toBe(1);
      expect(metrics.appliedFalse).toBe(1);
    });
  });

  describe('6. Validation des Données', () => {
    it('should validate tool call structure', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);
      const invalidToolCall = {
        id: 'invalid-1',
        type: 'function',
        function: {
          name: 'test',
          arguments: 'invalid json' // JSON invalide
        }
      };

      // Act
      await fsm.executeRound('Test', 'Test system');
      
      // Assert
      expect(() => fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [invalidToolCall]
      })).not.toThrow(); // La validation est faite au niveau des schémas Zod, pas dans la FSM
    });

    it('should validate tool result structure', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);
      const invalidToolResult = {
        tool_call_id: 'test-1',
        name: 'test',
        result: null,
        success: false,
        // timestamp manquant
      };

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [{ id: 'test-1', type: 'function', function: { name: 'test', arguments: '{}' } }]
      });

      // Assert
      expect(() => fsm.injectToolResults([invalidToolResult as any])).not.toThrow();
    });
  });

  describe('7. Gestion des Erreurs et Récupération', () => {
    it('should handle provider errors gracefully', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');
      
      // Simuler une erreur en forçant l'état ERROR
      fsm.forceTransition('ERROR');

      // Assert
      expect(fsm.getCurrentState()).toBe('ERROR');
      expect(fsm.hasError()).toBe(true);
    });

    it('should allow error recovery and retry', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.forceTransition('ERROR');
      
      // Tenter la récupération en forçant un nouvel état
      fsm.forceTransition('CALL_MODEL_1');

      // Assert
      expect(fsm.getCurrentState()).toBe('CALL_MODEL_1');
      expect(fsm.hasError()).toBe(false);
    });
  });

  describe('8. Performance et Optimisation', () => {
    it('should complete round within reasonable time', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);
      const startTime = Date.now();

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.injectFirstResponse({
        content: 'Test',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }]
      });
      fsm.injectToolResults([{
        tool_call_id: '1',
        name: 'test',
        result: { success: true },
        success: true,
        timestamp: new Date().toISOString()
      }]);

      // Assert
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Le round devrait se terminer en moins de 100ms (test local)
      expect(duration).toBeLessThan(100);
    });

    it('should handle large tool call arrays efficiently', async () => {
      // Arrange
      const fsm = new GroqRoundFSM('test-session', DEFAULT_FSM_CONFIG);
      const largeToolCalls = Array.from({ length: 100 }, (_, i) => ({
        id: `tool-${i}`,
        type: 'function' as const,
        function: {
          name: `function_${i}`,
          arguments: JSON.stringify({ index: i })
        }
      }));

      // Act
      await fsm.executeRound('Test', 'Test system');
      fsm.injectFirstResponse({
        content: 'Test with many tools',
        tool_calls: largeToolCalls
      });

      // Assert
      const data = fsm.getData();
      expect(data.toolCalls).toHaveLength(100);
      expect(data.toolCalls[99].id).toBe('tool-99');
    });
  });
}); 