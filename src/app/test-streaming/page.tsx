'use client';

import { useState } from 'react';

export default function TestStreaming() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testStreaming = async () => {
    setLoading(true);
    setResponse('');

    try {
      // Test direct DeepSeek sans authentification
      const payload = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system' as const,
            content: 'Tu es un assistant utile.'
          },
          {
            role: 'user' as const,
            content: message
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 100
      };

      console.log('Test streaming DeepSeek...');
      
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-eddfc67e7ee448e3b6761f129b727b39'}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Pas de body de réponse pour le streaming');
      }

      const decoder = new TextDecoder();
      let fullResponse = '';

      console.log('Début du streaming...');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.choices && data.choices[0]?.delta?.content) {
                const token = data.choices[0].delta.content;
                fullResponse += token;
                setResponse(fullResponse);
                console.log('Token reçu:', token);
              } else if (data.choices && data.choices[0]?.finish_reason) {
                console.log('Streaming terminé');
                break;
              }
            } catch (e) {
              console.warn('Erreur parsing SSE:', e);
            }
          }
        }
      }

      console.log('Réponse complète:', fullResponse);

    } catch (error) {
      console.error('Erreur:', error);
      setResponse(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test Streaming DeepSeek</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Entrez votre message..."
          style={{ width: '100%', height: '100px', padding: '10px' }}
        />
      </div>
      
      <button 
        onClick={testStreaming}
        disabled={loading || !message}
        style={{ padding: '10px 20px', marginBottom: '20px' }}
      >
        {loading ? 'Streaming...' : 'Tester Streaming'}
      </button>
      
      {response && (
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
          <h3>Réponse (streaming):</h3>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{response}</pre>
        </div>
      )}
    </div>
  );
} 