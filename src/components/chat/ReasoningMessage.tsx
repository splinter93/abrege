'use client';
import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';

interface ReasoningMessageProps {
  reasoning: string | null;
  model?: string;
  className?: string;
}

const ReasoningMessage: React.FC<ReasoningMessageProps> = ({ reasoning, model, className = '' }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  if (!reasoning) return null;

  // Détecter si c'est Qwen 3
  const isQwen3 = model?.includes('Qwen') || model?.includes('qwen');
  
  // Nettoyer le reasoning
  let cleanedReasoning = reasoning.trim();
  
  // Gestion spécifique des balises <think> et </think> de Qwen 3
  if (isQwen3) {
    const thinkMatch = cleanedReasoning.match(/<think>([\s\S]*?)<\/think>/);
    
    if (thinkMatch) {
      cleanedReasoning = thinkMatch[1].trim();
    } else {
      cleanedReasoning = cleanedReasoning
        .replace(/<think>/gi, '')
        .replace(/<\/think>/gi, '')
        .trim();
    }
  }
  
  // Nettoyer les marqueurs de reasoning pour les autres modèles
  const reasoningMarkers = [
    '<|im_start|>reasoning\n',
    '<|im_end|>\n',
    'reasoning\n',
    'Reasoning:\n',
    'Raisonnement:\n'
  ];
  
  for (const marker of reasoningMarkers) {
    if (cleanedReasoning.startsWith(marker)) {
      cleanedReasoning = cleanedReasoning.substring(marker.length);
    }
  }
  
  // Formater le reasoning
  const formattedReasoning = cleanedReasoning
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return (
    <div className={`reasoning-message ${className}`}>
      <button
        className="reasoning-header"
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={!collapsed}
      >
        <div className="reasoning-title-group">
          <svg className="reasoning-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 10h4v4h-4v-4zm-6-6h4v4h-4V4zm-6 6h4v4H6v-4z"/>
            <path d="M6 18h12M12 4v2M12 10v4M12 16v2"/>
          </svg>
          <span className="reasoning-title">Raisonnement</span>
        </div>
        <svg className="reasoning-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {!collapsed && (
        <div className="reasoning-content">
          <EnhancedMarkdownMessage content={formattedReasoning} />
        </div>
      )}
    </div>
  );
};

export default ReasoningMessage; 