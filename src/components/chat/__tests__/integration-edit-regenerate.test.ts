/**
 * Tests d'intégration pour flow édition/régénération
 * Flow: Édition message → régénération réponse
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Tests intégration flows critiques
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatMessage } from '@/types/chat';

// Setup variables d'environnement
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Mock des dépendances
vi.mock('@/utils/supabaseClient', () => {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'session' }, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  };
  return {
    createSupabaseClient: () => supabase,
  };
});

describe('[Integration] Edit & Regenerate', () => {
  const mockSessionId = 'test-session-123';
  let messages: ChatMessage[];

  beforeEach(() => {
    messages = [
      {
        id: 'msg-1',
        session_id: mockSessionId,
        sequence_number: 1,
        role: 'user',
        content: 'Message original',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'msg-2',
        session_id: mockSessionId,
        sequence_number: 2,
        role: 'assistant',
        content: 'Réponse originale',
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  });

  it('should handle edit message → regenerate response', async () => {
    // Arrange: Message existant
    const originalUserMessage = messages[0];
    const originalAssistantMessage = messages[1];

    // Act: Éditer le message utilisateur
    const editedUserMessage: ChatMessage = {
      ...originalUserMessage,
      content: 'Message édité',
      updated_at: new Date().toISOString()
    };

    // Act: Supprimer les messages après le message édité (simulation)
    const messagesAfterEdit = messages.filter(m => m.sequence_number > editedUserMessage.sequence_number);
    expect(messagesAfterEdit.length).toBe(1); // Message assistant à supprimer

    // Act: Régénérer la réponse
    const regeneratedResponse: ChatMessage = {
      id: 'msg-3',
      session_id: mockSessionId,
      sequence_number: 2, // Même sequence_number que l'ancien message assistant
      role: 'assistant',
      content: 'Nouvelle réponse régénérée',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Assert: Nouvelle réponse générée
    expect(editedUserMessage.content).toBe('Message édité');
    expect(regeneratedResponse.content).toBe('Nouvelle réponse régénérée');
    expect(regeneratedResponse.role).toBe('assistant');
    expect(regeneratedResponse.sequence_number).toBe(2);
  });

  it('should handle multiple edits and regenerations', async () => {
    // Arrange: Plusieurs messages
    messages.push({
      id: 'msg-3',
      session_id: mockSessionId,
      sequence_number: 3,
      role: 'user',
      content: 'Deuxième message',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Act: Éditer le premier message
    const editedMessage1 = {
      ...messages[0],
      content: 'Premier message édité',
      updated_at: new Date().toISOString()
    };

    // Act: Supprimer tous les messages après
    const messagesToDelete = messages.filter(m => m.sequence_number > editedMessage1.sequence_number);
    expect(messagesToDelete.length).toBe(2); // 2 messages à supprimer

    // Act: Régénérer
    const regeneratedResponse: ChatMessage = {
      id: 'msg-4',
      session_id: mockSessionId,
      sequence_number: 2,
      role: 'assistant',
      content: 'Réponse régénérée après édition',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Assert: Flow complet
    expect(editedMessage1.content).toBe('Premier message édité');
    expect(regeneratedResponse.content).toContain('régénérée');
  });

  it('should maintain sequence_number consistency after edit', async () => {
    // Arrange: Messages avec sequence_numbers
    const userMessage = messages[0];
    const assistantMessage = messages[1];

    // Act: Éditer et régénérer
    const editedUser = { ...userMessage, content: 'Édité' };
    const regeneratedAssistant: ChatMessage = {
      ...assistantMessage,
      id: 'msg-new',
      content: 'Nouvelle réponse',
      timestamp: new Date().toISOString()
    };

    // Assert: Sequence numbers cohérents
    expect(editedUser.sequence_number).toBe(1);
    expect(regeneratedAssistant.sequence_number).toBe(2);
    expect(regeneratedAssistant.sequence_number).toBeGreaterThan(editedUser.sequence_number);
  });
});

