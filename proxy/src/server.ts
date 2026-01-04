/**
 * Point d'entrée du serveur WebSocket proxy XAI Voice
 * Conforme au GUIDE D'EXCELLENCE - Fail-fast, Graceful shutdown
 */

// Charger les variables d'environnement AVANT d'importer la config
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv(); // Charger .env aussi

import { createServer } from 'http';
import { logger, LogCategory } from "./utils/logger";
import { XAIVoiceProxyService } from './XAIVoiceProxyService';
import { XAIVoiceProxyConfig } from './types';
import { ProxyErrorHandler, ProxyConfigError } from './errorHandler';

/**
 * Configuration du proxy depuis les variables d'environnement
 */
function loadConfig(): XAIVoiceProxyConfig {
  const xaiApiKey = process.env.XAI_API_KEY;
  if (!xaiApiKey) {
    throw new ProxyConfigError('XAI_API_KEY non configurée. Configurez XAI_API_KEY dans les variables d\'environnement.');
  }

  // Railway/Render utilisent $PORT, mais on garde XAI_VOICE_PROXY_PORT pour compatibilité
  const port = parseInt(process.env.PORT || process.env.XAI_VOICE_PROXY_PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ProxyConfigError(`Port invalide: ${process.env.PORT || process.env.XAI_VOICE_PROXY_PORT || '3001'}. Utilisez un port entre 1 et 65535.`);
  }

  return {
    port,
    xaiApiKey,
    path: '/ws/xai-voice',
    maxConnections: 100, // Limite par défaut
    connectionTimeout: 10000, // 10 secondes
    pingInterval: 30000 // 30 secondes
  };
}

/**
 * Gestion du graceful shutdown
 */
function setupGracefulShutdown(service: XAIVoiceProxyService, healthServer: ReturnType<typeof createServer> | null): void {
  const shutdown = async (signal: string) => {
    logger.info(LogCategory.AUDIO, `[Server] Signal ${signal} reçu, arrêt gracieux...`);
    
    try {
      // Fermer le serveur health check
      if (healthServer) {
        healthServer.close();
      }
      await service.stop();
      process.exit(0);
    } catch (error) {
      logger.error(LogCategory.AUDIO, '[Server] Erreur lors de l\'arrêt', undefined, error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Gestion erreurs non catchées
  process.on('uncaughtException', (error: Error) => {
    logger.error(LogCategory.AUDIO, '[Server] Exception non catchée', undefined, error);
    shutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error(LogCategory.AUDIO, '[Server] Promise rejetée non gérée', {
      reason: reason instanceof Error ? reason.message : String(reason)
    }, reason instanceof Error ? reason : new Error(String(reason)));
  });
}

/**
 * Point d'entrée principal
 */
async function main(): Promise<void> {
  try {
    // Validation fail-fast
    logger.info(LogCategory.AUDIO, '[Server] Démarrage du proxy WebSocket XAI Voice...');
    
    const config = loadConfig();
    logger.info(LogCategory.AUDIO, '[Server] Configuration chargée', {
      port: config.port,
      path: config.path,
      hasXaiApiKey: !!config.xaiApiKey
    });

    // Créer et démarrer le service
    const service = XAIVoiceProxyService.getInstance(config);
    await service.start();

    // Démarrer le serveur health check sur un port séparé
    const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || String(config.port + 1), 10);
    const healthServer = createServer((req, res) => {
      if (req.url === '/health' && req.method === 'GET') {
        const connectionsCount = service.getActiveConnectionsCount();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          connections: connectionsCount,
          maxConnections: config.maxConnections || 100,
          timestamp: new Date().toISOString()
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    healthServer.listen(healthCheckPort, () => {
      logger.info(LogCategory.AUDIO, '[Server] Health check server démarré', {
        port: healthCheckPort
      });
    });

    // Configuration graceful shutdown
    setupGracefulShutdown(service, healthServer);

    logger.info(LogCategory.AUDIO, '[Server] ✅ Serveur proxy démarré avec succès', {
      port: config.port,
      path: config.path,
      healthCheckPort
    });
  } catch (error) {
    const handled = ProxyErrorHandler.handleError(error, { operation: 'main' });
    logger.error(LogCategory.AUDIO, '[Server] ❌ Erreur fatale au démarrage', undefined, error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Démarrer le serveur
main().catch((error) => {
  logger.error(LogCategory.AUDIO, '[Server] ❌ Erreur critique', undefined, error instanceof Error ? error : new Error(String(error)));
  process.exit(1);
});

