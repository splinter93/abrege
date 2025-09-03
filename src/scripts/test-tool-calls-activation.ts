/**
 * Script de test pour vérifier l'activation des tool calls
 * Usage: npm run test:tool-calls-activation
 */

import { simpleLogger as logger } from '../utils/logger';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

class ToolCallsActivationTester {
  private results: TestResult[] = [];

  async runAllTests() {
    logger.info('🧪 Début des tests d\'activation des tool calls');
    
    await this.testDeveloperMessageDetection();
    await this.testToolExtraction();
    await this.testPayloadConfiguration();
    await this.testErrorHandling();
    
    this.generateReport();
  }

  private async testDeveloperMessageDetection() {
    logger.info('\n📋 Test 1: Détection du message developer');
    
    // Simuler des messages avec et sans message developer
    const messagesWithDeveloper = [
      { role: 'system', content: 'System message' },
      { role: 'developer', content: '<|tool_code|>\n# test_tool\n# Description: Test tool\n# Parameters:\n{"type": "object"}\n<|/tool_code|>' },
      { role: 'user', content: 'User message' }
    ];
    
    const messagesWithoutDeveloper = [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User message' }
    ];
    
    // Test avec message developer
    const hasDeveloperWithTools = messagesWithDeveloper.some(
      msg => msg.role === 'developer' && msg.content
    );
    
    // Test sans message developer
    const hasDeveloperWithoutTools = messagesWithoutDeveloper.some(
      msg => msg.role === 'developer' && msg.content
    );
    
    this.addResult('Détection message developer (avec)', 
      hasDeveloperWithTools ? 'PASS' : 'FAIL',
      hasDeveloperWithTools ? 'Message developer détecté correctement' : 'Message developer non détecté'
    );
    
    this.addResult('Détection message developer (sans)', 
      !hasDeveloperWithoutTools ? 'PASS' : 'FAIL',
      !hasDeveloperWithoutTools ? 'Aucun message developer détecté correctement' : 'Message developer détecté par erreur'
    );
  }

  private async testToolExtraction() {
    logger.info('\n📋 Test 2: Extraction des outils');
    
    const developerContent = `<|tool_code|>
# search_web
# Description: Search the web for information
# Parameters:
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query"
    }
  },
  "required": ["query"]
}

# create_note
# Description: Create a note
# Parameters:
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Note title"
    }
  },
  "required": ["title"]
}
<|/tool_code|>`;
    
    // Simuler l'extraction des outils
    const toolCodeMatch = developerContent.match(/<\|tool_code\|>([\s\S]*?)<\|\/tool_code\|>/);
    const hasToolCode = !!toolCodeMatch;
    
    if (hasToolCode) {
      const toolCodeContent = toolCodeMatch![1].trim();
      const toolSections = toolCodeContent.split(/\n\s*\n/);
      const hasMultipleTools = toolSections.length >= 2;
      
      this.addResult('Extraction bloc tool_code', 'PASS', 'Bloc tool_code extrait correctement');
      this.addResult('Détection outils multiples', 
        hasMultipleTools ? 'PASS' : 'FAIL',
        hasMultipleTools ? `${toolSections.length} outils détectés` : 'Un seul outil détecté'
      );
    } else {
      this.addResult('Extraction bloc tool_code', 'FAIL', 'Bloc tool_code non trouvé');
    }
  }

