/**
 * Exemples d'utilisation de xAI Grok 4 Fast
 * 
 * Ces exemples montrent comment utiliser le provider xAI
 * dans différents contextes de l'application.
 */

import { XAIProvider } from '@/services/llm/providers';
import { simpleOrchestrator } from '@/services/llm/services/SimpleOrchestrator';
import { LLMProviderManager } from '@/services/llm/providerManager';
import type { Tool } from '@/services/llm/types/strictTypes';

// =============================================================================
// EXEMPLE 1 : Utilisation directe du provider
// =============================================================================

async function exemple1_BasicUsage() {
  console.log('\n=== EXEMPLE 1 : Utilisation basique ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.7,
    maxTokens: 8000
  });

  // Test de connexion
  const isConnected = await xai.testConnection();
  console.log('Connexion xAI:', isConnected ? '✅' : '❌');

  // Appel simple
  const response = await xai.call(
    'Explique-moi ce qu\'est un LLM en 2 phrases.',
    { content: 'Tu es un assistant IA concis.' },
    []
  );

  console.log('Réponse:', response);
}

// =============================================================================
// EXEMPLE 2 : Function calling avec tool calls
// =============================================================================

async function exemple2_FunctionCalling() {
  console.log('\n=== EXEMPLE 2 : Function Calling ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    temperature: 0.7
  });

  // Définir les tools
  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'create_note',
        description: 'Créer une nouvelle note dans un classeur',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Titre de la note'
            },
            content: {
              type: 'string',
              description: 'Contenu markdown de la note'
            },
            notebook_slug: {
              type: 'string',
              description: 'Slug du classeur'
            }
          },
          required: ['title', 'content', 'notebook_slug']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'search_notes',
        description: 'Rechercher des notes par mots-clés',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Requête de recherche'
            },
            limit: {
              type: 'number',
              description: 'Nombre maximum de résultats',
              default: 10
            }
          },
          required: ['query']
        }
      }
    }
  ];

  // Messages
  const messages = [
    {
      role: 'system' as const,
      content: 'Tu es un assistant qui aide à gérer des notes. Utilise les tools pour exécuter les actions.'
    },
    {
      role: 'user' as const,
      content: 'Crée une note "Test Grok" avec le contenu "# Hello from Grok 4 Fast" dans le classeur "main-notebook"'
    }
  ];

  // Appel avec tools
  const response = await xai.callWithMessages(messages, tools);

  console.log('Contenu:', response.content);
  console.log('Tool calls:', response.tool_calls);
  console.log('\nDétail des tool calls:');
  response.tool_calls?.forEach((tc, i) => {
    console.log(`  ${i + 1}. ${tc.function.name}`);
    console.log(`     Arguments:`, tc.function.arguments);
  });
}

// =============================================================================
// EXEMPLE 3 : Mode reasoning avancé
// =============================================================================

async function exemple3_ReasoningMode() {
  console.log('\n=== EXEMPLE 3 : Mode Reasoning ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast-reasoning', // ← Mode reasoning
    temperature: 0.7,
    maxTokens: 8000,
    reasoningMode: 'reasoning'
  });

  const messages = [
    {
      role: 'system' as const,
      content: 'Tu es un architecte logiciel expert.'
    },
    {
      role: 'user' as const,
      content: `Analyse cette architecture et propose 3 améliorations concrètes:
      
Architecture actuelle:
- Frontend: Next.js + React
- Backend: API Routes Next.js
- Database: Supabase (PostgreSQL)
- LLM: Multiple providers (Groq, xAI, Synesia)
- Storage: S3
- Auth: Supabase Auth

Contraintes:
- Doit scaler à 10k utilisateurs
- Budget limité
- Temps de réponse < 2s`
    }
  ];

  const response = await xai.callWithMessages(messages, []);

  console.log('=== REASONING ===');
  console.log(response.reasoning);
  console.log('\n=== RÉPONSE FINALE ===');
  console.log(response.content);
}

// =============================================================================
// EXEMPLE 4 : Via SimpleOrchestrator (recommandé pour production)
// =============================================================================

