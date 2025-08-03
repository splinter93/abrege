const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFolderCreation() {
  console.log('🔍 Test de création de dossier avec authentification...');
  
  try {
    // 1. Récupérer la session actuelle
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erreur récupération session:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ Aucune session active, impossible de tester');
      return;
    }
    
    console.log('✅ Session trouvée pour utilisateur:', session.user.id);
    
    // 2. Récupérer un classeur existant pour le test
    const { data: classeurs, error: classeursError } = await supabase
      .from('classeurs')
      .select('id, slug, name')
      .eq('user_id', session.user.id)
      .limit(1);
    
    if (classeursError || !classeurs || classeurs.length === 0) {
      console.log('⚠️ Aucun classeur trouvé, création d\'un classeur de test...');
      
      // Créer un classeur de test
      const { data: newClasseur, error: createClasseurError } = await supabase
        .from('classeurs')
        .insert({
          name: 'Test Classeur',
          user_id: session.user.id,
          slug: 'test-classeur-' + Date.now(),
          position: 0
        })
        .select()
        .single();
      
      if (createClasseurError) {
        console.error('❌ Erreur création classeur de test:', createClasseurError);
        return;
      }
      
      console.log('✅ Classeur de test créé:', newClasseur.id);
      var testClasseurId = newClasseur.id;
    } else {
      testClasseurId = classeurs[0].id;
      console.log('✅ Classeur trouvé pour le test:', testClasseurId);
    }
    
    // 3. Test de création de dossier
    const testFolderName = 'Test Folder ' + Date.now();
    console.log('📁 Test création dossier:', testFolderName);
    
    const response = await fetch('http://localhost:3000/api/v1/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        name: testFolderName,
        notebook_id: testClasseurId
      })
    });
    
    console.log('📡 Status de la réponse:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test réussi: Dossier créé avec authentification');
      console.log('📋 Résultat:', result);
      
      // Nettoyer le dossier de test
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', result.folder.id);
      
      if (deleteError) {
        console.log('⚠️ Impossible de nettoyer le dossier de test:', deleteError);
      } else {
        console.log('🧹 Dossier de test nettoyé');
      }
    } else {
      const error = await response.text();
      console.log('❌ Test échoué: Erreur lors de la création du dossier');
      console.log('📋 Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testFolderCreation(); 