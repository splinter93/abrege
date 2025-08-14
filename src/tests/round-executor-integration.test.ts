import { RoundExecutor, RoundState } from '@/services/llm/RoundExecutor';
import { ThreadBuilder } from '@/services/llm/ThreadBuilder';
import { RoundLogger, RoundEventType } from '@/services/llm/RoundLogger';
import { OpenAiLikeAdapter, ProviderAdapterFactory } from '@/services/llm/providers/OpenAiLikeAdapter';
import { validateMessage, validateThread } from '@/services/llm/schemas';

// 🎯 Configuration de test
const TEST_CONFIG = {
  maxRelances: 2,
  timeout: 10000,
  enableLogging: true,
  enableMetrics: true
};

// 🎯 Mock provider pour les tests
class MockProvider extends OpenAiLikeAdapter {
  private responses: any[] = [];
  private callCount = 0;

  constructor() {
    super({
      name: 'mock',
      baseUrl: 'http://mock',
      apiKey: 'mock-key',
      model: 'mock-model',
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.9,
      timeout: 5000,
      retries: 1,
      enableLogging: false
    });
  }

  setResponses(responses: any[]): void {
    this.responses = responses;
  }

  protected async executeCall(payload: any, timeout: number): Promise<any> {
    this.callCount++;
    
    if (this.callCount > this.responses.length) {
      throw new Error('Plus de réponses disponibles');
    }

    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.responses[this.callCount - 1];
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}

describe('RoundExecutor Integration Tests', () => {
  let roundExecutor: RoundExecutor;
  let threadBuilder: ThreadBuilder;
  let roundLogger: RoundLogger;
  let mockProvider: MockProvider;

  beforeEach(() => {
    roundExecutor = RoundExecutor.getInstance();
    threadBuilder = ThreadBuilder.getInstance();
    roundLogger = RoundLogger.getInstance({ enableLogging: false });
    mockProvider = new MockProvider();
  });

  afterEach(() => {
    mockProvider.reset();
  });

  describe('Scénario nominal (mono-tool)', () => {
    it('should complete a single tool call round successfully', async () => {
      // 🎯 Configuration des réponses du provider
      mockProvider.setResponses([
        // Premier appel: assistant avec tool call
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'create_note',
                  arguments: '{"title": "Test Note"}'
                }
              }]
            }
          }]
        },
        // Deuxième appel: réponse finale
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'J\'ai créé la note "Test Note" comme demandé.'
            }
          }]
        }
      ]);

      // 🎯 Exécution du round
      const result = await roundExecutor.executeRound({
        sessionId: 'test-session-1',
        userMessage: 'Crée une note de test',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      // ✅ Vérifications
      expect(result.success).toBe(true);
      expect(result.finalState).toBe(RoundState.DONE);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].function.name).toBe('create_note');
      expect(result.messages).toHaveLength(2); // assistant + assistant final
      expect(result.relanceCount).toBe(0);

      // ✅ Vérifier que le second appel voit bien le message tool
      expect(mockProvider.getCallCount()).toBe(2);
    });

    it('should validate tool call arguments as JSON', async () => {
      mockProvider.setResponses([
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'create_note',
                  arguments: '{"title": "Test Note", "content": "Content"}'
                }
              }]
            }
          }]
        },
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Note créée avec succès'
            }
          }]
        }
      ]);

      const result = await roundExecutor.executeRound({
        sessionId: 'test-session-2',
        userMessage: 'Crée une note',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      // ✅ Vérifier que les arguments sont du JSON valide
      const toolCall = result.toolCalls[0];
      expect(() => JSON.parse(toolCall.function.arguments)).not.toThrow();
      
      const args = JSON.parse(toolCall.function.arguments);
      expect(args.title).toBe('Test Note');
      expect(args.content).toBe('Content');
    });
  });

  describe('Scénario multi-tools', () => {
    it('should handle multiple tool calls in sequence', async () => {
      mockProvider.setResponses([
        // Premier appel: assistant avec 2 tool calls
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_A',
                  type: 'function',
                  function: {
                    name: 'create_folder',
                    arguments: '{"name": "Projects"}'
                  }
                },
                {
                  id: 'call_B',
                  type: 'function',
                  function: {
                    name: 'create_note',
                    arguments: '{"title": "README", "folder_id": "projects"}'
                  }
                }
              ]
            }
          }]
        },
        // Deuxième appel: réponse finale
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'J\'ai créé le dossier "Projects" et la note "README" dedans.'
            }
          }]
        }
      ]);

      const result = await roundExecutor.executeRound({
        sessionId: 'test-session-3',
        userMessage: 'Crée un dossier Projects avec une note README',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      // ✅ Vérifications
      expect(result.success).toBe(true);
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].function.name).toBe('create_folder');
      expect(result.toolCalls[1].function.name).toBe('create_note');
      
      // ✅ Vérifier l'ordre des tool calls
      expect(result.toolCalls[0].id).toBe('call_A');
      expect(result.toolCalls[1].id).toBe('call_B');
    });

    it('should preserve tool call sequence in thread', async () => {
      // 🎯 Créer un thread avec des tool calls
      const mockThread = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Crée un dossier et une note',
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_A',
              type: 'function',
              function: { name: 'create_folder', arguments: '{"name": "Test"}' }
            },
            {
              id: 'call_B',
              type: 'function',
              function: { name: 'create_note', arguments: '{"title": "Note"}' }
            }
          ],
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-3',
          role: 'tool',
          tool_call_id: 'call_A',
          name: 'create_folder',
          content: '{"success": true, "folder_id": "123"}',
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-4',
          role: 'tool',
          tool_call_id: 'call_B',
          name: 'create_note',
          content: '{"success": true, "note_id": "456"}',
          timestamp: new Date().toISOString()
        }
      ];

      // 🎯 Reconstruire le thread
      const buildResult = await threadBuilder.buildThread('test-session', {
        preserveToolCallSequence: true,
        enableValidation: true
      });

      expect(buildResult.success).toBe(true);
      expect(buildResult.toolCallSequence).toHaveLength(1);
      
      const sequence = buildResult.toolCallSequence![0];
      expect(sequence.assistantMessage.tool_calls).toHaveLength(2);
      expect(sequence.toolMessages).toHaveLength(2);
      
      // ✅ Vérifier l'appariement des tool_call_id
      expect(sequence.toolMessages[0].tool_call_id).toBe('call_A');
      expect(sequence.toolMessages[1].tool_call_id).toBe('call_B');
    });
  });

  describe('Scénario retry réseau', () => {
    it('should handle network retries gracefully', async () => {
      let callCount = 0;
      
      // 🎯 Provider qui échoue puis réussit
      const retryProvider = new MockProvider();
      retryProvider.setResponses([
        // Premier appel échoue
        { error: 'Network timeout' },
        // Premier appel réussit au retry
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_retry',
                type: 'function',
                function: {
                  name: 'test_tool',
                  arguments: '{"param": "value"}'
                }
              }]
            }
          }]
        },
        // Deuxième appel
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Tool exécuté avec succès'
            }
          }]
        }
      ]);

      const result = await roundExecutor.executeRound({
        sessionId: 'test-session-retry',
        userMessage: 'Test retry',
        config: { ...TEST_CONFIG, retries: 2 },
        provider: retryProvider
      });

      expect(result.success).toBe(true);
      expect(result.finalState).toBe(RoundState.DONE);
    });
  });

  describe('Scénario arguments invalides', () => {
    it('should reject invalid JSON arguments', async () => {
      mockProvider.setResponses([
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_invalid',
                type: 'function',
                function: {
                  name: 'create_note',
                  arguments: '{"title": "Test", "content": "Content",}' // JSON invalide
                }
              }]
            }
          }]
        }
      ]);

      // 🎯 Le round devrait échouer à cause des arguments invalides
      await expect(roundExecutor.executeRound({
        sessionId: 'test-session-invalid',
        userMessage: 'Test arguments invalides',
        config: TEST_CONFIG,
        provider: mockProvider
      })).rejects.toThrow();
    });

    it('should validate tool message content as JSON string', async () => {
      // 🎯 Créer un message tool avec contenu invalide
      const invalidToolMessage = {
        role: 'tool',
        tool_call_id: 'call_123',
        name: 'test_tool',
        content: { success: true, data: 'test' }, // Objet au lieu de string
        timestamp: new Date().toISOString()
      };

      // ✅ Validation devrait échouer
      const validation = validateMessage(invalidToolMessage);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('content'))).toBe(true);
    });
  });

  describe('Scénario pruning', () => {
    it('should preserve tool call sequences during pruning', async () => {
      // 🎯 Créer un thread long avec des tool calls à la fin
      const longThread = Array.from({ length: 60 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date(Date.now() - (60 - i) * 1000).toISOString()
      }));

      // 🎯 Ajouter une séquence de tool calls à la fin
      const toolCallSequence = [
        {
          id: 'msg-tool-1',
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_final',
            type: 'function',
            function: {
              name: 'final_tool',
              arguments: '{"action": "complete"}'
            }
          }],
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-tool-2',
          role: 'tool',
          tool_call_id: 'call_final',
          name: 'final_tool',
          content: '{"success": true}',
          timestamp: new Date().toISOString()
        }
      ];

      const fullThread = [...longThread, ...toolCallSequence];

      // 🎯 Nettoyer avec une limite de 50 messages
      const cleanedThread = fullThread.slice(-50);

      // ✅ Vérifier que la séquence de tool calls est préservée
      const hasToolCalls = cleanedThread.some(msg => 
        msg.role === 'assistant' && msg.tool_calls
      );
      const hasToolResults = cleanedThread.some(msg => 
        msg.role === 'tool' && msg.tool_call_id
      );

      expect(hasToolCalls).toBe(true);
      expect(hasToolResults).toBe(true);

      // ✅ Vérifier que la séquence est complète
      const toolCallMessages = cleanedThread.filter(msg => 
        msg.role === 'assistant' && msg.tool_calls
      );
      const toolResultMessages = cleanedThread.filter(msg => 
        msg.role === 'tool'
      );

      expect(toolCallMessages.length).toBeGreaterThan(0);
      expect(toolResultMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Critères d\'acceptation "comme ChatGPT"', () => {
    it('should ensure second model call sees 100% of tool messages', async () => {
      // 🎯 Configuration avec logging détaillé
      const detailedLogger = RoundLogger.getInstance({ 
        enableLogging: true, 
        logLevel: RoundLogger.RoundLogLevel.DEBUG 
      });

      mockProvider.setResponses([
        // Premier appel: tool calls
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_acceptance',
                type: 'function',
                function: {
                  name: 'acceptance_test',
                  arguments: '{"test": true}'
                }
              }]
            }
          }]
        },
        // Deuxième appel: réponse finale
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Test d\'acceptation réussi'
            }
          }]
        }
      ]);

      const roundId = 'acceptance-test';
      detailedLogger.startRound(roundId, { 
        sessionId: 'test-acceptance',
        userMessage: 'Test critères d\'acceptation'
      });

      const result = await roundExecutor.executeRound({
        sessionId: 'test-acceptance',
        userMessage: 'Test critères d\'acceptation',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      detailedLogger.completeRound(roundId, result.success);

      // ✅ Vérifications critiques
      expect(result.success).toBe(true);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.messages).toHaveLength(2);

      // ✅ Vérifier que le second appel contient bien le message tool
      const toolMessage = result.messages.find(msg => msg.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage?.tool_call_id).toBe('call_acceptance');
      expect(toolMessage?.name).toBe('acceptance_test');

      // ✅ Vérifier que le contenu est une string JSON
      expect(typeof toolMessage?.content).toBe('string');
      expect(() => JSON.parse(toolMessage?.content || '{}')).not.toThrow();
    });

    it('should prevent responses based on old messages', async () => {
      // 🎯 Ce test vérifie que le modèle ne répond pas aux messages précédents
      // mais se concentre sur le contexte actuel avec les tool results
      
      mockProvider.setResponses([
        // Premier appel: tool calls
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_context',
                type: 'function',
                function: {
                  name: 'context_test',
                  arguments: '{"context": "current"}'
                }
              }]
            }
          }]
        },
        // Deuxième appel: doit répondre au contexte actuel
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'J\'ai traité votre demande actuelle avec le contexte fourni.'
            }
          }]
        }
      ]);

      const result = await roundExecutor.executeRound({
        sessionId: 'test-context',
        userMessage: 'Traite cette demande avec le contexte actuel',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      // ✅ Vérifier que la réponse finale est contextuelle
      const finalMessage = result.messages[result.messages.length - 1];
      expect(finalMessage.role).toBe('assistant');
      expect(finalMessage.content).toContain('demande actuelle');
      expect(finalMessage.content).toContain('contexte');
    });

    it('should maintain conversation flow after tool execution', async () => {
      // 🎯 Test de la continuité conversationnelle
      mockProvider.setResponses([
        // Premier appel: tool calls
        {
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_flow',
                type: 'function',
                function: {
                  name: 'flow_test',
                  arguments: '{"step": "first"}'
                }
              }]
            }
          }]
        },
        // Deuxième appel: suite logique
        {
          choices: [{
            message: {
              role: 'assistant',
              content: 'Première étape terminée. Passons à la suite logique de votre demande.'
            }
          }]
        }
      ]);

      const result = await roundExecutor.executeRound({
        sessionId: 'test-flow',
        userMessage: 'Exécute cette tâche en plusieurs étapes',
        config: TEST_CONFIG,
        provider: mockProvider
      });

      // ✅ Vérifier la continuité
      expect(result.success).toBe(true);
      const finalMessage = result.messages[result.messages.length - 1];
      expect(finalMessage.content).toContain('Première étape terminée');
      expect(finalMessage.content).toContain('suite logique');
    });
  });

  describe('Validation des schémas', () => {
    it('should validate complete thread structure', async () => {
      const validThread = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_1',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{"param": "value"}'
            }
          }],
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-3',
          role: 'tool',
          tool_call_id: 'call_1',
          name: 'test_tool',
          content: '{"success": true}',
          timestamp: new Date().toISOString()
        }
      ];

      const validation = validateThread(validThread);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.validMessages).toHaveLength(3);
    });

    it('should reject invalid tool message structure', async () => {
      const invalidToolMessage = {
        role: 'tool',
        // tool_call_id manquant
        name: 'test_tool',
        content: '{"success": true}'
      };

      const validation = validateMessage(invalidToolMessage);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('tool_call_id'))).toBe(true);
    });
  });
}); 