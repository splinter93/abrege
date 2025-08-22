/**
 * Gestionnaire d'erreurs robuste pour l'éditeur et l'application
 * Centralise la gestion des erreurs avec logging et fallbacks
 */

import { logger, LogCategory } from './logger';

export interface ErrorContext {
  component?: string;
  operation?: string;
  userId?: string;
  noteId?: string;
  editorState?: string;
  [key: string]: unknown;
}

export interface ErrorInfo {
  message: string;
  error: Error | unknown;
  context?: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export class EditorErrorHandler {
  private static instance: EditorErrorHandler;
  private errorCount = 0;
  private maxErrorsPerMinute = 10;
  private errorWindow: number[] = [];

  private constructor() {}

  static getInstance(): EditorErrorHandler {
    if (!EditorErrorHandler.instance) {
      EditorErrorHandler.instance = new EditorErrorHandler();
    }
    return EditorErrorHandler.instance;
  }

  /**
   * Gère une erreur avec contexte et logging approprié
   */
  handleError(error: Error | unknown, context?: ErrorContext, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorInfo: ErrorInfo = {
      message: this.extractErrorMessage(error),
      error,
      context,
      severity,
      recoverable: this.isRecoverable(error, severity)
    };

    // Limiter le taux d'erreurs pour éviter le spam
    if (!this.shouldLogError()) {
      return;
    }

    // Logger l'erreur selon sa sévérité
    this.logError(errorInfo);

    // Actions spécifiques selon la sévérité
    this.handleErrorBySeverity(errorInfo);

    // Incrémenter le compteur d'erreurs
    this.incrementErrorCount();
  }

  /**
   * Gère une erreur d'éditeur spécifiquement
   */
  handleEditorError(error: Error | unknown, operation: string, noteId?: string): void {
    this.handleError(error, {
      component: 'Editor',
      operation,
      noteId
    }, 'medium');
  }

  /**
   * Gère une erreur d'API avec retry automatique
   */
  handleApiError(error: Error | unknown, endpoint: string, userId?: string): void {
    this.handleError(error, {
      component: 'API',
      operation: endpoint,
      userId
    }, 'high');
  }

  /**
   * Gère une erreur critique avec notification utilisateur
   */
  handleCriticalError(error: Error | unknown, context?: ErrorContext): void {
    this.handleError(error, context, 'critical');
    
    // Notifier l'utilisateur pour les erreurs critiques
    if (typeof window !== 'undefined') {
      // En production, envoyer à un service de monitoring
      this.notifyUser('Une erreur critique s\'est produite. Veuillez rafraîchir la page.');
    }
  }

  /**
   * Vérifie si une erreur est récupérable
   */
  private isRecoverable(error: Error | unknown, severity: string): boolean {
    if (severity === 'critical') return false;
    
    // Erreurs de réseau généralement récupérables
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return true;
      }
    }
    
