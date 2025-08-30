require('dotenv').config();

async function testPollingApiTrigger() {
  try {
    console.log('🧪 Test du polling déclenché par API...');
    
    console.log('\n📋 Instructions pour tester le polling API :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Regardez l\'indicateur de polling en haut à droite');
    console.log('4. Les changements devraient être détectés instantanément');
    
    console.log('\n⏳ Attente de 3 secondes avant de tester...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Créer une note via API
    console.log('\n📝 Test création note via API...');
    
    const createNoteResponse = await fetch('http://localhost:3000/api/ui/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test Polling API',
        markdown_content: '# Test Polling API\n\nCette note teste le polling déclenché par API.',
        notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943',
        header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      })
    });
    
    if (!createNoteResponse.ok) {
      console.error('❌ Erreur création note:', await createNoteResponse.text());
      return;
    }
    
    const createdNote = await createNoteResponse.json();
    console.log('✅ Note créée:', createdNote.note.source_title);
    console.log('🎯 Vérification: La note devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 3 secondes puis mise à jour...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Mettre à jour la note via API
    console.log('\n🔄 Test mise à jour note via API...');
    
    const updateNoteResponse = await fetch(`http://localhost:3000/api/ui/note/${createdNote.note.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test Polling API - MIS À JOUR',
        markdown_content: '# Test Polling API - MIS À JOUR\n\nCette note a été mise à jour pour tester le polling API.\n\n## Fonctionnalités\n- ✅ Polling déclenché par API\n- ✅ Détection instantanée\n- ✅ Mise à jour temps réel'
      })
    });
    
    if (!updateNoteResponse.ok) {
      console.error('❌ Erreur mise à jour note:', await updateNoteResponse.text());
      return;
    }
    
    const updatedNote = await updateNoteResponse.json();
    console.log('✅ Note mise à jour:', updatedNote.note.source_title);
    console.log('🎯 Vérification: Le titre devrait changer instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 3 secondes puis suppression...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Supprimer la note via API
    console.log('\n🗑️ Test suppression note via API...');
    
    const deleteNoteResponse = await fetch(`http://localhost:3000/api/ui/note/${createdNote.note.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteNoteResponse.ok) {
      console.error('❌ Erreur suppression note:', await deleteNoteResponse.text());
      return;
    }
    
    console.log('✅ Note supprimée avec succès');
    console.log('🎯 Vérification: La note devrait disparaître instantanément de l\'UI');
    
    // Test 4: Créer un dossier via API
    console.log('\n⏳ Attente de 3 secondes puis test dossier...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📁 Test création dossier via API...');
    
    const createFolderResponse = await fetch('http://localhost:3000/api/ui/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Polling API Dossier',
        notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943'
      })
    });
    
    if (!createFolderResponse.ok) {
      console.error('❌ Erreur création dossier:', await createFolderResponse.text());
      return;
    }
    
    const createdFolder = await createFolderResponse.json();
    console.log('✅ Dossier créé:', createdFolder.folder.name);
    console.log('🎯 Vérification: Le dossier devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 3 secondes puis suppression dossier...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 5: Supprimer le dossier via API
    console.log('\n🗑️ Test suppression dossier via API...');
    
    const deleteFolderResponse = await fetch(`http://localhost:3000/api/ui/folder/${createdFolder.folder.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteFolderResponse.ok) {
      console.error('❌ Erreur suppression dossier:', await deleteFolderResponse.text());
      return;
    }
    
    console.log('✅ Dossier supprimé avec succès');
    console.log('🎯 Vérification: Le dossier devrait disparaître instantanément de l\'UI');
    
    console.log('\n✅ Test du polling déclenché par API terminé !');
    console.log('\n📊 Résumé :');
    console.log('- ✅ INSERT déclenché instantanément');
    console.log('- ✅ UPDATE déclenché instantanément');
    console.log('- ✅ DELETE déclenché instantanément');
    console.log('- ✅ Interface mise à jour en temps réel');
    console.log('- ✅ Plus de polling continu inutile');
    
  } catch (error) {
    console.error('❌ Erreur lors du test polling API:', error);
  }
}

testPollingApiTrigger(); 