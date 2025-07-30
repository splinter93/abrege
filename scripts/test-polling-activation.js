require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPollingActivation() {
  try {
    console.log('🧪 Test d\'activation du polling...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const NOTEBOOK_ID = "3df1dc39-ece7-40db-ab33-0337c93ca943";
    
    // Test 1: Créer une note pour déclencher le polling
    console.log('\n📝 Création d\'une note de test...');
    
    const { data: newNote, error: createError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test Polling Activation',
        markdown_content: '# Test du polling\n\nCette note teste l\'activation du polling.',
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
    
    // Test 2: Attendre 5 secondes puis créer une autre note
    console.log('\n⏳ Attente de 5 secondes...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const { data: secondNote, error: secondError } = await supabase
      .from('articles')
      .insert({
        source_title: 'Test Polling Activation 2',
        markdown_content: '# Deuxième test\n\nCette note devrait être détectée par le polling.',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      })
      .select();
    
    if (secondError) {
      console.error('❌ Erreur création deuxième note:', secondError.message);
      return;
    }
    
    console.log('✅ Deuxième note créée:', secondNote[0].source_title);
    console.log('⏰ Timestamp:', secondNote[0].updated_at);
    
    // Test 3: Vérifier que les notes sont bien dans la base
    console.log('\n📊 Vérification des notes créées...');
    
    const { data: recentNotes, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', USER_ID)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Erreur récupération notes:', fetchError.message);
      return;
    }
    
    console.log('✅ Notes récentes trouvées:', recentNotes.length);
    recentNotes.forEach((note, index) => {
      console.log(`  ${index + 1}. ${note.source_title} (${note.updated_at})`);
    });
    
    console.log('\n🎯 Instructions pour tester le polling :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Regardez les logs [DossiersPage] et [Polling]');
    console.log('4. Les nouvelles notes devraient apparaître automatiquement');
    
    console.log('\n✅ Test d\'activation du polling terminé');
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'activation:', error);
  }
}

testPollingActivation(); 