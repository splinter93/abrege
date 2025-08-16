require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// Client avec service role pour contourner RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLSTemporarily() {
  try {
    console.log('🔧 DÉSACTIVATION TEMPORAIRE DE RLS');
    console.log('==================================\n');

    // 1. Vérifier l'état actuel
    console.log('🔍 Vérification de l\'état actuel...');
    const { data: articles, error: selectError } = await supabase
      .from('articles')
      .select('id, source_title, user_id')
      .limit(1);

    if (selectError) {
      console.log(`❌ Erreur accès articles: ${selectError.message}`);
      return;
    }

    console.log(`✅ Table articles accessible: ${articles?.length || 0} articles trouvés`);

    // 2. Créer des politiques RLS permissives (temporaires pour développement)
    console.log('\n🔓 Création de politiques RLS permissives...');
    
    // Note: Ces politiques sont temporaires et ne doivent PAS être utilisées en production
    const permissivePolicies = [
      // Politique SELECT - permettre à tous de voir les articles
      {
        name: 'Temporary allow all users to select articles',
        table: 'articles',
        operation: 'SELECT',
        using: 'true'
      },
      // Politique INSERT - permettre à tous de créer des articles
      {
        name: 'Temporary allow all users to insert articles',
        table: 'articles',
        operation: 'INSERT',
        with_check: 'true'
      },
      // Politique UPDATE - permettre à tous de modifier les articles
      {
        name: 'Temporary allow all users to update articles',
        table: 'articles',
        operation: 'UPDATE',
        using: 'true',
        with_check: 'true'
      },
      // Politique DELETE - permettre à tous de supprimer les articles
      {
        name: 'Temporary allow all users to delete articles',
        table: 'articles',
        operation: 'DELETE',
        using: 'true'
      }
    ];

    // 3. Essayer de créer les politiques via des requêtes SQL directes
    console.log('📝 Tentative de création des politiques...');
    
    // Méthode 1: Utiliser des requêtes SQL directes si possible
    try {
      // Créer une politique simple pour SELECT
      const { error: selectPolicyError } = await supabase
        .rpc('exec_sql', { 
          sql: `CREATE POLICY IF NOT EXISTS "temp_select_all" ON articles FOR SELECT USING (true);` 
        });
      
      if (selectPolicyError) {
        console.log(`⚠️ Impossible de créer la politique SELECT: ${selectPolicyError.message}`);
      } else {
        console.log('✅ Politique SELECT créée');
      }
    } catch (e) {
      console.log('⚠️ Fonction exec_sql non disponible');
    }

    // 4. Test de création d'une note
    console.log('\n🧪 Test de création de note...');
    
    // Récupérer un classeur et un utilisateur existants
    const { data: classeurs } = await supabase
      .from('classeurs')
      .select('id, name')
      .limit(1);

    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (!classeurs || !users) {
      console.log('❌ Données de test manquantes');
      return;
    }

    const testNote = {
      source_title: 'Test RLS Disabled',
      markdown_content: 'Test content after RLS fix',
      html_content: 'Test content after RLS fix',
      user_id: users[0].id,
      classeur_id: classeurs[0].id,
      slug: `test-rls-disabled-${Date.now()}`,
      position: 0
    };

    console.log('📝 Tentative de création...');
    const { data: createdNote, error: createError } = await supabase
      .from('articles')
      .insert(testNote)
      .select()
      .single();

    if (createError) {
      console.log(`❌ Test échoué: ${createError.message}`);
      
      if (createError.message.includes('row-level security policy')) {
        console.log('\n🚨 RLS BLOQUE TOUJOURS LA CRÉATION');
        console.log('💡 Solution manuelle requise:');
        console.log('   1. Allez sur https://supabase.com/dashboard');
        console.log('   2. Sélectionnez votre projet');
        console.log('   3. Database > Tables > articles');
        console.log('   4. Onglet RLS > Désactivez le toggle');
        console.log('   5. Ou créez des politiques permissives manuellement');
      }
    } else {
      console.log('✅ Test de création réussi !');
      console.log(`📋 Note créée: ${createdNote.id}`);
      
      // Nettoyer le test
      await supabase
        .from('articles')
        .delete()
        .eq('id', createdNote.id);
      console.log('🧹 Note de test supprimée');
    }

    // 5. Recommandations
    console.log('\n🎯 RÉSUMÉ ET RECOMMANDATIONS');
    console.log('==============================');
    console.log('✅ Table articles accessible via service role');
    console.log('❌ RLS bloque toujours la création via l\'API normale');
    console.log('\n🔧 SOLUTIONS:');
    console.log('1. DÉSACTIVER RLS TEMPORAIREMENT (Recommandé pour développement):');
    console.log('   - Dashboard Supabase > Database > Tables > articles > RLS > Toggle OFF');
    console.log('\n2. CRÉER DES POLITIQUES PERMISSIVES:');
    console.log('   - Dashboard Supabase > Database > Tables > articles > RLS');
    console.log('   - Créer des politiques avec USING (true) et WITH CHECK (true)');
    console.log('\n3. UTILISER LA SERVICE ROLE KEY:');
    console.log('   - Modifier l\'API pour utiliser SUPABASE_SERVICE_ROLE_KEY');
    console.log('   - ⚠️ ATTENTION: Cela contourne complètement la sécurité');
    console.log('\n⚠️  IMPORTANT: Ces solutions sont temporaires pour le développement');
    console.log('   En production, créez des politiques RLS appropriées basées sur auth.uid()');

  } catch (error) {
    console.error('❌ Erreur lors de la désactivation RLS:', error);
  }
}

disableRLSTemporarily(); 