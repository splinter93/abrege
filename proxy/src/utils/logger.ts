/**
 * Logger simplifié pour le proxy XAI Voice (standalone)
 * Pas de dépendance Next.js/Sentry
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export enum LogCategory {
  AUDIO = 'AUDIO'
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

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
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

    const formattedMessage = this.formatMessage({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error
    });

    // Sérialiser les données si présentes
    let output = formattedMessage;
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        output += '\n' + dataStr;
      } catch {
        output += '\n[Unable to serialize data]';
      }
    }

    // Afficher dans la console
    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        if (error) {
          console.error(error);
        }
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.DEBUG:
        console.log(output);
        break;
    }
  }

  error(category: LogCategory, message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  warn(category: LogCategory, message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.WARN, category, message, data, error);
  }

  info(category: LogCategory, message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.INFO, category, message, data, error);
  }

  debug(category: LogCategory, message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.DEBUG, category, message, data, error);
  }
}

// Instance singleton
export const logger = new Logger();

