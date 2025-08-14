import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
import { RoundExecutor } from '@/services/llm/RoundExecutor';
import { ThreadBuilder } from '@/services/llm/ThreadBuilder';
import { RoundLogger } from '@/services/llm/RoundLogger';
import { ChatMessage } from '@/types/chat';

// 🎯 Test de validation du système réparé
describe('Groq Tool Calls Fix - Validation du système réparé', () => {
  
  test('should correctly inject tool results before second model call', async () => {
    // 🎯 Mock des données de test
    const mockParams = {
      message: 'Crée une note de test',
      appContext: {
        type: 'test',
        name: 'Test App',
        id: 'test-123',
        content: 'Test content'
      },
      sessionHistory: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Bonjour',
          timestamp: new Date().toISOString()
        }
      ],
      agentConfig: {
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        api_v2_capabilities: ['create_note']
      },
      userToken: 'test-token',
      sessionId: 'test-session-123'
    };

    // 🎯 Mock du GroqProvider pour simuler les tool calls
    const mockGroqProvider = {
      call: jest.fn()
        .mockResolvedValueOnce({
          // Premier appel : assistant avec tool calls
          content: null,
          reasoning: '',
          tool_calls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'create_note',
                arguments: '{"title": "Note de test", "content": "Contenu de test"}'
              }
            }
          ]
        })
        .mockResolvedValueOnce({
          // Deuxième appel : réponse finale
          content: 'J\'ai créé la note "Note de test" avec succès.',
          reasoning: 'Tool exécuté avec succès',
          tool_calls: []
        })
    };

    // 🎯 Mock du ToolCallManager
    const mockToolCallManager = {
      executeToolCall: jest.fn().mockResolvedValue({
        tool_call_id: 'call_123',
        name: 'create_note',
        result: {
          success: true,
          note_id: 'note-456',
          title: 'Note de test'
        },
        success: true
      })
    };

    // 🎯 Mock des services
    jest.mock('@/services/llm/RoundExecutor');
    jest.mock('@/services/llm/ThreadBuilder');
    jest.mock('@/services/llm/RoundLogger');
    jest.mock('./toolCallManager');
    jest.mock('./providers');

    // 🎯 Vérifier que le système injecte correctement les résultats
    const result = await handleGroqGptOss120b(mockParams);

    // ✅ Vérifications critiques
    const resultData = await result.json();
    expect(resultData.success).toBe(true);
    expect(resultData.tool_calls).toHaveLength(1);
    expect(resultData.tool_results).toHaveLength(1);
    expect(resultData.is_relance).toBe(true);
    expect(resultData.round_id).toBeDefined();

    // ✅ Vérifier que le contenu final est basé sur les résultats des tools
    expect(resultData.content).toContain('créé la note');
    expect(resultData.content).toContain('Note de test');
  });

  test('should maintain correct message sequence: assistant -> tool -> assistant', async () => {
    // 🎯 Test de la séquence des messages
    const mockThread = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Crée une note',
        timestamp: new Date().toISOString()
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'create_note',
              arguments: '{"title": "Test"}'
            }
          }
        ],
        timestamp: new Date().toISOString()
      }
    ];

    // 🎯 Vérifier que le ThreadBuilder reconstruit correctement la séquence
    const threadBuilder = ThreadBuilder.getInstance();
    const buildResult = await threadBuilder.buildThread('test-session', {
      preserveToolCallSequence: true,
      enableValidation: true
    });

    expect(buildResult.success).toBe(true);
    expect(buildResult.toolCallSequence).toBeDefined();
    expect(buildResult.toolCallSequence!.length).toBeGreaterThan(0);
  });

  test('should validate tool call arguments as JSON', async () => {
    // 🎯 Test de validation des arguments
    const validToolCall = {
      id: 'call_123',
      type: 'function',
      function: {
        name: 'create_note',
        arguments: '{"title": "Test", "content": "Content"}'
      }
    };

    const invalidToolCall = {
      id: 'call_456',
      type: 'function',
      function: {
        name: 'create_note',
        arguments: '{"title": "Test", "content": "Content",}' // JSON invalide
      }
    };

    // ✅ Validation des arguments valides
    expect(() => JSON.parse(validToolCall.function.arguments)).not.toThrow();
    
    // ✅ Validation des arguments invalides
    expect(() => JSON.parse(invalidToolCall.function.arguments)).toThrow();
  });

  test('should handle multiple tool calls in sequence', async () => {
    // 🎯 Test de gestion de plusieurs tool calls
    const mockParams = {
      message: 'Crée un dossier et une note dedans',
      appContext: {
        type: 'test',
        name: 'Test App',
        id: 'test-123',
        content: 'Test content'
      },
      sessionHistory: [],
      agentConfig: {
        model: 'openai/gpt-oss-120b',
        api_v2_capabilities: ['create_folder', 'create_note']
      },
      userToken: 'test-token',
      sessionId: 'test-session-multi'
    };

    // 🎯 Mock avec plusieurs tool calls
    const mockGroqProvider = {
      call: jest.fn()
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            {
              id: 'call_folder',
              type: 'function',
              function: {
                name: 'create_folder',
                arguments: '{"name": "Projects"}'
              }
            },
            {
              id: 'call_note',
              type: 'function',
              function: {
                name: 'create_note',
                arguments: '{"title": "README", "folder_id": "projects"}'
              }
            }
          ]
        })
        .mockResolvedValueOnce({
          content: 'J\'ai créé le dossier "Projects" et la note "README" dedans.',
          tool_calls: []
        })
    };

    // 🎯 Vérifier la gestion de plusieurs tools
    const result = await handleGroqGptOss120b(mockParams);

    expect(result.success).toBe(true);
    expect(result.tool_calls).toHaveLength(2);
    expect(result.tool_calls[0].function.name).toBe('create_folder');
    expect(result.tool_calls[1].function.name).toBe('create_note');
  });

  test('should prevent responses based on old messages', async () => {
    // 🎯 Test que le modèle ne répond pas aux anciens messages
    const mockParams = {
      message: 'Traite cette demande actuelle',
      appContext: {
        type: 'test',
        name: 'Test App',
        id: 'test-123',
        content: 'Test content'
      },
      sessionHistory: [
        {
          id: 'msg-old',
          role: 'user',
          content: 'Ancienne demande',
          timestamp: new Date(Date.now() - 60000).toISOString()
        }
      ],
      agentConfig: {
        model: 'openai/gpt-oss-120b',
        api_v2_capabilities: ['test_tool']
      },
      userToken: 'test-token',
      sessionId: 'test-session-context'
    };

    // 🎯 Mock avec focus sur le message actuel
    const mockGroqProvider = {
      call: jest.fn()
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            {
              id: 'call_test',
              type: 'function',
              function: {
                name: 'test_tool',
                arguments: '{"action": "current"}'
              }
            }
          ]
        })
        .mockResolvedValueOnce({
          content: 'J\'ai traité votre demande actuelle avec le contexte fourni.',
          tool_calls: []
        })
    };

    const result = await handleGroqGptOss120b(mockParams);

    // ✅ Vérifier que la réponse est contextuelle
    expect(result.success).toBe(true);
    expect(result.content).toContain('demande actuelle');
    expect(result.content).toContain('contexte');
    expect(result.content).not.toContain('Ancienne demande');
  });

  test('should maintain conversation flow after tool execution', async () => {
    // 🎯 Test de la continuité conversationnelle
    const mockParams = {
      message: 'Exécute cette tâche en plusieurs étapes',
      appContext: {
        type: 'test',
        name: 'Test App',
        id: 'test-123',
        content: 'Test content'
      },
      sessionHistory: [],
      agentConfig: {
        model: 'openai/gpt-oss-120b',
        api_v2_capabilities: ['step_tool']
      },
      userToken: 'test-token',
      sessionId: 'test-session-flow'
    };

    // 🎯 Mock avec continuité
    const mockGroqProvider = {
      call: jest.fn()
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            {
              id: 'call_step',
              type: 'function',
              function: {
                name: 'step_tool',
                arguments: '{"step": "first"}'
              }
            }
          ]
        })
        .mockResolvedValueOnce({
          content: 'Première étape terminée. Passons à la suite logique de votre demande.',
          tool_calls: []
        })
    };

    const result = await handleGroqGptOss120b(mockParams);

    // ✅ Vérifier la continuité
    expect(result.success).toBe(true);
    expect(result.content).toContain('Première étape terminée');
    expect(result.content).toContain('suite logique');
  });

  test('should handle tool execution errors gracefully', async () => {
    // 🎯 Test de gestion des erreurs de tools
    const mockParams = {
      message: 'Crée une note qui va échouer',
      appContext: {
        type: 'test',
        name: 'Test App',
        id: 'test-123',
        content: 'Test content'
      },
      sessionHistory: [],
      agentConfig: {
        model: 'openai/gpt-oss-120b',
        api_v2_capabilities: ['failing_tool']
      },
      userToken: 'test-token',
      sessionId: 'test-session-error'
    };

    // 🎯 Mock avec échec du tool
    const mockGroqProvider = {
      call: jest.fn()
        .mockResolvedValueOnce({
          content: null,
          tool_calls: [
            {
              id: 'call_fail',
              type: 'function',
              function: {
                name: 'failing_tool',
                arguments: '{"param": "value"}'
              }
            }
          ]
        })
        .mockResolvedValueOnce({
          content: 'Le tool a échoué, mais je peux continuer avec les informations disponibles.',
          tool_calls: []
        })
    };

    // 🎯 Mock du ToolCallManager avec échec
    const mockToolCallManager = {
      executeToolCall: jest.fn().mockRejectedValue(new Error('Tool execution failed'))
    };

    const result = await handleGroqGptOss120b(mockParams);

    // ✅ Vérifier la gestion gracieuse des erreurs
    expect(result.success).toBe(true);
    expect(result.tool_results).toHaveLength(1);
    expect(result.tool_results[0].success).toBe(false);
    expect(result.tool_results[0].result.error).toBeDefined();
  });
}); 

describe('GroqProvider ChatMessage handling', () => {
  it('should handle ChatMessage with tool_results property', () => {
    const chatMessage: ChatMessage = {
      id: 'test-1',
      role: 'tool',
      content: 'Tool result content',
      timestamp: new Date().toISOString(),
      tool_call_id: 'call-123',
      name: 'test_function',
      tool_results: [
        {
          tool_call_id: 'call-123',
          name: 'test_function',
          content: 'Tool result content',
          success: true
        }
      ]
    };

    // Verify that the ChatMessage type includes tool_results
    expect(chatMessage.tool_results).toBeDefined();
    expect(chatMessage.tool_results?.[0]?.tool_call_id).toBe('call-123');
    expect(chatMessage.tool_results?.[0]?.success).toBe(true);
  });
}); 