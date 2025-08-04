import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { simpleLogger as logger } from '@/utils/logger';

export interface ErrorNotification {
  title: string;
  message?: string;
  type?: 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ApiError {
  message: string;
  details?: string[];
  code?: string;
}

/**
 * Hook centralisé pour la gestion des erreurs avec notifications toast
 * 
 * @returns { notifyError, notifyWarning, notifyInfo, handleApiError }
 */
export const useErrorNotifier = () => {
  const notifyError = useCallback((notification: ErrorNotification) => {
    toast.error(
      `${notification.title}${notification.message ? `: ${notification.message}` : ''}`,
      {
        duration: notification.duration || 5000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
        },
      }
    );
  }, []);

  const notifyWarning = useCallback((notification: ErrorNotification) => {
    toast(
      `${notification.title}${notification.message ? `: ${notification.message}` : ''}`,
      {
        duration: notification.duration || 4000,
        position: 'top-right',
        style: {
          background: '#f59e0b',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
        },
      }
    );
  }, []);

  const notifyInfo = useCallback((notification: ErrorNotification) => {
    toast.success(
      `${notification.title}${notification.message ? `: ${notification.message}` : ''}`,
      {
        duration: notification.duration || 3000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '12px 16px',
        },
      }
    );
  }, []);

  const handleApiError = useCallback((error: ApiError | Error | unknown, context?: string) => {
    let errorMessage = 'Une erreur inattendue s\'est produite';
    let errorDetails: string[] = [];

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as ApiError).message;
      errorDetails = (error as ApiError).details || [];
    }

    notifyError({
      title: context ? `Erreur ${context}` : 'Erreur',
      message: errorDetails.length > 0 ? errorDetails.join(', ') : errorMessage,
      duration: 6000,
    });

    // Log en développement
    if (process.env.NODE_ENV === 'development') {
      logger.error('[ErrorNotifier]', error);
    }
  }, [notifyError]);

  return {
    notifyError,
    notifyWarning,
    notifyInfo,
    handleApiError,
  };
}; 