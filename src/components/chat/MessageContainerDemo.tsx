'use client';
import React from 'react';
import MessageContainer from './MessageContainer';
import { ChatMessage } from '@/types/chat';

const MessageContainerDemo: React.FC = () => {
  // Message utilisateur de démonstration
  const userMessage: ChatMessage = {
    id: 'demo-user-1',
    role: 'user',
    content: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ? J\'ai plusieurs questions sur le développement et j\'aimerais comprendre comment optimiser mon code.',
    timestamp: new Date().toISOString()
  };

  // Message assistant de démonstration
  const assistantMessage: ChatMessage = {
    id: 'demo-assistant-1',
    role: 'assistant',
    content: 'Salut ! Je suis ravi de vous aider. Je peux répondre à vos questions, vous aider avec du code, ou discuter de n\'importe quel sujet. Que souhaitez-vous faire ?',
    timestamp: new Date().toISOString()
  };

  return (
    <div className="message-container-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Démonstration du MessageContainer</h2>
      <p>Voici comment le nouveau MessageContainer organise les messages avec leurs boutons :</p>
      
      {/* Message utilisateur */}
      <MessageContainer
        message={userMessage}
        role="user"
        className="demo-message"
      >
        <div className="chat-message-bubble chat-message-bubble-user">
          <div className="message-content">
            {userMessage.content}
          </div>
        </div>
      </MessageContainer>

      {/* Message assistant */}
      <MessageContainer
        message={assistantMessage}
        role="assistant"
        className="demo-message"
      >
        <div className="chat-message-bubble chat-message-bubble-assistant">
          <div className="message-content">
            {assistantMessage.content}
          </div>
        </div>
      </MessageContainer>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Différence des boutons par rôle :</h3>
        <ul>
          <li>✅ <strong>Message utilisateur :</strong> Bouton copier + bouton édition</li>
          <li>✅ <strong>Message assistant :</strong> Bouton copier uniquement</li>
          <li>✅ <strong>Container organisé :</strong> Chaque message a son propre container</li>
          <li>✅ <strong>Boutons bien positionnés :</strong> Les boutons sont automatiquement placés sous chaque bulle</li>
          <li>✅ <strong>Structure cohérente :</strong> Même organisation pour tous les types de messages</li>
          <li>✅ <strong>Responsive :</strong> S'adapte automatiquement à la taille de l'écran</li>
          <li>✅ <strong>Animations :</strong> Chaque container a ses propres animations</li>
        </ul>
      </div>
    </div>
  );
};

export default MessageContainerDemo; 