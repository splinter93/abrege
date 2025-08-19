"use client";

import { useCallback } from 'react';
import { useErrorNotifier } from '@/hooks/useErrorNotifier';
import { simpleLogger as logger } from '@/utils/logger';

interface SecureErrorHandlerProps {
  context: string;
  operation: string;
  userId?: string;
}

export function useSecureErrorHandler({ context, operation, userId }: SecureErrorHandlerProps) {
  const { handleApiError } = useErrorNotifier();

  const handleError = useCallback((error: unknown, userContext?: string) => {
    if (process.env.NODE_ENV === 'development') {
      logger.error(`[${context}] Erreur ${operation}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: userId ? userId.slice(0, 8) + '...' : 'unknown',
        userContext
      });
    }
    if (process.env.NODE_ENV === 'production') {
      logger.error(`[${context}] Erreur ${operation} pour l'utilisateur ${userId ? userId.slice(0, 8) + '...' : 'unknown'}`);
    }
    handleApiError(error, operation);
  }, [context, operation, userId, handleApiError]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    userContext?: string
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, userContext);
      return null;
    }
  }, [handleError]);

  return { handleError, handleAsyncError };
} 