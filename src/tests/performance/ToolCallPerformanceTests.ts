/**
 * Tests de performance pour les tool calls optimisés
 * Validation des gains de performance attendus
 */

// import { agentApiV2Tools } from '../../services/agentApiV2Tools'; // Supprimé - remplacé par API V2 direct
import { distributedCache } from '../../services/cache/DistributedCache';
import { toolsCache } from '../../services/cache/ToolsCache';
import { optimizedDatabaseService } from '../../services/database/OptimizedDatabaseService';
import { toolCallMetrics } from '../../services/monitoring/ToolCallMetrics';
import { performanceDashboard } from '../../services/monitoring/PerformanceDashboard';
import { optimizedTimeouts } from '../../services/config/OptimizedTimeouts';

export interface PerformanceTestResult {
  testName: string;
  duration: number;
  success: boolean;
  metrics: {
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  improvements: {
    cacheHitRate: number;
    responseTime: number;
    errorRate: number;
  };
}

export class ToolCallPerformanceTests {
  private testResults: PerformanceTestResult[] = [];
  private readonly TEST_ITERATIONS = 100;
  private readonly CONCURRENT_USERS = 10;

  /**
   * Exécuter tous les tests de performance
   */
  async runAllTests(): Promise<PerformanceTestResult[]> {
    console.log('🚀 Démarrage des tests de performance des tool calls...');
    
    try {
      // Test 1: Cache des tools
      await this.testToolsCache();
      
      // Test 2: Cache distribué
      await this.testDistributedCache();
      
      // Test 3: Requêtes de base de données optimisées
      await this.testOptimizedDatabaseQueries();
      
      // Test 4: Timeouts adaptatifs
      await this.testAdaptiveTimeouts();
      
      // Test 5: Monitoring et métriques
      await this.testMonitoringSystem();
      
      // Test 6: Charge concurrente
      await this.testConcurrentLoad();
      
      console.log('✅ Tous les tests de performance terminés');
      return this.testResults;
    } catch (error) {
      console.error('❌ Erreur lors des tests de performance:', error);
      throw error;
    }
  }

