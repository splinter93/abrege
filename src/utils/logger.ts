/**
 * Utilitaire de logging centralisé
 * Remplace les console.log dispersés par un système unifié
 */

export interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  noteId?: string;
  folderId?: string;
  classeurId?: string;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: number;

  constructor() {
    // Définir le niveau de log selon l'environnement
    this.logLevel = process.env.NODE_ENV === 'development' 
      ? LOG_LEVELS.DEBUG 
      : LOG_LEVELS.ERROR;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Logger de debug (seulement en développement)
   */
  debug(message: string, context?: LogContext, ...args: any[]): void {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      this.log('DEBUG', message, context, ...args);
    }
  }

  /**
   * Logger d'information
   */
  info(message: string, context?: LogContext, ...args: any[]): void {
    if (this.logLevel <= LOG_LEVELS.INFO) {
      this.log('INFO', message, context, ...args);
    }
  }

  /**
   * Logger d'avertissement
   */
  warn(message: string, context?: LogContext, ...args: any[]): void {
    if (this.logLevel <= LOG_LEVELS.WARN) {
      this.log('WARN', message, context, ...args);
    }
  }

  /**
   * Logger d'erreur (toujours affiché)
   */
  error(message: string, context?: LogContext, ...args: any[]): void {
    if (this.logLevel <= LOG_LEVELS.ERROR) {
      this.log('ERROR', message, context, ...args);
    }
  }

  /**
   * Logger pour les opérations API
   */
  api(operation: string, message: string, context?: LogContext, ...args: any[]): void {
    this.info(`[API] ${operation}: ${message}`, { ...context, operation }, ...args);
  }

  /**
   * Logger pour les opérations de polling
   */
  polling(operation: string, message: string, context?: LogContext, ...args: any[]): void {
    this.debug(`[POLLING] ${operation}: ${message}`, { ...context, operation }, ...args);
  }

  /**
   * Logger pour les opérations de store Zustand
   */
  store(operation: string, message: string, context?: LogContext, ...args: any[]): void {
    this.debug(`[STORE] ${operation}: ${message}`, { ...context, operation }, ...args);
    }

  /**
   * Logger pour les opérations d'éditeur
   */
  editor(operation: string, message: string, context?: LogContext, ...args: any[]): void {
    this.debug(`[EDITOR] ${operation}: ${message}`, { ...context, operation }, ...args);
  }

  /**
   * Méthode privée pour formater et afficher les logs
   */
  private log(level: string, message: string, context?: LogContext, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${this.formatContext(context)}]` : '';
    
    const logMessage = `[${timestamp}] ${level}${contextStr}: ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(logMessage, ...args);
        break;
      case 'WARN':
        console.warn(logMessage, ...args);
        break;
      case 'INFO':
        console.info(logMessage, ...args);
        break;
      case 'DEBUG':
        console.log(logMessage, ...args);
        break;
      default:
        console.log(logMessage, ...args);
    }
  }

  /**
   * Formater le contexte pour l'affichage
   */
  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    
    if (context.component) parts.push(`component:${context.component}`);
    if (context.operation) parts.push(`op:${context.operation}`);
    if (context.userId) parts.push(`user:${context.userId.slice(0, 8)}...`);
    if (context.noteId) parts.push(`note:${context.noteId.slice(0, 8)}...`);
    if (context.folderId) parts.push(`folder:${context.folderId.slice(0, 8)}...`);
    if (context.classeurId) parts.push(`classeur:${context.classeurId.slice(0, 8)}...`);
    
    return parts.join(' | ');
  }

  /**
   * Définir le niveau de log dynamiquement
   */
  setLogLevel(level: number): void {
    this.logLevel = level;
  }

  /**
   * Activer/désactiver les logs de debug
   */
  setDebugMode(enabled: boolean): void {
    this.logLevel = enabled ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
  }
}

// Export de l'instance singleton
export const logger = Logger.getInstance();

// Fonctions utilitaires pour un usage plus simple
export const logDebug = (message: string, context?: LogContext, ...args: any[]) => 
  logger.debug(message, context, ...args);

export const logInfo = (message: string, context?: LogContext, ...args: any[]) => 
  logger.info(message, context, ...args);

export const logWarn = (message: string, context?: LogContext, ...args: any[]) => 
  logger.warn(message, context, ...args);

export const logError = (message: string, context?: LogContext, ...args: any[]) => 
  logger.error(message, context, ...args);

export const logApi = (operation: string, message: string, context?: LogContext, ...args: any[]) => 
  logger.api(operation, message, context, ...args);

export const logPolling = (operation: string, message: string, context?: LogContext, ...args: any[]) => 
  logger.polling(operation, message, context, ...args);

export const logStore = (operation: string, message: string, context?: LogContext, ...args: any[]) => 
  logger.store(operation, message, context, ...args);

export const logEditor = (operation: string, message: string, context?: LogContext, ...args: any[]) => 
  logger.editor(operation, message, context, ...args); 