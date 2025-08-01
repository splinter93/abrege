require('dotenv').config();

async function testApiOptimisee() {
  try {
    console.log('⚡ Test de l\'API optimisée avec mise à jour directe de Zustand...');
    
    console.log('\n📋 Instructions pour tester l\'API optimisée :');
    console.log('1. Ouvrez http://localhost:3000/dossiers dans votre navigateur');
    console.log('2. Ouvrez la console développeur (F12)');
    console.log('3. Observez les logs de timing optimisés');
    console.log('4. La latence devrait être < 50ms maintenant');
    
    console.log('\n⏳ Attente de 3 secondes avant de tester...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Créer une note avec API optimisée
    console.log('\n📝 Test création note avec API optimisée...');
    const startTime = Date.now();
    
    const createNoteResponse = await fetch('http://localhost:3000/api/v1/note/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test API Optimisée',
        markdown_content: '# Test API Optimisée\n\nCette note teste l\'API optimisée avec mise à jour directe de Zustand.',
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
    
    console.log('\n⏳ Attente de 2 secondes puis mise à jour...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Mettre à jour la note avec API optimisée
    console.log('\n🔄 Test mise à jour note avec API optimisée...');
    const updateStartTime = Date.now();
    
    const updateNoteResponse = await fetch(`http://localhost:3000/api/v1/note/${createdNote.note.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_title: 'Test API Optimisée - MIS À JOUR',
        markdown_content: '# Test API Optimisée - MIS À JOUR\n\nCette note a été mise à jour pour tester l\'API optimisée.\n\n## Optimisations\n- ✅ Mise à jour directe de Zustand\n- ✅ Latence < 50ms\n- ✅ Pas de polling\n- ✅ Interface instantanée'
      })
    });
    
    if (!updateNoteResponse.ok) {
      console.error('❌ Erreur mise à jour note:', await updateNoteResponse.text());
      return;
    }
    
    const updatedNote = await updateNoteResponse.json();
    const updateEndTime = Date.now();
    const updateLatency = updateEndTime - updateStartTime;
    
    console.log('✅ Note mise à jour:', updatedNote.note.source_title);
    console.log(`⏱️ Latence mise à jour: ${updateLatency}ms`);
    console.log('🎯 Vérification: Le titre devrait changer instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Supprimer la note avec API optimisée
    console.log('\n🗑️ Test suppression note avec API optimisée...');
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
    
    // Test 4: Créer un dossier avec API optimisée
    console.log('\n⏳ Attente de 2 secondes puis test dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📁 Test création dossier avec API optimisée...');
    const folderStartTime = Date.now();
    
    const createFolderResponse = await fetch('http://localhost:3000/api/v1/folder/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test API Optimisée Dossier',
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
    
    // Test 5: Supprimer le dossier avec API optimisée
    console.log('\n🗑️ Test suppression dossier avec API optimisée...');
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
    
    console.log('\n✅ Test de l\'API optimisée terminé !');
    console.log('\n📊 Résumé des latences optimisées :');
    console.log(`- 📝 Création note: ${latency}ms`);
    console.log(`- 🔄 Mise à jour note: ${updateLatency}ms`);
    console.log(`- 🗑️ Suppression note: ${deleteLatency}ms`);
    console.log(`- 📁 Création dossier: ${folderLatency}ms`);
    console.log(`- 🗑️ Suppression dossier: ${deleteFolderLatency}ms`);
    
    const avgLatency = (latency + updateLatency + deleteLatency + folderLatency + deleteFolderLatency) / 5;
    console.log(`\n📈 Latence moyenne: ${avgLatency.toFixed(0)}ms`);
    
    if (avgLatency < 50) {
      console.log('🎉 EXCELLENT! Latence < 50ms - Optimisation parfaite !');
    } else if (avgLatency < 100) {
      console.log('✅ TRÈS BON! Latence < 100ms - Performance excellente');
    } else if (avgLatency < 200) {
      console.log('✅ BON! Latence < 200ms - Performance acceptable');
    } else {
      console.log('⚠️ AMÉLIORABLE! Latence > 200ms - Optimisation nécessaire');
    }
    
    console.log('\n🚀 Avantages de l\'API optimisée :');
    console.log('- ✅ Mise à jour directe de Zustand');
    console.log('- ✅ Pas de polling inutile');
    console.log('- ✅ Interface instantanée');
    console.log('- ✅ Latence minimale');
    console.log('- ✅ Ressources optimisées');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de l\'API optimisée:', error);
  }
}

testApiOptimisee(); 