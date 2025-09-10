/**
 * Composant HarmonyReasoningMessage - Affichage du raisonnement Harmony
 * Production-ready, format Harmony strict, zéro any
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HarmonyReasoningMessageProps {
  reasoning: string;
  channel?: 'analysis' | 'commentary' | 'final';
  model?: string;
  className?: string;
  showChannel?: boolean;
}

const HarmonyReasoningMessage: React.FC<HarmonyReasoningMessageProps> = ({ 
  reasoning, 
  channel = 'analysis',
  model,
  className = '',
  showChannel = true
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // 🐛 Debug pour Harmony
  console.log('[HarmonyReasoningMessage] 🎼 Rendu:', {
    channel,
    reasoning: reasoning?.substring(0, 50) + '...',
    hasReasoning: !!reasoning
  });

  if (!reasoning) return null;

  // Nettoyer le reasoning Harmony
  let cleanedReasoning = reasoning.trim();
  
  // Supprimer les tokens Harmony si présents - CORRECTION: Plus complet
  const harmonyTokens = [
    '<|start|>assistant<|channel|>analysis<|message|>',
    '<|start|>assistant<|channel|>commentary<|message|>',
    '<|start|>assistant<|channel|>final<|message|>',
    '<|start|>assistant<|message|>',
    '<|end|>',
    '<|start|>',
    '<|message|>',
    '<|channel|>',
    '<|return|>', // CORRECTION: Supprimer aussi ce token
    '<|analysis|>',
    '<|commentary|>',
    '<|final|>'
  ];
  
  for (const token of harmonyTokens) {
    cleanedReasoning = cleanedReasoning.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }
  
  // Nettoyer les marqueurs de reasoning génériques
  const reasoningMarkers = [
    'reasoning\n',
    'Reasoning:\n',
    'Raisonnement:\n',
    'Analysis:\n',
    'Analyse:\n'
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

  // Icônes par canal
  const channelIcons = {
    analysis: '🧠',
    commentary: '💭',
    final: '✨'
  };

  const channelLabels = {
    analysis: 'Analyse',
    commentary: 'Commentaire',
    final: 'Réponse finale'
  };

  const channelColors = {
    analysis: '#667eea',
    commentary: '#f093fb',
    final: '#4facfe'
  };

  return (
    <motion.div 
      className={`harmony-reasoning-message ${className}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="harmony-reasoning-header"
        style={{ borderLeftColor: channelColors[channel] }}
      >
        <div className="harmony-reasoning-title">
          <span className="harmony-reasoning-icon">{channelIcons[channel]}</span>
          {showChannel && (
            <span className="harmony-reasoning-channel">
              {channelLabels[channel]}
            </span>
          )}
          <span className="harmony-reasoning-label">Raisonnement</span>
        </div>
        
        <div className="harmony-reasoning-controls">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="harmony-reasoning-toggle"
            title={showRaw ? 'Voir formaté' : 'Voir brut'}
          >
            {showRaw ? '📝' : '🔍'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="harmony-reasoning-collapse"
            title={collapsed ? 'Développer' : 'Réduire'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="harmony-reasoning-content"
          >
            {showRaw ? (
              <pre className="harmony-reasoning-raw">
                {reasoning}
              </pre>
            ) : (
              <div className="harmony-reasoning-formatted">
                {formattedReasoning.split('\n').map((line, index) => (
                  <div key={index} className="harmony-reasoning-line">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HarmonyReasoningMessage;
