'use client';
import React, { useState } from 'react';
import ChatMessageOptimized from './ChatMessageOptimized';
import { ChatMessage } from '@/types/chat';

/**
 * Composant de démonstration pour tester les bulles de chat
 * Affiche différents types de messages avec leurs styles
 */
const ChatBubblesDemo: React.FC = () => {
  const [showToolCalls, setShowToolCalls] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // Messages de démonstration
  const demoMessages: ChatMessage[] = [
    {
      id: 'demo-user-1',
      role: 'user',
      content: 'Bonjour ! Pouvez-vous m\'aider à créer une note sur les technologies web modernes ?',
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-assistant-1',
      role: 'assistant',
      content: `Bien sûr ! Je vais vous aider à créer une note sur les technologies web modernes.

## 🚀 Technologies Web Modernes

### **Frontend**
- **React** : Bibliothèque UI déclarative
- **Vue.js** : Framework progressif
- **Angular** : Framework complet TypeScript

### **Backend**
- **Node.js** : Runtime JavaScript
- **Python** : Django, FastAPI
- **Go** : Performance et simplicité

### **Base de données**
- **PostgreSQL** : Relationnel robuste
- **MongoDB** : Document NoSQL
- **Redis** : Cache en mémoire

Voulez-vous que je crée cette note pour vous ?`,
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-user-2',
      role: 'user',
      content: 'Oui, créez-la dans mon notebook "Technologies"',
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-assistant-2',
      role: 'assistant',
      content: null,
      tool_calls: showToolCalls ? [
        {
          id: 'call_123',
          type: 'function',
          function: {
            name: 'create_note',
            arguments: JSON.stringify({
              notebook_id: 'technologies',
              title: 'Technologies Web Modernes',
              markdown_content: '# Technologies Web Modernes...'
            })
          }
        }
      ] : undefined,
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-tool-1',
      role: 'tool',
      tool_call_id: 'call_123',
      name: 'create_note',
      content: JSON.stringify({
        success: true,
        note_id: 'note_456',
        message: 'Note créée avec succès'
      }),
      timestamp: new Date().toISOString()
    },
    {
      id: 'demo-assistant-3',
      role: 'assistant',
      content: 'Parfait ! J\'ai créé la note "Technologies Web Modernes" dans votre notebook. Elle contient toutes les informations sur les technologies modernes du web.',
      reasoning: showReasoning ? `L'utilisateur a demandé de créer une note sur les technologies web modernes. 
J'ai d'abord présenté un aperçu des technologies, puis l'utilisateur a confirmé vouloir la note créée.
J'ai utilisé l'outil create_note pour créer la note dans le notebook "technologies".
L'outil a retourné un succès, donc je confirme la création à l'utilisateur.` : undefined,
      timestamp: new Date().toISOString()
    }
  ];

  return (
    <div className="chat-bubbles-demo">
      {/* Header de démonstration */}
      <div className="demo-header">
        <h1>🧪 Démonstration des Bulles de Chat</h1>
        <p>Testez différents types de messages et leurs styles</p>
        
        {/* Contrôles de démonstration */}
        <div className="demo-controls">
          <label className="demo-control">
            <input
              type="checkbox"
              checked={showToolCalls}
              onChange={(e) => setShowToolCalls(e.target.checked)}
            />
            Afficher les Tool Calls
          </label>
          
          <label className="demo-control">
            <input
              type="checkbox"
              checked={showReasoning}
              onChange={(e) => setShowReasoning(e.target.checked)}
            />
            Afficher le Reasoning
          </label>
        </div>
      </div>

      {/* Zone de chat de démonstration */}
      <div className="demo-chat-area">
        <div className="demo-messages">
          {demoMessages.map((message) => (
            <ChatMessageOptimized
              key={message.id}
              message={message}
              animateContent={false}
            />
          ))}
        </div>
      </div>

      {/* Informations sur les styles */}
      <div className="demo-info">
        <h3>📋 Types de Messages Supportés</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-icon">👤</div>
            <div className="info-content">
              <h4>Messages Utilisateur</h4>
              <p>Bulles grises modernes, alignées à droite</p>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">🤖</div>
            <div className="info-content">
              <h4>Messages Assistant</h4>
              <p>Bulles transparentes sans bordure, alignées à gauche</p>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">🔧</div>
            <div className="info-content">
              <h4>Tool Calls</h4>
              <p>Messages avec appels d'outils (création de notes, etc.)</p>
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-icon">🧠</div>
            <div className="info-content">
              <h4>Reasoning</h4>
              <p>Processus de pensée du modèle (optionnel)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles de démonstration */}
      <style jsx>{`
        .chat-bubbles-demo {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #0f0f23;
          min-height: 100vh;
          color: #e5e7eb;
        }
        
        .demo-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .demo-header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: #ffffff;
        }
        
        .demo-header p {
          margin: 0 0 20px 0;
          opacity: 0.8;
          font-size: 16px;
        }
        
        .demo-controls {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .demo-control {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        
        .demo-control:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .demo-control input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #667eea;
        }
        
        .demo-chat-area {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 40px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .demo-messages {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .demo-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .demo-info h3 {
          margin: 0 0 20px 0;
          text-align: center;
          color: #ffffff;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .info-icon {
          font-size: 24px;
          flex-shrink: 0;
        }
        
        .info-content h4 {
          margin: 0 0 8px 0;
          color: #ffffff;
          font-size: 16px;
        }
        
        .info-content p {
          margin: 0;
          opacity: 0.8;
          font-size: 14px;
          line-height: 1.4;
        }
        
        @media (max-width: 768px) {
          .chat-bubbles-demo {
            padding: 15px;
          }
          
          .demo-header {
            padding: 20px;
          }
          
          .demo-header h1 {
            font-size: 24px;
          }
          
          .demo-controls {
            flex-direction: column;
            align-items: center;
          }
          
          .demo-chat-area {
            padding: 20px;
          }
          
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatBubblesDemo; 