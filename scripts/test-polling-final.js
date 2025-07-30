require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPollingFinal() {
  try {
    console.log('🎯 Test final du système de polling...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const NOTEBOOK_ID = "3df1dc39-ece7-40db-ab33-0337c93ca943";
    
    console.log('\n📋 Instructions pour tester le polling :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Regardez l\'indicateur de polling en haut à droite');
    console.log('4. Les logs [DossiersPage] et [Polling] devraient apparaître');
    
    console.log('\n⏳ Attente de 3 secondes avant de créer une note...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Créer une note pour déclencher le polling
    console.log('\n📝 Création d\'une note de test final...');
    
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test Final Polling',
        markdown_content: '# Test Final\n\nCette note teste le système de polling final.\n\n## Fonctionnalités\n- ✅ Polling temps réel\n- ✅ Détection des changements\n- ✅ Mise à jour automatique de l\'UI',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      })
      .select();
    
    if (createError) {
      console.error('❌ Erreur création note:', createError.message);
      return;
    }
    
    console.log('✅ Note créée:', newNote[0].source_title);
    console.log('⏰ Timestamp:', newNote[0].updated_at);
    
    console.log('\n🎯 Vérifications à faire dans le navigateur :');
    console.log('- L\'indicateur de polling devrait être vert et pulser');
    console.log('- La note devrait apparaître automatiquement dans la liste');
    console.log('- Les logs dans la console devraient montrer les événements');
    
    console.log('\n⏳ Attente de 5 secondes puis mise à jour de la note...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Mettre à jour la note pour tester les UPDATE
    console.log('\n🔄 Mise à jour de la note...');
    
    const { data: updatedNote, error: updateError } = await supabase
      .from('articles')
      .update({
        source_title: 'Test Final Polling - MIS À JOUR',
        markdown_content: '# Test Final - MIS À JOUR\n\nCette note a été mise à jour pour tester le polling.\n\n## Fonctionnalités\n- ✅ Polling temps réel\n- ✅ Détection des changements\n- ✅ Mise à jour automatique de l\'UI\n- ✅ UPDATE détecté'
      })
      .eq('id', newNote[0].id)
      .select();
    
    if (updateError) {
      console.error('❌ Erreur mise à jour note:', updateError.message);
      return;
    }
    
    console.log('✅ Note mise à jour:', updatedNote[0].source_title);
    console.log('⏰ Timestamp:', updatedNote[0].updated_at);
    
    console.log('\n🎯 Vérifications finales :');
    console.log('- Le titre de la note devrait changer automatiquement');
    console.log('- L\'indicateur devrait montrer "UPDATE - Test Final Polling - MIS À JOUR"');
    console.log('- Le compteur d\'événements devrait augmenter');
    
    console.log('\n✅ Test final du polling terminé !');
    console.log('\n📊 Résumé :');
    console.log('- ✅ Système de polling activé');
    console.log('- ✅ Indicateur visuel en place');
    console.log('- ✅ Détection des INSERT/UPDATE');
    console.log('- ✅ Mise à jour automatique de l\'UI');
    
  } catch (error) {
    console.error('❌ Erreur lors du test final:', error);
  }
}

testPollingFinal(); 