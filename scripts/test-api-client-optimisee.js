require('dotenv').config();

// Simulation de l'API optimisée côté client
class OptimizedApiClient {
  constructor() {
    this.store = {
      notes: {},
      folders: {}
    };
  }

  async createNote(noteData) {
    console.log('[OptimizedApiClient] 🚀 Création note optimisée');
    const startTime = Date.now();
    
    try {
      // Appel API
      const response = await fetch('http://localhost:3001/api/v1/note/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        throw new Error(`Erreur création note: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ API terminée en ${apiTime}ms`);

      // 🚀 Mise à jour directe du store (instantanée)
      this.store.notes[result.note.id] = result.note;
      
      const totalTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ Note ajoutée au store en ${totalTime}ms total`);
      
      return result;
    } catch (error) {
      console.error('[OptimizedApiClient] ❌ Erreur création note:', error);
      throw error;
    }
  }

  async deleteNote(noteId) {
    console.log('[OptimizedApiClient] 🗑️ Suppression note optimisée');
    const startTime = Date.now();
    
    try {
      // Appel API
      const response = await fetch(`http://localhost:3001/api/v1/note/${noteId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression note: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ API terminée en ${apiTime}ms`);

      // 🚀 Mise à jour directe du store (instantanée)
      delete this.store.notes[noteId];
      
      const totalTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ Note supprimée du store en ${totalTime}ms total`);
      
      return { success: true };
    } catch (error) {
      console.error('[OptimizedApiClient] ❌ Erreur suppression note:', error);
      throw error;
    }
  }

  async createFolder(folderData) {
    console.log('[OptimizedApiClient] 📁 Création dossier optimisée');
    const startTime = Date.now();
    
    try {
      // Appel API
      const response = await fetch('http://localhost:3001/api/v1/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });

      if (!response.ok) {
        throw new Error(`Erreur création dossier: ${response.statusText}`);
      }

      const result = await response.json();
      const apiTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ API terminée en ${apiTime}ms`);

      // 🚀 Mise à jour directe du store (instantanée)
      this.store.folders[result.folder.id] = result.folder;
      
      const totalTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ Dossier ajouté au store en ${totalTime}ms total`);
      
      return result;
    } catch (error) {
      console.error('[OptimizedApiClient] ❌ Erreur création dossier:', error);
      throw error;
    }
  }

  async deleteFolder(folderId) {
    console.log('[OptimizedApiClient] 🗑️ Suppression dossier optimisée');
    const startTime = Date.now();
    
    try {
      // Appel API
      const response = await fetch(`http://localhost:3001/api/v1/folder/${folderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Erreur suppression dossier: ${response.statusText}`);
      }

      const apiTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ API terminée en ${apiTime}ms`);

      // 🚀 Mise à jour directe du store (instantanée)
      delete this.store.folders[folderId];
      
      const totalTime = Date.now() - startTime;
      console.log(`[OptimizedApiClient] ✅ Dossier supprimé du store en ${totalTime}ms total`);
      
      return { success: true };
    } catch (error) {
      console.error('[OptimizedApiClient] ❌ Erreur suppression dossier:', error);
      throw error;
    }
  }
}

async function testApiClientOptimisee() {
  try {
    console.log('⚡ Test de l\'API client optimisée - Latence minimale...');
    
    console.log('\n📋 Instructions :');
    console.log('1. Ouvrez http://localhost:3001/dossiers dans votre navigateur');
    console.log('2. Observez la latence - elle devrait être < 50ms maintenant');
    console.log('3. Plus de polling continu qui matraque !');
    
    const apiClient = new OptimizedApiClient();
    
    console.log('\n⏳ Attente de 3 secondes avant de tester...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 1: Créer une note avec API client optimisée
    console.log('\n📝 Test création note avec API client optimisée...');
    const startTime = Date.now();
    
    const createdNote = await apiClient.createNote({
      source_title: 'Test API Client Optimisée',
      markdown_content: '# Test API Client Optimisée\n\nCette note teste l\'API client optimisée.',
      notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943',
      header_image: 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    console.log('✅ Note créée:', createdNote.note.source_title);
    console.log(`⏱️ Latence totale: ${latency}ms`);
    console.log('🎯 Vérification: La note devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Supprimer la note avec API client optimisée
    console.log('\n🗑️ Test suppression note avec API client optimisée...');
    const deleteStartTime = Date.now();
    
    await apiClient.deleteNote(createdNote.note.id);
    
    const deleteEndTime = Date.now();
    const deleteLatency = deleteEndTime - deleteStartTime;
    
    console.log('✅ Note supprimée avec succès');
    console.log(`⏱️ Latence suppression: ${deleteLatency}ms`);
    console.log('🎯 Vérification: La note devrait disparaître instantanément de l\'UI');
    
    // Test 3: Créer un dossier avec API client optimisée
    console.log('\n⏳ Attente de 2 secondes puis test dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📁 Test création dossier avec API client optimisée...');
    const folderStartTime = Date.now();
    
    const createdFolder = await apiClient.createFolder({
      name: 'Test API Client Optimisée Dossier',
      notebook_id: '3df1dc39-ece7-40db-ab33-0337c93ca943'
    });
    
    const folderEndTime = Date.now();
    const folderLatency = folderEndTime - folderStartTime;
    
    console.log('✅ Dossier créé:', createdFolder.folder.name);
    console.log(`⏱️ Latence création dossier: ${folderLatency}ms`);
    console.log('🎯 Vérification: Le dossier devrait apparaître instantanément dans l\'UI');
    
    console.log('\n⏳ Attente de 2 secondes puis suppression dossier...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Supprimer le dossier avec API client optimisée
    console.log('\n🗑️ Test suppression dossier avec API client optimisée...');
    const deleteFolderStartTime = Date.now();
    
    await apiClient.deleteFolder(createdFolder.folder.id);
    
    const deleteFolderEndTime = Date.now();
    const deleteFolderLatency = deleteFolderEndTime - deleteFolderStartTime;
    
    console.log('✅ Dossier supprimé avec succès');
    console.log(`⏱️ Latence suppression dossier: ${deleteFolderLatency}ms`);
    console.log('🎯 Vérification: Le dossier devrait disparaître instantanément de l\'UI');
    
    console.log('\n✅ Test de l\'API client optimisée terminé !');
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
    
    console.log('\n🚀 Avantages de l\'API client optimisée :');
    console.log('- ✅ Plus de polling continu qui matraque');
    console.log('- ✅ Mise à jour directe du store');
    console.log('- ✅ Interface instantanée');
    console.log('- ✅ Latence minimale');
    console.log('- ✅ Ressources optimisées');
    console.log('- ✅ Code propre et maintenable');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de l\'API client optimisée:', error);
  }
}

testApiClientOptimisee(); 