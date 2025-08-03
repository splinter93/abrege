import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '../useChatStore';
import { sessionSyncService } from '@/services/sessionSyncService';

// Mock des dépendances
vi.mock('@/services/sessionSyncService');

describe('useChatStore', () => {
  let mockSessionSyncService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionSyncService = sessionSyncService;
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      // Act
      const { result } = renderHook(() => useChatStore());

      // Assert
      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSession).toBeNull();
      expect(result.current.isWidgetOpen).toBe(false);
      expect(result.current.isFullscreen).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('UI actions', () => {
    it('should toggle widget correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act
      act(() => {
        result.current.toggleWidget();
      });

      // Assert
      expect(result.current.isWidgetOpen).toBe(true);

      // Act again
      act(() => {
        result.current.toggleWidget();
      });

      // Assert
      expect(result.current.isWidgetOpen).toBe(false);
    });

    it('should open fullscreen correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act
      act(() => {
        result.current.openFullscreen();
      });

      // Assert
      expect(result.current.isFullscreen).toBe(true);
      expect(result.current.isWidgetOpen).toBe(false);
    });

    it('should close widget correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act
      act(() => {
        result.current.toggleWidget(); // Open first
        result.current.closeWidget();
      });

      // Assert
      expect(result.current.isWidgetOpen).toBe(false);
    });
  });

  describe('syncSessions', () => {
    it('should sync sessions successfully', async () => {
      // Arrange
      const mockSessions = [
        {
          id: '1',
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

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.syncSessions();
      });

      // Assert
      expect(mockSessionSyncService.syncSessionsFromDB).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle sync error gracefully', async () => {
      // Arrange
      mockSessionSyncService.syncSessionsFromDB.mockResolvedValue({
        success: false,
        error: 'Sync failed',
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.syncSessions();
      });

      // Assert
      expect(result.current.error).toBe('Sync failed');
      expect(result.current.loading).toBe(false);
    });

    it('should handle network error gracefully', async () => {
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
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      // Arrange
      const mockSession = {
        id: 'new-session',
        name: 'New Session',
        thread: [],
        history_limit: 10,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: true,
        session: mockSession,
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.createSession('New Session');
      });

      // Assert
      expect(mockSessionSyncService.createSessionAndSync).toHaveBeenCalledWith('New Session');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle creation error gracefully', async () => {
      // Arrange
      mockSessionSyncService.createSessionAndSync.mockResolvedValue({
        success: false,
        error: 'Creation failed',
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.createSession('New Session');
      });

      // Assert
      expect(result.current.error).toBe('Creation failed');
      expect(result.current.loading).toBe(false);
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

      // Set current session
      const { result } = renderHook(() => useChatStore());
      act(() => {
        result.current.setCurrentSession({
          id: 'session-1',
          name: 'Test Session',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        });
      });

      mockSessionSyncService.addMessageAndSync.mockResolvedValue({
        success: true,
      });

      // Act
      await act(async () => {
        await result.current.addMessage(message);
      });

      // Assert
      expect(mockSessionSyncService.addMessageAndSync).toHaveBeenCalledWith('session-1', message);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle error when no current session', async () => {
      // Arrange
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T10:00:00Z',
      };

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.addMessage(message);
      });

      // Assert
      expect(result.current.error).toBe('Aucune session active');
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
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      // Assert
      expect(mockSessionSyncService.deleteSessionAndSync).toHaveBeenCalledWith('session-1');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle deletion error gracefully', async () => {
      // Arrange
      mockSessionSyncService.deleteSessionAndSync.mockResolvedValue({
        success: false,
        error: 'Deletion failed',
      });

      // Act
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      // Assert
      expect(result.current.error).toBe('Deletion failed');
      expect(result.current.loading).toBe(false);
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
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.updateSession('session-1', updateData);
      });

      // Assert
      expect(mockSessionSyncService.updateSessionAndSync).toHaveBeenCalledWith('session-1', updateData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('state setters', () => {
    it('should set sessions correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());
      const sessions = [
        {
          id: '1',
          name: 'Session 1',
          thread: [],
          history_limit: 10,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      // Act
      act(() => {
        result.current.setSessions(sessions);
      });

      // Assert
      expect(result.current.sessions).toEqual(sessions);
    });

    it('should set current session correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());
      const session = {
        id: '1',
        name: 'Session 1',
        thread: [],
        history_limit: 10,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // Act
      act(() => {
        result.current.setCurrentSession(session);
      });

      // Assert
      expect(result.current.currentSession).toEqual(session);
    });

    it('should set loading state correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act
      act(() => {
        result.current.setLoading(true);
      });

      // Assert
      expect(result.current.loading).toBe(true);

      // Act again
      act(() => {
        result.current.setLoading(false);
      });

      // Assert
      expect(result.current.loading).toBe(false);
    });

    it('should set error state correctly', () => {
      // Arrange
      const { result } = renderHook(() => useChatStore());

      // Act
      act(() => {
        result.current.setError('Test error');
      });

      // Assert
      expect(result.current.error).toBe('Test error');

      // Act again
      act(() => {
        result.current.setError(null);
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });
}); 