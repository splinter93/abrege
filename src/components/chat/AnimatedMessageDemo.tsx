'use client';

import React, { useState } from 'react';
import { AnimatedMessage } from './AnimatedMessage';
import { AnimatedReasoning } from './AnimatedReasoning';

export const AnimatedMessageDemo: React.FC = () => {
  const [showMessage, setShowMessage] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [messageContent, setMessageContent] = useState('Ceci est un message de test pour démontrer l\'animation Framer Motion. Il s\'affiche caractère par caractère avec un effet de frappe fluide.');
  const [reasoningContent, setReasoningContent] = useState('Voici un exemple de raisonnement qui s\'affiche plus lentement que le message principal, permettant à l\'utilisateur de suivre le processus de pensée étape par étape.');

  return (
    <div className="animated-message-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🎬 Démonstration Framer Motion</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Message animé</h3>
        <button 
          onClick={() => setShowMessage(!showMessage)}
          style={{ 
            padding: '10px 20px', 
            marginBottom: '10px',
            backgroundColor: showMessage ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {showMessage ? 'Masquer' : 'Afficher'} le message
        </button>
        
        {showMessage && (
          <AnimatedMessage
            content={messageContent}
            speed={50}
            onComplete={() => console.log('Message animation terminée')}
          />
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Raisonnement animé</h3>
        <button 
          onClick={() => setShowReasoning(!showReasoning)}
          style={{ 
            padding: '10px 20px', 
            marginBottom: '10px',
            backgroundColor: showReasoning ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {showReasoning ? 'Masquer' : 'Afficher'} le raisonnement
        </button>
        
        {showReasoning && (
          <AnimatedReasoning
            reasoning={reasoningContent}
            speed={30}
            onComplete={() => console.log('Reasoning animation terminée')}
          />
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Contrôles</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setMessageContent('Message court.')}
            style={{ padding: '8px 16px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Message court
          </button>
          <button 
            onClick={() => setMessageContent('Ceci est un message de test pour démontrer l\'animation Framer Motion. Il s\'affiche caractère par caractère avec un effet de frappe fluide.')}
            style={{ padding: '8px 16px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Message long
          </button>
          <button 
            onClick={() => setReasoningContent('Raisonnement court.')}
            style={{ padding: '8px 16px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Raisonnement court
          </button>
          <button 
            onClick={() => setReasoningContent('Voici un exemple de raisonnement qui s\'affiche plus lentement que le message principal, permettant à l\'utilisateur de suivre le processus de pensée étape par étape.')}
            style={{ padding: '8px 16px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Raisonnement long
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '5px', 
        border: '1px solid #dee2e6' 
      }}>
        <h4>📋 Instructions de test :</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Cliquez sur "Afficher le message" pour voir l'animation du message</li>
          <li>Cliquez sur "Afficher le raisonnement" pour voir l'animation du raisonnement</li>
          <li>Utilisez les boutons de contrôle pour changer la longueur du contenu</li>
          <li>Observez la fluidité des animations et la vitesse d'affichage</li>
          <li>Vérifiez que le curseur de frappe clignote pendant l'animation</li>
        </ul>
      </div>
    </div>
  );
}; 