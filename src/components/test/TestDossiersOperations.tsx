"use client";

import React, { useState } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import { useAuth } from '@/hooks/useAuth';

/**
 * Composant de test pour vérifier les opérations CRUD sur les dossiers
 * Teste spécifiquement les mises à jour du store Zustand
 */
export default function TestDossiersOperations() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  // Récupérer l'état du store
  const store = useFileSystemStore.getState();
  const folders = Object.values(store.folders);
  const notes = Object.values(store.notes);
  
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  const clearResults = () => {
    setTestResults([]);
  };
  
  const testStoreUpdate = () => {
    addTestResult('🧪 Test de mise à jour du store...');
    
    // Vérifier que le store a les bonnes méthodes
    if (typeof store.addNote === 'function') {
      addTestResult('✅ store.addNote disponible');
    } else {
      addTestResult('❌ store.addNote manquant');
    }
    
    if (typeof store.removeNote === 'function') {
      addTestResult('✅ store.removeNote disponible');
    } else {
      addTestResult('❌ store.removeNote manquant');
    }
    
    if (typeof store.updateNote === 'function') {
      addTestResult('✅ store.updateNote disponible');
    } else {
      addTestResult('❌ store.updateNote manquant');
    }
    
    if (typeof store.addFolder === 'function') {
      addTestResult('✅ store.addFolder disponible');
    } else {
      addTestResult('❌ store.addFolder manquant');
    }
    
    if (typeof store.removeFolder === 'function') {
      addTestResult('✅ store.removeFolder disponible');
    } else {
      addTestResult('❌ store.removeFolder manquant');
    }
    
    if (typeof store.updateFolder === 'function') {
      addTestResult('✅ store.updateFolder disponible');
    } else {
      addTestResult('❌ store.updateFolder manquant');
    }
  };
  
  const testOptimisticUpdate = () => {
    addTestResult('🚀 Test de mise à jour optimiste...');
    
    try {
      // Test d'ajout optimiste d'une note
      const testNote = {
        id: `test_note_${Date.now()}`,
        source_title: 'Note de test optimiste',
        classeur_id: 'test_classeur',
        folder_id: null,
        markdown_content: '# Test\n\nContenu de test',
        _optimistic: true
      };
      
      store.addNote(testNote);
      addTestResult('✅ Note ajoutée au store (optimiste)');
      
      // Vérifier qu'elle est bien dans le store
      const addedNote = store.notes[testNote.id];
      if (addedNote) {
        addTestResult(`✅ Note trouvée dans le store: ${addedNote.source_title}`);
      } else {
        addTestResult('❌ Note non trouvée dans le store après ajout');
      }
      
      // Test de suppression optimiste
      store.removeNote(testNote.id);
      addTestResult('✅ Note supprimée du store (optimiste)');
      
      // Vérifier qu'elle n'est plus dans le store
      const removedNote = store.notes[testNote.id];
      if (!removedNote) {
        addTestResult('✅ Note bien supprimée du store');
      } else {
        addTestResult('❌ Note toujours présente dans le store après suppression');
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test optimiste: ${error}`);
    }
  };
  
  const testStoreState = () => {
    addTestResult('📊 État actuel du store:');
    addTestResult(`   - Dossiers: ${folders.length}`);
    addTestResult(`   - Notes: ${notes.length}`);
    
    if (folders.length > 0) {
      const firstFolder = folders[0];
      addTestResult(`   - Premier dossier: ${firstFolder.name} (ID: ${firstFolder.id})`);
    }
    
    if (notes.length > 0) {
      const firstNote = notes[0];
      addTestResult(`   - Première note: ${firstNote.source_title} (ID: ${firstNote.id})`);
    }
  };
  
  const testStoreOperations = () => {
    addTestResult('🔧 Test des opérations du store...');
    
    try {
      // Test d'ajout d'un dossier
      const testFolder = {
        id: `test_folder_${Date.now()}`,
        name: 'Dossier de test',
        classeur_id: 'test_classeur',
        parent_id: null,
        position: 0,
        created_at: new Date().toISOString(),
        _optimistic: true
      };
      
      const initialCount = Object.keys(store.folders).length;
      store.addFolder(testFolder);
      const afterAddCount = Object.keys(store.folders).length;
      
      if (afterAddCount > initialCount) {
        addTestResult(`✅ Dossier ajouté au store: ${afterAddCount - initialCount} dossier(s) ajouté(s)`);
      } else {
        addTestResult('❌ Dossier non ajouté au store');
      }
      
      // Test de mise à jour
      const updatedName = 'Dossier de test - Modifié';
      store.updateFolder(testFolder.id, { name: updatedName });
      
      const updatedFolder = store.folders[testFolder.id];
      if (updatedFolder && updatedFolder.name === updatedName) {
        addTestResult(`✅ Dossier mis à jour dans le store: ${updatedFolder.name}`);
      } else {
        addTestResult('❌ Dossier non mis à jour dans le store');
      }
      
      // Test de suppression
      store.removeFolder(testFolder.id);
      const afterDeleteCount = Object.keys(store.folders).length;
      
      if (afterDeleteCount === initialCount) {
        addTestResult('✅ Dossier supprimé du store');
      } else {
        addTestResult('❌ Dossier non supprimé du store');
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des opérations: ${error}`);
    }
  };
  
  const testRealOperations = async () => {
    if (!user?.id) {
      addTestResult('❌ Utilisateur non connecté');
      return;
    }
    
    setIsLoading(true);
    addTestResult('🔧 Test des opérations réelles...');
    
    try {
      const api = V2UnifiedApi.getInstance();
      
      // Test de création d'un dossier de test
      addTestResult('📁 Création d\'un dossier de test...');
      const createResult = await api.createFolder({
        name: `Test Dossier ${Date.now()}`,
        notebook_id: 'test_notebook_id'
      }, user.id);
      
      if (createResult?.folder) {
        addTestResult(`✅ Dossier créé: ${createResult.folder.name}`);
        
        // Test de mise à jour
        addTestResult('✏️ Test de mise à jour du dossier...');
        const updateResult = await api.updateFolder(createResult.folder.id, {
          name: `${createResult.folder.name} - Modifié`
        }, user.id);
        
        if (updateResult?.folder) {
          addTestResult(`✅ Dossier mis à jour: ${updateResult.folder.name}`);
        } else {
          addTestResult('❌ Échec de la mise à jour du dossier');
        }
        
        // Test de suppression
        addTestResult('🗑️ Test de suppression du dossier...');
        const deleteResult = await api.deleteFolder(createResult.folder.id, user.id);
        
        if (deleteResult?.success) {
          addTestResult('✅ Dossier supprimé avec succès');
        } else {
          addTestResult('❌ Échec de la suppression du dossier');
        }
      } else {
        addTestResult('❌ Échec de la création du dossier');
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors des tests réels: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="test-dossiers-operations">
      <h2>🧪 Test des Opérations Dossiers</h2>
      
      <div className="test-controls">
        <button 
          onClick={testStoreUpdate}
          className="test-btn"
          disabled={isLoading}
        >
          🔍 Tester Store
        </button>
        
        <button 
          onClick={testOptimisticUpdate}
          className="test-btn"
          disabled={isLoading}
        >
          🚀 Test Optimiste
        </button>
        
        <button 
          onClick={testStoreState}
          className="test-btn"
          disabled={isLoading}
        >
          📊 État Store
        </button>
        
        <button 
          onClick={testStoreOperations}
          className="test-btn"
          disabled={isLoading}
        >
          🔧 Tests Opérations Store
        </button>
        
        <button 
          onClick={testRealOperations}
          className="test-btn"
          disabled={isLoading}
        >
          🔧 Tests Réels
        </button>
        
        <button 
          onClick={clearResults}
          className="test-btn clear"
        >
          🗑️ Effacer
        </button>
      </div>
      
      <div className="test-results">
        <h3>Résultats des Tests:</h3>
        {testResults.length === 0 ? (
          <p className="no-results">Aucun test exécuté</p>
        ) : (
          <div className="results-list">
            {testResults.map((result, index) => (
              <div key={index} className="result-item">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .test-dossiers-operations {
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .test-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .test-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          background: #3b82f6;
          color: white;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .test-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .test-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .test-btn.clear {
          background: #ef4444;
        }
        
        .test-btn.clear:hover {
          background: #dc2626;
        }
        
        .test-results {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .results-list {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .result-item {
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9rem;
        }
        
        .result-item:last-child {
          border-bottom: none;
        }
        
        .no-results {
          color: #64748b;
          font-style: italic;
        }
      `}</style>
    </div>
  );
} 