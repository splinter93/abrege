'use client';

import React, { memo } from 'react';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import './ChatMessage.css';

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatMessageProps {
  content: string | null;
  role: 'user' | 'assistant' | 'system' | 'tool';
  isStreaming?: boolean;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

const ChatMessage = memo<ChatMessageProps>(({ 
  content, 
  role, 
  isStreaming = false, 
  tool_calls,
  tool_call_id 
}) => {
  const { html } = useMarkdownRender({ content: content || '' });

  // Rendu des tool calls (style ChatGPT)
  const renderToolCalls = () => {
    if (!tool_calls || tool_calls.length === 0) return null;

    return (
      <div className="chat-tool-calls">
        {tool_calls.map((toolCall, index) => (
          <div key={toolCall.id} className="chat-tool-call">
            <div className="chat-tool-call-header">
              <div className="chat-tool-call-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="chat-tool-call-info">
                <span className="chat-tool-call-name">{toolCall.function.name}</span>
                <span className="chat-tool-call-status">En cours d'exécution...</span>
              </div>
            </div>
            <div className="chat-tool-call-arguments">
              <div className="chat-tool-call-arguments-header">
                <span>Arguments</span>
              </div>
              <pre className="chat-tool-call-arguments-content">
                {JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Rendu du résultat de tool call
  const renderToolResult = () => {
    if (role !== 'tool' || !tool_call_id) return null;

    return (
      <div className="chat-tool-result">
        <div className="chat-tool-result-header">
          <div className="chat-tool-result-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="chat-tool-result-info">
            <span className="chat-tool-result-label">Résultat</span>
            <span className="chat-tool-result-status">Terminé</span>
          </div>
        </div>
        <div className="chat-tool-result-content">
          <div className="chat-tool-result-content-header">
            <span>Données retournées</span>
          </div>
          <pre className="chat-tool-result-content-data">
            {content}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className={`chat-message chat-message-${role}`}>
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        {/* Contenu markdown normal (pas pour les messages tool) */}
        {content && role !== 'tool' && (
          <div 
            className="chat-markdown"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        
        {/* Tool calls (style ChatGPT) */}
        {renderToolCalls()}
        
        {/* Résultat de tool call */}
        {renderToolResult()}
        
        {/* Indicateur de frappe */}
        {isStreaming && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage; 