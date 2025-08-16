#!/usr/bin/env node

/**
 * Test de l'API tree V2 pour vérifier que le contenu complet des notes est récupéré
 */

const { simpleLogger: logger } = require('../src/utils/logger');

async function testTreeContentFix() {
  logger.dev('🧪 Test de l\'API tree V2 - Contenu complet des notes');
  
  try {
    // Simuler une requête vers l'API tree
    const response = await fetch('http://localhost:3000/api/v2/classeur/test/tree', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    if (!response.ok) {
      logger.error(`❌ Erreur API: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    if (data.success && data.tree) {
      logger.dev('✅ API tree V2 fonctionne');
      
      // Vérifier le contenu des notes
      const notes = data.tree.notes || [];
      logger.dev(`📝 ${notes.length} notes trouvées`);
      
      if (notes.length > 0) {
        const firstNote = notes[0];
        logger.dev('🔍 Première note:');
        logger.dev(`  - ID: ${firstNote.id}`);
        logger.dev(`  - Titre: ${firstNote.title}`);
        logger.dev(`  - Markdown: ${firstNote.markdown_content ? '✅ Présent' : '❌ Manquant'}`);
        logger.dev(`  - HTML: ${firstNote.html_content ? '✅ Présent' : '❌ Manquant'}`);
        logger.dev(`  - Image: ${firstNote.image_url ? '✅ Présent' : '❌ Manquant'}`);
        logger.dev(`  - Folder ID: ${firstNote.folder_id || 'Racine'}`);
      }
      
      // Vérifier les dossiers
      const folders = data.tree.folders || [];
      logger.dev(`📁 ${folders.length} dossiers trouvés`);
      
    } else {
      logger.error('❌ Réponse API invalide:', data);
    }
    
  } catch (error) {
    logger.error('❌ Erreur test:', error);
  }
}

// Exécuter le test
testTreeContentFix().then(() => {
  logger.dev('🏁 Test terminé');
  process.exit(0);
}).catch((error) => {
  logger.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 