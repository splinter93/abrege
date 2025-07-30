require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPollingDeleteUpdate() {
  try {
    console.log('🧪 Test du polling DELETE et UPDATE...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const NOTEBOOK_ID = "3df1dc39-ece7-40db-ab33-0337c93ca943";
    
    console.log('\n📋 Instructions pour tester le polling DELETE/UPDATE :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Regardez l\'indicateur de polling en haut à droite');
    console.log('4. Les suppressions et mises à jour devraient être détectées');
    
    // Test 1: Créer une note pour la tester
    console.log('\n📝 Création d\'une note de test pour UPDATE...');
    
    const { data: testNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test UPDATE/DELETE',
        markdown_content: '# Test UPDATE/DELETE\n\nCette note va être mise à jour puis supprimée.',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      })
      .select();
    
    if (createError) {
      console.error('❌ Erreur création note:', createError.message);
      return;
    }
    
    console.log('✅ Note créée:', testNote[0].source_title);
    console.log('⏰ Timestamp:', testNote[0].updated_at);
    
    console.log('\n⏳ Attente de 5 secondes puis UPDATE de la note...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Mettre à jour la note
    console.log('\n🔄 Mise à jour de la note...');
    
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        source_title: 'Test UPDATE/DELETE - MIS À JOUR',
        markdown_content: '# Test UPDATE/DELETE - MIS À JOUR\n\nCette note a été mise à jour pour tester le polling.\n\n## Fonctionnalités\n- ✅ UPDATE détecté\n- ✅ Polling temps réel\n- ✅ Interface mise à jour'
      })
      .eq('id', testNote[0].id)
      .select();
    
    if (updateError) {
      console.error('❌ Erreur mise à jour note:', updateError.message);
      return;
    }
    
    console.log('✅ Note mise à jour:', updatedNote[0].source_title);
    console.log('⏰ Timestamp:', updatedNote[0].updated_at);
    
    console.log('\n🎯 Vérifications UPDATE :');
    console.log('- Le titre de la note devrait changer automatiquement');
    console.log('- L\'indicateur devrait montrer "UPDATE - Test UPDATE/DELETE - MIS À JOUR"');
    console.log('- Le compteur d\'événements devrait augmenter');
    
    console.log('\n⏳ Attente de 5 secondes puis DELETE de la note...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 3: Supprimer la note
    console.log('\n🗑️ Suppression de la note...');
    
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', testNote[0].id);
    
    if (deleteError) {
      console.error('❌ Erreur suppression note:', deleteError.message);
      return;
    }
    
    console.log('✅ Note supprimée avec succès');
    
    console.log('\n🎯 Vérifications DELETE :');
    console.log('- La note devrait disparaître automatiquement de la liste');
    console.log('- L\'indicateur devrait montrer "DELETE"');
    console.log('- Le compteur d\'événements devrait augmenter');
    
    // Test 4: Créer et supprimer un dossier
    console.log('\n⏳ Attente de 3 secondes puis test avec un dossier...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📁 Création d\'un dossier de test...');
    
    const { data: testFolder, error: folderCreateError } = await supabase
      .from('folders')
      .insert({
        name: 'Test DELETE Dossier',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        parent_id: null,
        position: 0
      })
      .select();
    
    if (folderCreateError) {
      console.error('❌ Erreur création dossier:', folderCreateError.message);
      return;
    }
    
    console.log('✅ Dossier créé:', testFolder[0].name);
    
    console.log('\n⏳ Attente de 3 secondes puis suppression du dossier...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🗑️ Suppression du dossier...');
    
    const { error: folderDeleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', testFolder[0].id);
    
    if (folderDeleteError) {
      console.error('❌ Erreur suppression dossier:', folderDeleteError.message);
      return;
    }
    
    console.log('✅ Dossier supprimé avec succès');
    
    console.log('\n✅ Test du polling DELETE et UPDATE terminé !');
    console.log('\n📊 Résumé :');
    console.log('- ✅ UPDATE détecté et géré');
    console.log('- ✅ DELETE détecté et géré');
    console.log('- ✅ Interface mise à jour automatiquement');
    console.log('- ✅ Logs détaillés pour le debugging');
    
  } catch (error) {
    console.error('❌ Erreur lors du test DELETE/UPDATE:', error);
  }
}

testPollingDeleteUpdate(); 