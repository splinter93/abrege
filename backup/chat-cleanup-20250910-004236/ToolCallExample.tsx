'use client';

import React from 'react';
import ChatMessage from './ChatMessage';

const ToolCallExample: React.FC = () => {
  // Exemple de message assistant avec tool call
  const assistantMessageWithToolCall = {
    id: '1',
    role: 'assistant' as const,
    content: null,
    timestamp: new Date().toISOString(),
    tool_calls: [{
      id: 'call_1234567890',
      type: 'function' as const,
      function: {
        name: 'create_note',
        arguments: JSON.stringify({
          source_title: 'Ma note de test',
          notebook_id: 'classeur-123',
          content: 'Contenu de la note'
        }, null, 2)
      }
    }]
  };

  // Exemple de message tool avec résultat
  const toolResultMessage = {
    id: '2',
    role: 'tool' as const,
    content: JSON.stringify({
      success: true,
      note: {
        id: 'note-456',
        title: 'Ma note de test',
        slug: 'ma-note-de-test',
        created_at: new Date().toISOString()
      }
    }, null, 2),
    timestamp: new Date().toISOString(),
    tool_call_id: 'call_1234567890'
  };

  // Exemple de message utilisateur normal
  const userMessage = {
    id: '3',
    role: 'user' as const,
    content: 'Peux-tu créer une note pour moi ?',
    timestamp: new Date().toISOString()
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1 style={{ color: '#ececf1', marginBottom: '30px' }}>
        Test d'affichage des Tool Calls - Style ChatGPT
      </h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#ececf1', marginBottom: '20px' }}>Message Utilisateur</h2>
        <ChatMessage
          content={userMessage.content}
          role={userMessage.role}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#ececf1', marginBottom: '20px' }}>Message Assistant avec Tool Call</h2>
        <ChatMessage
          content={assistantMessageWithToolCall.content}
          role={assistantMessageWithToolCall.role}
          tool_calls={assistantMessageWithToolCall.tool_calls}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#ececf1', marginBottom: '20px' }}>Résultat du Tool Call</h2>
        <ChatMessage
          content={toolResultMessage.content}
          role={toolResultMessage.role}
          tool_call_id={toolResultMessage.tool_call_id}
        />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#ececf1', marginBottom: '20px' }}>Message Assistant avec Contenu</h2>
        <ChatMessage
          content="Parfait ! J'ai créé la note 'Ma note de test' dans votre classeur. La note a été créée avec succès et est maintenant disponible."
          role="assistant"
        />
      </div>
    </div>
  );
};

export default ToolCallExample; 