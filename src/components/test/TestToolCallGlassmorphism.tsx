"use client";

import React, { useState } from 'react';
import ToolCallMessage from '../chat/ToolCallMessage';

const TestToolCallGlassmorphism: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  // Données de test pour simuler différents scénarios
  const singleToolCall = [
    {
      id: "call_1",
      type: "function" as const,
      function: {
        name: "create_note",
        arguments: JSON.stringify({
          title: "Note de test",
          content: "Contenu de la note",
          folder_id: "folder_123"
        })
      }
    }
  ];

  const multipleSameToolCalls = [
    {
      id: "call_1",
      type: "function" as const,
      function: {
        name: "search_notes",
        arguments: JSON.stringify({ query: "test", limit: 10 })
      }
    },
    {
      id: "call_2",
      type: "function" as const,
      function: {
        name: "search_notes",
        arguments: JSON.stringify({ query: "important", limit: 5 })
      }
    },
    {
      id: "call_3",
      type: "function" as const,
      function: {
        name: "search_notes",
        arguments: JSON.stringify({ query: "urgent", limit: 3 })
      }
    }
  ];

  const mixedToolCalls = [
    {
      id: "call_1",
      type: "function" as const,
      function: {
        name: "create_note",
        arguments: JSON.stringify({ title: "Note 1", content: "Contenu 1" })
      }
    },
    {
      id: "call_2",
      type: "function" as const,
      function: {
        name: "search_notes",
        arguments: JSON.stringify({ query: "test" })
      }
    },
    {
      id: "call_3",
      type: "function" as const,
      function: {
        name: "create_note",
        arguments: JSON.stringify({ title: "Note 2", content: "Contenu 2" })
      }
    }
  ];

  const toolResults = [
    {
      tool_call_id: "call_1",
      name: "create_note",
      content: JSON.stringify({ success: true, note_id: "note_123" }),
      success: true
    },
    {
      tool_call_id: "call_2",
      name: "search_notes",
      content: JSON.stringify({ success: true, results: ["note1", "note2"] }),
      success: true
    },
    {
      tool_call_id: "call_3",
      name: "create_note",
      content: JSON.stringify({ success: false, error: "Permission denied" }),
      success: false
    }
  ];

  const manyToolCalls = Array.from({ length: 15 }, (_, i) => ({
    id: `call_${i + 1}`,
    type: "function" as const,
    function: {
      name: i % 3 === 0 ? "create_note" : i % 3 === 1 ? "search_notes" : "update_note",
      arguments: JSON.stringify({ id: i, action: `action_${i}` })
    }
  }));

  return (
    <div className="test-tool-call-glassmorphism p-8 max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">🔮 Test Tool Call Glassmorphism</h1>
        <p className="text-slate-300 mb-6">
          Test du nouveau style glassmorphism avec affichage du nom de l'endpoint
        </p>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
        >
          {isVisible ? '🔄 Actualiser' : '👁️ Afficher'}
        </button>
      </div>

      {isVisible && (
        <div className="space-y-8">
          {/* Test 1: Single Tool Call */}
          <div className="test-section">
            <h2 className="text-xl font-semibold text-white mb-4">1️⃣ Single Tool Call</h2>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ToolCallMessage
                toolCalls={singleToolCall}
                toolResults={[toolResults[0]]}
              />
            </div>
          </div>

          {/* Test 2: Multiple Same Tool Calls */}
          <div className="test-section">
            <h2 className="text-xl font-semibold text-white mb-4">2️⃣ Multiple Same Tool Calls</h2>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ToolCallMessage
                toolCalls={multipleSameToolCalls}
                toolResults={toolResults.slice(0, 2)}
              />
            </div>
          </div>

          {/* Test 3: Mixed Tool Calls */}
          <div className="test-section">
            <h2 className="text-xl font-semibold text-white mb-4">3️⃣ Mixed Tool Calls</h2>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ToolCallMessage
                toolCalls={mixedToolCalls}
                toolResults={toolResults}
              />
            </div>
          </div>

          {/* Test 4: Many Tool Calls (Batch Warning) */}
          <div className="test-section">
            <h2 className="text-xl font-semibold text-white mb-4">4️⃣ Many Tool Calls (Batch Warning)</h2>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ToolCallMessage
                toolCalls={manyToolCalls}
                toolResults={[]}
              />
            </div>
          </div>

          {/* Test 5: With Pending Status */}
          <div className="test-section">
            <h2 className="text-xl font-semibold text-white mb-4">5️⃣ With Pending Status</h2>
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <ToolCallMessage
                toolCalls={singleToolCall}
                toolResults={[]}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">✨ Caractéristiques du Style Glassmorphism</h3>
        <ul className="text-slate-300 space-y-2">
          <li>• <strong>Backdrop Filter:</strong> Effet de flou (blur) pour l'effet glassmorphism</li>
          <li>• <strong>Transparence:</strong> Arrière-plans semi-transparents avec rgba</li>
          <li>• <strong>Bordures subtiles:</strong> Bordures blanches semi-transparentes</li>
          <li>• <strong>Ombres:</strong> Drop shadows et box shadows pour la profondeur</li>
          <li>• <strong>Animations:</strong> Transitions fluides et effets hover</li>
          <li>• <strong>Header intelligent:</strong> Affiche le nom de l'endpoint principal</li>
          <li>• <strong>Indicateurs visuels:</strong> Statuts colorés avec effets glassmorphism</li>
        </ul>
      </div>
    </div>
  );
};

export default TestToolCallGlassmorphism; 