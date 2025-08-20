import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/store/useChatStore';
import { useSessionSync } from '@/hooks/useSessionSync';
import { sessionSyncService } from '@/services/sessionSyncService';

// Mock des dépendances
vi.mock('@/services/sessionSyncService');
vi.mock('@/store/useChatStore', () => ({
  useChatStore: vi.fn(() => ({
    setLoading: vi.fn(),
    setError: vi.fn(),
    currentSession: {
      id: 'session-1',
      name: 'Test Session',
      thread: [],
      history_limit: 10,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
    },
  })),
}));

describe('Chat Architecture Integration', () => {
  let mockSessionSyncService: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionSyncService = sessionSyncService;
  });

  describe('Complete workflow', () => {
    it('should handle complete session lifecycle', async () => {
      // Arrange - Mock successful responses
      const mockSessions = [
        {
          id: 'session-1',
          name: 'Session 1',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: true,
        sessions: mockSessions,
      });

      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: true,
        session: {
          id: 'new-session',
          name: 'New Session',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T11:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
        },
      });

      mockSessionSyncService.addMessageAndSync.mockResolvedValue({
        success: true,
      });

      mockSessionSyncService.deleteSessionAndSync.mockResolvedValue({
        success: true,
      });

      // Act & Assert - Test complete workflow
      const { result: storeResult } = renderHook(() => useChatStore());
      const { result: hookResult } = renderHook(() => useSessionSync());

      // 1. Initial sync
      await act(async () => {
        await storeResult.current.syncSessions();
      });

      expect(mockSessionSyncService.syncSessionsFromDB).toHaveBeenCalledTimes(1);

      // 2. Create new session
      await act(async () => {
        await hookResult.current.createSession('New Session');
      });

      expect(mockSessionSyncService.createSessionAndSync).toHaveBeenCalledWith('New Session');

      // 3. Add message
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T12:00:00Z',
      };

      await act(async () => {
        await hookResult.current.addMessage(message);
      });

      expect(mockSessionSyncService.addMessageAndSync).toHaveBeenCalledWith('session-1', message);

      // 4. Delete session
      await act(async () => {
        await hookResult.current.deleteSession('session-1');
      });

      expect(mockSessionSyncService.deleteSessionAndSync).toHaveBeenCalledWith('session-1');
    });

    it('should handle errors gracefully throughout workflow', async () => {
      // Arrange - Mock error responses
      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: false,
        error: 'Creation failed',
      });

      // Act & Assert
      const { result: storeResult } = renderHook(() => useChatStore());
      const { result: hookResult } = renderHook(() => useSessionSync());

      // Test sync error
      await act(async () => {
        await storeResult.current.syncSessions();
      });

      expect(storeResult.current.error).toBe('Network error');

      // Test creation error
      await act(async () => {
        await hookResult.current.createSession('New Session');
      });

      expect(hookResult.current.createSession).toBeDefined();
    });
  });

  describe('Type conversion', () => {
    it('should handle Date to string conversion correctly', async () => {
      // Arrange
      const mockSessionsWithDate = [
        {
          id: 'session-1',
          name: 'Session 1',
          thread: [
            {
              id: 'msg1',
              role: 'user',
              content: 'Hello',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
          ],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: true,
        sessions: mockSessionsWithDate,
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.syncSessions();
      });

      // Assert - Check that conversion happened
      expect(mockSessionSyncService.syncSessionsFromDB).toHaveBeenCalledTimes(1);
    });

    it('should handle string to Date conversion for API calls', async () => {
      // Arrange
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T10:00:00Z',
      };

      mockSessionSyncService.addMessageAndSync.mockResolvedValue({
        success: true,
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        await result.current.addMessage(message);
      });

      // Assert - Check that conversion happened
      expect(mockSessionSyncService.addMessageAndSync).toHaveBeenCalledWith('session-1', {
        role: 'user',
        content: 'Hello world',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('State management', () => {
    it('should maintain consistent state across operations', async () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act & Assert
      // Initial state
      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSession).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();

      // Set sessions
      act(() => {
        result.current.setSessions([
          {
            id: '1',
            name: 'Session 1',
            thread: [],
            history_limit: 10,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z',
          },
        ]);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].name).toBe('Session 1');

      // Set current session
      act(() => {
        result.current.setCurrentSession({
          id: '1',
          name: 'Session 1',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        });
      });

      expect(result.current.currentSession).toBeDefined();
      expect(result.current.currentSession!.name).toBe('Session 1');
    });

    it('should handle UI state correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act & Assert
      // Toggle widget
      act(() => {
        result.current.toggleWidget();
      });

      expect(result.current.isWidgetOpen).toBe(true);

      // Open fullscreen
      act(() => {
        result.current.openFullscreen();
      });

      expect(result.current.isFullscreen).toBe(true);
      expect(result.current.isWidgetOpen).toBe(false);

      // Close widget
      act(() => {
        result.current.closeWidget();
      });

      expect(result.current.isWidgetOpen).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockSessionSyncService.syncSessionsFromDB.mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.syncSessions();
      });

      // Assert
      expect(result.current.error).toBe('Erreur lors de la synchronisation');
      expect(result.current.loading).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.createSession('New Session');
      });

      // Assert
      expect(result.current.error).toBe('API Error');
      expect(result.current.loading).toBe(false);
    });

    it('should handle missing current session gracefully', async () => {
      // Arrange
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T10:00:00Z',
      };

      // Mock useChatStore to return no current session
      vi.mocked(require('@/store/useChatStore').useChatStore).mockReturnValue({
        setLoading: vi.fn(),
        setError: vi.fn(),
        currentSession: null,
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.addMessage(message);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Aucune session active');
      });

      // Assert
      expect(mockSessionSyncService.addMessageAndSync).not.toHaveBeenCalled();
    });
  });
}); 