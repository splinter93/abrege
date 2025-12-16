/**
 * Tests unitaires pour SessionTitleGenerator
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Tests isolés avec mocks
 * - Couverture scénarios critiques
 * - Assertions explicites
 * - Cleanup après chaque test
 */

import { SessionTitleGenerator, getSessionTitleGenerator } from '../SessionTitleGenerator';

// Mock fetch global
global.fetch = jest.fn();

describe('SessionTitleGenerator', () => {
  let generator: SessionTitleGenerator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock GROQ_API_KEY
    process.env.GROQ_API_KEY = 'test-groq-key';
    
    // Créer nouvelle instance
    generator = new SessionTitleGenerator();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should throw error if GROQ_API_KEY missing', () => {
      delete process.env.GROQ_API_KEY;
      
      expect(() => new SessionTitleGenerator()).toThrow(
        'GROQ_API_KEY manquante ou invalide'
      );
    });

    it('should throw error if GROQ_API_KEY empty', () => {
      process.env.GROQ_API_KEY = '   ';
      
      expect(() => new SessionTitleGenerator()).toThrow(
        'GROQ_API_KEY manquante ou invalide'
      );
    });

    it('should create instance with valid API key', () => {
      process.env.GROQ_API_KEY = 'valid-key';
      
      expect(() => new SessionTitleGenerator()).not.toThrow();
    });
  });

  describe('generateTitle', () => {
    it('should return error if sessionId empty', async () => {
      const result = await generator.generateTitle({
        sessionId: '',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('sessionId requis');
    });

    it('should return error if userMessage empty', async () => {
      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('userMessage requis');
    });

    it('should generate title successfully', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Comment apprendre TypeScript',
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 10,
            total_tokens: 60
          },
          model: 'openai/gpt-oss-20b'
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Comment apprendre TypeScript facilement ?'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Comment apprendre TypeScript');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should sanitize title (remove quotes)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '"Introduction à React"',
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ]
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'React basics'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Introduction à React');
    });

    it('should sanitize title (remove trailing punctuation)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Guide Node.js.',
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ]
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Node.js guide'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Guide Node.js');
    });

    it('should truncate long titles', async () => {
      const longTitle = 'Ceci est un titre extrêmement long qui dépasse largement la limite de 60 caractères imposée';
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: longTitle,
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ]
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Long question about many topics'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBeDefined();
      expect(result.title!.length).toBeLessThanOrEqual(61); // 60 + ellipse
      expect(result.title).toContain('…');
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Groq API error: 500');
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network failure')
      );

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });

    it('should handle timeout', async () => {
      // Mock slow response (> 10s)
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ choices: [] })
          }), 15000);
        })
      );

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    it('should handle empty response from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: []
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Réponse Groq invalide');
    });

    it('should capitalize first letter', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'apprendre python',
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ]
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'python tutorial'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Apprendre python');
      expect(result.title![0]).toBe('A'); // First char capitalized
    });

    it('should use fallback title if sanitized result empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '   ',
                role: 'assistant'
              },
              finish_reason: 'stop'
            }
          ]
        })
      });

      const result = await generator.generateTitle({
        sessionId: 'test-session-id',
        userMessage: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.title).toBe('Nouvelle conversation');
    });
  });

  describe('getSessionTitleGenerator (Singleton)', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getSessionTitleGenerator();
      const instance2 = getSessionTitleGenerator();

      expect(instance1).toBe(instance2);
    });
  });
});

