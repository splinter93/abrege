import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSecureErrorHandler } from '../SecureErrorHandler';

// Mock du hook useErrorNotifier
jest.mock('@/hooks/useErrorNotifier', () => ({
  useErrorNotifier: jest.fn()
}));

// Mock du logger
jest.mock('@/utils/logger', () => ({
  simpleLogger: {
    error: jest.fn()
  }
}));

const mockUseErrorNotifier = require('@/hooks/useErrorNotifier').useErrorNotifier;

describe('useSecureErrorHandler', () => {
  const mockHandleApiError = jest.fn();

  beforeEach(() => {
    mockUseErrorNotifier.mockReturnValue({
      handleApiError: mockHandleApiError
    });
    mockHandleApiError.mockClear();
  });

  it('devrait appeler handleApiError avec le bon contexte', () => {
    const TestComponent = () => {
      const { handleError } = useSecureErrorHandler({
        context: 'TestContext',
        operation: 'test_operation',
        userId: 'user123'
      });

      const testError = new Error('Test error');
      handleError(testError, 'test_context');

      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      'test_operation'
    );
  });

  it('devrait gérer les erreurs non-Error', () => {
    const TestComponent = () => {
      const { handleError } = useSecureErrorHandler({
        context: 'TestContext',
        operation: 'test_operation',
        userId: 'user123'
      });

      handleError('String error', 'test_context');

      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(mockHandleApiError).toHaveBeenCalledWith(
      'String error',
      'test_operation'
    );
  });

  it('devrait gérer les erreurs sans userId', () => {
    const TestComponent = () => {
      const { handleError } = useSecureErrorHandler({
        context: 'TestContext',
        operation: 'test_operation'
      });

      const testError = new Error('Test error');
      handleError(testError, 'test_context');

      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      'test_operation'
    );
  });
}); 