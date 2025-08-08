import { NextRequest, NextResponse } from 'next/server';
import { LLMProviderManager } from '@/services/llm/providerManager';
import { logger } from '@/utils/logger';

const llmManager = new LLMProviderManager();

export async function GET(request: NextRequest) {
  try {
    logger.debug('[LLM Health] 🔍 Vérification de la santé des providers');
    
    // ✅ Health check de tous les providers
    const healthStatus = await llmManager.healthCheck();
    
    // ✅ Récupération des métriques
    const metrics = llmManager.getMetrics();
    
    // ✅ Calcul des statistiques globales
    const totalCalls = Object.values(metrics).reduce((sum, metric) => sum + metric.calls, 0);
    const totalErrors = Object.values(metrics).reduce((sum, metric) => sum + metric.errors, 0);
    const avgResponseTime = Object.values(metrics).reduce((sum, metric) => sum + metric.avgResponseTime, 0) / Object.keys(metrics).length;
    
    const response = {
      timestamp: new Date().toISOString(),
      health: healthStatus,
      metrics: {
        providers: metrics,
        global: {
          totalCalls,
          totalErrors,
          avgResponseTime,
          errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0
        }
      },
      currentProvider: llmManager.getCurrentProviderId(),
      availableProviders: llmManager.getAvailableProviders().map(p => p.id)
    };
    
    logger.debug('[LLM Health] ✅ Rapport de santé généré:', {
      healthyProviders: Object.values(healthStatus).filter(Boolean).length,
      totalProviders: Object.keys(healthStatus).length,
      totalCalls,
      errorRate: response.metrics.global.errorRate
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('[LLM Health] ❌ Erreur lors de la vérification de santé:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de santé' },
      { status: 500 }
    );
  }
} 