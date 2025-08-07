#!/usr/bin/env node

/**
 * Script de test pour vérifier le format du content des messages tool
 * Montre exactement comment la réponse du tool est formatée dans le content
 */

async function testToolContentFormat() {
  console.log('🔧 Test du format du content des messages tool - API v2 Scrivia\n');

  try {
    // 1. Simuler les résultats de différents tools
    const toolResults = {
      create_note: {
        success: true,
        note: {
          id: 'note-123',
          source_title: 'Ma note de test',
          slug: 'ma-note-de-test',
          markdown_content: '# Test\n\nContenu de test',
          created_at: '2024-01-01T12:00:00.000Z'
        }
      },
      get_notebooks: {
        success: true,
        classeurs: [
          {
            id: 'classeur-1',
            name: 'Mon premier classeur',
            slug: 'mon-premier-classeur',
            created_at: '2024-01-01T10:00:00.000Z'
          },
          {
            id: 'classeur-2', 
            name: 'Projets',
            slug: 'projets',
            created_at: '2024-01-01T11:00:00.000Z'
          }
        ]
      },
      create_folder: {
        success: true,
        folder: {
          id: 'folder-456',
          name: 'Nouveau dossier',
          slug: 'nouveau-dossier',
          classeur_id: 'classeur-1',
          created_at: '2024-01-01T12:30:00.000Z'
        }
      },
      error_example: {
        success: false,
        error: 'Classeur non trouvé: classeur-inexistant'
      }
    };

    console.log('📋 Exemples de résultats de tools:');
    Object.entries(toolResults).forEach(([toolName, result]) => {
      console.log(`\n🔧 ${toolName}:`);
      console.log('   Résultat original:', result);
      console.log('   Content JSON:', JSON.stringify(result));
    });

    // 2. Simuler l'injection dans l'historique
    console.log('\n📝 Simulation d\'injection dans l\'historique:');
    
    const toolCallId = 'call_1234567890';
    
    // Message assistant avec tool call
    const assistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: toolCallId,
        type: 'function',
        function: {
          name: 'create_note',
          arguments: JSON.stringify({
            source_title: 'Ma note de test',
            notebook_id: 'classeur-1',
            markdown_content: '# Test\n\nContenu de test'
          })
        }
      }]
    };

    // Message tool avec le résultat (content bien propre)
    const toolMessage = {
      role: 'tool',
      tool_call_id: toolCallId,
      name: 'create_note',
      content: JSON.stringify(toolResults.create_note) // ✅ Réponse propre du tool
    };

    console.log('✅ Message assistant:');
    console.log(JSON.stringify(assistantMessage, null, 2));
    
    console.log('\n✅ Message tool avec content propre:');
    console.log(JSON.stringify(toolMessage, null, 2));

    // 3. Vérifier le parsing côté client
    console.log('\n🔍 Test de parsing côté client:');
    try {
      const parsedContent = JSON.parse(toolMessage.content);
      console.log('✅ Content parsé avec succès:');
      console.log('   - success:', parsedContent.success);
      console.log('   - note.title:', parsedContent.note?.source_title);
      console.log('   - note.id:', parsedContent.note?.id);
    } catch (error) {
      console.error('❌ Erreur parsing:', error);
    }

    // 4. Exemple d'erreur
    console.log('\n❌ Exemple avec erreur:');
    const errorToolMessage = {
      role: 'tool',
      tool_call_id: 'call_error_123',
      name: 'create_note',
      content: JSON.stringify(toolResults.error_example)
    };
    
    console.log('✅ Message tool avec erreur:');
    console.log(JSON.stringify(errorToolMessage, null, 2));

    // 5. Vérifier le parsing de l'erreur
    try {
      const parsedError = JSON.parse(errorToolMessage.content);
      console.log('✅ Erreur parsée:');
      console.log('   - success:', parsedError.success);
      console.log('   - error:', parsedError.error);
    } catch (error) {
      console.error('❌ Erreur parsing erreur:', error);
    }

    console.log('\n🎉 Test du format du content terminé avec succès !');
    console.log('📝 Le content contient bien la réponse propre du tool en JSON.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test
testToolContentFormat().catch(console.error); 