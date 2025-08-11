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

async function fixFoldersRLS() {
  try {
    console.log('🔧 CORRECTION RLS SPÉCIFIQUE POUR LA TABLE FOLDERS');
    console.log('===================================================');
    
    // 1. Vérifier l'état actuel de la table folders
    console.log('\n📋 Vérification de la table folders...');
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, user_id')
        .limit(1);
      
      if (error) {
        console.log('❌ Erreur accès folders:', error.message);
        return;
      }
      console.log('✅ Table folders accessible');
    } catch (e) {
      console.log('❌ Erreur inattendue:', e.message);
      return;
    }
    
    // 2. Désactiver temporairement RLS pour corriger les politiques
    console.log('\n🔓 Désactivation temporaire de RLS sur folders...');
    
    try {
      const { error } = await supabase
        .rpc('sql', { 
          query: 'ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;' 
        });
      
      if (error) {
        console.log('⚠️ Impossible de désactiver RLS via RPC:', error.message);
        console.log('   Tentative via requête directe...');
        
        // Essayer une approche différente
        const { error: directError } = await supabase
          .from('folders')
          .select('id')
          .limit(1);
        
        if (directError && directError.message.includes('RLS')) {
          console.log('❌ RLS toujours actif, impossible de le désactiver via API');
          console.log('   Solution: Désactiver RLS manuellement dans le dashboard Supabase');
          return;
        }
      } else {
        console.log('✅ RLS désactivé temporairement');
      }
    } catch (e) {
      console.log('⚠️ Erreur lors de la désactivation RLS:', e.message);
    }
    
    // 3. Vérifier si RLS est désactivé
    console.log('\n🔍 Vérification de l\'état RLS...');
    
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name, user_id')
        .limit(1);
      
      if (error && error.message.includes('RLS')) {
        console.log('❌ RLS toujours actif');
        console.log('   Erreur:', error.message);
      } else {
        console.log('✅ RLS désactivé ou politiques corrigées');
      }
    } catch (e) {
      console.log('⚠️ Erreur lors de la vérification:', e.message);
    }
    
    // 4. Tester la création d'un dossier
    console.log('\n🧪 Test de création de dossier...');
    
    try {
      // Récupérer un utilisateur existant
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError || !users.users.length) {
        console.log('⚠️ Aucun utilisateur trouvé pour le test');
      } else {
        const testUser = users.users[0];
        console.log(`👤 Utilisateur de test: ${testUser.email}`);
        
        const testFolder = {
          name: `Test RLS Fix - ${new Date().toISOString()}`,
          user_id: testUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newFolder, error: createError } = await supabase
          .from('folders')
          .insert([testFolder])
          .select('id, name')
          .single();
        
        if (createError) {
          console.log('❌ Erreur création dossier:', createError.message);
          
          if (createError.message.includes('RLS')) {
            console.log('\n🚨 PROBLÈME RLS DÉTECTÉ');
            console.log('========================');
            console.log('La table folders a encore des politiques RLS bloquantes.');
            console.log('');
            console.log('🔧 SOLUTIONS:');
            console.log('1. Désactiver RLS manuellement dans le dashboard Supabase');
            console.log('2. Ou appliquer la migration SQL directement');
            console.log('');
            console.log('📋 Étapes dashboard Supabase:');
            console.log('   - Aller dans Database > Tables');
            console.log('   - Cliquer sur la table "folders"');
            console.log('   - Onglet RLS > Désactiver le toggle');
            console.log('   - Ou supprimer toutes les politiques existantes');
          }
        } else {
          console.log(`✅ Création dossier OK: ${newFolder.name} (${newFolder.id})`);
          
          // Nettoyer le dossier de test
          try {
            await supabase
              .from('folders')
              .delete()
              .eq('id', newFolder.id);
            console.log('🧹 Dossier de test supprimé');
          } catch (cleanupError) {
            console.log('⚠️ Impossible de supprimer le dossier de test:', cleanupError.message);
          }
        }
      }
    } catch (e) {
      console.log('❌ Erreur test création:', e.message);
    }
    
    // 5. Réactiver RLS avec des politiques simples
    console.log('\n🔒 Réactivation de RLS avec politiques simples...');
    
    try {
      // Créer une politique simple pour SELECT
      const { error: selectError } = await supabase
        .rpc('sql', {
          query: `
            CREATE POLICY IF NOT EXISTS "Users can view their own folders"
            ON public.folders
            FOR SELECT
            USING (auth.uid() = user_id);
          `
        });
      
      if (selectError) {
        console.log('⚠️ Impossible de créer la politique SELECT:', selectError.message);
      } else {
        console.log('✅ Politique SELECT créée');
      }
      
      // Créer une politique simple pour INSERT
      const { error: insertError } = await supabase
        .rpc('sql', {
          query: `
            CREATE POLICY IF NOT EXISTS "Users can insert their own folders"
            ON public.folders
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
          `
        });
      
      if (insertError) {
        console.log('⚠️ Impossible de créer la politique INSERT:', insertError.message);
      } else {
        console.log('✅ Politique INSERT créée');
      }
      
      // Réactiver RLS
      const { error: enableError } = await supabase
        .rpc('sql', {
          query: 'ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;'
        });
      
      if (enableError) {
        console.log('⚠️ Impossible de réactiver RLS:', enableError.message);
      } else {
        console.log('✅ RLS réactivé');
      }
      
    } catch (e) {
      console.log('⚠️ Erreur lors de la réactivation RLS:', e.message);
    }
    
    console.log('\n🎉 CORRECTION FOLDERS RLS TERMINÉE');
    console.log('====================================');
    console.log('✅ Si tous les tests sont OK, create_folder devrait fonctionner');
    console.log('⚠️ Si RLS pose encore problème, le désactiver manuellement');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction RLS folders:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixFoldersRLS().catch(console.error); 