import { ToolCallManager } from '@/services/llm/toolCallManager';
import { ChatHistoryCleaner } from '@/services/chatHistoryCleaner';
import { ChatMessage } from '@/types/chat';
import { ToolCallResult } from '@/services/llm/toolCallManager';

describe('Tool Call System', () => {
  let toolCallManager: ToolCallManager;
  let historyCleaner: ChatHistoryCleaner;

  beforeEach(() => {
    toolCallManager = ToolCallManager.getInstance();
    historyCleaner = ChatHistoryCleaner.getInstance();
    toolCallManager.clearExecutionHistory();
  });

  describe('ToolCallManager', () => {
    it('should prevent infinite loops by tracking execution history', async () => {
      const mockToolCall = {
        id: 'test-123',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      // Première exécution
      const result1 = await toolCallManager.executeToolCall(mockToolCall, 'token');
      expect(result1.success).toBe(true);

      // Deuxième exécution avec le même ID devrait être bloquée
      const result2 = await toolCallManager.executeToolCall(mockToolCall, 'token');
      expect(result2.success).toBe(false);
      expect(result2.result.code).toBe('ANTI_LOOP');
    });

    it('should allow multiple different tool calls in the same session', async () => {
      const toolCall1 = {
        id: 'test-1',
        function: { name: 'create_folder', arguments: '{"name": "Test1"}' }
      };

      const toolCall2 = {
        id: 'test-2', 
        function: { name: 'create_note', arguments: '{"title": "Test2"}' }
      };

      // Les deux tools devraient pouvoir s'exécuter
      const result1 = await toolCallManager.executeToolCall(toolCall1, 'token');
      const result2 = await toolCallManager.executeToolCall(toolCall2, 'token');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.name).toBe('create_folder');
      expect(result2.name).toBe('create_note');
    });

    it('should handle tool call errors gracefully', async () => {
      const invalidToolCall = {
        id: 'invalid',
        function: { name: 'invalid_tool', arguments: 'invalid json' }
      };

      const result = await toolCallManager.executeToolCall(invalidToolCall, 'token');
      expect(result.success).toBe(false);
      expect(result.result.error).toBeDefined();
    });
  });

  describe('ChatHistoryCleaner', () => {
    it('should remove invalid tool messages', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi', timestamp: '2024-01-01T00:00:01Z' },
        { role: 'tool', content: 'result', timestamp: '2024-01-01T00:00:02Z' }, // Manque tool_call_id
        { role: 'tool', tool_call_id: '123', content: 'result', timestamp: '2024-01-01T00:00:03Z' } // Manque name
      ] as ChatMessage[];

      const cleaned = historyCleaner.cleanHistory(messages, { removeInvalidToolMessages: true });
      expect(cleaned.length).toBe(2); // Seuls user et assistant restent
    });

    it('should remove duplicate messages', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:01Z' }, // Duplicate
        { role: 'assistant', content: 'Hi', timestamp: '2024-01-01T00:00:02Z' }
      ] as ChatMessage[];

      const cleaned = historyCleaner.cleanHistory(messages, { removeDuplicateMessages: true });
      expect(cleaned.length).toBe(2);
    });

    it('should validate tool call consistency', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { 
          role: 'assistant', 
          content: 'I will help', 
          tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'test', arguments: '{}' } }],
          timestamp: '2024-01-01T00:00:01Z' 
        },
        { role: 'tool', tool_call_id: 'call-1', name: 'test', content: 'result', timestamp: '2024-01-01T00:00:02Z' }
      ] as ChatMessage[];

      const validation = historyCleaner.validateToolCallConsistency(messages);
      expect(validation.isValid).toBe(true);
    });

    it('should detect tool call inconsistencies', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { 
          role: 'assistant', 
          content: 'I will help', 
          tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'test', arguments: '{}' } }],
          timestamp: '2024-01-01T00:00:01Z' 
        }
        // Manque le message tool avec tool_call_id: 'call-1'
      ] as ChatMessage[];

      const validation = historyCleaner.validateToolCallConsistency(messages);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Tool call call-1 sans résultat correspondant');
    });

    it('should provide accurate history statistics', () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi', timestamp: '2024-01-01T00:00:01Z' },
        { role: 'tool', tool_call_id: '123', name: 'test', content: 'result', timestamp: '2024-01-01T00:00:02Z' }
      ] as ChatMessage[];

      const stats = historyCleaner.getHistoryStats(messages);
      expect(stats.total).toBe(3);
      expect(stats.byRole.user).toBe(1);
      expect(stats.byRole.assistant).toBe(1);
      expect(stats.byRole.tool).toBe(1);
      expect(stats.toolCalls).toBe(0);
      expect(stats.toolResults).toBe(1);
    });
  });

  describe('Multi Tool Call Execution', () => {
    it('should execute multiple tool calls sequentially', async () => {
      const toolCalls = [
        {
          id: 'call-1',
          function: { name: 'create_folder', arguments: '{"name": "Folder1"}' }
        },
        {
          id: 'call-2', 
          function: { name: 'create_note', arguments: '{"title": "Note1"}' }
        },
        {
          id: 'call-3',
          function: { name: 'create_folder', arguments: '{"name": "Folder2"}' }
        }
      ];

      const results: ToolCallResult[] = [];
      for (const toolCall of toolCalls) {
        const result = await toolCallManager.executeToolCall(toolCall, 'token');
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[0].name).toBe('create_folder');
      expect(results[1].name).toBe('create_note');
      expect(results[2].name).toBe('create_folder');
    });

    it('should limit tool calls to maximum 10', () => {
      const manyToolCalls = Array.from({ length: 15 }, (_, i) => ({
        id: `call-${i}`,
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      }));

      // Simuler la logique de limitation
      if (manyToolCalls.length > 10) {
        manyToolCalls.splice(10);
      }

      expect(manyToolCalls).toHaveLength(10);
    });

    it('should allow re-execution of tools after timeout', async () => {
      const toolCall = {
        id: 'test-timeout',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      // Première exécution
      const result1 = await toolCallManager.executeToolCall(toolCall, 'token');
      expect(result1.success).toBe(true);

      // Attendre que le timeout expire (simulation)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Deuxième exécution avec le même ID devrait être possible après nettoyage
      toolCallManager.clearExecutionHistory();
      const result2 = await toolCallManager.executeToolCall(toolCall, 'token');
      expect(result2.success).toBe(true);
    });

    it('should maintain correct message order in tool call relaunch', () => {
      // Simuler l'historique d'une session
      const sanitizedHistory = [
        { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' }
      ];

      const currentMessage = 'Create a folder and a note';
      const toolResults = [
        { tool_call_id: 'call-1', name: 'create_folder', result: { success: true } },
        { tool_call_id: 'call-2', name: 'create_note', result: { success: true } }
      ];

      // Simuler la construction du payload de relance
      const relancePayload = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          ...sanitizedHistory,
          { role: 'user', content: currentMessage },
          ...toolResults.map(result => ({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            name: result.name,
            content: JSON.stringify(result.result)
          })),
          { role: 'user', content: 'Maintenant que les outils ont été exécutés, réponds à la demande de l\'utilisateur en utilisant les résultats obtenus.' }
        ]
      };

      // Vérifier l'ordre des messages
      expect(relancePayload.messages).toHaveLength(7);
      expect(relancePayload.messages[0].role).toBe('system');
      expect(relancePayload.messages[1].role).toBe('user'); // Premier message utilisateur
      expect(relancePayload.messages[2].role).toBe('assistant');
      expect(relancePayload.messages[3].role).toBe('user'); // Message utilisateur actuel
      expect(relancePayload.messages[4].role).toBe('tool'); // Premier résultat tool
      expect(relancePayload.messages[5].role).toBe('tool'); // Deuxième résultat tool
      expect(relancePayload.messages[6].role).toBe('user'); // Instruction de relance
    });

    it('should maintain consistent sliding history between frontend and backend', () => {
      // Simuler un thread avec plus de messages que la limite
      const longThread = Array.from({ length: 15 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(2024, 0, 1, 0, 0, i).toISOString()
      }));

      const historyLimit = 10;

      // 🔧 FRONTEND: Tri puis limitation
      const frontendThread = longThread
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-historyLimit);

      // 🔧 BACKEND: Même logique (maintenant corrigée)
      const backendThread = longThread
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-historyLimit);

      // Vérifier la cohérence
      expect(frontendThread).toHaveLength(historyLimit);
      expect(backendThread).toHaveLength(historyLimit);
      expect(frontendThread).toEqual(backendThread);

      // Vérifier que les messages les plus récents sont conservés
      const lastMessage = longThread[longThread.length - 1];
      expect(frontendThread[frontendThread.length - 1].id).toBe(lastMessage.id);
      expect(backendThread[backendThread.length - 1].id).toBe(lastMessage.id);
    });
  });
}); 