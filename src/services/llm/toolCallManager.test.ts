import { ToolCallManager } from './toolCallManager';

describe('ToolCallManager - Anti-boucle pour create_folder', () => {
  let toolCallManager: ToolCallManager;

  beforeEach(() => {
    toolCallManager = ToolCallManager.getInstance();
    toolCallManager.clearExecutionHistory();
  });

  describe('create_folder avec même nom', () => {
    it('devrait permettre la création de dossiers avec le même nom', async () => {
      // Premier appel - créer un dossier "Projets"
      const firstCall = {
        id: 'call-1',
        function: {
          name: 'create_folder',
          arguments: '{"name": "Projets", "notebook_id": "notebook-123"}'
        }
      };

      // Deuxième appel - créer un autre dossier "Projets" (même nom)
      const secondCall = {
        id: 'call-2',
        function: {
          name: 'create_folder',
          arguments: '{"name": "Projets", "notebook_id": "notebook-123"}'
        }
      };

      // Simuler l'exécution du premier appel
      const mockExecuteTool = jest.fn().mockResolvedValue({ success: true, data: { id: 'folder-1' } });
      jest.spyOn(require('@/services/agentApiV2Tools'), 'executeTool').mockImplementation(mockExecuteTool);

      // Exécuter le premier appel
      const firstResult = await toolCallManager.executeToolCall(firstCall, 'user-token', 3, { batchId: 'batch-1' });
      expect(firstResult.success).toBe(true);

      // Exécuter le deuxième appel immédiatement après
      const secondResult = await toolCallManager.executeToolCall(secondCall, 'user-token', 3, { batchId: 'batch-2' });
      
      // Le deuxième appel devrait réussir (pas bloqué par l'anti-boucle)
      expect(secondResult.success).toBe(true);
      expect(secondResult.result.code).not.toBe('ANTI_LOOP_SIGNATURE');
    });

    it('devrait toujours bloquer les vrais appels identiques (même ID)', async () => {
      const call = {
        id: 'call-1',
        function: {
          name: 'create_folder',
          arguments: '{"name": "Projets", "notebook_id": "notebook-123"}'
        }
      };

      // Premier appel
      const mockExecuteTool = jest.fn().mockResolvedValue({ success: true, data: { id: 'folder-1' } });
      jest.spyOn(require('@/services/agentApiV2Tools'), 'executeTool').mockImplementation(mockExecuteTool);

      const firstResult = await toolCallManager.executeToolCall(call, 'user-token', 3, { batchId: 'batch-1' });
      expect(firstResult.success).toBe(true);

      // Deuxième appel avec le MÊME ID (vraie boucle)
      const secondResult = await toolCallManager.executeToolCall(call, 'user-token', 3, { batchId: 'batch-2' });
      
      // Celui-ci devrait être bloqué par l'anti-boucle ID
      expect(secondResult.success).toBe(false);
      expect(secondResult.result.code).toBe('ANTI_LOOP_ID');
    });

    it('devrait permettre la création de dossiers avec des noms différents', async () => {
      const firstCall = {
        id: 'call-1',
        function: {
          name: 'create_folder',
          arguments: '{"name": "Projets", "notebook_id": "notebook-123"}'
        }
      };

      const secondCall = {
        id: 'call-2',
        function: {
          name: 'create_folder',
          arguments: '{"name": "Documents", "notebook_id": "notebook-123"}'
        }
      };

      const mockExecuteTool = jest.fn().mockResolvedValue({ success: true, data: { id: 'folder-1' } });
      jest.spyOn(require('@/services/agentApiV2Tools'), 'executeTool').mockImplementation(mockExecuteTool);

      // Premier appel
      const firstResult = await toolCallManager.executeToolCall(firstCall, 'user-token', 3, { batchId: 'batch-1' });
      expect(firstResult.success).toBe(true);

      // Deuxième appel avec nom différent
      const secondResult = await toolCallManager.executeToolCall(secondCall, 'user-token', 3, { batchId: 'batch-2' });
      expect(secondResult.success).toBe(true);
    });
  });

  describe('create_note avec même nom', () => {
    it('devrait permettre la création de notes avec le même nom', async () => {
      const firstCall = {
        id: 'call-1',
        function: {
          name: 'create_note',
          arguments: '{"name": "Todo", "notebook_id": "notebook-123"}'
        }
      };

      const secondCall = {
        id: 'call-2',
        function: {
          name: 'create_note',
          arguments: '{"name": "Todo", "notebook_id": "notebook-123"}'
        }
      };

      const mockExecuteTool = jest.fn().mockResolvedValue({ success: true, data: { id: 'note-1' } });
      jest.spyOn(require('@/services/agentApiV2Tools'), 'executeTool').mockImplementation(mockExecuteTool);

      // Premier appel
      const firstResult = await toolCallManager.executeToolCall(firstCall, 'user-token', 3, { batchId: 'batch-1' });
      expect(firstResult.success).toBe(true);

      // Deuxième appel avec même nom
      const secondResult = await toolCallManager.executeToolCall(secondCall, 'user-token', 3, { batchId: 'batch-2' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.result.code).not.toBe('ANTI_LOOP_SIGNATURE');
    });
  });

  describe('autres outils', () => {
    it('devrait toujours appliquer l\'anti-boucle pour les autres outils', async () => {
      const firstCall = {
        id: 'call-1',
        function: {
          name: 'update_note',
          arguments: '{"ref": "note-123", "content": "Nouveau contenu"}'
        }
      };

      const secondCall = {
        id: 'call-2',
        function: {
          name: 'update_note',
          arguments: '{"ref": "note-123", "content": "Nouveau contenu"}'
        }
      };

      const mockExecuteTool = jest.fn().mockResolvedValue({ success: true, data: { id: 'note-123' } });
      jest.spyOn(require('@/services/agentApiV2Tools'), 'executeTool').mockImplementation(mockExecuteTool);

      // Premier appel
      const firstResult = await toolCallManager.executeToolCall(firstCall, 'user-token', 3, { batchId: 'batch-1' });
      expect(firstResult.success).toBe(true);

      // Deuxième appel identique devrait être bloqué
      const secondResult = await toolCallManager.executeToolCall(secondCall, 'user-token', 3, { batchId: 'batch-2' });
      expect(secondResult.success).toBe(false);
      expect(secondResult.result.code).toBe('ANTI_LOOP_SIGNATURE');
    });
  });
}); 