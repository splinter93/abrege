export interface LogMetadata {
  [key: string]: any;
}

export class ChatLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static error(context: string, error: Error | string, metadata?: LogMetadata) {
    const errorMessage = error instanceof Error ? error.message : error;
    
    if (this.isDevelopment) {
      console.error(`[Chat ${context}]`, errorMessage, metadata);
    } else {
      // En production, on pourrait envoyer à un service de logging
      // comme Sentry, LogRocket, etc.
      console.error(`[Chat ${context}] ${errorMessage}`);
    }
  }

  static warn(context: string, message: string, metadata?: LogMetadata) {
    if (this.isDevelopment) {
      console.warn(`[Chat ${context}]`, message, metadata);
    }
  }

  static info(context: string, message: string, metadata?: LogMetadata) {
    if (this.isDevelopment) {
      console.info(`[Chat ${context}]`, message, metadata);
    }
  }
} 