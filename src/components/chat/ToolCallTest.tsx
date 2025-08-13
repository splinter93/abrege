'use client';

import React from 'react';
import ToolCallMessage from './ToolCallMessage';

export const ToolCallTest: React.FC = () => {
  const testToolCalls = [
    {
      id: 'call_1',
      type: 'function' as const,
      function: {
        name: 'search_notes',
        arguments: JSON.stringify({ query: 'test' })
      }
    }
  ];

  const testToolResults = [
    {
      tool_call_id: 'call_1',
      name: 'search_notes',
      content: JSON.stringify({ 
        success: true, 
        results: ['Note 1', 'Note 2'],
        count: 2
      }),
      success: true
    }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🧪 Test Tool Calls</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Tool Calls avec résultats</h3>
        <ToolCallMessage 
          toolCalls={testToolCalls}
          toolResults={testToolResults}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Tool Calls sans résultats (pending)</h3>
        <ToolCallMessage 
          toolCalls={testToolCalls}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Tool Calls avec erreur</h3>
        <ToolCallMessage 
          toolCalls={testToolCalls}
          toolResults={[
            {
              tool_call_id: 'call_1',
              name: 'search_notes',
              content: JSON.stringify({ 
                success: false, 
                error: 'Erreur de test'
              }),
              success: false
            }
          ]}
        />
      </div>
    </div>
  );
}; 