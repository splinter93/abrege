import { toast } from 'react-hot-toast';
import { simpleLogger as logger } from '@/utils/logger';

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  noteId?: string;
  folderId?: string;
  classeurId?: string;
}

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
  context?: ErrorContext;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Gérer les erreurs API de manière centralisée
   */
  static handleApiError(error: unknown, context: ErrorContext): void {
    const errorHandler = ErrorHandler.getInstance();
    errorHandler.logError(error, context);
    errorHandler.showUserNotification(error, context);
  }

  /**
   * Logger les erreurs de manière structurée
   */
  private logError(error: unknown, context: ErrorContext): void {
    const safeError = error as { message?: string; stack?: string; status?: number; statusText?: string };
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: {
        message: safeError?.message || 'Erreur inconnue',
        stack: safeError?.stack,
        status: safeError?.status,
        statusText: safeError?.statusText,
      },
      context,
      environment: process.env.NODE_ENV,
    };

    if (process.env.NODE_ENV === 'development') {
      logger.dev(`🚨 Erreur API - ${context.operation}`, errorInfo);
    } else {
      // En production, on pourrait envoyer à un service de monitoring
      logger.error(`[ERROR] ${context.operation}:`, safeError?.message || 'Erreur inconnue');
    }
  }

  /**
   * Afficher une notification utilisateur appropriée
   */
  private showUserNotification(error: unknown, context: ErrorContext): void {
    const safeError = error as { status?: number };
    let message = 'Une erreur est survenue';

    // Messages personnalisés selon le type d'opération
    switch (context.operation) {
      case 'create_note':
        message = 'Impossible de créer la note';
        break;
      case 'update_note':
        message = 'Impossible de sauvegarder la note';
        break;
      case 'delete_note':
        message = 'Impossible de supprimer la note';
        break;
      case 'create_folder':
        message = 'Impossible de créer le dossier';
        break;
      case 'update_folder':
        message = 'Impossible de modifier le dossier';
        break;
      case 'delete_folder':
        message = 'Impossible de supprimer le dossier';
        break;
      case 'create_classeur':
        message = 'Impossible de créer le classeur';
        break;
      case 'update_classeur':
        message = 'Impossible de modifier le classeur';
        break;
      case 'delete_classeur':
        message = 'Impossible de supprimer le classeur';
        break;
      default:
        message = 'Une erreur est survenue lors de l\'opération';
    }

    // Ajouter des détails selon le code d'erreur
    if (safeError?.status === 404) {
      message += ' - Élément non trouvé';
    } else if (safeError?.status === 403) {
      message += ' - Accès refusé';
    } else if (safeError?.status === 500) {
      message += ' - Erreur serveur';
    }

    toast.error(message, {
      duration: 4000,
      position: 'bottom-right',
    });
  }

  /**
   * Gérer les erreurs de réseau
   */
  static handleNetworkError(context: ErrorContext): void {
    const message = 'Problème de connexion - Vérifiez votre connexion internet';
    toast.error(message, {
      duration: 6000,
      position: 'bottom-right',
    });

    if (process.env.NODE_ENV === 'development') {
      logger.error(`[NETWORK_ERROR] ${context.operation}: Problème de connexion`);
    }
  }

  /**
   * Gérer les erreurs de validation
   */
  static handleValidationError(field: string, context: ErrorContext): void {
    const message = `Données invalides pour ${field}`;
    toast.error(message, {
      duration: 3000,
      position: 'bottom-right',
    });

    if (process.env.NODE_ENV === 'development') {
      logger.error(`[VALIDATION_ERROR] ${context.operation}: Champ invalide - ${field}`);
    }
  }
}

// Export de l'instance singleton
export const errorHandler = ErrorHandler.getInstance(); 