require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

// Client avec clé anonyme (comme l'API normale)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNoteCreation() {
  try {
    console.log('🧪 TEST DE CRÉATION DE NOTE');
    console.log('============================\n');

    // 1. Vérifier l'accès à la table articles
    console.log('🔍 Test d\'accès à la table articles...');
    const { data: articles, error: selectError } = await supabase
      .from('articles')
      .select('id, source_title')
      .limit(1);

    if (selectError) {
      console.log(`❌ Erreur accès articles: ${selectError.message}`);
      
      if (selectError.message.includes('row-level security policy')) {
        console.log('\n🚨 RLS BLOQUE L\'ACCÈS');
        console.log('💡 Solution: Désactiver RLS sur la table articles');
        console.log('   - Dashboard Supabase > Database > Tables > articles > RLS > Toggle OFF');
        return;
      }
      
      return;
    }

    console.log(`✅ Accès articles OK: ${articles?.length || 0} notes trouvées`);

    // 2. Test de création d'une note
    console.log('\n📝 Test de création de note...');
    
    // Récupérer un classeur existant
    const { data: classeurs, error: classeurError } = await supabase
      .from('classeurs')
      .select('id, name')
      .limit(1);

    if (classeurError || !classeurs || classeurs.length === 0) {
      console.log('❌ Aucun classeur trouvé');
      return;
    }

    const classeurId = classeurs[0].id;
    console.log(`📚 Classeur: ${classeurs[0].name} (${classeurId})`);

    // Note de test
    const testNote = {
      source_title: 'Test Note Creation',
      markdown_content: 'Contenu de test pour vérifier que RLS fonctionne',
      html_content: 'Contenu de test pour vérifier que RLS fonctionne',
      classeur_id: classeurId,
      slug: `test-note-${Date.now()}`,
      position: 0
    };

    console.log('📝 Tentative de création...');
    const { data: createdNote, error: createError } = await supabase
      .from('articles')
      .insert(testNote)
      .select()
      .single();

    if (createError) {
      console.log(`❌ Création échouée: ${createError.message}`);
      
      if (createError.message.includes('row-level security policy')) {
        console.log('\n🚨 RLS BLOQUE TOUJOURS LA CRÉATION');
        console.log('💡 Actions requises:');
        console.log('   1. Allez sur https://supabase.com/dashboard');
        console.log('   2. Sélectionnez votre projet');
        console.log('   3. Database > Tables > articles');
        console.log('   4. Onglet RLS > Désactivez le toggle');
        console.log('   5. Re-testez avec ce script');
      } else if (createError.message.includes('user_id')) {
        console.log('\n⚠️ Erreur user_id - RLS peut être configuré pour exiger auth.uid()');
        console.log('💡 Solution: Désactiver RLS ou créer des politiques appropriées');
      }
      
      return;
    }

    console.log('✅ Création réussie !');
    console.log(`📋 Note créée: ${createdNote.id}`);
    console.log(`📝 Titre: ${createdNote.source_title}`);

    // 3. Nettoyer le test
    console.log('\n🧹 Nettoyage de la note de test...');
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', createdNote.id);

    if (deleteError) {
      console.log(`⚠️ Erreur suppression: ${deleteError.message}`);
    } else {
      console.log('✅ Note de test supprimée');
    }

    // 4. Résumé
    console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS');
    console.log('==============================');
    console.log('✅ RLS ne bloque plus la création de notes');
    console.log('✅ L\'API devrait maintenant fonctionner normalement');
    console.log('✅ Vous pouvez créer des notes dans l\'application');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testNoteCreation(); 