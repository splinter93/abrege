"use client";

import React, { useState } from 'react';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Composant de test pour vérifier que l'enchaînement d'actions fonctionne
 */
export default function TestToolChaining() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testToolChaining = async () => {
    setIsLoading(true);
    addLog('🚀 Test d\'enchaînement d\'actions...');
    
    try {
      // Simuler un token JWT (en production, ce serait un vrai token)
      const mockToken = 'mock-jwt-token';
      
      // Test 1: Créer un classeur
      addLog('📚 Test 1: Création d\'un classeur...');
      const createResult = await agentApiV2Tools.executeTool('create_notebook', {
        name: 'Test Enchaînement',
        description: 'Classeur de test pour l\'enchaînement'
      }, mockToken);
      
      if (createResult.success) {
        addLog('✅ Classeur créé avec succès');
        
        // Test 2: Créer un dossier dans ce classeur (enchaînement)
        addLog('📁 Test 2: Création d\'un dossier (enchaînement)...');
        const folderResult = await agentApiV2Tools.executeTool('create_folder', {
          name: 'Dossier Test',
          notebook_id: createResult.notebook?.id || 'test-id'
        }, mockToken);
        
        if (folderResult.success) {
          addLog('✅ Dossier créé avec succès (enchaînement réussi)');
          
          // Test 3: Créer une note (enchaînement)
          addLog('📝 Test 3: Création d\'une note (enchaînement)...');
          const noteResult = await agentApiV2Tools.executeTool('create_note', {
            source_title: 'Note Test',
            notebook_id: createResult.notebook?.id || 'test-id',
            markdown_content: '# Test d\'enchaînement\n\nCette note a été créée en enchaînant les actions.'
          }, mockToken);
          
          if (noteResult.success) {
            addLog('✅ Note créée avec succès (enchaînement réussi)');
            
            // Test 4: Ajouter du contenu à la note (enchaînement)
            addLog('➕ Test 4: Ajout de contenu (enchaînement)...');
            const addContentResult = await agentApiV2Tools.executeTool('add_content_to_note', {
              ref: noteResult.note?.id || 'test-note-id',
              content: '\n\n## Section ajoutée\n\nContenu ajouté en enchaînant les actions.'
            }, mockToken);
            
            if (addContentResult.success) {
              addLog('✅ Contenu ajouté avec succès (enchaînement réussi)');
              addLog('🎉 TOUS LES TESTS D\'ENCHAÎNEMENT ONT RÉUSSI !');
            } else {
              addLog(`❌ Échec ajout contenu: ${addContentResult.error}`);
            }
          } else {
            addLog(`❌ Échec création note: ${noteResult.error}`);
          }
        } else {
          addLog(`❌ Échec création dossier: ${folderResult.error}`);
        }
      } else {
        addLog(`❌ Échec création classeur: ${createResult.error}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      addLog(`❌ Erreur lors du test: ${errorMessage}`);
      logger.error('[TestToolChaining] ❌ Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">🧪 Test d'Enchaînement d'Actions</h3>
      
      <div className="mb-4 space-y-2">
        <button
          onClick={testToolChaining}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '🔄 Test en cours...' : '🚀 Tester l\'enchaînement'}
        </button>
        
        <button
          onClick={clearLogs}
          className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🗑️ Effacer les logs
        </button>
      </div>
      
      <div className="bg-white border rounded p-3 max-h-96 overflow-y-auto">
        <h4 className="font-medium mb-2">📊 Résultats des tests:</h4>
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">Aucun test exécuté</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Ce test vérifie :</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>✅ Création d'un classeur</li>
          <li>✅ Création d'un dossier (enchaînement)</li>
          <li>✅ Création d'une note (enchaînement)</li>
          <li>✅ Ajout de contenu (enchaînement)</li>
        </ul>
        <p className="mt-2">
          <strong>Objectif :</strong> Vérifier que le système anti-boucle permet maintenant 
          l'enchaînement d'actions logiques sans être trop restrictif.
        </p>
      </div>
    </div>
  );
} 