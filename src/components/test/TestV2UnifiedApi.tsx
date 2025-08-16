'use client';

import React, { useState } from 'react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { useAuth } from '@/hooks/useAuth';

const TestV2UnifiedApi: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCreateClasseur = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test création classeur...');
      
      const result = await v2UnifiedApi.createClasseur({
        name: 'Test Classeur V2',
        description: 'Classeur de test pour V2UnifiedApi',
        icon: '🧪'
      }, user.id);

      if (result.success) {
        addResult(`✅ Classeur créé: ${result.classeur.name} (ID: ${result.classeur.id})`);
      } else {
        addResult('❌ Échec création classeur');
      }
    } catch (error) {
      addResult(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateFolder = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test création dossier...');
      
      // D'abord créer un classeur de test
      const classeurResult = await v2UnifiedApi.createClasseur({
        name: 'Test Classeur pour Dossier',
        description: 'Classeur temporaire pour tester la création de dossier'
      }, user.id);

      if (!classeurResult.success) {
        addResult('❌ Impossible de créer le classeur de test');
        return;
      }

      // Créer le dossier
      const result = await v2UnifiedApi.createFolder({
        name: 'Test Dossier V2',
        notebook_id: classeurResult.classeur.id
      }, user.id);

      if (result.success) {
        addResult(`✅ Dossier créé: ${result.folder.name} (ID: ${result.folder.id})`);
      } else {
        addResult('❌ Échec création dossier');
      }
    } catch (error) {
      addResult(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateNote = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test création note...');
      
      // D'abord créer un classeur de test
      const classeurResult = await v2UnifiedApi.createClasseur({
        name: 'Test Classeur pour Note',
        description: 'Classeur temporaire pour tester la création de note'
      }, user.id);

      if (!classeurResult.success) {
        addResult('❌ Impossible de créer le classeur de test');
        return;
      }

      // Créer la note
      const result = await v2UnifiedApi.createNote({
        source_title: 'Test Note V2',
        notebook_id: classeurResult.classeur.id,
        markdown_content: '# Test Note V2\n\nCeci est une note de test pour valider V2UnifiedApi.',
        description: 'Note de test pour V2UnifiedApi'
      }, user.id);

      if (result.success) {
        addResult(`✅ Note créée: ${result.note.source_title} (ID: ${result.note.id})`);
      } else {
        addResult('❌ Échec création note');
      }
    } catch (error) {
      addResult(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGetClasseurs = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test récupération classeurs...');
      
      const result = await v2UnifiedApi.getClasseurs(user.id);

      if (result.success) {
        addResult(`✅ ${result.classeurs.length} classeurs récupérés`);
        result.classeurs.forEach(classeur => {
          addResult(`   - ${classeur.name} (${classeur.id})`);
        });
      } else {
        addResult('❌ Échec récupération classeurs');
      }
    } catch (error) {
      addResult(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadClasseursWithContent = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test chargement classeurs avec contenu...');
      
      const result = await v2UnifiedApi.loadClasseursWithContent(user.id);

      if (result.success) {
        addResult(`✅ ${result.classeurs.length} classeurs chargés avec contenu`);
      } else {
        addResult('❌ Échec chargement classeurs avec contenu');
      }
    } catch (error) {
      addResult(`💥 Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h2>🧪 Test V2UnifiedApi</h2>
        <p>Vous devez être connecté pour tester V2UnifiedApi.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 Test V2UnifiedApi</h2>
      <p>Test du service unifié V2 qui combine V2DatabaseUtils avec les mécanismes de V1.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Tests disponibles :</h3>
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <button 
            onClick={testCreateClasseur}
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Créer Classeur
          </button>
          
          <button 
            onClick={testCreateFolder}
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              backgroundColor: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Créer Dossier
          </button>
          
          <button 
            onClick={testCreateNote}
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              backgroundColor: isLoading ? '#ccc' : '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Créer Note
          </button>
          
          <button 
            onClick={testGetClasseurs}
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              backgroundColor: isLoading ? '#ccc' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Récupérer Classeurs
          </button>
          
          <button 
            onClick={testLoadClasseursWithContent}
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              backgroundColor: isLoading ? '#ccc' : '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Charger avec Contenu
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={clearResults}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ Effacer Résultats
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>État:</strong> {isLoading ? '⏳ Test en cours...' : '✅ Prêt'}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Résultats des tests :</h3>
        {testResults.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Aucun test exécuté pour le moment.</p>
        ) : (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '5px', 
            padding: '15px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ 
                padding: '5px 0', 
                borderBottom: index < testResults.length - 1 ? '1px solid #dee2e6' : 'none',
                fontFamily: 'monospace',
                fontSize: '14px'
              }}>
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: '5px', 
        padding: '15px',
        marginTop: '20px'
      }}>
        <h4>📋 Informations sur V2UnifiedApi :</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>✅ Combine V2DatabaseUtils (accès direct DB) avec les mécanismes de V1</li>
          <li>✅ Mise à jour optimiste du store Zustand</li>
          <li>✅ Polling intelligent déclenché par API</li>
          <li>✅ Compatible avec l'architecture existante</li>
          <li>✅ Remplace complètement optimizedApi</li>
        </ul>
      </div>
    </div>
  );
};

export default TestV2UnifiedApi; 