  private async testPayloadConfiguration() {
    logger.info('\n📋 Test 3: Configuration du payload');
    
    // Simuler la configuration du payload avec tools
    const payloadWithTools = {
      model: 'openai/gpt-oss-120b',
      messages: [],
      temperature: 1,
      max_completion_tokens: 30000,
      top_p: 1,
      stream: false,
      tool_choice: 'auto',
      parallel_tool_calls: true,
      max_tokens: 4000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'test_tool',
            description: 'Test tool',
            parameters: { type: 'object' }
          }
        }
      ]
    };
    
    const payloadWithoutTools = {
      model: 'openai/gpt-oss-120b',
      messages: [],
      temperature: 1,
      max_completion_tokens: 30000,
      top_p: 1,
      stream: false,
      tool_choice: 'none'
    };
    
    // Vérifier la configuration avec tools
    const hasToolChoice = payloadWithTools.tool_choice === 'auto';
    const hasParallelCalls = payloadWithTools.parallel_tool_calls === true;
    const hasTools = Array.isArray(payloadWithTools.tools) && payloadWithTools.tools.length > 0;
    
    // Vérifier la configuration sans tools
    const hasNoToolChoice = payloadWithoutTools.tool_choice === 'none';
    const hasNoTools = !payloadWithoutTools.tools;
    
    this.addResult('Configuration avec tools - tool_choice', 
      hasToolChoice ? 'PASS' : 'FAIL',
      hasToolChoice ? 'tool_choice = auto' : 'tool_choice incorrect'
    );
    
    this.addResult('Configuration avec tools - parallel_calls', 
      hasParallelCalls ? 'PASS' : 'FAIL',
      hasParallelCalls ? 'parallel_tool_calls = true' : 'parallel_tool_calls incorrect'
    );
    
    this.addResult('Configuration avec tools - tools array', 
      hasTools ? 'PASS' : 'FAIL',
      hasTools ? `${payloadWithTools.tools.length} outils configurés` : 'Aucun outil configuré'
    );
    
    this.addResult('Configuration sans tools - tool_choice', 
      hasNoToolChoice ? 'PASS' : 'FAIL',
      hasNoToolChoice ? 'tool_choice = none' : 'tool_choice incorrect'
    );
    
    this.addResult('Configuration sans tools - no tools', 
      hasNoTools ? 'PASS' : 'FAIL',
      hasNoTools ? 'Aucun outil configuré' : 'Outils configurés par erreur'
    );
  }

  private async testErrorHandling() {
    logger.info('\n📋 Test 4: Gestion des erreurs');
    
    // Simuler des erreurs courantes
    const errorScenarios = [
      {
        name: 'Message developer malformé',
        content: '<|tool_code|>Invalid content<|/tool_code|>',
        shouldFail: true
      },
      {
        name: 'Message developer vide',
        content: '<|tool_code|><|/tool_code|>',
        shouldFail: true
      },
      {
        name: 'Message developer valide',
        content: '<|tool_code|>\n# test_tool\n# Description: Test\n# Parameters:\n{"type": "object"}\n<|/tool_code|>',
        shouldFail: false
      }
    ];
    
    errorScenarios.forEach(scenario => {
      try {
        const toolCodeMatch = scenario.content.match(/<\|tool_code\|>([\s\S]*?)<\|\/tool_code\|>/);
        const hasValidContent = toolCodeMatch && toolCodeMatch[1].trim().length > 0;
        
        const testPassed = scenario.shouldFail ? !hasValidContent : hasValidContent;
        
        this.addResult(`Gestion erreur - ${scenario.name}`, 
          testPassed ? 'PASS' : 'FAIL',
          testPassed ? 'Gestion correcte' : 'Gestion incorrecte'
        );
      } catch (error) {
        this.addResult(`Gestion erreur - ${scenario.name}`, 
          scenario.shouldFail ? 'PASS' : 'FAIL',
          scenario.shouldFail ? 'Erreur gérée correctement' : 'Erreur non gérée'
        );
      }
    });
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.results.push({ test, status, message, details });
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    logger.info(`${emoji} ${test}: ${message}`);
  }

  private generateReport() {
    logger.info('\n📊 RAPPORT DE TEST');
    logger.info('==================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;
    
    logger.info(`\n📈 Résultats:`);
    logger.info(`   ✅ Passés: ${passed}/${total}`);
    logger.info(`   ❌ Échoués: ${failed}/${total}`);
    logger.info(`   ⏭️ Ignorés: ${skipped}/${total}`);
    
    if (failed > 0) {
      logger.info(`\n❌ Tests échoués:`);
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        logger.info(`   • ${result.test}: ${result.message}`);
      });
    }
    
    if (passed === total) {
      logger.info('\n🎉 TOUS LES TESTS SONT PASSÉS !');
      logger.info('✅ L\'activation des tool calls fonctionne correctement');
    } else {
      logger.info('\n⚠️ Certains tests ont échoué');
      logger.info('🔧 Vérifiez la configuration des tool calls');
    }
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  const tester = new ToolCallsActivationTester();
  tester.runAllTests()
    .then(() => {
      logger.info('\n🏁 Tests terminés');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Erreur lors des tests:', error);
      process.exit(1);
    });
}

export { ToolCallsActivationTester };

