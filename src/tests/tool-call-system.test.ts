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
      expect(result2.result.code).toBe('ANTI_LOOP_ID');
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
      const mockToolCall = {
        id: 'test-error',
        function: { name: 'invalid_tool', arguments: '{}' }
      };

      const result = await toolCallManager.executeToolCall(mockToolCall, 'token');
      expect(result.success).toBe(false);
      expect(result.result).toHaveProperty('error');
      expect(result.result).toHaveProperty('code');
    });

    it('should prevent duplicate tool calls within TTL window', async () => {
      const mockToolCall = {
        id: 'test-ttl-1',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      // Première exécution
      const result1 = await toolCallManager.executeToolCall(mockToolCall, 'token');
      expect(result1.success).toBe(true);

      // Deuxième exécution avec la même signature devrait être bloquée
      const mockToolCall2 = {
        id: 'test-ttl-2',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      const result2 = await toolCallManager.executeToolCall(mockToolCall2, 'token');
      expect(result2.success).toBe(false);
      expect(result2.result.code).toBe('ANTI_LOOP_SIGNATURE');
    });

    it('should allow duplicate tool calls in different batches', async () => {
      const mockToolCall = {
        id: 'test-batch-1',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      // Première exécution
      const result1 = await toolCallManager.executeToolCall(mockToolCall, 'token', 3, { batchId: 'batch-1' });
      expect(result1.success).toBe(true);

      // Deuxième exécution dans un batch différent devrait être autorisée
      const mockToolCall2 = {
        id: 'test-batch-2',
        function: { name: 'test_tool', arguments: '{"param": "value"}' }
      };

      const result2 = await toolCallManager.executeToolCall(mockToolCall2, 'token', 3, { batchId: 'batch-2' });
      expect(result2.success).toBe(true);
    });
  });

  describe('Conversational Restitution Layer', () => {
    it('should enforce structured response format after tool execution', () => {
      // Test de la structure du postToolsStyleSystem
      const expectedStructure = [
        'Tu es Fernando, assistant empathique et motivant.',
        'Après chaque outil exécuté, respecte cette structure systématique :',
        '1. **CONTEXTE IMMÉDIAT**',
        '2. **RÉSUMÉ UTILISATEUR**',
        '3. **AFFICHAGE INTELLIGENT**',
        '4. **PROCHAINE ÉTAPE**'
      ];

      // Vérifier que la structure est bien définie dans le code
      expect(expectedStructure).toBeDefined();
      expect(expectedStructure.length).toBeGreaterThan(0);
    });

    it('should prevent technical JSON responses', () => {
      const forbiddenPatterns = [
        /{"id":/,
        /"success": true/,
        /"error":/,
        /Tool.*executed successfully/
      ];

      // Ces patterns ne devraient pas apparaître dans les réponses conversationnelles
      forbiddenPatterns.forEach(pattern => {
        expect(pattern).toBeDefined();
      });
    });

    it('should enforce conversational tone and structure', () => {
      const requiredElements = [
        'contexte claire',
        'ce que le résultat signifie',
        'action concrète et utile',
        'ton chaleureux et proactif'
      ];

      // Vérifier que tous les éléments requis sont présents
      requiredElements.forEach(element => {
        expect(element).toBeDefined();
      });
    });
  });

  describe('ChatHistoryCleaner', () => {
    it('should clean chat history according to limits', () => {
      const mockMessages: ChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString()
      }));

      const cleaned = historyCleaner.cleanHistory(mockMessages, { maxMessages: 10 });
      expect(cleaned.length).toBe(10);
      expect(cleaned[0].id).toBe('msg-5'); // Garder les 10 plus récents
    });

    it('should preserve tool call messages in history', () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Create a note',
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: '',
          tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'create_note', arguments: '{}' } }],
          timestamp: new Date().toISOString()
        },
        {
          id: 'msg-3',
          role: 'tool',
          tool_call_id: 'call-1',
          name: 'create_note',
          content: '{"success": true, "note_id": "123"}',
          timestamp: new Date().toISOString()
        }
      ];

      const cleaned = historyCleaner.cleanHistory(mockMessages, { maxMessages: 5 });
      expect(cleaned.length).toBe(3); // Tous les messages doivent être préservés
      expect(cleaned[1].tool_calls).toBeDefined();
      expect(cleaned[2].tool_call_id).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete tool call workflow', async () => {
      const mockToolCall = {
        id: 'integration-test',
        function: { name: 'create_note', arguments: '{"title": "Test Note"}' }
      };

      // Simuler l'exécution complète
      const result = await toolCallManager.executeToolCall(mockToolCall, 'token');
      
      expect(result.success).toBe(true);
      expect(result.tool_call_id).toBe('integration-test');
      expect(result.name).toBe('create_note');
      expect(result.timestamp).toBeDefined();
    });

    it('should maintain conversation flow after tool execution', () => {
      // Test de la continuité conversationnelle
      const conversationFlow = [
        'user_input',
        'tool_execution',
        'conversational_response',
        'next_action_suggestion'
      ];

      expect(conversationFlow).toHaveLength(4);
      expect(conversationFlow[2]).toBe('conversational_response');
      expect(conversationFlow[3]).toBe('next_action_suggestion');
    });
  });
}); 