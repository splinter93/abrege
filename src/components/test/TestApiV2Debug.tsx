'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';

const TestApiV2Debug: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectApiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
      addResult(`🧪 Test direct API: ${method} ${endpoint}`);
      
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        addResult('❌ Pas de session active');
        return;
      }

      const headers: HeadersInit = { 
        'Content-Type': 'application/json',
        'X-Client-Type': 'TestApiV2Debug'
      };
      
      if (session.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const options: RequestInit = {
        method,
        headers
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const responseText = await response.text();
      
      addResult(`📡 Réponse: ${response.status} ${response.statusText}`);
      addResult(`📄 Contenu: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      if (!response.ok) {
        addResult(`❌ Erreur HTTP: ${response.status}`);
      } else {
        addResult(`✅ Succès HTTP: ${response.status}`);
      }
    } catch (error) {
      addResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testV2UnifiedApi = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      addResult('🧪 Test V2UnifiedApi.loadClasseursWithContent...');
      
      const result = await v2UnifiedApi.loadClasseursWithContent(user.id);
      addResult(`✅ Résultat: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error) {
      addResult(`❌ Erreur V2UnifiedApi: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllEndpoints = async () => {
    if (!user?.id) {
      addResult('❌ Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    try {
      // Test 1: Endpoint classeurs
      addResult('🔍 Test 1: Endpoint /api/v2/classeurs');
      await testDirectApiCall('/api/v2/classeurs');
      
      // Test 2: Endpoint classeur tree (si on a un classeur)
      addResult('🔍 Test 2: Endpoint /api/v2/classeur/test/tree');
      await testDirectApiCall('/api/v2/classeur/test/tree');
      
      // Test 3: Endpoint note create
      addResult('🔍 Test 3: Endpoint /api/v2/note/create');
      await testDirectApiCall('/api/v2/note/create', 'POST', {
        source_title: 'Test Note Debug',
        notebook_id: 'test-notebook-id',
        markdown_content: '# Test\n\nContenu de test'
      });
      
    } catch (error) {
      addResult(`❌ Erreur générale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Debug API V2 - Diagnostic des Classeurs Vides</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">📊 État de l'utilisateur</h2>
        <p><strong>ID:</strong> {user?.id || 'Non connecté'}</p>
        <p><strong>Email:</strong> {user?.email || 'Non connecté'}</p>
      </div>

      <div className="mb-6 space-x-4">
        <button
          onClick={testAllEndpoints}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? '⏳ Test en cours...' : '🧪 Tester tous les endpoints'}
        </button>
        
        <button
          onClick={testV2UnifiedApi}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? '⏳ Test en cours...' : '🔧 Tester V2UnifiedApi'}
        </button>
        
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          🗑️ Effacer les résultats
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">📋 Résultats des tests</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">Aucun test exécuté. Cliquez sur un bouton pour commencer.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">🔍 Endpoints à tester</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-100 rounded">
            <h3 className="font-semibold">Classeurs</h3>
            <p className="text-sm text-gray-600">GET /api/v2/classeurs</p>
            <button
              onClick={() => testDirectApiCall('/api/v2/classeurs')}
              className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Tester
            </button>
          </div>
          
          <div className="p-3 bg-gray-100 rounded">
            <h3 className="font-semibold">Création Note</h3>
            <p className="text-sm text-gray-600">POST /api/v2/note/create</p>
            <button
              onClick={() => testDirectApiCall('/api/v2/note/create', 'POST', {
                source_title: 'Test Note',
                notebook_id: 'test-id',
                markdown_content: '# Test'
              })}
              className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            >
              Tester
            </button>
          </div>
          
          <div className="p-3 bg-gray-100 rounded">
            <h3 className="font-semibold">Création Dossier</h3>
            <p className="text-sm text-gray-600">POST /api/v2/folder/create</p>
            <button
              onClick={() => testDirectApiCall('/api/v2/folder/create', 'POST', {
                name: 'Test Folder',
                notebook_id: 'test-id'
              })}
              className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            >
              Tester
            </button>
          </div>
          
          <div className="p-3 bg-gray-100 rounded">
            <h3 className="font-semibold">Création Classeur</h3>
            <p className="text-sm text-gray-600">POST /api/v2/classeur/create</p>
            <button
              onClick={() => testDirectApiCall('/api/v2/classeur/create', 'POST', {
                name: 'Test Classeur'
              })}
              className="mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
            >
              Tester
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestApiV2Debug; 