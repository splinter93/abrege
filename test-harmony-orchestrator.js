/**
 * Test simple pour vérifier que HarmonyOrchestrator fonctionne avec les tools API V2
 */

const { HarmonyOrchestrator } = require('./src/services/llm/services/HarmonyOrchestrator.ts');
const { API_V2_TOOLS } = require('./src/services/llm/tools/ApiV2Tools.ts');

async function testHarmonyOrchestrator() {
  console.log('🧪 Test HarmonyOrchestrator avec tools API V2');
  
  try {
    // 1. Créer l'orchestrateur
    const orchestrator = new HarmonyOrchestrator();
    console.log('✅ Orchestrateur créé');
    
    // 2. Vérifier les tools disponibles
    const tools = orchestrator.getAvailableTools();
    console.log(`✅ ${tools.length} tools disponibles`);
    
    // 3. Lister quelques tools
    const toolNames = tools.slice(0, 5).map(tool => tool.function.name);
    console.log('📋 Premiers tools:', toolNames);
    
    // 4. Vérifier que les tools API V2 sont bien présents
    const hasCreateNote = tools.some(tool => tool.function.name === 'createNote');
    const hasGetNote = tools.some(tool => tool.function.name === 'getNote');
    const hasSearchContent = tools.some(tool => tool.function.name === 'searchContent');
    
    console.log('🔍 Vérification des tools API V2:');
    console.log(`  - createNote: ${hasCreateNote ? '✅' : '❌'}`);
    console.log(`  - getNote: ${hasGetNote ? '✅' : '❌'}`);
    console.log(`  - searchContent: ${hasSearchContent ? '✅' : '❌'}`);
    
    if (hasCreateNote && hasGetNote && hasSearchContent) {
      console.log('🎉 SUCCESS: HarmonyOrchestrator fonctionne avec les tools API V2 !');
      return true;
    } else {
      console.log('❌ FAIL: Des tools API V2 sont manquants');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    return false;
  }
}

// Exécuter le test
testHarmonyOrchestrator()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 ERREUR FATALE:', error);
    process.exit(1);
  });
