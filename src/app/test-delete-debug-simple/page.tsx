/**
 * 🧪 Test Simple de l'Endpoint DELETE
 * 
 * Cette page teste l'endpoint DELETE pour identifier le problème
 * "Failed to parse URL" mentionné par l'utilisateur.
 */

"use client";

import { useState } from 'react';

export default function TestDeleteDebugSimple() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noteId, setNoteId] = useState('');
  const [authToken, setAuthToken] = useState('');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => setLogs([]);

  const testDelete = async () => {
    if (!noteId.trim()) {
      addLog('❌ Veuillez entrer un ID de note');
      return;
    }

    setIsLoading(true);
    addLog(`🚀 Test suppression note: ${noteId}`);
    
    try {
      // Test avec l'endpoint DELETE
      const response = await fetch(`/api/v2/note/${noteId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'test',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });

      addLog(`📡 Réponse HTTP: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Erreur: ${errorText}`);
        
        // Vérifier si c'est l'erreur "Failed to parse URL"
        if (errorText.includes('Failed to parse URL')) {
          addLog('🚨 PROBLÈME IDENTIFIÉ: "Failed to parse URL" détecté !');
        }
      } else {
        const result = await response.json();
        addLog(`✅ Succès: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      addLog(`❌ Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testWithUUID = () => {
    setNoteId('123e4567-e89b-12d3-a456-426614174000');
    addLog('🔧 UUID de test défini');
  };

  const testWithSlug = () => {
    setNoteId('test-note-slug');
    addLog('🔧 Slug de test défini');
  };

  const testWithInvalidChars = () => {
    setNoteId('note-with-invalid-chars-éàç');
    addLog('🔧 ID avec caractères spéciaux défini');
  };

  const testWithSpaces = () => {
    setNoteId('note with spaces');
    addLog('🔧 ID avec espaces défini');
  };

  const testWithSpecialChars = () => {
    setNoteId('note@#$%^&*()');
    addLog('🔧 ID avec caractères spéciaux définis');
  };

  const testLLMScenario = async () => {
    if (!noteId.trim()) {
      addLog('❌ Veuillez entrer un ID de note');
      return;
    }

    setIsLoading(true);
    addLog(`🤖 Test scénario LLM: ${noteId}`);
    
    try {
      // Simuler exactement ce que fait l'API LLM
      const response = await fetch(`/api/v2/note/${noteId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm', // Simuler l'appel LLM
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });

      addLog(`📡 Réponse HTTP LLM: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Erreur LLM: ${errorText}`);
        
        // Vérifier si c'est l'erreur "Failed to parse URL"
        if (errorText.includes('Failed to parse URL')) {
          addLog('🚨 PROBLÈME IDENTIFIÉ: "Failed to parse URL" dans le scénario LLM !');
        }
        
        // Vérifier si c'est une erreur d'authentification
        if (response.status === 401) {
          addLog('🔐 PROBLÈME IDENTIFICATION: Erreur 401 - Authentification requise');
        }
      } else {
        const result = await response.json();
        addLog(`✅ Succès LLM: ${JSON.stringify(result)}`);
      }
      
    } catch (error) {
      addLog(`❌ Exception LLM: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLLMWithAuth = async () => {
    if (!noteId.trim()) {
      addLog('❌ Veuillez entrer un ID de note');
      return;
    }

    if (!authToken.trim()) {
      addLog('❌ Veuillez entrer un token d\'authentification');
      return;
    }

    setIsLoading(true);
    addLog(`🔐 Test LLM avec authentification: ${noteId}`);
    
    try {
      // Simuler l'API LLM avec authentification
      const response = await fetch(`/api/v2/note/${noteId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'llm',
          'Authorization': `Bearer ${authToken}`
        }
      });

      addLog(`📡 Réponse HTTP LLM avec auth: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Erreur LLM avec auth: ${errorText}`);
      } else {
        const result = await response.json();
        addLog(`✅ Succès LLM avec auth: ${JSON.stringify(result)}`);
        addLog('🎉 L\'API LLM peut maintenant supprimer des notes !');
      }
      
    } catch (error) {
      addLog(`❌ Exception LLM avec auth: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Simple de l'Endpoint DELETE</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ Information</h2>
        <p className="text-blue-700">
          Cette page teste l'endpoint DELETE pour identifier le problème 
          "Failed to parse URL" mentionné par l'utilisateur.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID/Slug de la note à supprimer:
          </label>
          <input
            type="text"
            value={noteId}
            onChange={(e) => setNoteId(e.target.value)}
            placeholder="UUID ou slug de la note"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token d'authentification (optionnel):
          </label>
          <input
            type="text"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Bearer token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        <button
          onClick={testWithUUID}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
        >
          🔧 UUID Test
        </button>
        
        <button
          onClick={testWithSlug}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
        >
          🔧 Slug Test
        </button>
        
        <button
          onClick={testWithInvalidChars}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
        >
          🔧 Chars Spéciaux
        </button>
        
        <button
          onClick={testWithSpaces}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
        >
          🔧 Espaces
        </button>
        
        <button
          onClick={testWithSpecialChars}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium text-sm"
        >
          🔧 @#$%^&*()
        </button>
      </div>

      <div className="mb-6">
        <button
          onClick={testDelete}
          disabled={isLoading || !noteId.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium text-lg"
        >
          {isLoading ? '⏳ Test en cours...' : '🗑️ Tester la Suppression'}
        </button>
        
        <button
          onClick={testLLMScenario}
          disabled={isLoading || !noteId.trim()}
          className="ml-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium text-lg"
        >
          {isLoading ? '⏳ Test en cours...' : '🤖 Test Scénario LLM'}
        </button>
        
        <button
          onClick={testLLMWithAuth}
          disabled={isLoading || !noteId.trim() || !authToken.trim()}
          className="ml-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium text-lg"
        >
          {isLoading ? '⏳ Test en cours...' : '🔐 Test LLM avec Auth'}
        </button>
        
        <button
          onClick={clearLogs}
          className="ml-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          🧹 Effacer les logs
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📝 Logs de Test</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">Aucun log pour le moment. Lancez un test pour commencer.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔍 Comment Diagnostiquer</h3>
        <ol className="text-yellow-700 list-decimal list-inside space-y-1">
          <li>Entrez un UUID valide ou un slug de note</li>
          <li>Testez avec différents types d'identifiants (UUID, slug, caractères spéciaux)</li>
          <li>Cliquez sur "Tester la Suppression" ou "Test Scénario LLM"</li>
          <li>Regardez les logs pour voir la réponse HTTP</li>
          <li>Si vous voyez "Failed to parse URL", le problème est dans l'endpoint</li>
          <li>Si vous voyez une autre erreur, le problème est ailleurs</li>
        </ol>
      </div>
    </div>
  );
} 