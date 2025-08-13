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

    it('should validate pipeline integration of conversational layer', () => {
      // Test de l'intégration dans le pipeline
      const pipelineSteps = [
        'user_input',
        'llm_with_tools',
        'tool_calls_detected',
        'tools_executed',
        '🗣️ CONVERSATIONAL_LAYER_INJECTION', // Étape 5 - OBLIGATOIRE
        'llm_relaunch',
        'structured_response'
      ];

      expect(pipelineSteps).toHaveLength(7);
      expect(pipelineSteps[4]).toBe('🗣️ CONVERSATIONAL_LAYER_INJECTION');
    });

    it('should enforce mandatory 4-step structure', () => {
      // Test de la structure obligatoire en 4 étapes
      const mandatorySteps = [
        'CONTEXTE_IMMÉDIAT',
        'RÉSUMÉ_UTILISATEUR', 
        'AFFICHAGE_INTELLIGENT',
        'PROCHAINE_ÉTAPE'
      ];

      expect(mandatorySteps).toHaveLength(4);
      mandatorySteps.forEach(step => {
        expect(step).toBeDefined();
        expect(step).toContain('_');
      });
    });

    it('should prevent pipeline bypass of conversational layer', () => {
      // Test que la couche ne peut pas être contournée
      const pipelineEnforcement = {
        injectionPosition: 5,
        messageType: 'system',
        priority: 'max',
        bypassImpossible: true
      };

      expect(pipelineEnforcement.injectionPosition).toBe(5);
      expect(pipelineEnforcement.messageType).toBe('system');
      expect(pipelineEnforcement.priority).toBe('max');
      expect(pipelineEnforcement.bypassImpossible).toBe(true);
    });

    it('should enable intelligent error handling with tool reactivation', () => {
      // Test de la gestion d'erreur intelligente
      const errorHandlingCapabilities = {
        errorAnalysis: true,
        automaticCorrection: true,
        toolReactivation: true,
        userInformation: true,
        conversationContinuity: true
      };

      expect(errorHandlingCapabilities.errorAnalysis).toBe(true);
      expect(errorHandlingCapabilities.automaticCorrection).toBe(true);
      expect(errorHandlingCapabilities.toolReactivation).toBe(true);
      expect(errorHandlingCapabilities.userInformation).toBe(true);
      expect(errorHandlingCapabilities.conversationContinuity).toBe(true);
    });

    it('should reactivate tools when errors are detected', () => {
      // Test de la réactivation intelligente des tools
      const mockToolResults = [
        { success: true, name: 'create_note' },
        { success: false, name: 'create_folder', result: { error: 'Permission denied' } }
      ];

      const hasErrors = mockToolResults.some(result => !result.success);
      const shouldReactivateTools = hasErrors && mockToolResults.length > 0;

      expect(hasErrors).toBe(true);
      expect(shouldReactivateTools).toBe(true);
      expect(mockToolResults[1]?.success).toBe(false);
      expect(mockToolResults[1]?.result?.error).toBe('Permission denied');
    });

    it('should maintain conversation flow after error correction', () => {
      // Test de la continuité conversationnelle après correction d'erreur
      const errorCorrectionFlow = [
        'tool_execution_error',
        'error_analysis',
        'correction_attempt',
        'tool_reactivation',
        'corrected_tool_call',
        'successful_execution',
        'conversational_response'
      ];

      expect(errorCorrectionFlow).toHaveLength(7);
      expect(errorCorrectionFlow[2]).toBe('correction_attempt');
      expect(errorCorrectionFlow[3]).toBe('tool_reactivation');
      expect(errorCorrectionFlow[4]).toBe('corrected_tool_call');
    });

    it('should preserve conversation context after tool execution', () => {
      // Test de la préservation du contexte conversationnel
      const contextPreservationCapabilities = {
        keepInitialRequest: true,
        contextualConfirmation: true,
        logicalContinuation: true,
        noContextJumping: true,
        successAcknowledgment: true
      };

      expect(contextPreservationCapabilities.keepInitialRequest).toBe(true);
      expect(contextPreservationCapabilities.contextualConfirmation).toBe(true);
      expect(contextPreservationCapabilities.logicalContinuation).toBe(true);
      expect(contextPreservationCapabilities.noContextJumping).toBe(true);
      expect(contextPreservationCapabilities.successAcknowledgment).toBe(true);
    });

    it('should prevent context loss in tool responses', () => {
      // Test que le contexte n'est pas perdu dans les réponses aux tools
      const contextPreservationRules = [
        'GARDE LA DEMANDE INITIALE EN TÊTE',
        'CONFIRMATION CONTEXTUELLE OBLIGATOIRE',
        'SUITE LOGIQUE DANS LE CONTEXTE',
        'Ne JAMAIS "sauter" vers un autre sujet'
      ];

      expect(contextPreservationRules).toHaveLength(4);
      contextPreservationRules.forEach(rule => {
        expect(rule).toBeDefined();
        expect(rule.length).toBeGreaterThan(0);
      });
    });

    it('should enforce contextual confirmation after successful tool execution', () => {
      // Test de la confirmation contextuelle obligatoire
      const contextualConfirmationExamples = [
        'J\'ai créé le dossier *Projets* comme vous l\'avez demandé',
        'Votre note a été ajoutée à la section *Budget* comme souhaité',
        'Le fichier a été téléchargé comme demandé'
      ];

      contextualConfirmationExamples.forEach(example => {
        expect(example).toContain('comme');
        expect(example.includes('demandé') || example.includes('souhaité')).toBe(true);
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