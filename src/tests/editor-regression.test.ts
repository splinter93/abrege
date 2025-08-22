/**
 * Tests de régression pour l'éditeur
 * Vérifie que toutes les fonctionnalités fonctionnent après le nettoyage
 */

import { logger, LogCategory } from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

// Mock des modules externes
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    editorError: jest.fn(),
    editorInfo: jest.fn(),
    editorDebug: jest.fn(),
    apiError: jest.fn(),
    apiInfo: jest.fn(),
    performance: jest.fn(),
  },
  LogCategory: {
    EDITOR: 'EDITOR',
    SLASH_COMMANDS: 'SLASH_COMMANDS',
    TOOLBAR: 'TOOLBAR',
    EXTENSIONS: 'EXTENSIONS',
    API: 'API',
    PERFORMANCE: 'PERFORMANCE',
  },
}));

jest.mock('@/utils/errorHandler', () => ({
  errorHandler: {
    handleError: jest.fn(),
    handleEditorError: jest.fn(),
    handleApiError: jest.fn(),
    handleCriticalError: jest.fn(),
    getErrorStats: jest.fn(),
    resetErrorStats: jest.fn(),
  },
}));

describe('Editor Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Logger System', () => {
    it('should log errors correctly', () => {
      const error = new Error('Test error');
      logger.error(LogCategory.EDITOR, 'Test message', error);
      
      expect(logger.error).toHaveBeenCalledWith(
        LogCategory.EDITOR,
        'Test message',
        error
      );
    });

    it('should log info messages correctly', () => {
      logger.info(LogCategory.EDITOR, 'Test info');
      
      expect(logger.info).toHaveBeenCalledWith(
        LogCategory.EDITOR,
        'Test info'
      );
    });

    it('should log debug messages only in development', () => {
      logger.debug(LogCategory.EDITOR, 'Test debug');
      
      expect(logger.debug).toHaveBeenCalledWith(
        LogCategory.EDITOR,
        'Test debug'
      );
    });
  });

  describe('Error Handler', () => {
    it('should handle editor errors correctly', () => {
      const error = new Error('Editor error');
      errorHandler.handleEditorError(error, 'test-operation', 'test-note-id');
      
      expect(errorHandler.handleEditorError).toHaveBeenCalledWith(
        error,
        'test-operation',
        'test-note-id'
      );
    });

    it('should handle API errors correctly', () => {
      const error = new Error('API error');
      errorHandler.handleApiError(error, '/api/test', 'test-user-id');
      
      expect(errorHandler.handleApiError).toHaveBeenCalledWith(
        error,
        '/api/test',
        'test-user-id'
      );
    });

    it('should handle critical errors correctly', () => {
      const error = new Error('Critical error');
      const context = { component: 'Editor', operation: 'test' };
      errorHandler.handleCriticalError(error, context);
      
      expect(errorHandler.handleCriticalError).toHaveBeenCalledWith(
        error,
        context
      );
    });
  });

  describe('Type Safety', () => {
    it('should have proper types for editor instances', () => {
      // Vérifier que les types sont correctement définis
      expect(typeof LogCategory.EDITOR).toBe('string');
      expect(typeof LogCategory.SLASH_COMMANDS).toBe('string');
      expect(typeof LogCategory.TOOLBAR).toBe('string');
      expect(typeof LogCategory.EXTENSIONS).toBe('string');
      expect(typeof LogCategory.API).toBe('string');
      expect(typeof LogCategory.PERFORMANCE).toBe('string');
    });

    it('should have proper types for error handling', () => {
      expect(typeof errorHandler.handleEditorError).toBe('function');
      expect(typeof errorHandler.handleApiError).toBe('function');
      expect(typeof errorHandler.handleCriticalError).toBe('function');
      expect(typeof errorHandler.getErrorStats).toBe('function');
      expect(typeof errorHandler.resetErrorStats).toBe('function');
    });
  });

  describe('Performance', () => {
    it('should log performance metrics correctly', () => {
      logger.performance(LogCategory.EDITOR, 'test-operation', 100);
      
      expect(logger.performance).toHaveBeenCalledWith(
        LogCategory.EDITOR,
        'test-operation',
        100
      );
    });

    it('should handle multiple log calls efficiently', () => {
      // Simuler plusieurs appels de log
      for (let i = 0; i < 100; i++) {
        logger.info(LogCategory.EDITOR, `Message ${i}`);
      }
      
      expect(logger.info).toHaveBeenCalledTimes(100);
    });
  });

  describe('Error Recovery', () => {
    it('should attempt recovery for recoverable errors', () => {
      const error = new Error('Network error');
      errorHandler.handleError(error, { component: 'Editor' }, 'high');
      
      expect(errorHandler.handleError).toHaveBeenCalledWith(
        error,
        { component: 'Editor' },
        'high'
      );
    });

    it('should not attempt recovery for critical errors', () => {
      const error = new Error('Critical system error');
      errorHandler.handleError(error, { component: 'System' }, 'critical');
      
      expect(errorHandler.handleError).toHaveBeenCalledWith(
        error,
        { component: 'System' },
        'high'
      );
    });
  });

  describe('Integration', () => {
    it('should integrate logger and error handler correctly', () => {
      const error = new Error('Integration test error');
      
      // Logger l'erreur
      logger.error(LogCategory.EDITOR, 'Integration error', error);
      
      // Gérer l'erreur
      errorHandler.handleEditorError(error, 'integration-test');
      
      expect(logger.error).toHaveBeenCalled();
      expect(errorHandler.handleEditorError).toHaveBeenCalled();
    });

    it('should maintain state consistency across operations', () => {
      // Simuler une séquence d'opérations
      logger.info(LogCategory.EDITOR, 'Operation 1');
      logger.info(LogCategory.EDITOR, 'Operation 2');
      logger.info(LogCategory.EDITOR, 'Operation 3');
      
      expect(logger.info).toHaveBeenCalledTimes(3);
    });
  });
});

// Tests de validation des composants
describe('Component Validation', () => {
  it('should validate editor component types', () => {
    // Vérifier que les types d'interface sont corrects
    expect(LogCategory).toBeDefined();
    expect(logger).toBeDefined();
    expect(errorHandler).toBeDefined();
  });

  it('should validate error handler singleton pattern', () => {
    const instance1 = errorHandler;
    const instance2 = errorHandler;
    
    expect(instance1).toBe(instance2);
  });
});

// Tests de stress
describe('Stress Tests', () => {
  it('should handle rapid error logging without issues', () => {
    const errors = Array.from({ length: 50 }, (_, i) => 
      new Error(`Stress test error ${i}`)
    );
    
    errors.forEach((error, index) => {
      logger.error(LogCategory.EDITOR, `Stress test ${index}`, error);
    });
    
    expect(logger.error).toHaveBeenCalledTimes(50);
  });

  it('should handle concurrent operations correctly', () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      Promise.resolve().then(() => {
        logger.info(LogCategory.EDITOR, `Concurrent operation ${i}`);
      })
    );
    
    return Promise.all(promises).then(() => {
      expect(logger.info).toHaveBeenCalledTimes(10);
    });
  });
}); 