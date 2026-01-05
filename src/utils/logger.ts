/**
 * Système de logging professionnel pour l'éditeur
 * Configurable par environnement et niveau de log
 */

import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export enum LogCategory {
  EDITOR = 'EDITOR',
  SLASH_COMMANDS = 'SLASH_COMMANDS',
  TOOLBAR = 'TOOLBAR',
  EXTENSIONS = 'EXTENSIONS',
  API = 'API',
  AUDIO = 'AUDIO',
  PERFORMANCE = 'PERFORMANCE',
  MONITORING = 'MONITORING'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // ✅ En prod : INFO (au lieu de ERROR uniquement) pour debug
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = LogLevel[entry.level];
    const category = entry.category;
    const message = entry.message;
    
    return `[${timestamp}] [${level}] [${category}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error
    };

    // Ajouter au buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // ✅ PROD FIX : Toujours afficher dans la console (serveur + client)
    // Côté serveur (Node.js) : logs Vercel
    // Côté client (navigateur) : console devtools
    const formattedMessage = this.formatMessage(entry);
    
    // 🔧 CORRECTION : Sérialiser les objets pour éviter [object Object] et gérer les références circulaires
    const serializeData = (obj: unknown): string => {
        if (obj === null || obj === undefined) return '';
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
        try {
          return JSON.stringify(obj, (key, value) => {
            // Gérer les références circulaires communes
            if (key === 'socket' || key === 'channels' || key === 'client' || key === 'parent' || key === 'child') {
              return '[Circular Reference]';
            }
            // Limiter la profondeur pour éviter les structures trop complexes
            if (typeof value === 'object' && value !== null) {
              const seen = new WeakSet();
              if (seen.has(value)) {
                return '[Circular Reference]';
              }
              seen.add(value);
            }
            return value;
          }, 2);
        } catch (error) {
          // Fallback pour les objets avec structures circulaires complexes
          if (error instanceof Error && error.message.includes('circular')) {
            const objWithConstructor = obj as { constructor?: { name?: string } };
            return `[Object with circular structure: ${objWithConstructor?.constructor?.name || 'Unknown'}]`;
          }
          return String(obj);
        }
      };
    
    switch (level) {
      case LogLevel.ERROR:
        const errorData = data && typeof data === 'object' && Object.keys(data).length > 0 ? serializeData(data) : undefined;
        const errorObj = error && error instanceof Error ? error : undefined;
        const serializedError = error && !(error instanceof Error) ? serializeData(error) : undefined;
        
        // Ne passer que les paramètres non-vides à console.error
        if (errorData && errorObj) {
          console.error(formattedMessage, errorData, errorObj);
        } else if (errorData && serializedError) {
          console.error(formattedMessage, errorData, serializedError);
        } else if (errorData) {
          console.error(formattedMessage, errorData);
        } else if (errorObj) {
          console.error(formattedMessage, errorObj);
        } else if (serializedError) {
          console.error(formattedMessage, serializedError);
        } else {
          console.error(formattedMessage);
        }
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data ? serializeData(data) : '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data ? serializeData(data) : '');
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, data ? serializeData(data) : '');
        break;
      case LogLevel.TRACE:
        console.trace(formattedMessage, data ? serializeData(data) : '');
        break;
    }

    // En production, envoyer les erreurs critiques à un service de monitoring
    if (level === LogLevel.ERROR && !this.isDevelopment) {
      this.sendToMonitoring(entry);
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // Ne pas envoyer en développement
    if (this.isDevelopment) {
      return;
    }
    
    // Ne pas envoyer si Sentry n'est pas configuré
    if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      return;
    }
    
    try {
      // Capturer l'erreur dans Sentry
      if (entry.error) {
        Sentry.captureException(entry.error, {
          level: 'error',
          tags: {
            category: entry.category,
            component: typeof window === 'undefined' ? 'server' : 'client',
          },
          extra: {
            message: entry.message,
            data: entry.data,
            timestamp: entry.timestamp,
          },
        });
      } else {
        // Capturer un message d'erreur sans exception
        Sentry.captureMessage(entry.message, {
          level: 'error',
          tags: {
            category: entry.category,
            component: typeof window === 'undefined' ? 'server' : 'client',
          },
          extra: {
            data: entry.data,
            timestamp: entry.timestamp,
          },
        });
      }
    } catch (monitoringError) {
      // Ne pas planter si Sentry échoue
      // Log silencieux (on ne veut pas de boucle infinie)
      if (this.isDevelopment) {
        console.error('[Logger] Failed to send to Sentry:', monitoringError);
      }
    }
  }

  // Méthodes publiques
  error(category: LogCategory, message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  warn(category: LogCategory, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  info(category: LogCategory, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  debug(category: LogCategory, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  trace(category: LogCategory, message: string, data?: unknown): void {
    this.log(LogLevel.TRACE, category, message, data);
  }

  // Méthodes spécialisées pour l'éditeur
  editorError(message: string, data?: unknown, error?: Error): void {
    this.error(LogCategory.EDITOR, message, data, error);
  }

  editorInfo(message: string, data?: unknown): void {
    this.info(LogCategory.EDITOR, message, data);
  }

  editorDebug(message: string, data?: unknown): void {
    this.debug(LogCategory.EDITOR, message, data);
  }

  apiError(message: string, data?: unknown, error?: Error): void {
    this.error(LogCategory.API, message, data, error);
  }

  apiInfo(message: string, data?: unknown): void {
    this.info(LogCategory.API, message, data);
  }

  audioError(message: string, data?: unknown, error?: Error): void {
    this.error(LogCategory.AUDIO, message, data, error);
  }

  audioInfo(message: string, data?: unknown): void {
    this.info(LogCategory.AUDIO, message, data);
  }

  audioDebug(message: string, data?: unknown): void {
    this.debug(LogCategory.AUDIO, message, data);
  }

  performance(category: LogCategory, operation: string, duration: number): void {
    this.info(LogCategory.PERFORMANCE, `${operation} completed in ${duration}ms`);
  }

  // Récupérer les logs pour le debugging
  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Vider le buffer
  clearLogs(): void {
    this.logBuffer = [];
  }

  // Changer le niveau de log dynamiquement
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Instance singleton
export const logger = new Logger();

// Export des méthodes principales pour faciliter l'utilisation
export const {
  error,
  warn,
  info,
  debug,
  trace,
  editorError,
  editorInfo,
  editorDebug,
  apiError,
  apiInfo,
  audioError,
  audioInfo,
  audioDebug,
  performance
} = logger;

// Compatibilité avec l'ancien simpleLogger pour éviter les erreurs d'import
export const simpleLogger = {
  dev: (message: string, ...args: unknown[]) => {
    // ✅ PROD FIX : Logger aussi en production (niveau DEBUG→INFO en prod)
    logger.debug(LogCategory.EDITOR, message, args);
  },
  error: (message: string, error?: unknown) => {
    // Convertir l'erreur en objet Error si ce n'est pas déjà le cas
    const errorObj = (() => {
      if (error instanceof Error) {
        return error;
      }
      if (!error) {
        return undefined;
      }

      let message = '';
      try {
        if (typeof error === 'string') {
          message = error;
        } else if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
          message = String(error);
        } else if (typeof error === 'symbol') {
          message = error.toString();
        } else {
          message = JSON.stringify(error);
        }
      } catch {
        message = '[Unserializable error]';
      }

      const err = new Error(message);
      (err as Error & { originalError?: unknown }).originalError = error;
      return err;
    })();
    
    // Si l'erreur est un objet complexe, le sérialiser pour éviter [object Object]
    let serializedData: string | undefined = undefined;
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      try {
        serializedData = JSON.stringify(error, (key, value) => {
          // Gérer les références circulaires communes
          if (key === 'socket' || key === 'channels' || key === 'client' || key === 'parent' || key === 'child') {
            return '[Circular Reference]';
          }
          return value;
        }, 2);
      } catch (circularError) {
        // Fallback pour les objets avec structures circulaires
        if (circularError instanceof Error && circularError.message.includes('circular')) {
          const errorWithConstructor = error as { constructor?: { name?: string } };
          serializedData = `[Object with circular structure: ${errorWithConstructor?.constructor?.name || 'Unknown'}]`;
        } else {
          serializedData = String(error);
        }
      }
    }
    
    // Passer les données sérialisées comme message étendu si nécessaire
    const fullMessage = serializedData ? `${message}\n${serializedData}` : message;
    logger.error(LogCategory.EDITOR, fullMessage, undefined, errorObj);
  },
  warn: (message: string, ...args: unknown[]) => {
    logger.warn(LogCategory.EDITOR, message, args);
  },
  info: (message: string, ...args: unknown[]) => {
    // ✅ PROD FIX : Logger aussi en production
    logger.info(LogCategory.EDITOR, message, args);
  },
  // Méthode pour les tool calls (compatible avec l'ancien système)
  tool: (message: string, ...args: unknown[]) => {
    logger.info(LogCategory.EDITOR, message, args);
  }
};

// Export de logApi pour compatibilité avec l'ancien système
export const logApi = {
  error: (message: string, error?: unknown) => {
    // Sérialiser l'erreur si c'est un objet complexe
    let serializedError: string | undefined = undefined;
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      try {
        serializedError = JSON.stringify(error, null, 2);
      } catch {
        serializedError = String(error);
      }
    }
    
    // Passer les données sérialisées comme message étendu si nécessaire
    const fullMessage = serializedError ? `${message}\n${serializedError}` : message;
    logger.error(LogCategory.API, fullMessage);
  },
  info: (message: string, data?: unknown) => {
    logger.info(LogCategory.API, message, data);
  },
  warn: (message: string, data?: unknown) => {
    logger.warn(LogCategory.API, message, data);
  },
  debug: (message: string, data?: unknown) => {
    logger.debug(LogCategory.API, message, data);
  }
}; 