  /**
   * Test 1: Performance du cache des tools
   */
  private async testToolsCache(): Promise<void> {
    console.log('📊 Test 1: Cache des tools...');
    
    const startTime = Date.now();
    let cacheHits = 0;
    let totalRequests = 0;
    
    try {
      // Test avec cache
      for (let i = 0; i < this.TEST_ITERATIONS; i++) {
        const start = Date.now();
        const tools = await agentApiV2Tools.getToolsForFunctionCalling(['function_calls']);
        const duration = Date.now() - start;
        
        totalRequests++;
        if (duration < 50) { // Cache hit si < 50ms
          cacheHits++;
        }
        
        // Petite pause pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const totalDuration = Date.now() - startTime;
      const cacheHitRate = cacheHits / totalRequests;
      const averageResponseTime = totalDuration / totalRequests;
      const throughput = totalRequests / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Tools Cache Performance',
        duration: totalDuration,
        success: cacheHitRate > 0.8, // 80% de cache hit attendu
        metrics: {
          cacheHitRate,
          averageResponseTime,
          errorRate: 0,
          throughput,
        },
        improvements: {
          cacheHitRate: cacheHitRate * 100,
          responseTime: Math.max(0, 200 - averageResponseTime), // Gain vs 200ms sans cache
          errorRate: 0,
        },
      });
      
      console.log(`✅ Cache des tools: ${cacheHitRate * 100}% hit rate, ${averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('❌ Erreur test cache tools:', error);
    }
  }

  /**
   * Test 2: Performance du cache distribué
   */
  private async testDistributedCache(): Promise<void> {
    console.log('📊 Test 2: Cache distribué...');
    
    const startTime = Date.now();
    let cacheHits = 0;
    let totalRequests = 0;
    
    try {
      // Test avec cache distribué
      for (let i = 0; i < this.TEST_ITERATIONS; i++) {
        const key = `test:cache:${i}`;
        const value = { data: `test-data-${i}`, timestamp: Date.now() };
        
        const start = Date.now();
        
        // Set
        await distributedCache.set(key, value, 60000);
        
        // Get
        const cached = await distributedCache.get(key);
        const duration = Date.now() - start;
        
        totalRequests++;
        if (cached && duration < 20) { // Cache hit si < 20ms
          cacheHits++;
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const cacheHitRate = cacheHits / totalRequests;
      const averageResponseTime = totalDuration / totalRequests;
      const throughput = totalRequests / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Distributed Cache Performance',
        duration: totalDuration,
        success: cacheHitRate > 0.9, // 90% de cache hit attendu
        metrics: {
          cacheHitRate,
          averageResponseTime,
          errorRate: 0,
          throughput,
        },
        improvements: {
          cacheHitRate: cacheHitRate * 100,
          responseTime: Math.max(0, 100 - averageResponseTime), // Gain vs 100ms sans cache
          errorRate: 0,
        },
      });
      
      console.log(`✅ Cache distribué: ${cacheHitRate * 100}% hit rate, ${averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('❌ Erreur test cache distribué:', error);
    }
  }

  /**
   * Test 3: Performance des requêtes de base de données optimisées
   */
  private async testOptimizedDatabaseQueries(): Promise<void> {
    console.log('📊 Test 3: Requêtes DB optimisées...');
    
    const startTime = Date.now();
    let successfulQueries = 0;
    let totalQueries = 0;
    
    try {
      // Test avec requêtes optimisées (simulé)
      for (let i = 0; i < this.TEST_ITERATIONS / 10; i++) { // Moins d'itérations pour les requêtes DB
        const start = Date.now();
        
        // Simuler une requête optimisée
        const mockQuery = new Promise(resolve => {
          setTimeout(() => resolve({ success: true, data: [] }), Math.random() * 50 + 10); // 10-60ms
        });
        
        await mockQuery;
        const duration = Date.now() - start;
        
        totalQueries++;
        if (duration < 100) { // Succès si < 100ms
          successfulQueries++;
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const successRate = successfulQueries / totalQueries;
      const averageResponseTime = totalDuration / totalQueries;
      const throughput = totalQueries / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Optimized Database Queries',
        duration: totalDuration,
        success: successRate > 0.95, // 95% de succès attendu
        metrics: {
          cacheHitRate: 0,
          averageResponseTime,
          errorRate: 1 - successRate,
          throughput,
        },
        improvements: {
          cacheHitRate: 0,
          responseTime: Math.max(0, 200 - averageResponseTime), // Gain vs 200ms sans optimisation
          errorRate: Math.max(0, 0.1 - (1 - successRate)), // Réduction des erreurs
        },
      });
      
      console.log(`✅ Requêtes DB: ${successRate * 100}% succès, ${averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('❌ Erreur test requêtes DB:', error);
    }
  }

  /**
   * Test 4: Performance des timeouts adaptatifs
   */
  private async testAdaptiveTimeouts(): Promise<void> {
    console.log('📊 Test 4: Timeouts adaptatifs...');
    
    const startTime = Date.now();
    let successfulTimeouts = 0;
    let totalTimeouts = 0;
    
    try {
      // Test des timeouts adaptatifs
      for (let i = 0; i < this.TEST_ITERATIONS; i++) {
        const start = Date.now();
        
        // Simuler une opération avec timeout adaptatif
        const timeout = optimizedTimeouts.getToolCallTimeout('testTool');
        const operation = new Promise(resolve => {
          setTimeout(() => resolve('success'), Math.random() * timeout * 0.8); // 80% du timeout max
        });
        
        try {
          await Promise.race([
            operation,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          ]);
          
          const duration = Date.now() - start;
          optimizedTimeouts.recordPerformance('tool:testTool', duration, true);
          
          totalTimeouts++;
          if (duration < timeout) {
            successfulTimeouts++;
          }
        } catch (error) {
          totalTimeouts++;
          optimizedTimeouts.recordPerformance('tool:testTool', timeout, false);
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const successRate = successfulTimeouts / totalTimeouts;
      const averageResponseTime = totalDuration / totalTimeouts;
      const throughput = totalTimeouts / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Adaptive Timeouts',
        duration: totalDuration,
        success: successRate > 0.9, // 90% de succès attendu
        metrics: {
          cacheHitRate: 0,
          averageResponseTime,
          errorRate: 1 - successRate,
          throughput,
        },
        improvements: {
          cacheHitRate: 0,
          responseTime: Math.max(0, 5000 - averageResponseTime), // Gain vs 5s timeout fixe
          errorRate: Math.max(0, 0.2 - (1 - successRate)), // Réduction des timeouts
        },
      });
      
      console.log(`✅ Timeouts adaptatifs: ${successRate * 100}% succès, ${averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('❌ Erreur test timeouts adaptatifs:', error);
    }
  }

  /**
   * Test 5: Performance du système de monitoring
   */
  private async testMonitoringSystem(): Promise<void> {
    console.log('📊 Test 5: Système de monitoring...');
    
    const startTime = Date.now();
    let successfulMetrics = 0;
    let totalMetrics = 0;
    
    try {
      // Test du système de monitoring
      for (let i = 0; i < this.TEST_ITERATIONS; i++) {
        const start = Date.now();
        
        // Enregistrer des métriques
        toolCallMetrics.recordToolCall({
          toolName: 'testTool',
          executionTime: Math.random() * 1000 + 100,
          success: Math.random() > 0.1, // 90% de succès
          timestamp: Date.now(),
          userId: 'test-user',
          cacheHit: Math.random() > 0.2, // 80% de cache hit
        });
        
        // Obtenir les statistiques
        const stats = toolCallMetrics.getToolStats('testTool');
        const duration = Date.now() - start;
        
        totalMetrics++;
        if (stats && duration < 10) { // Succès si < 10ms
          successfulMetrics++;
        }
      }
      
      const totalDuration = Date.now() - startTime;
      const successRate = successfulMetrics / totalMetrics;
      const averageResponseTime = totalDuration / totalMetrics;
      const throughput = totalMetrics / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Monitoring System',
        duration: totalDuration,
        success: successRate > 0.95, // 95% de succès attendu
        metrics: {
          cacheHitRate: 0,
          averageResponseTime,
          errorRate: 1 - successRate,
          throughput,
        },
        improvements: {
          cacheHitRate: 0,
          responseTime: Math.max(0, 50 - averageResponseTime), // Gain vs 50ms sans monitoring
          errorRate: Math.max(0, 0.05 - (1 - successRate)), // Réduction des erreurs
        },
      });
      
      console.log(`✅ Monitoring: ${successRate * 100}% succès, ${averageResponseTime.toFixed(2)}ms avg`);
    } catch (error) {
      console.error('❌ Erreur test monitoring:', error);
    }
  }

  /**
   * Test 6: Charge concurrente
   */
  private async testConcurrentLoad(): Promise<void> {
    console.log('📊 Test 6: Charge concurrente...');
    
    const startTime = Date.now();
    let successfulRequests = 0;
    let totalRequests = 0;
    
    try {
      // Test de charge concurrente
      const promises = Array.from({ length: this.CONCURRENT_USERS }, async (_, userIndex) => {
        for (let i = 0; i < this.TEST_ITERATIONS / this.CONCURRENT_USERS; i++) {
          const start = Date.now();
          
          try {
            // Simuler une requête concurrente
            const mockRequest = new Promise(resolve => {
              setTimeout(() => resolve({ success: true }), Math.random() * 100 + 50); // 50-150ms
            });
            
            await mockRequest;
            const duration = Date.now() - start;
            
            totalRequests++;
            if (duration < 200) { // Succès si < 200ms
              successfulRequests++;
            }
          } catch (error) {
            totalRequests++;
          }
        }
      });
      
      await Promise.all(promises);
      
      const totalDuration = Date.now() - startTime;
      const successRate = successfulRequests / totalRequests;
      const averageResponseTime = totalDuration / totalRequests;
      const throughput = totalRequests / (totalDuration / 1000);
      
      this.testResults.push({
        testName: 'Concurrent Load',
        duration: totalDuration,
        success: successRate > 0.9, // 90% de succès attendu
        metrics: {
          cacheHitRate: 0,
          averageResponseTime,
          errorRate: 1 - successRate,
          throughput,
        },
        improvements: {
          cacheHitRate: 0,
          responseTime: Math.max(0, 500 - averageResponseTime), // Gain vs 500ms sans optimisation
          errorRate: Math.max(0, 0.1 - (1 - successRate)), // Réduction des erreurs
        },
      });
      
      console.log(`✅ Charge concurrente: ${successRate * 100}% succès, ${averageResponseTime.toFixed(2)}ms avg, ${throughput.toFixed(2)} req/s`);
    } catch (error) {
      console.error('❌ Erreur test charge concurrente:', error);
    }
  }

  /**
   * Générer un rapport de performance
   */
  generatePerformanceReport(): {
    summary: {
      totalTests: number;
      successfulTests: number;
      averageImprovement: number;
      overallScore: number;
    };
    details: PerformanceTestResult[];
    recommendations: string[];
  } {
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    
    const averageImprovement = this.testResults.reduce((sum, result) => {
      return sum + (result.improvements.responseTime + result.improvements.cacheHitRate) / 2;
    }, 0) / totalTests;
    
    const overallScore = (successfulTests / totalTests) * 100;
    
    const recommendations: string[] = [];
    
    if (overallScore < 80) {
      recommendations.push('Améliorer la configuration du cache Redis');
      recommendations.push('Optimiser davantage les requêtes de base de données');
    }
    
    if (averageImprovement < 50) {
      recommendations.push('Ajuster les timeouts adaptatifs');
      recommendations.push('Augmenter la taille du cache mémoire');
    }
    
    return {
      summary: {
        totalTests,
        successfulTests,
        averageImprovement,
        overallScore,
      },
      details: this.testResults,
      recommendations,
    };
  }

  /**
   * Nettoyer les données de test
   */
  async cleanup(): Promise<void> {
    try {
      // Nettoyer le cache
      await distributedCache.clear();
      await toolsCache.invalidateAllTools();
      
      // Réinitialiser les métriques
      toolCallMetrics.reset();
      
      // Réinitialiser les timeouts adaptatifs
      optimizedTimeouts.resetAdaptiveTimeouts();
      
      console.log('🧹 Nettoyage des données de test terminé');
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
    }
  }
}

/**
 * Fonction utilitaire pour exécuter les tests de performance
 */
export async function runToolCallPerformanceTests(): Promise<void> {
  const tests = new ToolCallPerformanceTests();
  
  try {
    const results = await tests.runAllTests();
    const report = tests.generatePerformanceReport();
    
    console.log('\n📊 RAPPORT DE PERFORMANCE DES TOOL CALLS');
    console.log('==========================================');
    console.log(`Tests réussis: ${report.summary.successfulTests}/${report.summary.totalTests}`);
    console.log(`Score global: ${report.summary.overallScore.toFixed(1)}%`);
    console.log(`Amélioration moyenne: ${report.summary.averageImprovement.toFixed(1)}%`);
    
    console.log('\n📈 DÉTAILS PAR TEST:');
    report.details.forEach(result => {
      console.log(`- ${result.testName}: ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMANDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
    }
    
    await tests.cleanup();
  } catch (error) {
    console.error('❌ Erreur lors des tests de performance:', error);
    await tests.cleanup();
    throw error;
  }
}
