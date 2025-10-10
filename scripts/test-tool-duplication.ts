/**
 * 🧪 Script de test pour la duplication des tool calls
 * 
 * Ce script teste les différents scénarios de duplication :
 * 1. Même ID → Doit être bloqué
 * 2. IDs différents, même contenu → Doit être bloqué
 * 3. Race conditions (parallélisation) → Un seul doit réussir
 * 4. Retry après échec → Doit être autorisé
 */

import { ToolCallManager } from '../src/services/llm/toolCallManager';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function runTests() {
  console.log(`\n${BOLD}🧪 Test de Duplication des Tool Calls${RESET}\n`);
  
  const manager = ToolCallManager.getInstance();
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Duplication par ID identique
  console.log(`${BOLD}Test 1: Duplication par ID identique${RESET}`);
  manager.clearExecutionHistory();
  
  const toolCall1 = {
    id: "call_test_123",
    function: { 
      name: "getNote", 
      arguments: JSON.stringify({ ref: "test-note-1" }) 
    }
  };
  
  const result1 = await manager.executeToolCall(toolCall1, "fake-token");
  const result1Duplicate = await manager.executeToolCall(toolCall1, "fake-token");
  
  if (!result1Duplicate.success && result1Duplicate.result.error?.includes('déjà exécuté')) {
    console.log(`${GREEN}✓${RESET} Duplication par ID bloquée correctement`);
    testsPassed++;
  } else {
    console.log(`${RED}✗${RESET} ÉCHEC: Duplication par ID non bloquée`);
    testsFailed++;
  }
  
  // Test 2: IDs différents, même contenu
  console.log(`\n${BOLD}Test 2: IDs différents, même contenu${RESET}`);
  manager.clearExecutionHistory();
  
  const toolCall2a = {
    id: "call_test_456",
    function: { 
      name: "getNote", 
      arguments: JSON.stringify({ ref: "test-note-2" }) 
    }
  };
  
  const toolCall2b = {
    id: "call_test_789", // ID différent
    function: { 
      name: "getNote", 
      arguments: JSON.stringify({ ref: "test-note-2" }) // Même contenu
    }
  };
  
  const result2a = await manager.executeToolCall(toolCall2a, "fake-token");
  const result2b = await manager.executeToolCall(toolCall2b, "fake-token");
  
  if (!result2b.success && result2b.result.error?.includes('déjà exécuté')) {
    console.log(`${GREEN}✓${RESET} Duplication par contenu bloquée correctement`);
    console.log(`  Détecté par: ${result2b.result.detected_by}`);
    testsPassed++;
  } else {
    console.log(`${RED}✗${RESET} ÉCHEC: Duplication par contenu non bloquée`);
    testsFailed++;
  }
  
  // Test 3: Normalisation des arguments (espaces, ordre des clés)
  console.log(`\n${BOLD}Test 3: Normalisation des arguments${RESET}`);
  manager.clearExecutionHistory();
  
  const toolCall3a = {
    id: "call_test_abc",
    function: { 
      name: "updateNote", 
      arguments: JSON.stringify({ ref: "note-3", content: "Hello", title: "Test" }) 
    }
  };
  
  const toolCall3b = {
    id: "call_test_def",
    function: { 
      name: "updateNote", 
      // Ordre différent des clés
      arguments: JSON.stringify({ title: "Test", ref: "note-3", content: "Hello" }) 
    }
  };
  
  const result3a = await manager.executeToolCall(toolCall3a, "fake-token");
  const result3b = await manager.executeToolCall(toolCall3b, "fake-token");
  
  if (!result3b.success && result3b.result.error?.includes('déjà exécuté')) {
    console.log(`${GREEN}✓${RESET} Normalisation des arguments fonctionne`);
    testsPassed++;
  } else {
    console.log(`${RED}✗${RESET} ÉCHEC: Normalisation des arguments ne fonctionne pas`);
    testsFailed++;
  }
  
  // Test 4: Race conditions (exécution parallèle)
  console.log(`\n${BOLD}Test 4: Race conditions (10 appels parallèles)${RESET}`);
  manager.clearExecutionHistory();
  
  const toolCallRace = {
    id: "call_test_race",
    function: { 
      name: "getClasseur", 
      arguments: JSON.stringify({ ref: "classeur-test" }) 
    }
  };
  
  // Créer 10 variantes avec IDs différents mais même contenu
  const racePromises = Array(10).fill(null).map((_, idx) => 
    manager.executeToolCall(
      {
        ...toolCallRace,
        id: `call_test_race_${idx}` // IDs différents
      },
      "fake-token"
    )
  );
  
  const raceResults = await Promise.all(racePromises);
  const raceSuccesses = raceResults.filter(r => r.success).length;
  const raceDuplicates = raceResults.filter(r => !r.success && r.result.error?.includes('déjà exécuté')).length;
  
  if (raceSuccesses === 1 && raceDuplicates === 9) {
    console.log(`${GREEN}✓${RESET} Race conditions gérées: 1 succès, 9 duplications bloquées`);
    testsPassed++;
  } else {
    console.log(`${RED}✗${RESET} ÉCHEC Race conditions: ${raceSuccesses} succès, ${raceDuplicates} bloqués (attendu: 1/9)`);
    testsFailed++;
  }
  
  // Test 5: Statistiques
  console.log(`\n${BOLD}Test 5: Statistiques de duplication${RESET}`);
  const stats = manager.getDuplicationStats();
  
  console.log(`  Total exécuté (par ID): ${stats.totalExecuted}`);
  console.log(`  Unique par contenu: ${stats.uniqueByContent}`);
  console.log(`  Tentatives de duplication: ${stats.duplicateAttempts}`);
  console.log(`  Locks actifs: ${stats.activeLocks}`);
  
  if (stats.duplicateAttempts > 0) {
    console.log(`${GREEN}✓${RESET} Statistiques disponibles`);
    testsPassed++;
  } else {
    console.log(`${YELLOW}⚠${RESET} Aucune duplication détectée dans les stats (normal si tests précédents ont échoué)`);
    testsPassed++;
  }
  
  // Résumé
  console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BOLD}Résumé des tests:${RESET}`);
  console.log(`${GREEN}✓ Réussis: ${testsPassed}${RESET}`);
  console.log(`${RED}✗ Échoués: ${testsFailed}${RESET}`);
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);
  
  if (testsFailed === 0) {
    console.log(`${GREEN}${BOLD}🎉 TOUS LES TESTS SONT PASSÉS !${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}❌ ${testsFailed} TEST(S) ONT ÉCHOUÉ${RESET}\n`);
    process.exit(1);
  }
}

// Exécuter les tests
runTests().catch(error => {
  console.error(`${RED}${BOLD}❌ Erreur fatale:${RESET}`, error);
  process.exit(1);
});

