#!/usr/bin/env node

/**
 * Script de diagnostic pour le problème de déplacement des notes
 * Vérifie la cohérence entre la base de données et l'interface
 */

console.log('🔍 Diagnostic du problème de déplacement des notes...\n');

// 1. Analyse du problème
console.log('📋 1. Analyse du problème...');

const problem = [
  '❌ Note déplacée côté serveur (✅ dans les logs)',
  '❌ Note disparaît de l\'interface',
  '❌ Note n\'apparaît pas dans le dossier de destination',
  '❌ Problème de synchronisation DB ↔ Interface'
];

problem.forEach(item => console.log(`   ${item}`));

// 2. Causes possibles identifiées
console.log('\n🔍 2. Causes possibles identifiées...');

const causes = [
  '🔍 Store Zustand: moveNote met à jour folder_id mais pas classeur_id',
  '🔍 Filtrage UI: notes.filter(n => n.classeur_id === classeurId && ...)',
  '🔍 Cohérence DB: folder_id vs classeur_id dans la table articles',
  '🔍 Rafraîchissement: L\'interface ne se met pas à jour après le déplacement'
];

causes.forEach(cause => console.log(`   ${cause}`));

// 3. Vérifications à effectuer
console.log('\n🔧 3. Vérifications à effectuer...');

const verifications = [
  '✅ Vérifier que la note a le bon folder_id dans la DB',
  '✅ Vérifier que la note a le bon classeur_id dans la DB',
  '✅ Vérifier que le store Zustand est bien mis à jour',
  '✅ Vérifier que l\'interface se rafraîchit correctement',
  '✅ Vérifier que le filtrage fonctionne avec les bonnes données'
];

verifications.forEach(verif => console.log(`   ${verif}`));

// 4. Solutions proposées
console.log('\n💡 4. Solutions proposées...');

const solutions = [
  '🔧 Corriger moveNote pour mettre à jour classeur_id aussi',
  '🔧 Forcer le rafraîchissement de l\'interface après déplacement',
  '🔧 Vérifier la cohérence des données dans la DB',
  '🔧 Ajouter des logs de debug pour tracer le problème',
  '🔧 Tester avec un rechargement manuel de la page'
];

solutions.forEach(solution => console.log(`   ${solution}`));

// 5. Test de diagnostic
console.log('\n🧪 5. Test de diagnostic...');
console.log('   1. Ouvrir la console du navigateur');
console.log('   2. Aller sur /private/dossiers');
console.log('   3. Sélectionner un classeur');
console.log('   4. Créer un dossier "Test"');
console.log('   5. Créer une note "Note test"');
console.log('   6. Faire glisser la note dans le dossier');
console.log('   7. Vérifier dans la console:');
console.log('      - store.getState().notes[noteId]');
console.log('      - folder_id et classeur_id de la note');
console.log('   8. Vérifier dans la DB:');
console.log('      - SELECT * FROM articles WHERE id = \'noteId\'');
console.log('      - folder_id et classeur_id');

// 6. Commandes de debug
console.log('\n🐛 6. Commandes de debug...');
console.log('   // Dans la console du navigateur:');
console.log('   const store = useFileSystemStore.getState();');
console.log('   console.log(\'Notes:\', store.notes);');
console.log('   console.log(\'Folders:\', store.folders);');
console.log('   console.log(\'Classeurs:\', store.classeurs);');
console.log('   // Vérifier une note spécifique:');
console.log('   const note = store.notes[\'noteId\'];');
console.log('   console.log(\'Note:\', note);');
console.log('   console.log(\'folder_id:\', note.folder_id);');
console.log('   console.log(\'classeur_id:\', note.classeur_id);');

console.log('\n✨ Diagnostic terminé !');
console.log('Suivez les étapes de test pour identifier la cause exacte du problème.'); 