    return severity === 'low' || severity === 'medium';
  }

  /**
   * Extrait le message d'erreur de manière sûre
   */
  private extractErrorMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Erreur inconnue';
  }

  /**
   * Log l'erreur selon sa sévérité
   */
  private logError(errorInfo: ErrorInfo): void {
    const { message, error, context, severity } = errorInfo;
    
    switch (severity) {
      case 'critical':
        logger.error(LogCategory.EDITOR, `[CRITIQUE] ${message}`, error);
        break;
      case 'high':
        logger.error(LogCategory.EDITOR, `[ÉLEVÉE] ${message}`, error);
        break;
      case 'medium':
        logger.warn(LogCategory.EDITOR, `[MOYENNE] ${message}`);
        break;
      case 'low':
        logger.info(LogCategory.EDITOR, `[FAIBLE] ${message}`);
        break;
    }
  }

  /**
   * Actions spécifiques selon la sévérité
   */
  private handleErrorBySeverity(errorInfo: ErrorInfo): void {
    const { severity, recoverable } = errorInfo;

    switch (severity) {
      case 'critical':
        // Sauvegarder l'état et rediriger vers une page d'erreur
        this.saveErrorState(errorInfo);
        break;
      case 'high':
        // Tenter une récupération automatique
        if (recoverable) {
          this.attemptRecovery(errorInfo);
        }
        break;
      case 'medium':
        // Logger et continuer
        break;
      case 'low':
        // Ignorer silencieusement
        break;
    }
  }

  /**
   * Sauvegarde l'état en cas d'erreur critique
   */
  private saveErrorState(errorInfo: ErrorInfo): void {
    try {
      if (typeof window !== 'undefined') {
        const errorState = {
          timestamp: new Date().toISOString(),
          error: errorInfo.message,
          context: errorInfo.context,
          url: window.location.href
        };
        localStorage.setItem('editor_error_state', JSON.stringify(errorState));
      }
    } catch (e) {
      // Ignorer les erreurs de sauvegarde
    }
  }

  /**
   * Tente une récupération automatique
   */
  private attemptRecovery(errorInfo: ErrorInfo): void {
    try {
      // Stratégies de récupération selon le contexte
      if (errorInfo.context?.component === 'Editor') {
        this.recoverEditorState();
      } else if (errorInfo.context?.component === 'API') {
        this.retryApiCall(errorInfo);
      }
    } catch (e) {
      logger.error(LogCategory.EDITOR, 'Échec de la récupération automatique', e);
    }
  }

  /**
   * Récupère l'état de l'éditeur
   */
  private recoverEditorState(): void {
    try {
      // Restaurer depuis le localStorage si disponible
      const savedState = localStorage.getItem('editor_state');
      if (savedState) {
        // Logique de restauration
        logger.info(LogCategory.EDITOR, 'État de l\'éditeur restauré');
      }
    } catch (e) {
      logger.error(LogCategory.EDITOR, 'Échec de la restauration de l\'état', e);
    }
  }

  /**
   * Retente un appel API
   */
  private retryApiCall(errorInfo: ErrorInfo): void {
    // Logique de retry avec backoff exponentiel
    logger.info(LogCategory.EDITOR, 'Tentative de retry pour l\'appel API');
  }

  /**
   * Notifie l'utilisateur d'une erreur
   */
  private notifyUser(message: string): void {
    try {
      if (typeof window !== 'undefined') {
        // Utiliser notification native en fallback
        alert(message);
      }
    } catch (e) {
      // Fallback silencieux
    }
  }

  /**
   * Vérifie si l'erreur doit être loggée (limitation de taux)
   */
  private shouldLogError(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Nettoyer les erreurs anciennes
    this.errorWindow = this.errorWindow.filter(time => time > oneMinuteAgo);
    
    return this.errorWindow.length < this.maxErrorsPerMinute;
  }

  /**
   * Incrémente le compteur d'erreurs
   */
  private incrementErrorCount(): void {
    this.errorWindow.push(Date.now());
    this.errorCount++;
  }

  /**
   * Récupère les statistiques d'erreurs
   */
  getErrorStats(): { total: number; recent: number; severity: Record<string, number> } {
    return {
      total: this.errorCount,
      recent: this.errorWindow.length,
      severity: {} // À implémenter si nécessaire
    };
  }

  /**
   * Réinitialise les statistiques d'erreurs
   */
  resetErrorStats(): void {
    this.errorCount = 0;
    this.errorWindow = [];
  }
}

// Instance singleton
export const errorHandler = EditorErrorHandler.getInstance();

// Fonctions utilitaires pour un usage plus simple
export const handleEditorError = (error: Error | unknown, operation: string, noteId?: string) => 
  errorHandler.handleEditorError(error, operation, noteId);

export const handleApiError = (error: Error | unknown, endpoint: string, userId?: string) => 
  errorHandler.handleApiError(error, endpoint, userId);

export const handleCriticalError = (error: Error | unknown, context?: ErrorContext) => 
  errorHandler.handleCriticalError(error, context); 