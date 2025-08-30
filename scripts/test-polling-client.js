require('dotenv').config();

async function testPollingClient() {
  try {
    console.log('⚡ Test du polling côté client déclenché par l\'API...');
    
    console.log('\n📋 Instructions :');
    console.log('1. Ouvrez http://localhost:3001/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Observez les logs de polling côté client');
    console.log('4. Le polling doit être déclenché immédiatement après l\'API');
    
    console.log('\n⏳ Attente de 3 secondes avant de tester...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Créer une note avec polling côté client
    console.log('\n📝 Test création note avec polling côté client...');
    const startTime = Date.now();
    
    const createNoteResponse = await fetch('http://localhost:3001/api/ui/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test Polling Côté Client',
        markdown_content: '# Test Polling Côté Client\n\nCette note teste le polling côté client déclenché par l\'API.',
        notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943',
        header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      })
    });
    
    if (!createNoteResponse.ok) {
      console.error('❌ Erreur création note:', await createNoteResponse.text());
      return;
    }
    
    const createdNote = await createNoteResponse.json();
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log('✅ Note créée:', createdNote.note.source_title);
    console.log(`⏱️ Latence API: ${latency}ms`);
    console.log('🎯 Vérification: Le polling côté client doit être déclenché immédiatement');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Supprimer la note avec polling côté client
    console.log('\n🗑️ Test suppression note avec polling côté client...');
    const deleteStartTime = Date.now();
    
    const deleteNoteResponse = await fetch(`http://localhost:3001/api/ui/note/${createdNote.note.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteNoteResponse.ok) {
      console.error('❌ Erreur suppression note:', await deleteNoteResponse.text());
      return;
    }
    
    const deleteEndTime = Date.now();
    const deleteLatency = deleteEndTime - deleteStartTime;
    
    console.log('✅ Note supprimée avec succès');
    console.log(`⏱️ Latence suppression: ${deleteLatency}ms`);
    console.log('🎯 Vérification: Le polling côté client doit être déclenché immédiatement');
    
    // Test 3: Créer un dossier avec polling côté client
    console.log('\n⏳ Attente de 2 secondes puis test dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📁 Test création dossier avec polling côté client...');
    const folderStartTime = Date.now();
    
    const createFolderResponse = await fetch('http://localhost:3001/api/ui/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Polling Côté Client Dossier',
        notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943'
      })
    });
    
    if (!createFolderResponse.ok) {
      console.error('❌ Erreur création dossier:', await createFolderResponse.text());
      return;
    }
    
    const createdFolder = await createFolderResponse.json();
    const folderEndTime = Date.now();
    const folderLatency = folderEndTime - folderStartTime;
    
    console.log('✅ Dossier créé:', createdFolder.folder.name);
    console.log(`⏱️ Latence création dossier: ${folderLatency}ms`);
    console.log('🎯 Vérification: Le polling côté client doit être déclenché immédiatement');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Supprimer le dossier avec polling côté client
    console.log('\n🗑️ Test suppression dossier avec polling côté client...');
    const deleteFolderStartTime = Date.now();
    
    const deleteFolderResponse = await fetch(`http://localhost:3001/api/ui/folder/${createdFolder.folder.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteFolderResponse.ok) {
      console.error('❌ Erreur suppression dossier:', await deleteFolderResponse.text());
      return;
    }
    
    const deleteFolderEndTime = Date.now();
    const deleteFolderLatency = deleteFolderEndTime - deleteFolderStartTime;
    
    console.log('✅ Dossier supprimé avec succès');
    console.log(`⏱️ Latence suppression dossier: ${deleteFolderLatency}ms`);
    console.log('🎯 Vérification: Le polling côté client doit être déclenché immédiatement');
    
    console.log('\n✅ Test du polling côté client terminé !');
    console.log('\n📊 Résumé des latences :');
    console.log(`- 📝 Création note: ${latency}ms`);
    console.log(`- 🗑️ Suppression note: ${deleteLatency}ms`);
    console.log(`- 📁 Création dossier: ${folderLatency}ms`);
    console.log(`- 🗑️ Suppression dossier: ${deleteFolderLatency}ms`);
    
    const avgLatency = (latency + deleteLatency + folderLatency + deleteFolderLatency) / 4;
    console.log(`\n📈 Latence moyenne: ${avgLatency.toFixed(0)}ms`);
    
    console.log('\n🚀 Avantages du polling côté client :');
    console.log('- ✅ Polling déclenché immédiatement après l\'API');
    console.log('- ✅ Plus de polling continu qui matraque');
    console.log('- ✅ Mise à jour instantanée de l\'interface');
    console.log('- ✅ Ressources optimisées');
    console.log('- ✅ Code propre et maintenable');
    
    console.log('\n🎯 Vérification dans la console du navigateur :');
    console.log('- Cherchez les logs [ClientPollingTrigger]');
    console.log('- Cherchez les logs [OptimizedApi]');
    console.log('- Le polling doit être déclenché immédiatement après chaque opération');
    
  } catch (error) {
    console.error('❌ Erreur lors du test du polling côté client:', error);
  }
}

testPollingClient(); 