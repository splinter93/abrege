#!/usr/bin/env node

/**
 * 🔧 Script pour appliquer la migration via l'API de l'application
 */

console.log('🔧 APPLICATION DE LA MIGRATION VIA API');
console.log('=====================================');

async function applyMigrationViaAPI() {
  console.log('\n🔧 ÉTAPE 1: Test de connexion à l\'API');
  
  try {
    // Test de connexion à l'API
    const response = await fetch('http://localhost:3000/api/v2/classeurs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'llm'
      }
    });
    
    if (response.ok) {
      console.log('   ✅ API accessible');
    } else {
      console.log('   ❌ API non accessible:', response.status);
      return false;
    }
    
    console.log('\n🔧 ÉTAPE 2: Application de la migration');
    console.log('   💡 Pour appliquer la migration, tu dois:');
    console.log('   1. Aller dans ton dashboard Supabase');
    console.log('   2. Ouvrir l\'éditeur SQL');
    console.log('   3. Exécuter cette requête:');
    console.log('');
    console.log('   ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_v2_capabilities TEXT[] DEFAULT \'{}\';');
    console.log('   CREATE INDEX IF NOT EXISTS idx_agents_api_v2_capabilities ON agents USING gin(api_v2_capabilities);');
    console.log('   COMMENT ON COLUMN agents.api_v2_capabilities IS \'Liste des capacités API v2 disponibles pour l\'agent\';');
    console.log('');
    console.log('   4. Puis exécuter cette requête pour configurer les agents:');
    console.log('');
    console.log('   UPDATE agents SET api_v2_capabilities = ARRAY[\'create_note\', \'update_note\', \'add_content_to_note\', \'move_note\', \'delete_note\', \'create_folder\', \'get_note_content\', \'get_tree\', \'get_notebooks\'];');
    console.log('');
    
    return true;
    
  } catch (error) {
    console.log('   ❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function testFunctionCalling() {
  console.log('\n🧪 ÉTAPE 3: Test des function calls');
  
  console.log('   📤 Test avec l\'application en cours d\'exécution');
  console.log('   💡 Essaie de tester avec Donna:');
  console.log('   "Créer une note \'Test Migration\' avec le contenu \'Ceci est un test de migration\'"');
  
  console.log('\n📋 **CAPACITÉS À ACTIVER:**');
  console.log('   - create_note: Créer une nouvelle note');
  console.log('   - update_note: Modifier une note existante');
  console.log('   - add_content_to_note: Ajouter du contenu à une note');
  console.log('   - move_note: Déplacer une note');
  console.log('   - delete_note: Supprimer une note');
  console.log('   - create_folder: Créer un dossier');
  console.log('   - get_note_content: Récupérer le contenu d\'une note');
  console.log('   - get_tree: Récupérer la structure d\'un classeur');
  console.log('   - get_notebooks: Lister tous les classeurs');
}

async function main() {
  console.log('🚀 DÉBUT DE LA MIGRATION VIA API...\n');
  
  const apiOk = await applyMigrationViaAPI();
  if (!apiOk) {
    console.log('\n❌ API non accessible. Arrêt.');
    process.exit(1);
  }
  
  await testFunctionCalling();
  
  console.log('\n✅ INSTRUCTIONS DE MIGRATION PRÊTES !');
  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Appliquer la migration SQL dans Supabase');
  console.log('   2. Redémarrer l\'application: npm run dev');
  console.log('   3. Tester avec Donna: "Créer une note de test"');
  console.log('   4. Vérifier que les function calls sont détectés automatiquement');
  
  console.log('\n🚀 **FUNCTION CALLS SERONT OPÉRATIONNELS APRÈS LA MIGRATION !**');
}

main().catch(console.error); 