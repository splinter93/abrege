#!/usr/bin/env node

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFixedFolders() {
  try {
    console.log('🧪 TEST DES DOSSIERS APRÈS CORRECTION');
    console.log('=======================================');
    
    // 1. Récupérer un utilisateur
    console.log('\n👥 Récupération d\'un utilisateur...');
    const { data, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !data || !data.users || !data.users.length) {
      console.log('⚠️ Aucun utilisateur trouvé');
      console.log('   Erreur:', usersError?.message || 'Données invalides');
      return;
    }
    
    const testUser = data.users[0];
    console.log(`👤 Utilisateur de test: ${testUser.email}`);
    
    // 2. Créer un classeur de test
    console.log('\n📚 Création d\'un classeur de test...');
    const testClasseur = {
      name: 'Test Classeur Fix',
      user_id: testUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newClasseur, error: createClasseurError } = await supabase
      .from('classeurs')
      .insert([testClasseur])
      .select('id, name')
      .single();
    
    if (createClasseurError) {
      console.log('❌ Erreur création classeur:', createClasseurError.message);
      return;
    }
    
    console.log(`✅ Classeur créé: ${newClasseur.name} (${newClasseur.id})`);
    
    // 3. Tester la création de dossier avec la structure corrigée
    console.log('\n📁 Test création dossier (structure corrigée)...');
    
    const testFolder = {
      name: 'Test Dossier Fix',
      user_id: testUser.id,
      classeur_id: newClasseur.id,
      created_at: new Date().toISOString(),
      position: 0,
      slug: `test-dossier-fix-${Date.now()}`
    };
    
    console.log('📦 Données du dossier (structure corrigée):');
    console.log(JSON.stringify(testFolder, null, 2));
    
    const { data: newFolder, error: createFolderError } = await supabase
      .from('folders')
      .insert([testFolder])
      .select('*')
      .single();
    
    if (createFolderError) {
      console.log('❌ Erreur création dossier:', createFolderError.message);
      
      if (createFolderError.message.includes('RLS')) {
        console.log('\n🚨 PROBLÈME RLS PERSISTE');
        console.log('=========================');
        console.log('Malgré la correction de la structure, RLS bloque encore.');
        console.log('Solution: Désactiver RLS dans le dashboard Supabase');
      } else if (createFolderError.message.includes('column')) {
        console.log('\n🚨 PROBLÈME DE STRUCTURE PERSISTE');
        console.log('==================================');
        console.log('Il y a encore des colonnes manquantes.');
        console.log('Erreur:', createFolderError.message);
      } else {
        console.log('\n⚠️ Autre type d\'erreur');
        console.log('Erreur:', createFolderError.message);
      }
    } else {
      console.log(`✅ SUCCÈS! Dossier créé avec la structure corrigée`);
      console.log('📋 Dossier créé:');
      console.log(JSON.stringify(newFolder, null, 2));
      
      // 4. Nettoyer les données de test
      console.log('\n🧹 Nettoyage des données de test...');
      
      try {
        // Supprimer le dossier
        await supabase
          .from('folders')
          .delete()
          .eq('id', newFolder.id);
        console.log('✅ Dossier de test supprimé');
        
        // Supprimer le classeur
        await supabase
          .from('classeurs')
          .delete()
          .eq('id', newClasseur.id);
        console.log('✅ Classeur de test supprimé');
        
      } catch (cleanupError) {
        console.log('⚠️ Erreur lors du nettoyage:', cleanupError.message);
      }
      
      // 5. Afficher le succès
      console.log('\n🎉 PROBLÈME RÉSOLU!');
      console.log('=====================');
      console.log('✅ La création de dossiers fonctionne maintenant');
      console.log('✅ Le problème était bien la structure de la table');
      console.log('✅ L\'API V2 devrait maintenant fonctionner correctement');
      console.log('');
      console.log('🔧 Prochaines étapes:');
      console.log('1. Tester avec le LLM');
      console.log('2. Vérifier que create_folder fonctionne');
      console.log('3. Tester les autres opérations sur les dossiers');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le script
testFixedFolders().catch(console.error); 