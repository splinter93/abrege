'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const ToolCallWorkflowDemo: React.FC = () => {
  const [workflowStep, setWorkflowStep] = useState<'initial' | 'tool_calls' | 'tool_results' | 'llm_response'>('initial');

  const simulateWorkflow = () => {
    setWorkflowStep('initial');
    
    // Simuler l'exécution des tool calls
    setTimeout(() => setWorkflowStep('tool_calls'), 1000);
    
    // Simuler la réception des résultats
    setTimeout(() => setWorkflowStep('tool_results'), 3000);
    
    // Simuler la relance du LLM et sa réponse
    setTimeout(() => setWorkflowStep('llm_response'), 5000);
  };

  const resetWorkflow = () => {
    setWorkflowStep('initial');
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '30px' }}
      >
        <h2>🔄 Workflow Tool Calls avec Relance Automatique</h2>
        <p style={{ color: '#666' }}>
          Démonstration du processus complet : Tool Calls → Résultats → Relance LLM → Réponse finale
        </p>
      </motion.div>

      {/* Contrôles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ textAlign: 'center', marginBottom: '30px' }}
      >
        <button
          onClick={simulateWorkflow}
          disabled={workflowStep !== 'initial'}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            background: workflowStep === 'initial' ? '#007bff' : '#ccc',
            color: '#fff',
            cursor: workflowStep === 'initial' ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold',
            marginRight: '10px'
          }}
        >
          🚀 Démarrer Workflow
        </button>
        
        <button
          onClick={resetWorkflow}
          style={{
            padding: '12px 24px',
            border: '1px solid #dc3545',
            borderRadius: '8px',
            background: '#fff',
            color: '#dc3545',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Réinitialiser
        </button>
      </motion.div>

      {/* Workflow Steps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        {[
          { key: 'initial', label: '1. Message Utilisateur', icon: '💬' },
          { key: 'tool_calls', label: '2. Tool Calls', icon: '🔧' },
          { key: 'tool_results', label: '3. Résultats Tools', icon: '✅' },
          { key: 'llm_response', label: '4. Réponse LLM', icon: '🤖' }
        ].map((step, index) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: workflowStep === step.key || 
                      (workflowStep === 'tool_calls' && index <= 1) ||
                      (workflowStep === 'tool_results' && index <= 2) ||
                      (workflowStep === 'llm_response' && index <= 3) ? 1 : 0.3,
              scale: workflowStep === step.key ? 1.1 : 0.8
            }}
            transition={{ duration: 0.5 }}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '15px',
              background: workflowStep === step.key ? '#e3f2fd' : '#f5f5f5',
              borderRadius: '8px',
              margin: '0 5px',
              border: workflowStep === step.key ? '2px solid #2196f3' : '1px solid #ddd'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{step.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{step.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Détails du workflow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e9ecef'
        }}
      >
        <h3 style={{ color: '#495057', marginBottom: '15px' }}>📋 Détails du Workflow</h3>
        
        {workflowStep === 'initial' && (
          <div style={{ color: '#6c757d' }}>
            <p><strong>Étape 1 :</strong> L'utilisateur envoie un message (ex: "Liste mes classeurs")</p>
            <p><strong>Prochain :</strong> Le LLM analyse et génère des tool calls</p>
          </div>
        )}
        
        {workflowStep === 'tool_calls' && (
          <div style={{ color: '#6c757d' }}>
            <p><strong>Étape 2 :</strong> Le LLM génère des tool calls (ex: get_notebooks)</p>
            <p><strong>Action :</strong> Les tools sont exécutés en parallèle</p>
            <p><strong>Prochain :</strong> Attente des résultats des tools</p>
          </div>
        )}
        
        {workflowStep === 'tool_results' && (
          <div style={{ color: '#6c757d' }}>
            <p><strong>Étape 3 :</strong> Tous les tool calls sont terminés</p>
            <p><strong>Action :</strong> Déclenchement automatique de la relance du LLM</p>
            <p><strong>Prochain :</strong> Le LLM génère sa réponse finale</p>
          </div>
        )}
        
        {workflowStep === 'llm_response' && (
          <div style={{ color: '#6c757d' }}>
            <p><strong>Étape 4 :</strong> Le LLM génère sa réponse finale</p>
            <p><strong>Contenu :</strong> Réponse basée sur les résultats des tools</p>
            <p><strong>Résultat :</strong> Workflow complet terminé avec succès !</p>
          </div>
        )}
      </motion.div>

      {/* Code d'exemple */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          marginTop: '20px',
          background: '#2d3748',
          borderRadius: '8px',
          padding: '20px',
          color: '#e2e8f0'
        }}
      >
        <h4 style={{ color: '#90cdf4', marginBottom: '15px' }}>💻 Code d'implémentation</h4>
        <pre style={{ fontSize: '12px', lineHeight: '1.4', overflow: 'auto' }}>
{`// Hook useChatResponse avec relance automatique
onToolExecutionComplete: async (toolResults) => {
  // Tous les tool calls terminés
  // Relance automatique du LLM
  await sendMessage(
    'Génère une réponse finale basée sur les résultats des outils exécutés.',
    sessionId,
    contextWithToolResults,
    history
  );
}

// Workflow automatique :
// 1. Tool calls → 2. Exécution → 3. Relance LLM → 4. Réponse finale`}
        </pre>
      </motion.div>
    </div>
  );
}; 