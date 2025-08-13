'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { ToolCallTest } from './ToolCallTest';
import { ToolCallWorkflowDemo } from './ToolCallWorkflowDemo';

export const AnimatedMessageDemo: React.FC = () => {
  const [demoMessage, setDemoMessage] = useState<ChatMessageType>({
    id: 'demo-1',
    role: 'assistant',
    content: '# Bonjour ! 👋\n\nCeci est un **message de démonstration** avec du markdown.\n\n## Fonctionnalités :\n- ✅ Animation fluide\n- ✅ Markdown rendu\n- ✅ Vitesse optimisée\n- ✅ Pas de doublons\n\n```javascript\nconsole.log("Code avec coloration syntaxique");\n```\n\n> Citation importante : "La simplicité est la sophistication ultime."',
    timestamp: new Date().toISOString(),
    reasoning: '🧠 Raisonnement : Ce message démontre les capacités du nouveau système d\'animation intégré.'
  });

  const [animateContent, setAnimateContent] = useState(false);
  const [messageType, setMessageType] = useState<'simple' | 'complex' | 'tool'>('simple');

  const updateDemoMessage = (type: 'simple' | 'complex' | 'tool') => {
    setMessageType(type);
    setAnimateContent(false);
    
    const messages = {
      simple: {
        id: 'demo-1',
        role: 'assistant' as const,
        content: 'Ceci est un message simple et court pour tester l\'animation.',
        timestamp: new Date().toISOString(),
        reasoning: '🧠 Raisonnement : Message simple pour test.'
      },
      complex: {
        id: 'demo-2',
        role: 'assistant' as const,
        content: `# Message Complexe 📚

Ce message contient du **markdown riche** avec plusieurs éléments :

## Liste des fonctionnalités
- ✅ **Gras** et *italique*
- ✅ \`Code inline\`
- ✅ [Liens](https://example.com)
- ✅ > Citations
- ✅ Tables

| Fonctionnalité | Statut | Note |
|----------------|--------|------|
| Animation | ✅ | Fluide |
| Markdown | ✅ | Complet |
| Performance | ✅ | Optimisée |

\`\`\`typescript
interface Message {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}
\`\`\`

> **Note importante** : Ce système est maintenant intégré directement dans ChatMessage !`,
        timestamp: new Date().toISOString(),
        reasoning: '🧠 Raisonnement : Message complexe avec markdown riche pour démontrer toutes les capacités.'
      },
      tool: {
        id: 'demo-3',
        role: 'assistant' as const,
        content: 'Je vais exécuter quelques outils pour vous aider.',
        timestamp: new Date().toISOString(),
        reasoning: '🧠 Raisonnement : Préparation de l\'exécution d\'outils.',
        tool_calls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: {
              name: 'search_notes',
              arguments: JSON.stringify({ query: 'démontration' })
            }
          },
          {
            id: 'call_2',
            type: 'function' as const,
            function: {
              name: 'create_note',
              arguments: JSON.stringify({ title: 'Test Tool Call', content: 'Contenu de test' })
            }
          }
        ]
      }
    };

    setDemoMessage(messages[type]);
  };

  const toggleAnimation = () => {
    setAnimateContent(!animateContent);
  };

  return (
    <div className="animated-message-demo" style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: '30px' }}
      >
        <h1 style={{ color: '#333', marginBottom: '10px' }}>
          🎬 Démonstration Framer Motion Intégré
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Test du nouveau système d'animation intégré dans ChatMessage
        </p>
      </motion.div>

      {/* Contrôles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <button
          onClick={() => updateDemoMessage('simple')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: messageType === 'simple' ? '#007bff' : '#fff',
            color: messageType === 'simple' ? '#fff' : '#333',
            cursor: 'pointer'
          }}
        >
          Message Simple
        </button>
        
        <button
          onClick={() => updateDemoMessage('complex')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: messageType === 'complex' ? '#007bff' : '#fff',
            color: messageType === 'complex' ? '#fff' : '#333',
            cursor: 'pointer'
          }}
        >
          Message Complexe
        </button>
        
        <button
          onClick={() => updateDemoMessage('tool')}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: messageType === 'tool' ? '#007bff' : '#fff',
            color: messageType === 'tool' ? '#fff' : '#333',
            cursor: 'pointer'
          }}
        >
          Avec Tool Calls
        </button>
      </motion.div>

      {/* Toggle Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', marginBottom: '20px' }}
      >
        <button
          onClick={toggleAnimation}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px',
            background: animateContent ? '#28a745' : '#dc3545',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {animateContent ? '🔄 Animation Active' : '▶️ Démarrer Animation'}
        </button>
      </motion.div>

      {/* Message de démonstration */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        style={{ 
          border: '1px solid #e0e0e0', 
          borderRadius: '12px',
          padding: '20px',
          background: '#fafafa'
        }}
      >
        <ChatMessage 
          message={demoMessage} 
          animateContent={animateContent}
        />
      </motion.div>

      {/* Informations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          marginTop: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}
      >
        <h3 style={{ color: '#495057', marginBottom: '15px' }}>ℹ️ Informations techniques</h3>
                 <ul style={{ color: '#6c757d', lineHeight: '1.6' }}>
           <li><strong>Animation intégrée :</strong> Plus de composants séparés, tout est dans ChatMessage</li>
           <li><strong>Vitesse optimisée :</strong> 80 caractères/seconde (au lieu de 50)</li>
           <li><strong>Markdown complet :</strong> Rendu avec EnhancedMarkdownMessage</li>
           <li><strong>Tool calls :</strong> Support complet des appels d'outils</li>
           <li><strong>Pas de doublons :</strong> Un seul message affiché à la fois</li>
         </ul>
       </motion.div>

       {/* Test des Tool Calls */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.6 }}
         style={{
           marginTop: '30px',
           padding: '20px',
           background: '#fff',
           borderRadius: '8px',
           border: '1px solid #e9ecef'
         }}
       >
         <ToolCallTest />
       </motion.div>

       {/* Démonstration du Workflow Tool Calls */}
       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.7 }}
         style={{
           marginTop: '30px',
           padding: '20px',
           background: '#fff',
           borderRadius: '8px',
           border: '1px solid #e9ecef'
         }}
       >
         <ToolCallWorkflowDemo />
       </motion.div>
     </div>
   );
 };

export default AnimatedMessageDemo; 