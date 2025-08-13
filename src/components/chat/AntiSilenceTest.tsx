'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  tool_call_id: string;
  name: string;
  result: any;
  success: boolean;
}

interface Message {
  role: 'user' | 'assistant' | 'tool' | 'developer';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

const AntiSilenceTest: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulation du pattern anti-silence
  const simulateAntiSilencePattern = async () => {
    setIsProcessing(true);
    
    // 1. Message utilisateur
    const userMessage: Message = {
      role: 'user',
      content: 'Liste mes classeurs'
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // 2. Assistant avec tool calls
    await new Promise(resolve => setTimeout(resolve, 1000));
    const assistantMessage: Message = {
      role: 'assistant',
      content: 'Je vais lister vos classeurs en utilisant l\'outil approprié.',
      tool_calls: [
        {
          id: 'fc_123456',
          function: {
            name: 'get_notebooks',
            arguments: '{"user_id": "user_123"}'
          }
        }
      ]
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    // 3. Résultats des tools
    await new Promise(resolve => setTimeout(resolve, 1000));
    const toolResults: Message[] = [
      {
        role: 'tool',
        tool_call_id: 'fc_123456',
        name: 'get_notebooks',
        content: JSON.stringify({
          success: true,
          data: [
            { id: 'nb_1', name: 'Travail', description: 'Notes de travail' },
            { id: 'nb_2', name: 'Personnel', description: 'Notes personnelles' }
          ]
        })
      }
    ];
    
    setMessages(prev => [...prev, ...toolResults]);
    
    // 4. Developer nudge
    await new Promise(resolve => setTimeout(resolve, 500));
    const developerNudge: Message = {
      role: 'developer',
      content: `Tu as les résultats ci-dessus.
– Si suffisant : réponds maintenant, clair et concis.
– Sinon : appelle exactement 1 tool pertinent.
Ne renvoie pas de JSON brut.`
    };
    
    setMessages(prev => [...prev, developerNudge]);
    
    // 5. Réponse finale de l'assistant
    await new Promise(resolve => setTimeout(resolve, 1000));
    const finalResponse: Message = {
      role: 'assistant',
      content: 'Voici vos classeurs :\n\n• **Travail** : Notes de travail\n• **Personnel** : Notes personnelles\n\nVous avez 2 classeurs au total. Souhaitez-vous explorer le contenu d\'un classeur spécifique ?'
    };
    
    setMessages(prev => [...prev, finalResponse]);
    setIsProcessing(false);
  };

  const resetTest = () => {
    setMessages([]);
    setIsProcessing(false);
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'assistant':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'tool':
        return 'bg-purple-100 border-purple-300 text-purple-900';
      case 'developer':
        return 'bg-orange-100 border-orange-300 text-orange-800 font-mono text-sm';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🚀 Test du Pattern Anti-Silence
        </h1>
        <p className="text-gray-600 mb-6">
          Démonstration du pattern fiable pour éviter les réponses vides après les tool calls
        </p>
        
        <div className="space-x-4">
          <button
            onClick={simulateAntiSilencePattern}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '⏳ Simulation en cours...' : '🎬 Démarrer la simulation'}
          </button>
          
          <button
            onClick={resetTest}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            🔄 Réinitialiser
          </button>
        </div>
      </div>

      {/* Explication du pattern */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          📋 Pattern Anti-Silence
        </h2>
        <ol className="list-decimal list-inside space-y-1 text-yellow-700 text-sm">
          <li><strong>Assistant avec tool_calls</strong> : Ré-inséré pour maintenir les tool_call_id</li>
          <li><strong>Messages tool</strong> : Un par résultat avec tool_call_id exact</li>
          <li><strong>Developer nudge</strong> : Force la reprise du LLM</li>
          <li><strong>Relance optimisée</strong> : tool_choice: "auto", temperature: 0.2</li>
        </ol>
      </div>

      {/* Messages de la conversation */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          💬 Conversation simulée
        </h3>
        
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Cliquez sur "Démarrer la simulation" pour voir le pattern en action
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getMessageStyle(message.role)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {message.role === 'user' && '👤'}
                    {message.role === 'assistant' && '🤖'}
                    {message.role === 'tool' && '🔧'}
                    {message.role === 'developer' && '👨‍💻'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {message.role.toUpperCase()}
                      {message.tool_calls && ` (${message.tool_calls.length} tool calls)`}
                      {message.tool_call_id && ` - ID: ${message.tool_call_id}`}
                      {message.name && ` - Name: ${message.name}`}
                    </div>
                    
                    <div className="text-sm">
                      {message.content}
                    </div>
                    
                    {message.tool_calls && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <strong>Tool Calls:</strong>
                        {message.tool_calls.map((tc, i) => (
                          <div key={i} className="ml-2">
                            • {tc.function.name}({tc.function.arguments})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist des bonnes pratiques */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-800 mb-2">
          ✅ Checklist Anti-Silence
        </h2>
        <ul className="space-y-1 text-green-700 text-sm">
          <li>✓ Historique complet avec message assistant + tool_calls</li>
          <li>✓ Messages tool avec tool_call_id exact</li>
          <li>✓ Developer nudge en dernier (pas de message tool en dernier)</li>
          <li>✓ tool_choice: "auto" pour permettre la chaîne</li>
          <li>✓ temperature: 0.2 pour la relance (plus déterministe)</li>
        </ul>
      </div>
    </div>
  );
};

export default AntiSilenceTest; 