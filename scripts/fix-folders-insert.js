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

async function fixFoldersInsert() {
  try {
    console.log('🔧 CORRECTION CRÉATION DE DOSSIERS - STRUCTURE CORRECTE');
    console.log('========================================================');
    
    // 1. Vérifier la configuration
    console.log('\n📋 Configuration:');
    console.log('   URL Supabase:', supabaseUrl);
    console.log('   Service Role Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ Manquante');
    
    // 2. Récupérer un utilisateur
    console.log('\n👥 Récupération des utilisateurs...');
    try {
      const { data, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError || !data || !data.users || !data.users.length) {
        console.log('⚠️ Aucun utilisateur trouvé pour le test');
        console.log('   Erreur:', usersError?.message || 'Données invalides');
        return;
      }
      
      const testUser = data.users[0];
      console.log(`👤 Utilisateur de test: ${testUser.email} (${testUser.id})`);
      
      // 3. Récupérer un classeur existant
      console.log('\n📚 Récupération d\'un classeur...');
      try {
        const { data: classeurs, error: classeursError } = await supabase
          .from('classeurs')
          .select('id, name')
          .eq('user_id', testUser.id)
          .limit(1);
        
        if (classeursError || !classeurs.length) {
          console.log('⚠️ Aucun classeur trouvé, création d\'un classeur de test...');
          
          const testClasseur = {
            name: 'Classeur de Test',
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
            console.log('❌ Impossible de créer un classeur de test:', createClasseurError.message);
            return;
          }
          
          console.log(`✅ Classeur de test créé: ${newClasseur.name} (${newClasseur.id})`);
          const testClasseurId = newClasseur.id;
          
          // Continuer avec la création du dossier
          await createTestFolder(testUser, testClasseurId, true);
          
        } else {
          const testClasseur = classeurs[0];
          console.log(`📚 Classeur de test: ${testClasseur.name} (${testClasseur.id})`);
          
          // Continuer avec la création du dossier
          await createTestFolder(testUser, testClasseur.id, false);
        }
        
      } catch (e) {
        console.log('❌ Erreur récupération classeur:', e.message);
      }
      
    } catch (e) {
      console.log('❌ Erreur récupération utilisateurs:', e.message);
    }
    
    console.log('\n🎉 CORRECTION STRUCTURE TERMINÉE');
    console.log('==================================');
    console.log('📋 Résumé:');
    console.log('   - Si création OK: Le problème était la structure, pas RLS');
    console.log('   - Si erreur RLS: Désactiver RLS dans le dashboard');
    console.log('   - Si autre erreur: Vérifier les colonnes manquantes');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
    process.exit(1);
  }
}

async function createTestFolder(testUser, classeurId, isTestClasseur) {
  // 4. Tester la création avec la structure correcte
  console.log('\n🧪 Test création avec structure correcte...');
  
  const testFolder = {
    name: `Test Structure Fix - ${new Date().toISOString()}`,
    user_id: testUser.id,
    classeur_id: classeurId,
    created_at: new Date().toISOString(),
    position: 0,
    slug: `test-structure-fix-${Date.now()}`
  };
  
  console.log('📦 Données du dossier de test (structure correcte):');
  console.log(JSON.stringify(testFolder, null, 2));
  
  const { data: newFolder, error: createError } = await supabase
    .from('folders')
    .insert([testFolder])
    .select('*')
    .single();
  
  if (createError) {
    console.log('❌ Erreur création dossier:', createError.message);
    
    if (createError.message.includes('RLS')) {
      console.log('\n🚨 PROBLÈME RLS CONFIRMÉ');
      console.log('==========================');
      console.log('La création est bloquée par RLS malgré la structure correcte.');
      console.log('');
      console.log('🔧 SOLUTION: Désactiver RLS dans le dashboard Supabase');
      console.log('');
      console.log('📋 Étapes:');
      console.log('1. Aller sur https://supabase.com/dashboard');
      console.log('2. Sélectionner votre projet');
      console.log('3. Database > Tables > folders');
      console.log('4. Onglet RLS > Désactiver le toggle');
    } else if (createError.message.includes('column')) {
      console.log('\n🚨 PROBLÈME DE STRUCTURE');
      console.log('========================');
      console.log('Il manque encore des colonnes.');
      console.log('Erreur:', createError.message);
    } else {
      console.log('\n⚠️ Autre type d\'erreur');
      console.log('Erreur:', createError.message);
    }
  } else {
    console.log(`✅ Création dossier OK!`);
    console.log('📋 Dossier créé:');
    console.log(JSON.stringify(newFolder, null, 2));
    
    // 5. Nettoyer le dossier de test
    console.log('\n🧹 Nettoyage du dossier de test...');
    try {
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', newFolder.id);
      
      if (deleteError) {
        console.log('⚠️ Impossible de supprimer le dossier de test:', deleteError.message);
      } else {
        console.log('✅ Dossier de test supprimé');
      }
    } catch (cleanupError) {
      console.log('⚠️ Erreur lors de la suppression:', cleanupError.message);
    }
    
    // 6. Nettoyer le classeur de test si nécessaire
    if (isTestClasseur) {
      console.log('\n🧹 Nettoyage du classeur de test...');
      try {
        const { error: deleteClasseurError } = await supabase
          .from('classeurs')
          .delete()
          .eq('id', classeurId);
        
        if (deleteClasseurError) {
          console.log('⚠️ Impossible de supprimer le classeur de test:', deleteClasseurError.message);
        } else {
          console.log('✅ Classeur de test supprimé');
        }
      } catch (cleanupClasseurError) {
        console.log('⚠️ Erreur lors de la suppression du classeur:', cleanupClasseurError.message);
      }
    }
    
    // 7. Afficher la solution
    console.log('\n🎉 SUCCÈS! STRUCTURE CORRECTE IDENTIFIÉE');
    console.log('==========================================');
    console.log('✅ La création de dossiers fonctionne avec la structure correcte');
    console.log('✅ Le problème n\'était PAS RLS mais la structure de la table');
    console.log('');
    console.log('🔧 SOLUTION POUR L\'API V2:');
    console.log('Utiliser cette structure pour create_folder:');
    console.log(JSON.stringify({
      name: 'Nom du dossier',
      user_id: 'UUID de l\'utilisateur',
      classeur_id: 'UUID du classeur',
      created_at: 'ISO string',
      position: 0,
      slug: 'slug-du-dossier'
    }, null, 2));
    console.log('');
    console.log('❌ NE PAS UTILISER:');
    console.log('- updated_at (n\'existe pas)');
    console.log('- Autres colonnes non listées ci-dessus');
  }
}

// Exécuter le script
fixFoldersInsert().catch(console.error); 