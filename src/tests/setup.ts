/**
 * Configuration de setup pour les tests des agents spécialisés
 */

// Mock des variables d'environnement
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock global pour les tests
global.fetch = jest.fn();

// Configuration des mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock des modules Next.js
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: init?.headers || {}
    }))
  }
}));

// Mock des modules Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })),
      rpc: jest.fn()
    }))
  }))
}));

// Mock des services LLM
jest.mock('@/services/llm/services/GroqOrchestrator', () => ({
  GroqOrchestrator: jest.fn().mockImplementation(() => ({
    executeRound: jest.fn()
  }))
}));

// Mock des utilitaires
jest.mock('@/utils/logger', () => ({
  simpleLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    dev: jest.fn()
  },
  logApi: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock des utilitaires d'authentification
jest.mock('@/utils/authUtils', () => ({
  getAuthenticatedUser: jest.fn(() => Promise.resolve({
    success: true,
    userId: 'test-user-id'
  })),
  createAuthenticatedSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        }))
      }))
    }))
  }))
}));

// Configuration des timeouts
jest.setTimeout(30000);
