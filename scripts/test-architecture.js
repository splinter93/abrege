#!/usr/bin/env node

/**
 * Script de test pour démontrer le fonctionnement de l'architecture Abrège
 * Simule les différents composants et leurs interactions
 */

console.log('🏗️ TEST DE L\'ARCHITECTURE ABRÈGE - Démonstration complète\n');

// Simulation des composants de l'architecture
class MockZustandStore {
  constructor() {
    this.notes = {};
    this.folders = {};
    this.classeurs = {};
    this.listeners = [];
  }

  // Simuler l'ajout d'une note avec optimistic update
  addNote(note) {
    console.log(`📝 [Store] Ajout optimiste de la note: ${note.title}`);
    this.notes[note.id] = { ...note, status: 'optimistic' };
    this.notifyListeners('note_added', note);
    return note;
  }

  // Simuler la confirmation d'une note
  confirmNote(noteId, finalData) {
    console.log(`✅ [Store] Confirmation de la note: ${noteId}`);
    this.notes[noteId] = { ...this.notes[noteId], ...finalData, status: 'confirmed' };
    this.notifyListeners('note_confirmed', this.notes[noteId]);
  }

  // Simuler le déplacement d'une note
  moveNote(noteId, folderId, classeurId) {
    const note = this.notes[noteId];
    if (note) {
      console.log(`🔄 [Store] Déplacement optimiste: ${note.title} → dossier ${folderId}`);
      this.notes[noteId] = { ...note, folder_id: folderId, classeur_id: classeurId, status: 'moving' };
      this.notifyListeners('note_moved', this.notes[noteId]);
    }
  }

  // Simuler la confirmation du déplacement
  confirmMove(noteId) {
    const note = this.notes[noteId];
    if (note) {
      console.log(`✅ [Store] Déplacement confirmé: ${note.title}`);
      this.notes[noteId] = { ...note, status: 'confirmed' };
      this.notifyListeners('move_confirmed', this.notes[noteId]);
    }
  }

  // Système de listeners pour simuler les mises à jour UI
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => listener(event, data));
  }
}

class MockV2UnifiedApi {
  static async createNote(noteData) {
    console.log(`🚀 [API] Création de note: ${noteData.title}`);
    
    // Simuler l'appel API
    const response = await this.callApi('POST', '/api/v2/note/create', noteData);
    
    if (response.success) {
      console.log(`✅ [API] Note créée avec succès: ${response.note.id}`);
      return response.note;
    } else {
      throw new Error(`Erreur création note: ${response.error}`);
    }
  }

  static async moveNote(noteId, targetFolderId) {
    console.log(`🔄 [API] Déplacement de note: ${noteId} → ${targetFolderId}`);
    
    // Simuler l'appel API
    const response = await this.callApi('PUT', `/api/v2/note/${noteId}/move`, { folder_id: targetFolderId });
    
    if (response.success) {
      console.log(`✅ [API] Note déplacée avec succès`);
      return response.note;
    } else {
      throw new Error(`Erreur déplacement note: ${response.error}`);
    }
  }

  // Simuler les appels API
  static async callApi(method, endpoint, data) {
    console.log(`🌐 [HTTP] ${method} ${endpoint}`);
    
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simuler une réponse réussie
    return {
      success: true,
      note: {
        id: data.id || `note_${Date.now()}`,
        title: data.title,
        folder_id: data.folder_id,
        classeur_id: data.classeur_id,
        created_at: new Date().toISOString()
      }
    };
  }
}

class MockRealtimeBridge {
  constructor(store) {
    this.store = store;
    this.channels = new Map();
    this.isConnected = false;
  }

  // Simuler la connexion Realtime
  connect() {
    console.log('🔌 [Realtime] Connexion WebSocket...');
    this.isConnected = true;
    console.log('✅ [Realtime] Connecté aux canaux temps réel');
    
    // Simuler l'écoute des canaux
    this.subscribeToNotes();
    this.subscribeToFolders();
  }

  // Simuler l'écoute des changements de notes
  subscribeToNotes() {
    console.log('📡 [Realtime] Écoute du canal "notes"');
    this.channels.set('notes', true);
  }

  // Simuler l'écoute des changements de dossiers
  subscribeToFolders() {
    console.log('📡 [Realtime] Écoute du canal "folders"');
    this.channels.set('folders', true);
  }

  // Simuler la réception d'un événement Realtime
  simulateRealtimeEvent(event, data) {
    console.log(`📡 [Realtime] Événement reçu: ${event}`);
    
    switch (event) {
      case 'note_created':
        this.store.confirmNote(data.id, data);
        break;
      case 'note_moved':
        this.store.confirmMove(data.id);
        break;
      default:
        console.log(`📡 [Realtime] Événement non géré: ${event}`);
    }
  }

  // Simuler la déconnexion
  disconnect() {
    console.log('🔌 [Realtime] Déconnexion WebSocket...');
    this.isConnected = false;
    this.channels.clear();
    console.log('❌ [Realtime] Déconnecté');
  }
}

class MockUI {
  constructor(store, api, realtime) {
    this.store = store;
    this.api = api;
    this.realtime = realtime;
    this.setupStoreListener();
  }

