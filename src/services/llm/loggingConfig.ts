/**
 * Configuration du logging détaillé pour les appels LLM
 * Permet d'activer/désactiver facilement le logging complet des payloads
 */

export interface LoggingConfig {
  /** Active le logging détaillé des payloads LLM */
  enableDetailedLLMLogging: boolean;
  
  /** Active le logging des messages individuels */
  enableMessageLogging: boolean;
  
  /** Active le logging du contexte de l'agent */
  enableAgentContextLogging: boolean;
  
  /** Active le logging du contexte de l'application */
  enableAppContextLogging: boolean;
  
  /** Active le logging de l'historique des sessions */
  enableSessionHistoryLogging: boolean;
  
  /** Active le logging des paramètres de configuration */
  enableConfigLogging: boolean;
  
  /** Active le logging des outils disponibles */
  enableToolsLogging: boolean;
  
  /** Active le logging des réponses API */
  enableResponseLogging: boolean;
  
  /** Active le logging de fin d'exécution */
  enableExecutionEndLogging: boolean;
  
  /** Longueur maximale des contenus affichés dans les logs */
  maxContentLength: number;
  
  /** Longueur maximale des aperçus de contenu */
  maxPreviewLength: number;
}

/**
 * Configuration par défaut pour le logging LLM
 */
export const defaultLoggingConfig: LoggingConfig = {
  enableDetailedLLMLogging: true,
  enableMessageLogging: true,
  enableAgentContextLogging: true,
  enableAppContextLogging: true,
  enableSessionHistoryLogging: true,
  enableConfigLogging: true,
  enableToolsLogging: true,
  enableResponseLogging: true,
  enableExecutionEndLogging: true,
  maxContentLength: 200,
  maxPreviewLength: 100
};

/**
 * Configuration de production (logging minimal)
 */
export const productionLoggingConfig: LoggingConfig = {
  enableDetailedLLMLogging: false,
  enableMessageLogging: false,
  enableAgentContextLogging: false,
  enableAppContextLogging: false,
  enableSessionHistoryLogging: false,
  enableConfigLogging: false,
  enableToolsLogging: false,
  enableResponseLogging: false,
  enableExecutionEndLogging: false,
  maxContentLength: 50,
  maxPreviewLength: 25
};

/**
 * Configuration de développement (logging complet)
 */
export const developmentLoggingConfig: LoggingConfig = {
  enableDetailedLLMLogging: true,
  enableMessageLogging: true,
  enableAgentContextLogging: true,
  enableAppContextLogging: true,
  enableSessionHistoryLogging: true,
  enableConfigLogging: true,
  enableToolsLogging: true,
  enableResponseLogging: true,
  enableExecutionEndLogging: true,
  maxContentLength: 500,
  maxPreviewLength: 200
};

/**
 * Récupère la configuration de logging basée sur l'environnement
 */
export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionLoggingConfig;
    case 'development':
      return developmentLoggingConfig;
    default:
      return defaultLoggingConfig;
  }
}

/**
 * Récupère la configuration de logging depuis les variables d'environnement
 * Permet de surcharger la configuration par défaut
 */
export function getEnvironmentLoggingConfig(): LoggingConfig {
  const config = getLoggingConfig();
  
  // Surcharge depuis les variables d'environnement
  if (process.env.ENABLE_DETAILED_LLM_LOGGING !== undefined) {
    config.enableDetailedLLMLogging = process.env.ENABLE_DETAILED_LLM_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_MESSAGE_LOGGING !== undefined) {
    config.enableMessageLogging = process.env.ENABLE_MESSAGE_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_AGENT_CONTEXT_LOGGING !== undefined) {
    config.enableAgentContextLogging = process.env.ENABLE_AGENT_CONTEXT_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_APP_CONTEXT_LOGGING !== undefined) {
    config.enableAppContextLogging = process.env.ENABLE_APP_CONTEXT_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_SESSION_HISTORY_LOGGING !== undefined) {
    config.enableSessionHistoryLogging = process.env.ENABLE_SESSION_HISTORY_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_CONFIG_LOGGING !== undefined) {
    config.enableConfigLogging = process.env.ENABLE_CONFIG_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_TOOLS_LOGGING !== undefined) {
    config.enableToolsLogging = process.env.ENABLE_TOOLS_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_RESPONSE_LOGGING !== undefined) {
    config.enableResponseLogging = process.env.ENABLE_RESPONSE_LOGGING === 'true';
  }
  
  if (process.env.ENABLE_EXECUTION_END_LOGGING !== undefined) {
    config.enableExecutionEndLogging = process.env.ENABLE_EXECUTION_END_LOGGING === 'true';
  }
  
  if (process.env.MAX_CONTENT_LENGTH !== undefined) {
    const maxLength = parseInt(process.env.MAX_CONTENT_LENGTH);
    if (!isNaN(maxLength)) {
      config.maxContentLength = maxLength;
    }
  }
  
  if (process.env.MAX_PREVIEW_LENGTH !== undefined) {
    const maxPreview = parseInt(process.env.MAX_PREVIEW_LENGTH);
    if (!isNaN(maxPreview)) {
      config.maxPreviewLength = maxPreview;
    }
  }
  
  return config;
} 