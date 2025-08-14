'use client';
import React, { useState } from 'react';
import { useToolCallDebugger } from '@/hooks/useToolCallDebugger';
import ToolCallDebugger from '@/components/chat/ToolCallDebugger';

const TestToolCallDebugger: React.FC = () => {
  const {
    toolCalls,
    toolResults,
    isDebuggerVisible,
    addToolCalls,
    addToolResult,
    clearToolCalls,
    toggleDebugger,
    hideDebugger,
    showDebugger
  } = useToolCallDebugger();

  const [testCount, setTestCount] = useState(1);

  const generateTestToolCalls = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-tool-call-${Date.now()}-${i}`,
      type: 'function' as const,
      function: {
        name: `test_function_${i + 1}`,
        arguments: JSON.stringify({ param1: `value${i + 1}`, param2: i + 1 })
      }
    }));
  };

  const handleAddToolCalls = () => {
    const newToolCalls = generateTestToolCalls(testCount);
    console.log('[TestToolCallDebugger] Ajout de tool calls:', newToolCalls);
    addToolCalls(newToolCalls);
  };

  const handleAddToolResult = (toolCallId: string, success: boolean = true) => {
    const result = {
      tool_call_id: toolCallId,
      name: 'test_function',
      content: success 
        ? JSON.stringify({ success: true, result: 'Test réussi' })
        : JSON.stringify({ success: false, error: 'Test échoué' }),
      success
    };
    console.log('[TestToolCallDebugger] Ajout de tool result:', result);
    addToolResult(result);
  };

  const handleSimulateToolExecution = () => {
    if (toolCalls.length === 0) {
      alert('Ajoutez d\'abord des tool calls');
      return;
    }

    // Simuler l'exécution de tous les tool calls
    toolCalls.forEach((toolCall, index) => {
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% de succès
        handleAddToolResult(toolCall.id, success);
      }, index * 1000); // 1 seconde entre chaque
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Tool Call Debugger</h1>
      
      {/* Contrôles */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Contrôles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre de tool calls à générer:
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={testCount}
              onChange={(e) => setTestCount(parseInt(e.target.value) || 1)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={handleAddToolCalls}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Ajouter {testCount} Tool Call(s)
            </button>
            
            <button
              onClick={handleSimulateToolExecution}
              disabled={toolCalls.length === 0}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              Simuler Exécution
            </button>
            
            <button
              onClick={clearToolCalls}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Effacer Tout
            </button>
          </div>
        </div>
      </div>

      {/* Contrôles du debugger */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Contrôles du Debugger</h2>
        
        <div className="flex gap-2">
          <button
            onClick={showDebugger}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Afficher Debugger
          </button>
          
          <button
            onClick={hideDebugger}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Masquer Debugger
          </button>
          
          <button
            onClick={toggleDebugger}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Toggle Debugger
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          État: {isDebuggerVisible ? 'Visible' : 'Masqué'}
        </div>
      </div>

      {/* État actuel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">État Actuel</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Tool Calls ({toolCalls.length})</h3>
            {toolCalls.length === 0 ? (
              <p className="text-gray-500 italic">Aucun tool call</p>
            ) : (
              <ul className="space-y-1">
                {toolCalls.map((tc, index) => (
                  <li key={tc.id} className="text-sm">
                    {index + 1}. {tc.function.name} ({tc.id.slice(-8)})
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Tool Results ({toolResults.length})</h3>
            {toolResults.length === 0 ? (
              <p className="text-gray-500 italic">Aucun résultat</p>
            ) : (
              <ul className="space-y-1">
                {toolResults.map((tr, index) => (
                  <li key={tr.tool_call_id} className="text-sm">
                    {index + 1}. {tr.name} - {tr.success ? '✅' : '❌'} ({tr.tool_call_id.slice(-8)})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Debugger */}
      <ToolCallDebugger
        toolCalls={toolCalls}
        toolResults={toolResults}
        isVisible={isDebuggerVisible}
        onToggle={hideDebugger}
      />

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Générez des tool calls avec le bouton "Ajouter Tool Call(s)"</li>
          <li>Simulez leur exécution avec "Simuler Exécution"</li>
          <li>Observez le debugger en haut à droite de l'écran</li>
          <li>Utilisez les contrôles pour afficher/masquer le debugger</li>
          <li>Vérifiez que les logs apparaissent dans la console</li>
        </ol>
      </div>
    </div>
  );
};

export default TestToolCallDebugger; 