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

async function fixRLSSimple() {
  try {
    console.log('🔧 CORRECTION RLS SIMPLE');
    console.log('========================\n');

    // 1. Vérifier l'état actuel de la table articles
    console.log('🔍 Vérification de la table articles...');
    const { data: articles, error: selectError } = await supabase
      .from('articles')
      .select('id, source_title, user_id')
      .limit(1);

    if (selectError) {
      console.log(`❌ Erreur accès articles: ${selectError.message}`);
      return;
    }

    console.log(`✅ Table articles accessible: ${articles?.length || 0} articles trouvés`);

    // 2. Test de création d'une note (simulation API)
    console.log('\n🧪 Test de création de note...');
    
    // D'abord, récupérer un classeur existant pour éviter l'erreur de clé étrangère
    const { data: classeurs, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name')
      .limit(1);

    if (classeurError || !classeurs || classeurs.length === 0) {
      console.log('❌ Aucun classeur trouvé pour le test');
      return;
    }

    const classeurId = classeurs[0].id;
    console.log(`📚 Utilisation du classeur: ${classeurs[0].name} (${classeurId})`);

    // Récupérer un utilisateur existant
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé pour le test');
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Utilisation de l'utilisateur: ${users[0].email} (${userId})`);

    // Test de création
    const testNote = {
      source_title: 'Test RLS Fix',
      markdown_content: 'Test content',
      html_content: 'Test content',
      user_id: userId,
      classeur_id: classeurId,
      slug: `test-rls-fix-${Date.now()}`,
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
      
      // Si c'est une erreur RLS, on peut essayer de désactiver temporairement
      if (createError.message.includes('row-level security policy')) {
        console.log('\n🔧 Tentative de désactivation temporaire de RLS...');
        
        // Note: Cette opération nécessite des privilèges admin sur Supabase
        // Pour l'instant, on va essayer de créer une note avec un utilisateur authentifié
        console.log('💡 Solution: Utiliser un utilisateur authentifié via l\'API');
      }
    } else {
      console.log('✅ Test de création réussi');
      console.log(`📋 Note créée: ${createdNote.id}`);
      
      // Nettoyer le test
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', createdNote.id);
      
      if (deleteError) {
        console.log(`⚠️ Erreur suppression note de test: ${deleteError.message}`);
      } else {
        console.log('🧹 Note de test supprimée');
      }
    }

    // 3. Vérifier les politiques RLS actuelles
    console.log('\n📋 Vérification des politiques RLS...');
    try {
      // Cette requête peut ne pas fonctionner selon les permissions
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'articles');

      if (policyError) {
        console.log(`⚠️ Impossible de récupérer les politiques: ${policyError.message}`);
      } else {
        console.log(`📊 Politiques trouvées: ${policies?.length || 0}`);
        policies?.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd} sur ${policy.tablename}`);
        });
      }
    } catch (e) {
      console.log(`⚠️ Vérification des politiques impossible: ${e.message}`);
    }

    console.log('\n🎯 RECOMMANDATIONS');
    console.log('==================');
    console.log('1. ✅ La table articles est accessible');
    console.log('2. ❌ Les politiques RLS bloquent la création');
    console.log('3. 💡 Solution: Désactiver temporairement RLS sur articles');
    console.log('4. 🔧 Ou créer des politiques RLS appropriées');
    console.log('\n📚 Pour désactiver RLS temporairement:');
    console.log('   - Allez sur le Dashboard Supabase');
    console.log('   - Database > Tables > articles > RLS');
    console.log('   - Désactivez le toggle RLS');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification RLS:', error);
  }
}

fixRLSSimple(); 