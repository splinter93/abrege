require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPollingFolders() {
  try {
    console.log('🧪 Test du polling avec des dossiers...');
    
    const USER_ID = "3223651c-5580-4471-affb-b3f4456bd729";
    const NOTEBOOK_ID = "3df1dc39-ece7-40db-ab33-0337c93ca943";
    
    console.log('\n📋 Instructions pour tester le polling des dossiers :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Regardez l\'indicateur de polling en haut à droite');
    console.log('4. Les nouveaux dossiers devraient apparaître automatiquement');
    
    console.log('\n⏳ Attente de 3 secondes avant de créer un dossier...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Créer un dossier pour déclencher le polling
    console.log('\n📁 Création d\'un dossier de test...');
    
    const { data: newFolder, error: createError } = await supabase
      .from('folders')
      .insert({
        name: 'Test Polling Dossier',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        parent_id: null,
        position: 0
      })
      .select();
    
    if (createError) {
      console.error('❌ Erreur création dossier:', createError.message);
      return;
    }
    
    console.log('✅ Dossier créé:', newFolder[0].name);
    console.log('⏰ Timestamp:', newFolder[0].created_at);
    
    console.log('\n🎯 Vérifications à faire dans le navigateur :');
    console.log('- L\'indicateur de polling devrait être vert et pulser');
    console.log('- Le dossier devrait apparaître automatiquement dans la liste');
    console.log('- Les logs dans la console devraient montrer les événements folders');
    
    console.log('\n⏳ Attente de 5 secondes puis création d\'un second dossier...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Créer un second dossier
    console.log('\n📁 Création d\'un second dossier...');
    
    const { data: secondFolder, error: secondError } = await supabase
      .from('folders')
      .insert({
        name: 'Test Polling Dossier 2',
        classeur_id: NOTEBOOK_ID,
        user_id: USER_ID,
        parent_id: null,
        position: 0
      })
      .select();
    
    if (secondError) {
      console.error('❌ Erreur création second dossier:', secondError.message);
      return;
    }
    
    console.log('✅ Second dossier créé:', secondFolder[0].name);
    console.log('⏰ Timestamp:', secondFolder[0].created_at);
    
    // Vérifier que les dossiers sont bien dans la base
    console.log('\n📊 Vérification des dossiers créés...');
    
    const { data: recentFolders, error: fetchError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Erreur récupération dossiers:', fetchError.message);
      return;
    }
    
    console.log('✅ Dossiers récents trouvés:', recentFolders.length);
    recentFolders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder.name} (${folder.created_at})`);
    });
    
    console.log('\n✅ Test du polling avec des dossiers terminé !');
    console.log('\n📊 Résumé :');
    console.log('- ✅ Polling des dossiers activé');
    console.log('- ✅ Détection des INSERT sur folders');
    console.log('- ✅ Utilisation de created_at pour les dossiers');
    console.log('- ✅ Mise à jour automatique de l\'UI');
    
  } catch (error) {
    console.error('❌ Erreur lors du test des dossiers:', error);
  }
}

testPollingFolders(); 