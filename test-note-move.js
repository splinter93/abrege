const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNoteMove() {
  console.log('🔍 Test de déplacement de note avec authentification...');
  
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
    
    // 2. Récupérer une note existante pour le test
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, classeur_id, folder_id')
      .eq('user_id', session.user.id)
      .limit(1);
    
    if (notesError || !notes || notes.length === 0) {
      console.log('⚠️ Aucune note trouvée, impossible de tester le déplacement');
      return;
    }
    
    const testNote = notes[0];
    console.log('✅ Note trouvée pour le test:', testNote.id, testNote.source_title);
    
    // 3. Récupérer un dossier existant pour le test
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, classeur_id')
      .eq('user_id', session.user.id)
      .limit(1);
    
    let targetFolderId = null;
    if (!foldersError && folders && folders.length > 0) {
      targetFolderId = folders[0].id;
      console.log('✅ Dossier trouvé pour le test:', targetFolderId, folders[0].name);
    } else {
      console.log('⚠️ Aucun dossier trouvé, test avec folder_id = null');
    }
    
    // 4. Test de déplacement de note
    console.log('📦 Test déplacement note:', testNote.id, 'vers dossier:', targetFolderId);
    
    const response = await fetch(`http://localhost:3000/api/v1/note/${testNote.id}/move`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        target_folder_id: targetFolderId,
        target_classeur_id: testNote.classeur_id
      })
    });
    
    console.log('📡 Status de la réponse:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test réussi: Note déplacée avec authentification');
      console.log('📋 Résultat:', result);
      
      // Remettre la note à sa position originale
      const restoreResponse = await fetch(`http://localhost:3000/api/v1/note/${testNote.id}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          target_folder_id: testNote.folder_id,
          target_classeur_id: testNote.classeur_id
        })
      });
      
      if (restoreResponse.ok) {
        console.log('🔄 Note remise à sa position originale');
      } else {
        console.log('⚠️ Impossible de remettre la note à sa position originale');
      }
    } else {
      const error = await response.text();
      console.log('❌ Test échoué: Erreur lors du déplacement de la note');
      console.log('📋 Erreur:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

testNoteMove(); 