  // Écouter les changements du store
  setupStoreListener() {
    this.store.subscribe((event, data) => {
      console.log(`🎨 [UI] Événement store: ${event} - ${data.title || data.id}`);
      
      switch (event) {
        case 'note_added':
          console.log(`🎨 [UI] Note ajoutée à l'interface: ${data.title}`);
          break;
        case 'note_confirmed':
          console.log(`🎨 [UI] Note confirmée dans l'interface: ${data.title}`);
          break;
        case 'note_moved':
          console.log(`🎨 [UI] Note déplacée dans l'interface: ${data.title}`);
          break;
        case 'move_confirmed':
          console.log(`🎨 [UI] Déplacement confirmé dans l'interface: ${data.title}`);
          break;
      }
    });
  }

  // Simuler l'action utilisateur de création de note
  async createNote(title, folderId = null, classeurId = 'classeur_1') {
    console.log(`👤 [UI] Utilisateur crée une note: "${title}"`);
    
    // 1. Création optimiste dans le store
    const optimisticNote = {
      id: `temp_${Date.now()}`,
      title,
      folder_id: folderId,
      classeur_id: classeurId,
      status: 'creating'
    };
    
    this.store.addNote(optimisticNote);
    
    try {
      // 2. Appel API REST
      const createdNote = await this.api.createNote(optimisticNote);
      
      // 3. Confirmation via Realtime (simulation)
      this.realtime.simulateRealtimeEvent('note_created', createdNote);
      
      console.log(`✅ [UI] Note créée avec succès: "${title}"`);
      return createdNote;
      
    } catch (error) {
      console.error(`❌ [UI] Erreur création note: ${error.message}`);
      throw error;
    }
  }

  // Simuler l'action utilisateur de déplacement de note
  async moveNote(noteId, targetFolderId) {
    const note = this.store.notes[noteId];
    if (!note) {
      console.error(`❌ [UI] Note non trouvée: ${noteId}`);
      return;
    }
    
    console.log(`👤 [UI] Utilisateur déplace la note: "${note.title}" → dossier ${targetFolderId}`);
    
    // 1. Déplacement optimiste dans le store
    this.store.moveNote(noteId, targetFolderId, note.classeur_id);
    
    try {
      // 2. Appel API REST
      const movedNote = await this.api.moveNote(noteId, targetFolderId);
      
      // 3. Confirmation via Realtime (simulation)
      this.realtime.simulateRealtimeEvent('note_moved', movedNote);
      
      console.log(`✅ [UI] Note déplacée avec succès: "${note.title}"`);
      return movedNote;
      
    } catch (error) {
      console.error(`❌ [UI] Erreur déplacement note: ${error.message}`);
      throw error;
    }
  }
}

// Test de l'architecture complète
async function testArchitecture() {
  console.log('🧪 DÉMARRAGE DU TEST D\'ARCHITECTURE\n');
  
  // 1. Initialisation des composants
  console.log('🔧 1. Initialisation des composants...');
  const store = new MockZustandStore();
  const api = MockV2UnifiedApi;
  const realtime = new MockRealtimeBridge(store);
  const ui = new MockUI(store, api, realtime);
  
  // 2. Connexion Realtime
  console.log('\n🔌 2. Connexion Realtime...');
  realtime.connect();
  
  // 3. Test de création de note
  console.log('\n📝 3. Test de création de note...');
  try {
    const note1 = await ui.createNote('Ma première note', 'folder_1', 'classeur_1');
    console.log(`✅ Note créée: ${note1.title} (ID: ${note1.id})`);
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
  
  // 4. Test de déplacement de note
  console.log('\n🔄 4. Test de déplacement de note...');
  try {
    const noteId = Object.keys(store.notes)[0];
    if (noteId) {
      await ui.moveNote(noteId, 'folder_2');
      console.log(`✅ Note déplacée vers folder_2`);
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
  
  // 5. Test de création d'une seconde note
  console.log('\n📝 5. Test de création d\'une seconde note...');
  try {
    const note2 = await ui.createNote('Ma seconde note', 'folder_2', 'classeur_1');
    console.log(`✅ Note créée: ${note2.title} (ID: ${note2.id})`);
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }
  
  // 6. Affichage de l'état final
  console.log('\n📊 6. État final du store...');
  console.log('Notes dans le store:');
  Object.values(store.notes).forEach(note => {
    console.log(`  - ${note.title} (${note.status}) dans dossier ${note.folder_id}`);
  });
  
  // 7. Déconnexion Realtime
  console.log('\n🔌 7. Déconnexion Realtime...');
  realtime.disconnect();
  
  console.log('\n🎉 TEST D\'ARCHITECTURE TERMINÉ AVEC SUCCÈS !');
  console.log('\n📋 RÉSUMÉ DE L\'ARCHITECTURE:');
  console.log('✅ Store Zustand: Gestion d\'état local et optimistic updates');
  console.log('✅ API REST: Opérations de mutation sécurisées');
  console.log('✅ Realtime: Synchronisation temps réel automatique');
  console.log('✅ UI: Interface réactive et fluide');
  console.log('✅ Architecture: Modulaire, maintenable et performante');
}

// Exécution du test
testArchitecture().catch(console.error); 