#!/usr/bin/env node

/**
 * 🧪 Test de la Limite de Contenu des Outils
 * 
 * Ce script teste que la limite de 8KB a été augmentée à 64KB
 * pour éviter la troncature des résultats d'outils volumineux
 */

const fs = require('fs');
const path = require('path');

async function testToolContentLimit() {
  try {
    console.log('🧪 Test de la Limite de Contenu des Outils...');
    
    // 1. Vérifier le fichier principal
    const filePath = path.join(process.cwd(), 'src/services/llm/groqGptOss120b.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier groqGptOss120b.ts non trouvé');
      return;
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 2. Vérifier que toutes les limites 8KB ont été remplacées
    const oldLimit = 'const MAX = 8 * 1024';
    const newLimit = 'const MAX = 64 * 1024';
    
    const oldLimitCount = (fileContent.match(new RegExp(oldLimit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const newLimitCount = (fileContent.match(new RegExp(newLimit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    console.log('\n📊 Analyse des Limites:');
    console.log(`   - Ancienne limite (8KB): ${oldLimitCount} occurrences`);
    console.log(`   - Nouvelle limite (64KB): ${newLimitCount} occurrences`);
    
    // 3. Vérifier les commentaires de correction
    const correctionComments = (fileContent.match(/✅ CORRECTION: Augmenter la limite de 8KB à 64KB/g) || []).length;
    console.log(`   - Commentaires de correction: ${correctionComments} occurrences`);
    
    // 4. Résultat du test
    console.log('\n📋 Résultat du Test:');
    
    if (oldLimitCount === 0 && newLimitCount >= 4 && correctionComments >= 4) {
      console.log('   ✅ SUCCÈS: Toutes les limites ont été corrigées');
      console.log('   ✅ Limite augmentée de 8KB à 64KB');
      console.log('   ✅ Commentaires de correction ajoutés');
    } else {
      console.log('   ❌ ÉCHEC: Certaines limites n\'ont pas été corrigées');
      console.log('   ❌ Vérifiez le fichier manuellement');
    }
    
    // 5. Impact de la correction
    console.log('\n🎯 Impact de la Correction:');
    console.log('   - Avant: Limite de 8KB (trop restrictive)');
    console.log('   - Après: Limite de 64KB (plus raisonnable)');
    console.log('   - Gain: 8x plus de données autorisées');
    console.log('   - Résultat: Plus de troncature pour get_notebook_tree');
    
    // 6. Outils qui bénéficient de cette correction
    console.log('\n🔧 Outils qui Bénéficient:');
    console.log('   - get_notebook_tree (arbres de données)');
    console.log('   - get_dossier_tree (structures de dossiers)');
    console.log('   - get_classeur_tree (hiérarchies complètes)');
    console.log('   - Tous les outils retournant des données structurées');
    
    // 7. Instructions de test
    console.log('\n📋 Instructions de Test:');
    console.log('   1. Redémarrer le serveur: npm run dev');
    console.log('   2. Tester avec un outil volumineux (ex: get_notebook_tree)');
    console.log('   3. Vérifier que le résultat n\'est plus tronqué');
    console.log('   4. Vérifier les logs pour confirmer la nouvelle limite');
    
  } catch (error) {
    console.log('❌ Erreur:', error);
  }
}

testToolContentLimit(); 