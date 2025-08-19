"use client";

import { useCallback } from 'react';
import { useErrorNotifier } from '@/hooks/useErrorNotifier';
import { simpleLogger as logger } from '@/utils/logger';

interface SecureErrorHandlerProps {
  context: string;
  operation: string;
  userId?: string;
}

/**
 * Hook pour gérer les erreurs de manière sécurisée
 * - Log les erreurs côté serveur uniquement
 * - Affiche des messages génériques aux utilisateurs
 * - Ne révèle jamais d'informations sensibles
 */
export function useSecureErrorHandler({ context, operation, userId }: SecureErrorHandlerProps) {
  const { handleApiError } = useErrorNotifier();

  const handleError = useCallback((error: unknown, userContext?: string) => {
    // Log sécurisé côté serveur (jamais en production)
    if (process.env.NODE_ENV === 'development') {
      logger.error(`[${context}] Erreur ${operation}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: userId ? userId.slice(0, 8) + '...' : 'unknown',
        userContext
      });
    }

    // En production, log minimal sans informations sensibles
    if (process.env.NODE_ENV === 'production') {
      logger.error(`[${context}] Erreur ${operation} pour l'utilisateur ${userId ? userId.slice(0, 8) + '...' : 'unknown'}`);
    }

    // Notification utilisateur sécurisée
    handleApiError(error, operation);
  }, [context, operation, userId, handleApiError]);

  return {
    handleError
  };
} 