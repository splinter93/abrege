'use client';
import React, { useState } from 'react';
import { batchMessageService } from '@/services/batchMessageService';
import { simpleLogger as logger } from '@/utils/logger';

const TestBatchAPI: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const testSimpleMessage = async () => {
    setIsLoading(true);
    addLog('🧪 Test message simple...');

    try {
      const result = await batchMessageService.addBatchMessages({
        messages: [{
          role: 'user',
          content: 'Test message simple',
          timestamp: new Date().toISOString()
        }],
        sessionId: 'test-session-123',
        batchId: `test-${Date.now()}`
      });

      if (result.success) {
        addLog('✅ Message simple ajouté avec succès');
        addLog(`   Messages ajoutés: ${result.data?.messages?.length || 0}`);
      } else {
        addLog(`❌ Échec: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testToolMessage = async () => {
    setIsLoading(true);
    addLog('🔧 Test message tool...');

    try {
      const result = await batchMessageService.addBatchMessages({
        messages: [{
          role: 'tool',
          tool_call_id: 'call_test_123',
          name: 'test_tool',
          content: '{"success": true, "result": "test"}',
          timestamp: new Date().toISOString()
        }],
        sessionId: 'test-session-123',
        batchId: `tool-test-${Date.now()}`
      });

      if (result.success) {
        addLog('✅ Message tool ajouté avec succès');
        addLog(`   Messages ajoutés: ${result.data?.messages?.length || 0}`);
      } else {
        addLog(`❌ Échec: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testToolCallSequence = async () => {
    setIsLoading(true);
    addLog('🔄 Test séquence tool call...');

    try {
      const result = await batchMessageService.addToolCallSequence(
        'test-session-123',
        {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_test_456',
            type: 'function',
            function: {
              name: 'test_function',
              arguments: '{"param": "value"}'
            }
          }],
          timestamp: new Date().toISOString()
        },
        [{
          tool_call_id: 'call_test_456',
          name: 'test_function',
          content: '{"success": true, "result": "sequence test"}',
          success: true
        }],
        {
          role: 'assistant',
          content: 'Résultat de la séquence: sequence test',
          timestamp: new Date().toISOString()
        }
      );

      if (result.success) {
        addLog('✅ Séquence tool call ajoutée avec succès');
        addLog(`   Messages ajoutés: ${result.data?.messages?.length || 0}`);
      } else {
        addLog(`❌ Échec: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testValidation = async () => {
    setIsLoading(true);
    addLog('✅ Test validation...');

    try {
      // Test avec message tool invalide
      const result = await batchMessageService.addBatchMessages({
        messages: [{
          role: 'tool',
          // ❌ Manque tool_call_id et name
          content: 'Test content invalide',
          timestamp: new Date().toISOString()
        }],
        sessionId: 'test-session-123',
        batchId: `validation-test-${Date.now()}`
      });

      if (!result.success) {
        addLog('✅ Validation échouée comme attendu');
        addLog(`   Erreur: ${result.error}`);
      } else {
        addLog('⚠️ Validation aurait dû échouer');
      }
    } catch (error) {
      addLog(`❌ Erreur validation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Test API Batch - Phase 1</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testSimpleMessage}
          disabled={isLoading}
          className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Message Simple
        </button>
        
        <button
          onClick={testToolMessage}
          disabled={isLoading}
          className="p-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Message Tool
        </button>
        
        <button
          onClick={testToolCallSequence}
          disabled={isLoading}
          className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Séquence Tool Call
        </button>
        
        <button
          onClick={testValidation}
          disabled={isLoading}
          className="p-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Test Validation
        </button>
        
        <button
          onClick={clearLogs}
          className="p-3 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Effacer Logs
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">État:</span>
          <span className={`px-2 py-1 rounded text-xs ${
            isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
          }`}>
            {isLoading ? 'En cours...' : 'Prêt'}
          </span>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📋 Logs de Test:</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">Aucun test exécuté</p>
          ) : (
            testResults.map((log, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">📚 Informations sur les Tests:</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Message Simple:</strong> Test d'ajout basique d'un message</li>
          <li>• <strong>Message Tool:</strong> Test d'ajout d'un message tool avec tous les champs requis</li>
          <li>• <strong>Séquence Tool Call:</strong> Test complet assistant → tool → relance</li>
          <li>• <strong>Validation:</strong> Test de validation des messages invalides</li>
        </ul>
      </div>
    </div>
  );
};

export default TestBatchAPI; 