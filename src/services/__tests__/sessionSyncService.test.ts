import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionSyncService } from '../sessionSyncService';
import { ChatSessionService } from '../chatSessionService';

// Mock des dépendances
vi.mock('../chatSessionService', () => ({
  ChatSessionService: {
    getInstance: vi.fn(),
  },
}));

describe('SessionSyncService', () => {
  let sessionSyncService: SessionSyncService;
  let mockChatSessionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock du service ChatSessionService
    const mockService = {
      getSessions: vi.fn(),
      createSession: vi.fn(),
      addMessage: vi.fn(),
      deleteSession: vi.fn(),
      updateSession: vi.fn(),
      getSession: vi.fn(),
      getMessages: vi.fn(),
      baseUrl: 'http://localhost:3000',
    } as any;
    
    vi.mocked(ChatSessionService.getInstance).mockReturnValue(mockService);
    mockChatSessionService = mockService;
    
    sessionSyncService = SessionSyncService.getInstance();
  });

  describe('syncSessionsFromDB', () => {
    it('should sync sessions from DB to store successfully', async () => {
      // Arrange
      const mockSessions = [
        {
          id: '1',
          name: 'Session 1',
          thread: [
            {
              id: 'msg1',
              role: 'user',
              content: 'Hello',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
          ],
          history_limit: 30,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: mockSessions,
      });

      // Act
      const result = await sessionSyncService.syncSessionsFromDB();

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessions).toBeDefined();
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions![0].name).toBe('Session 1');
      expect(mockChatSessionService.getSessions).toHaveBeenCalledTimes(1);
    });

    it('should handle API error gracefully', async () => {
      // Arrange
      mockChatSessionService.getSessions.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      // Act
      const result = await sessionSyncService.syncSessionsFromDB();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should convert Date timestamps to ISO strings', async () => {
      // Arrange
      const mockSessions = [
        {
          id: '1',
          name: 'Session 1',
          thread: [
            {
              id: 'msg1',
              role: 'user',
              content: 'Hello',
              timestamp: new Date('2024-01-01T10:00:00Z'),
            },
          ],
          history_limit: 30,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: mockSessions,
      });

      // Act
      const result = await sessionSyncService.syncSessionsFromDB();

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessions![0].thread[0].timestamp).toBe('2024-01-01T10:00:00.000Z');
    });
  });

  describe('createSessionAndSync', () => {
    it('should create session in DB and sync successfully', async () => {
      // Arrange
      const mockSession = {
        id: 'new-session',
        name: 'New Session',
        thread: [],
        history_limit: 30,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockChatSessionService.createSession.mockResolvedValue({
        success: true,
        data: mockSession,
      });

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: [mockSession],
      });

      // Act
      const result = await sessionSyncService.createSessionAndSync('New Session');

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session!.name).toBe('New Session');
      expect(mockChatSessionService.createSession).toHaveBeenCalledWith({
        name: 'New Session',
        history_limit: 30,
      });
    });

    it('should handle creation error gracefully', async () => {
      // Arrange
      mockChatSessionService.createSession.mockResolvedValue({
        success: false,
        error: 'Creation failed',
      });

      // Act
      const result = await sessionSyncService.createSessionAndSync('New Session');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
    });
  });

  describe('addMessageAndSync', () => {
    it('should add message to DB and sync successfully', async () => {
      // Arrange
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T10:00:00Z',
      };

      mockChatSessionService.addMessage.mockResolvedValue({
        success: true,
        data: { session: { id: '1' }, message: { id: 'msg1', ...message } },
      });

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      const result = await sessionSyncService.addMessageAndSync('session-1', message);

      // Assert
      expect(result.success).toBe(true);
      expect(mockChatSessionService.addMessage).toHaveBeenCalledWith('session-1', {
        role: 'user',
        content: 'Hello world',
        timestamp: expect.any(Date), // Should be converted to Date
      });
    });

    it('should convert string timestamp to Date for API', async () => {
      // Arrange
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: '2024-01-01T10:00:00Z',
      };

      mockChatSessionService.addMessage.mockResolvedValue({
        success: true,
        data: { session: { id: '1' }, message: { id: 'msg1', ...message } },
      });

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      await sessionSyncService.addMessageAndSync('session-1', message);

      // Assert
      expect(mockChatSessionService.addMessage).toHaveBeenCalledWith('session-1', {
        role: 'user',
        content: 'Hello world',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('deleteSessionAndSync', () => {
    it('should delete session from DB and sync successfully', async () => {
      // Arrange
      mockChatSessionService.deleteSession.mockResolvedValue({
        success: true,
      });

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: [],
      });

      // Act
      const result = await sessionSyncService.deleteSessionAndSync('session-1');

      // Assert
      expect(result.success).toBe(true);
      expect(mockChatSessionService.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should handle deletion error gracefully', async () => {
      // Arrange
      mockChatSessionService.deleteSession.mockResolvedValue({
        success: false,
        error: 'Deletion failed',
      });

      // Act
      const result = await sessionSyncService.deleteSessionAndSync('session-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion failed');
    });
  });

  describe('updateSessionAndSync', () => {
    it('should update session in DB and sync successfully', async () => {
      // Arrange
      const updatedSession = {
        id: 'session-1',
        name: 'Updated Session',
        thread: [],
        history_limit: 20,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
      };

      mockChatSessionService.updateSession.mockResolvedValue({
        success: true,
        data: updatedSession,
      });

      mockChatSessionService.getSessions.mockResolvedValue({
        success: true,
        data: [updatedSession],
      });

      // Act
      const result = await sessionSyncService.updateSessionAndSync('session-1', {
        name: 'Updated Session',
        history_limit: 20,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session!.name).toBe('Updated Session');
      expect(mockChatSessionService.updateSession).toHaveBeenCalledWith('session-1', {
        name: 'Updated Session',
        history_limit: 20,
      });
    });
  });
}); 