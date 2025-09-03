/**
 * Script de test pour vérifier la persistance des tool calls et du reasoning
 * Usage: npm run test:tool-calls-persistence
 */

import { ChatSessionService } from '../services/chatSessionService';
import { SessionSyncService } from '../services/sessionSyncService';
import { simpleLogger as logger } from '../utils/logger';

interface TestMessage {
  role: 'assistant';
  content: string;
  reasoning: string;
  tool_calls: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_results: Array<{
    tool_call_id: string;
    name: string;
    content: string;
    success: boolean;
  }>;
  timestamp: string;
  channel: 'final';
}

async function testToolCallsPersistence() {
  logger.info('🧪 Début du test de persistance des tool calls et reasoning');
  
  try {
    // 1. Créer une session de test
    const sessionService = ChatSessionService.getInstance();
    const syncService = SessionSyncService.getInstance();
    
    const testSessionName = `Test Tool Calls - ${new Date().toISOString()}`;
    logger.info(`📝 Création de la session de test: ${testSessionName}`);
    
    const createResult = await sessionService.createSession({ name: testSessionName });
    if (!createResult.success || !createResult.data) {
      throw new Error(`Erreur création session: ${createResult.error}`);
    }
    
    const sessionId = createResult.data.id;
    logger.info(`✅ Session créée avec ID: ${sessionId}`);
    
    // 2. Créer un message de test avec tool calls et reasoning
    const testMessage: TestMessage = {
      role: 'assistant',
      content: 'J\'ai analysé votre demande et j\'ai utilisé plusieurs outils pour vous aider.',
      reasoning: 'L\'utilisateur a demandé une analyse complexe. Je vais utiliser les outils disponibles pour collecter les informations nécessaires et fournir une réponse complète.',
      tool_calls: [
        {
          id: 'call_test_1',
          type: 'function',
          function: {
            name: 'search_web',
            arguments: JSON.stringify({ query: 'test query', limit: 5 })
          }
        },
        {
          id: 'call_test_2',
          type: 'function',
          function: {
            name: 'create_note',
            arguments: JSON.stringify({ title: 'Test Note', content: 'This is a test note' })
          }
        }
      ],
      tool_results: [
        {
          tool_call_id: 'call_test_1',
          name: 'search_web',
          content: JSON.stringify({ success: true, results: ['Result 1', 'Result 2'] }),
          success: true
        },
        {
          tool_call_id: 'call_test_2',
          name: 'create_note',
          content: JSON.stringify({ success: true, note_id: 'note_123' }),
          success: true
        }
      ],
      timestamp: new Date().toISOString(),
      channel: 'final'
    };
    
    logger.info('📤 Ajout du message de test avec tool calls et reasoning');
    
    // 3. Ajouter le message via le service de synchronisation
    const addResult = await syncService.addMessageAndSync(sessionId, testMessage);
    if (!addResult.success) {
      throw new Error(`Erreur ajout message: ${addResult.error}`);
    }
    
    logger.info('✅ Message ajouté avec succès');
    
    // 4. Récupérer la session pour vérifier la persistance
    logger.info('📥 Récupération de la session pour vérification');
    
    const getResult = await sessionService.getSession(sessionId);
    if (!getResult.success || !getResult.data) {
      throw new Error(`Erreur récupération session: ${getResult.error}`);
    }
    
    const retrievedSession = getResult.data;
    const lastMessage = retrievedSession.thread[retrievedSession.thread.length - 1];
    
    // 5. Vérifier que toutes les données sont présentes
    logger.info('🔍 Vérification des données persistées');
    
    const checks = {
      hasContent: !!lastMessage.content,
      hasReasoning: !!(lastMessage as any).reasoning,
      hasToolCalls: !!(lastMessage as any).tool_calls?.length,
      hasToolResults: !!(lastMessage as any).tool_results?.length,
      toolCallsCount: (lastMessage as any).tool_calls?.length || 0,
      toolResultsCount: (lastMessage as any).tool_results?.length || 0
    };
    
    logger.info('📊 Résultats de la vérification:', checks);
    
    // 6. Tests de validation
    const tests = [
      {
        name: 'Contenu du message',
        passed: checks.hasContent,
        expected: true,
        actual: checks.hasContent
      },
      {
        name: 'Reasoning présent',
        passed: checks.hasReasoning,
        expected: true,
        actual: checks.hasReasoning
      },
      {
        name: 'Tool calls présents',
        passed: checks.hasToolCalls,
        expected: true,
        actual: checks.hasToolCalls
      },
      {
        name: 'Tool results présents',
        passed: checks.hasToolResults,
        expected: true,
        actual: checks.hasToolResults
      },
      {
        name: 'Nombre de tool calls',
        passed: checks.toolCallsCount === 2,
        expected: 2,
        actual: checks.toolCallsCount
      },
      {
        name: 'Nombre de tool results',
        passed: checks.toolResultsCount === 2,
        expected: 2,
        actual: checks.toolResultsCount
      }
    ];
    
    // 7. Afficher les résultats
    logger.info('🧪 Résultats des tests:');
    tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      logger.info(`${status} ${test.name}: ${test.passed ? 'PASSÉ' : 'ÉCHOUÉ'} (attendu: ${test.expected}, obtenu: ${test.actual})`);
    });
    
    const passedTests = tests.filter(t => t.passed).length;
    const totalTests = tests.length;
    
    if (passedTests === totalTests) {
      logger.info(`🎉 TOUS LES TESTS SONT PASSÉS (${passedTests}/${totalTests})`);
      logger.info('✅ La persistance des tool calls et du reasoning fonctionne correctement');
    } else {
      logger.error(`❌ ${totalTests - passedTests} test(s) ont échoué (${passedTests}/${totalTests})`);
      logger.error('❌ La persistance des tool calls et du reasoning ne fonctionne pas correctement');
    }
    
    // 8. Nettoyage (optionnel)
    logger.info('🧹 Nettoyage de la session de test');
    await sessionService.deleteSession(sessionId);
    logger.info('✅ Session de test supprimée');
    
  } catch (error) {
    logger.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  testToolCallsPersistence()
    .then(() => {
      logger.info('🏁 Test terminé');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Erreur fatale:', error);
      process.exit(1);
    });
}

export { testToolCallsPersistence };

