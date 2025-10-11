import { NextRequest, NextResponse } from 'next/server';
import { agenticOrchestrator } from '@/services/llm/services/AgenticOrchestrator';
import { circuitBreakerManager } from '@/services/circuitBreaker';
import { toolCallsRateLimiter, chatRateLimiter, apiRateLimiter } from '@/services/rateLimiter';
import { simpleLogger as logger } from '@/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/metrics - Obtenir les métriques du système
 */
export async function GET(request: NextRequest) {
  try {
    // Obtenir les métriques de l'orchestrateur
    const orchestratorMetrics = agenticOrchestrator.getMetrics();
    
    // Obtenir les statistiques des circuit breakers
    const circuitBreakerStats = circuitBreakerManager.getGlobalStats();
    const failedServices = circuitBreakerManager.getFailedServices();
    
    // Obtenir les statistiques des rate limiters
    const rateLimiterStats = {
      toolCalls: toolCallsRateLimiter.getGlobalStats(),
      chat: chatRateLimiter.getGlobalStats(),
      api: apiRateLimiter.getGlobalStats()
    };
    
    // Calculer quelques statistiques supplémentaires
    const now = Date.now();
    const uptime = process.uptime();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      orchestrator: orchestratorMetrics,
      circuitBreakers: {
        stats: circuitBreakerStats,
        failedServices,
        totalServices: Object.keys(circuitBreakerStats).length,
        healthyServices: Object.keys(circuitBreakerStats).length - failedServices.length
      },
      rateLimiters: rateLimiterStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      }
    };
    
    logger.dev('[Metrics] 📊 Métriques récupérées avec succès');
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('[Metrics] ❌ Erreur récupération métriques:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des métriques',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/metrics - Réinitialiser les métriques
 */
export async function DELETE(request: NextRequest) {
  try {
    // Réinitialiser l'orchestrateur
    agenticOrchestrator.resetMetrics();
    agenticOrchestrator.clearCache();
    
    // Réinitialiser les circuit breakers
    circuitBreakerManager.resetAll();
    
    logger.info('[Metrics] 🔄 Métriques et cache réinitialisés');
    
    return NextResponse.json({
      success: true,
      message: 'Métriques, cache et circuit breakers réinitialisés',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('[Metrics] ❌ Erreur réinitialisation métriques:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la réinitialisation',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/metrics/circuit-breaker - Contrôler les circuit breakers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, service } = body;
    
    if (!action || !service) {
      return NextResponse.json(
        { error: 'action et service requis' },
        { status: 400 }
      );
    }
    
    const breaker = circuitBreakerManager.getBreaker(service);
    
    switch (action) {
      case 'open':
        breaker.forceOpen();
        logger.info(`[Metrics] ⛔ Circuit breaker ${service} forcé OPEN`);
        break;
        
      case 'close':
        breaker.forceClose();
        logger.info(`[Metrics] 🟢 Circuit breaker ${service} forcé CLOSED`);
        break;
        
      case 'reset':
        breaker.reset();
        logger.info(`[Metrics] 🔄 Circuit breaker ${service} réinitialisé`);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Action invalide (open, close, reset)' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: `Circuit breaker ${service} - action ${action} effectuée`,
      state: breaker.getStats()
    });
    
  } catch (error) {
    logger.error('[Metrics] ❌ Erreur contrôle circuit breaker:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du contrôle du circuit breaker',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * Formater l'uptime en format lisible
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

