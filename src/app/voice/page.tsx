'use client';

import { XAIVoiceChat } from '@/components/voice/XAIVoiceChat';

/**
 * Page de test pour XAI Voice
 * 
 * URL: /voice
 */
export default function VoicePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: '#1a1a1a'
        }}>
          XAI Voice Chat - Test
        </h1>
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>
          Testez la fonctionnalité de conversation vocale avec XAI Grok Voice Agent API.
          Cliquez sur le bouton pour commencer à parler.
        </p>
        <XAIVoiceChat 
          voice="Ara"
          instructions="You are a helpful AI assistant. Respond naturally and concisely."
        />
      </div>
    </div>
  );
}