async function exemple4_SimpleOrchestrator() {
  console.log('\n=== EXEMPLE 4 : SimpleOrchestrator ===\n');
  
  // Configurer pour utiliser xAI
  process.env.LLM_DEFAULT_PROVIDER = 'xai';
  process.env.LLM_DEFAULT_MODEL = 'grok-4-fast';

  const result = await simpleOrchestrator.processMessage(
    'Recherche toutes les notes qui parlent de TypeScript et crée une nouvelle note "Summary TypeScript" avec un résumé',
    {
      userToken: 'user_token_here', // Remplacer par vrai token
      sessionId: 'session_' + Date.now(),
      maxToolCalls: 50
    },
    []
  );

  console.log('Contenu:', result.content);
  console.log('Nombre de tool calls:', result.toolCalls?.length || 0);
  console.log('Tool calls exécutés:');
  result.toolCalls?.forEach((tc, i) => {
    console.log(`  ${i + 1}. ${tc.function.name}`);
  });
}

// =============================================================================
// EXEMPLE 5 : Via ProviderManager avec fallback
// =============================================================================

async function exemple5_ProviderManager() {
  console.log('\n=== EXEMPLE 5 : ProviderManager avec fallback ===\n');
  
  const manager = new LLMProviderManager();

  // Health check de tous les providers
  const health = await manager.healthCheck();
  console.log('Health check:');
  Object.entries(health).forEach(([provider, isHealthy]) => {
    console.log(`  ${provider}: ${isHealthy ? '✅' : '❌'}`);
  });

  // Utiliser xAI comme provider principal
  manager.setProvider('xai');
  
  try {
    // Essaie xAI, fallback automatique si erreur
    const response = await manager.callWithFallback(
      'Quelle est la capitale de la France ?',
      { content: 'Tu es un assistant géographique.' },
      []
    );
    
    console.log('\nRéponse:', response);
    
    // Afficher les métriques
    const metrics = manager.getMetrics();
    console.log('\nMétriques xAI:', metrics.xai);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// =============================================================================
// EXEMPLE 6 : Utilisation dans une API Route (Chat)
// =============================================================================

/**
 * Exemple d'utilisation dans /api/chat/llm/route.ts
 * 
 * Pour utiliser xAI au lieu de Groq, il suffit de changer le provider
 * dans la route API ou via les variables d'environnement.
 */

async function exemple6_ChatAPIRoute() {
  console.log('\n=== EXEMPLE 6 : API Route Chat ===\n');
  
  // Simuler le body de la requête
  const requestBody = {
    message: 'Crée une note "Meeting Notes" avec le contenu "# Meeting du 19/10/2025"',
    context: {
      classeurId: 'main-notebook',
      noteId: null
    },
    history: [],
    provider: 'xai' // ← Spécifier xAI
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  console.log('\nDans la route API, cela utilisera automatiquement XAIProvider');
  console.log('car il est enregistré dans le ProviderManager.');
}

// =============================================================================
// EXEMPLE 7 : Configuration dynamique
// =============================================================================

async function exemple7_DynamicConfiguration() {
  console.log('\n=== EXEMPLE 7 : Configuration dynamique ===\n');
  
  // Configuration différente selon l'environnement
  const isDev = process.env.NODE_ENV === 'development';
  
  const xai = new XAIProvider({
    model: isDev ? 'grok-4-fast' : 'grok-4-fast-reasoning',
    temperature: isDev ? 0.9 : 0.7, // Plus créatif en dev
    maxTokens: isDev ? 4000 : 8000,
    enableLogging: isDev, // Logs uniquement en dev
    enableMetrics: true,
    timeout: isDev ? 10000 : 30000
  });

  console.log('Configuration:', {
    modèle: xai.config.model,
    temperature: xai.config.temperature,
    maxTokens: xai.config.maxTokens,
    logging: xai.config.enableLogging,
    timeout: xai.config.timeout
  });
}

// =============================================================================
// EXEMPLE 8 : Gestion d'erreurs et retry
// =============================================================================

async function exemple8_ErrorHandling() {
  console.log('\n=== EXEMPLE 8 : Gestion d\'erreurs ===\n');
  
  const xai = new XAIProvider({
    apiKey: 'invalid_key', // ← Clé invalide pour tester
    model: 'grok-4-fast'
  });

  try {
    await xai.testConnection();
  } catch (error) {
    console.log('❌ Erreur attendue:', error instanceof Error ? error.message : error);
    
    // Retry avec une clé valide
    console.log('\n🔄 Retry avec configuration valide...');
    const xaiValid = new XAIProvider(); // Utilise XAI_API_KEY depuis .env
    const isConnected = await xaiValid.testConnection();
    console.log('Connexion:', isConnected ? '✅' : '❌');
  }
}

// =============================================================================
// EXEMPLE 9 : Parallel tool calls
// =============================================================================

async function exemple9_ParallelToolCalls() {
  console.log('\n=== EXEMPLE 9 : Parallel Tool Calls ===\n');
  
  const xai = new XAIProvider({
    model: 'grok-4-fast',
    parallelToolCalls: true // ← Activer l'exécution parallèle
  });

  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: {
          type: 'object',
          properties: {
            city: { type: 'string' }
          },
          required: ['city']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_time',
        description: 'Get current time for a timezone',
        parameters: {
          type: 'object',
          properties: {
            timezone: { type: 'string' }
          },
          required: ['timezone']
        }
      }
    }
  ];

  const messages = [
    {
      role: 'user' as const,
      content: 'Quelle est la météo à Paris et l\'heure à New York ?'
    }
  ];

  const response = await xai.callWithMessages(messages, tools);
  
  console.log('Tool calls (parallèles):', response.tool_calls?.length || 0);
  response.tool_calls?.forEach((tc, i) => {
    console.log(`  ${i + 1}. ${tc.function.name}(${tc.function.arguments})`);
  });
}

// =============================================================================
// EXEMPLE 10 : Monitoring et métriques
// =============================================================================

async function exemple10_MonitoringMetrics() {
  console.log('\n=== EXEMPLE 10 : Monitoring et métriques ===\n');
  
  const manager = new LLMProviderManager();
  
  // Effectuer plusieurs appels
  console.log('Exécution de 5 appels pour collecter des métriques...\n');
  
  for (let i = 0; i < 5; i++) {
    try {
      await manager.call(
        `Test ${i + 1}: Dis bonjour`,
        { content: 'Tu es un assistant.' },
        []
      );
    } catch (error) {
      // Ignorer les erreurs pour cet exemple
    }
  }
  
  // Afficher les métriques
  const metrics = manager.getMetrics();
  
  console.log('📊 MÉTRIQUES DES PROVIDERS:\n');
  Object.entries(metrics).forEach(([provider, metric]) => {
    console.log(`${provider}:`);
    console.log(`  Appels: ${metric.calls}`);
    console.log(`  Temps moyen: ${metric.avgResponseTime.toFixed(0)}ms`);
    console.log(`  Erreurs: ${metric.errors}`);
    console.log(`  Dernier usage: ${metric.lastUsed.toISOString()}`);
    console.log();
  });
}

// =============================================================================
// MAIN : Exécuter tous les exemples
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  EXEMPLES D\'UTILISATION xAI GROK 4 FAST                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Exécuter les exemples (commenter ceux que vous ne voulez pas exécuter)
    
    // await exemple1_BasicUsage();
    // await exemple2_FunctionCalling();
    // await exemple3_ReasoningMode();
    // await exemple4_SimpleOrchestrator();
    // await exemple5_ProviderManager();
    // await exemple6_ChatAPIRoute();
    // await exemple7_DynamicConfiguration();
    // await exemple8_ErrorHandling();
    // await exemple9_ParallelToolCalls();
    // await exemple10_MonitoringMetrics();

    console.log('\n✅ Tous les exemples terminés !');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

// Export pour usage dans d'autres fichiers
export {
  exemple1_BasicUsage,
  exemple2_FunctionCalling,
  exemple3_ReasoningMode,
  exemple4_SimpleOrchestrator,
  exemple5_ProviderManager,
  exemple6_ChatAPIRoute,
  exemple7_DynamicConfiguration,
  exemple8_ErrorHandling,
  exemple9_ParallelToolCalls,
  exemple10_MonitoringMetrics
};

