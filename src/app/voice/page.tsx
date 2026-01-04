'use client';

import { useState } from 'react';
import { XAIVoiceChat } from '@/components/voice/XAIVoiceChat';
import { VoiceConfigPanel } from '@/components/voice/VoiceConfigPanel';
import type { XAIVoiceTool } from '@/services/xai/types';

/**
 * Page de test pour XAI Voice
 * 
 * URL: /voice
 */
export default function VoicePage() {
  const [config, setConfig] = useState<{
    instructions: string;
    tools: XAIVoiceTool[];
    tool_choice: 'auto' | 'none' | 'required';
  }>({
    instructions: 'You are a helpful AI assistant. Respond naturally and concisely.',
    tools: [],
    tool_choice: 'auto'
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      backgroundColor: '#131313',
      color: '#e5e5e5'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: '#e5e5e5'
        }}>
          XAI Voice Chat - Test
        </h1>
        <p style={{ 
          color: '#a3a3a3', 
          marginBottom: '2rem',
          lineHeight: 1.6
        }}>
          Testez la fonctionnalité de conversation vocale avec XAI Grok Voice Agent API.
          Configurez les instructions et tools ci-dessous, puis cliquez sur le bouton pour commencer à parler.
        </p>
        <VoiceConfigPanel onConfigChange={setConfig} />
        <XAIVoiceChat 
          voice="Ara"
          instructions={config.instructions}
          tools={config.tools}
          tool_choice={config.tool_choice}
        />
      </div>
    </div>
  );
}
