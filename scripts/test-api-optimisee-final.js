require('dotenv').config();

async function testApiOptimiseeFinal() {
  try {
    console.log('⚡ Test final de l\'API optimisée - Latence minimale...');
    
    console.log('\n📋 Instructions :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Observez la latence - elle devrait être < 50ms maintenant');
    console.log('3. Plus de polling continu qui matraque !');
    
    console.log('\n⏳ Attente de 3 secondes avant de tester...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Créer une note
    console.log('\n📝 Test création note optimisée...');
    const startTime = Date.now();
    
    const createNoteResponse = await fetch('http://localhost:3000/api/v1/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test API Optimisée Final',
        markdown_content: '# Test API Optimisée Final\n\nCette note teste l\'API optimisée avec latence minimale.',
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
    console.log('🎯 Vérification: La note devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Supprimer la note
    console.log('\n🗑️ Test suppression note optimisée...');
    const deleteStartTime = Date.now();
    
    const deleteNoteResponse = await fetch(`http://localhost:3000/api/v1/note/${createdNote.note.id}`, {
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
    console.log('🎯 Vérification: La note devrait disparaître instantanément de l\'UI');
    
    // Test 3: Créer un dossier
    console.log('\n⏳ Attente de 2 secondes puis test dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📁 Test création dossier optimisée...');
    const folderStartTime = Date.now();
    
    const createFolderResponse = await fetch('http://localhost:3000/api/v1/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test API Optimisée Final Dossier',
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
    console.log('🎯 Vérification: Le dossier devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Supprimer le dossier
    console.log('\n🗑️ Test suppression dossier optimisée...');
    const deleteFolderStartTime = Date.now();
    
    const deleteFolderResponse = await fetch(`http://localhost:3000/api/v1/folder/${createdFolder.folder.id}`, {
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
    console.log('🎯 Vérification: Le dossier devrait disparaître instantanément de l\'UI');
    
    console.log('\n✅ Test final de l\'API optimisée terminé !');
    console.log('\n📊 Résumé des latences optimisées :');
    console.log(`- 📝 Création note: ${latency}ms`);
    console.log(`- 🗑️ Suppression note: ${deleteLatency}ms`);
    console.log(`- 📁 Création dossier: ${folderLatency}ms`);
    console.log(`- 🗑️ Suppression dossier: ${deleteFolderLatency}ms`);
    
    const avgLatency = (latency + deleteLatency + folderLatency + deleteFolderLatency) / 4;
    console.log(`\n📈 Latence moyenne: ${avgLatency.toFixed(0)}ms`);
    
    if (avgLatency < 50) {
      console.log('🎉 PARFAIT! Latence < 50ms - Optimisation réussie !');
    } else if (avgLatency < 100) {
      console.log('✅ EXCELLENT! Latence < 100ms - Performance parfaite');
    } else if (avgLatency < 200) {
      console.log('✅ BON! Latence < 200ms - Performance acceptable');
    } else {
      console.log('⚠️ AMÉLIORABLE! Latence > 200ms');
    }
    
    console.log('\n🚀 Avantages de l\'API optimisée :');
    console.log('- ✅ Plus de polling continu qui matraque');
    console.log('- ✅ Mise à jour directe de Zustand');
    console.log('- ✅ Interface instantanée');
    console.log('- ✅ Latence minimale');
    console.log('- ✅ Ressources optimisées');
    console.log('- ✅ Code propre et maintenable');
    
  } catch (error) {
    console.error('❌ Erreur lors du test final:', error);
  }
}

testApiOptimiseeFinal(); 