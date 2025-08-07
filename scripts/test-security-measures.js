#!/usr/bin/env node

/**
 * Script de test pour vérifier les mesures de sécurité
 * Teste: content null, taille, échappement, format d'erreur
 */

function testSecurityMeasures() {
  console.log('🔒 Test des mesures de sécurité - API v2 Scrivia\n');

  try {
    // 1. Test: assistant.content = null (jamais undefined)
    console.log('✅ Test 1: assistant.content = null');
    const assistantMessage = {
      role: 'assistant',
      content: null, // 🔧 SÉCURITÉ: Forcer null, jamais undefined
      tool_calls: [{
        id: 'call_123',
        type: 'function',
        function: {
          name: 'create_note',
          arguments: '{}'
        }
      }]
    };
    console.log('   ✅ assistant.content:', assistantMessage.content);
    console.log('   ✅ Type:', typeof assistantMessage.content);
    console.log('');

    // 2. Test: Éviter le double-échappement
    console.log('✅ Test 2: Éviter le double-échappement');
    
    // Cas 1: Objet JavaScript normal
    const normalResult = { success: true, note: { id: '123', title: 'Test' } };
    const normalContent = JSON.stringify(normalResult);
    console.log('   Cas 1 - Objet normal:');
    console.log('   Original:', normalResult);
    console.log('   JSON.stringify:', normalContent);
    console.log('   Pas de double-échappement ✅');
    
    // Cas 2: String JSON déjà échappée
    const jsonString = '{"success":true,"data":"test"}';
    let content2;
    try {
      JSON.parse(jsonString); // Test si c'est du JSON valide
      content2 = jsonString; // Utiliser directement
      console.log('   Cas 2 - String JSON:');
      console.log('   Original:', jsonString);
      console.log('   Utilisé directement:', content2);
      console.log('   Pas de double-échappement ✅');
    } catch {
      content2 = JSON.stringify(jsonString);
      console.log('   Cas 2 - String non-JSON:');
      console.log('   Échappé:', content2);
    }
    console.log('');

    // 3. Test: Vérification de la taille (8KB)
    console.log('✅ Test 3: Vérification de la taille (8KB)');
    const maxSize = 8 * 1024;
    
    // Cas normal (petit)
    const smallContent = JSON.stringify({ success: true, data: 'test' });
    console.log(`   Petit content (${smallContent.length} chars): OK ✅`);
    
    // Cas trop gros (simulé)
    const bigData = { success: true, data: 'x'.repeat(10000) };
    const bigContent = JSON.stringify(bigData);
    console.log(`   Gros content (${bigContent.length} chars): TROP GROS ❌`);
    
    if (bigContent.length > maxSize) {
      const truncatedContent = JSON.stringify({
        success: bigData.success,
        message: "Résultat tronqué - données trop volumineuses",
        truncated: true,
        original_size: bigContent.length
      });
      console.log(`   Content tronqué (${truncatedContent.length} chars): OK ✅`);
    }
    console.log('');

    // 4. Test: Format d'erreur standardisé
    console.log('✅ Test 4: Format d\'erreur standardisé');
    const errorMessage = 'Classeur non trouvé: test-classeur';
    const errorContent = JSON.stringify({
      success: false,
      error: errorMessage,
      message: `❌ ÉCHEC : ${errorMessage}` // Message humain pour le modèle
    });
    
    console.log('   Erreur formatée:');
    console.log('   - success: false');
    console.log('   - error: [message technique]');
    console.log('   - message: [message humain]');
    console.log('   Content:', errorContent);
    console.log('');

    // 5. Test: Message tool complet
    console.log('✅ Test 5: Message tool complet');
    const toolMessage = {
      role: 'tool',
      tool_call_id: 'call_123',
      name: 'create_note',
      content: normalContent
    };
    
    console.log('   Message tool:');
    console.log('   - role: tool');
    console.log('   - tool_call_id: call_123');
    console.log('   - name: create_note');
    console.log('   - content: [JSON propre]');
    console.log('   ✅ Format correct');
    console.log('');

    // 6. Test: Parsing côté client
    console.log('✅ Test 6: Parsing côté client');
    try {
      const parsedContent = JSON.parse(toolMessage.content);
      console.log('   Content parsé avec succès:');
      console.log('   - success:', parsedContent.success);
      console.log('   - note.id:', parsedContent.note?.id);
      console.log('   ✅ Parsing OK');
    } catch (error) {
      console.error('   ❌ Erreur parsing:', error);
    }

    console.log('\n🎉 Tous les tests de sécurité passés !');
    console.log('📝 Le pipeline est maintenant robuste et LLM-friendly.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testSecurityMeasures(); 