// Setup pour les tests d'intégration Groq
import '@testing-library/jest-dom';

// Configuration globale des mocks
beforeAll(() => {
  // Mock des variables d'environnement
  process.env.NODE_ENV = 'test';
  process.env.GROQ_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
  
  // Mock de console pour réduire le bruit dans les tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Nettoyage après tous les tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Configuration des timeouts
jest.setTimeout(30000);

// Mock des modules externes
jest.mock('@/utils/logger', () => ({
  simpleLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
})); 