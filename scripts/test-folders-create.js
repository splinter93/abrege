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

async function testFoldersCreate() {
  try {
    console.log('🧪 TEST CRÉATION DE DOSSIERS - DIAGNOSTIC RLS');
    console.log('==============================================');
    
    // 1. Vérifier la configuration
    console.log('\n📋 Configuration:');
    console.log('   URL Supabase:', supabaseUrl);
    console.log('   Service Role Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : '❌ Manquante');
    
    // 2. Tester la connexion
    console.log('\n🔌 Test de connexion...');
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .limit(1);
      
      if (error) {
        console.log('❌ Erreur de connexion:', error.message);
        return;
      }
      console.log('✅ Connexion Supabase OK');
    } catch (e) {
      console.log('❌ Erreur de connexion:', e.message);
      return;
    }
    
    // 3. Lister les utilisateurs
    console.log('\n👥 Récupération des utilisateurs...');
    try {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('❌ Erreur récupération utilisateurs:', usersError.message);
        return;
      }
      
      if (!users || users.length === 0) {
        console.log('⚠️ Aucun utilisateur trouvé');
        return;
      }
      
      console.log(`✅ ${users.length} utilisateur(s) trouvé(s)`);
      
      // Prendre le premier utilisateur pour les tests
      const testUser = users[0];
      console.log(`👤 Utilisateur de test: ${testUser.email} (${testUser.id})`);
      
      // 4. Tester l'accès aux dossiers existants
      console.log('\n📁 Test accès aux dossiers existants...');
      try {
        const { data: folders, error: foldersError } = await supabase
          .from('folders')
          .select('id, name, user_id, created_at')
          .eq('user_id', testUser.id)
          .limit(5);
        
        if (foldersError) {
          console.log('❌ Erreur accès dossiers:', foldersError.message);
          
          if (foldersError.message.includes('RLS')) {
            console.log('\n🚨 PROBLÈME RLS DÉTECTÉ');
            console.log('========================');
            console.log('La table folders a des politiques RLS bloquantes.');
            console.log('');
            console.log('🔧 SOLUTION IMMÉDIATE:');
            console.log('Désactiver RLS manuellement dans le dashboard Supabase');
            console.log('');
            console.log('📋 Étapes:');
            console.log('1. Aller sur https://supabase.com/dashboard');
            console.log('2. Sélectionner votre projet');
            console.log('3. Database > Tables');
            console.log('4. Cliquer sur la table "folders"');
            console.log('5. Onglet RLS > Désactiver le toggle');
            console.log('6. Ou supprimer toutes les politiques existantes');
          }
        } else {
          console.log(`✅ Accès dossiers OK: ${folders.length} dossier(s) trouvé(s)`);
          folders.forEach(folder => {
            console.log(`   - ${folder.name} (${folder.id}) - Créé: ${folder.created_at}`);
          });
        }
      } catch (e) {
        console.log('❌ Erreur test dossiers:', e.message);
      }
      
      // 5. Tester la création d'un dossier
      console.log('\n✏️ Test création de dossier...');
      try {
        const testFolder = {
          name: `Test RLS Fix - ${new Date().toISOString()}`,
          user_id: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('📦 Données du dossier de test:', testFolder);
        
        const { data: newFolder, error: createError } = await supabase
          .from('folders')
          .insert([testFolder])
          .select('id, name, user_id')
          .single();
        
        if (createError) {
          console.log('❌ Erreur création dossier:', createError.message);
          
          if (createError.message.includes('RLS')) {
            console.log('\n🚨 PROBLÈME RLS CONFIRMÉ');
            console.log('==========================');
            console.log('La création de dossiers est bloquée par RLS.');
            console.log('');
            console.log('🔧 SOLUTIONS:');
            console.log('1. DÉSACTIVER RLS (Recommandé pour le développement)');
            console.log('2. Ou corriger les politiques RLS');
            console.log('');
            console.log('📋 Étapes dashboard Supabase:');
            console.log('   - Database > Tables > folders > RLS');
            console.log('   - Désactiver le toggle RLS');
            console.log('   - Ou supprimer toutes les politiques');
            console.log('');
            console.log('⚠️ ATTENTION: Désactiver RLS permettra à tous les utilisateurs');
            console.log('   d\'accéder à tous les dossiers. À réactiver en production.');
          } else if (createError.message.includes('duplicate')) {
            console.log('⚠️ Erreur de duplication - le dossier existe peut-être déjà');
          } else if (createError.message.includes('foreign key')) {
            console.log('⚠️ Erreur de clé étrangère - vérifier user_id');
          } else {
            console.log('⚠️ Autre type d\'erreur - vérifier la structure de la table');
          }
        } else {
          console.log(`✅ Création dossier OK: ${newFolder.name} (${newFolder.id})`);
          console.log('   User ID:', newFolder.user_id);
          
          // Nettoyer le dossier de test
          try {
            const { error: deleteError } = await supabase
              .from('folders')
              .delete()
              .eq('id', newFolder.id);
            
            if (deleteError) {
              console.log('⚠️ Impossible de supprimer le dossier de test:', deleteError.message);
            } else {
              console.log('🧹 Dossier de test supprimé');
            }
          } catch (cleanupError) {
            console.log('⚠️ Erreur lors de la suppression:', cleanupError.message);
          }
        }
      } catch (e) {
        console.log('❌ Erreur test création:', e.message);
      }
      
      // 6. Vérifier la structure de la table
      console.log('\n🔍 Vérification de la structure de la table...');
      try {
        const { data: structure, error: structureError } = await supabase
          .from('folders')
          .select('*')
          .limit(0);
        
        if (structureError) {
          console.log('❌ Erreur structure:', structureError.message);
        } else {
          console.log('✅ Structure de la table accessible');
          console.log('   Colonnes disponibles:', Object.keys(structure || {}));
        }
      } catch (e) {
        console.log('⚠️ Impossible de vérifier la structure:', e.message);
      }
      
    } catch (e) {
      console.log('❌ Erreur récupération utilisateurs:', e.message);
    }
    
    console.log('\n🎉 DIAGNOSTIC TERMINÉ');
    console.log('========================');
    console.log('📋 Résumé:');
    console.log('   - Si création OK: RLS fonctionne');
    console.log('   - Si erreur RLS: Désactiver RLS dans le dashboard');
    console.log('   - Si autre erreur: Vérifier la structure de la table');
    
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    process.exit(1);
  }
}

// Exécuter le script
testFoldersCreate().catch(console.error); 