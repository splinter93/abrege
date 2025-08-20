import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionSync } from '../useSessionSync';
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

describe('useSessionSync', () => {
  let mockSessionSyncService: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionSyncService = sessionSyncService;
  });

  describe('syncSessions', () => {
    it('should sync sessions successfully', async () => {
      // Arrange
      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: true,
        sessions: [
          {
            id: '1',
            name: 'Session 1',
            thread: [],
            history_limit: 10,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z',
          },
        ],
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.syncSessions();
        expect(response.success).toBe(true);
      });

      // Assert
      expect(mockSessionSyncService.syncSessionsFromDB).toHaveBeenCalledTimes(1);
    });

    it('should handle sync error gracefully', async () => {
      // Arrange
      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: false,
        error: 'Sync failed',
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.syncSessions();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Sync failed');
      });
    });

    it('should handle network error gracefully', async () => {
      // Arrange
      mockSessionSyncService.syncSessionsFromDB.mockRejectedValue(
        new Error('Network error')
      );

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.syncSessions();
        expect(response.success).toBe(false);
        expect(response.error).toBe('Erreur lors de la synchronisation');
      });
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      // Arrange
      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: true,
        session: {
          id: 'new-session',
          name: 'New Session',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.createSession('New Session');
        expect(response.success).toBe(true);
      });

      // Assert
      expect(mockSessionSyncService.createSessionAndSync).toHaveBeenCalledWith('New Session');
    });

    it('should use default name when no name provided', async () => {
      // Arrange
      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: true,
        session: {
          id: 'new-session',
          name: 'Nouvelle conversation',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        await result.current.createSession();
      });

      // Assert
      expect(mockSessionSyncService.createSessionAndSync).toHaveBeenCalledWith('Nouvelle conversation');
    });
  });

  describe('addMessage', () => {
    it('should add message successfully when current session exists', async () => {
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
        const response = await result.current.addMessage("test-session", message);
        expect(response.success).toBe(true);
      });

      // Assert
      expect(mockSessionSyncService.addMessageAndSync).toHaveBeenCalledWith('session-1', message);
    });

    it('should return error when no current session', async () => {
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
        const response = await result.current.addMessage("test-session", message);
        expect(response.success).toBe(false);
        expect(response.error).toBe('Aucune session active');
      });

      // Assert
      expect(mockSessionSyncService.addMessageAndSync).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      // Arrange
      mockSessionSyncService.deleteSessionAndSync.mockResolvedValue({
        success: true,
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.deleteSession('session-1');
        expect(response.success).toBe(true);
      });

      // Assert
      expect(mockSessionSyncService.deleteSessionAndSync).toHaveBeenCalledWith('session-1');
    });

    it('should handle deletion error gracefully', async () => {
      // Arrange
      mockSessionSyncService.deleteSessionAndSync.mockResolvedValue({
        success: false,
        error: 'Deletion failed',
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.deleteSession('session-1');
        expect(response.success).toBe(false);
        expect(response.error).toBe('Deletion failed');
      });
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Session',
        history_limit: 20,
      };

      mockSessionSyncService.updateSessionAndSync.mockResolvedValue({
        success: true,
        session: {
          id: 'session-1',
          name: 'Updated Session',
          thread: [],
          history_limit: 20,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T11:00:00Z',
        },
      });

      // Act
      const { result } = renderHook(() => useSessionSync());

      await act(async () => {
        const response = await result.current.updateSession('session-1', updateData);
        expect(response.success).toBe(true);
      });

      // Assert
      expect(mockSessionSyncService.updateSessionAndSync).toHaveBeenCalledWith('session-1', updateData);
    });
  });
}); 