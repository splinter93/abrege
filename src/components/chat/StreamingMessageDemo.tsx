'use client';

import React, { useState } from 'react';
import StreamingMessage from './StreamingMessage';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import './StreamingLineByLine.css';

export const StreamingMessageDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'user-1',
      role: 'user',
      content: 'Peux-tu m\'expliquer comment fonctionne le streaming ligne par ligne ?',
      timestamp: new Date(Date.now() - 30000).toISOString()
    }
  ]);

  const [lineDelay, setLineDelay] = useState<number>(600);
  const [isAddingMessage, setIsAddingMessage] = useState<boolean>(false);

  const demoResponses = [
    {
      id: 'assistant-1',
      content: `# Explication du Streaming Ligne par Ligne

Le streaming ligne par ligne est une technique d'affichage qui améliore l'expérience utilisateur en ralentissant l'apparition du contenu généré par le LLM.

## Comment ça fonctionne

- **Division du contenu** : Le texte est divisé en lignes individuelles
- **Affichage progressif** : Chaque ligne apparaît avec un délai configurable
- **Animation fluide** : Utilisation de Framer Motion pour les transitions

## Avantages

1. **Meilleure lisibilité** : L'utilisateur peut lire à son rythme
2. **Expérience naturelle** : Simule une frappe humaine
3. **Contrôle de la vitesse** : Délai ajustable selon le contexte

## Configuration recommandée

- **Messages courts** : 400-600ms
- **Messages moyens** : 600-800ms  
- **Messages longs** : 800-1200ms

---

*Cette réponse démontre l'effet de streaming ligne par ligne.*`,
      reasoning: 'Explication détaillée du concept avec exemples concrets et recommandations d\'usage.'
    },
    {
      id: 'assistant-2',
      content: `## Implémentation technique

Le composant \`StreamingLineByLine\` utilise plusieurs techniques avancées :

\`\`\`typescript
interface StreamingLineByLineProps {
  content: string;
  lineDelay?: number; // Délai entre chaque ligne
  onComplete?: () => void;
}
\`\`\`

### Fonctionnalités clés

- **Gestion d'état** : Suivi de l'avancement du streaming
- **Animations** : Transitions fluides avec Framer Motion
- **Responsive** : Adaptation à tous les écrans
- **Accessibilité** : Support des lecteurs d'écran

### Performance

- **Optimisation** : Pas de re-renders inutiles
- **Cleanup** : Gestion propre des timeouts
- **Mémoire** : Pas de fuites mémoire

---

*Détails techniques pour les développeurs.*`,
      reasoning: 'Focus sur l\'aspect technique et l\'implémentation pour les développeurs.'
    },
    {
      id: 'assistant-3',
      content: `## Cas d'usage dans le chat

### Intégration avec le système existant

Le composant \`StreamingMessage\` peut remplacer facilement l'affichage instantané des messages assistant :

1. **Remplacement direct** : Remplacer \`ChatMessage\` par \`StreamingMessage\`
2. **Configuration** : Ajuster le délai selon le contexte
3. **Fallback** : Retour à l'affichage statique si nécessaire

### Personnalisation

- **Délais adaptatifs** : Ajustement automatique selon la longueur
- **Thèmes** : Intégration avec le système de design
- **Animations** : Transitions personnalisables

### Tests et validation

- **Composant de démo** : Interface de test interactive
- **Différents contenus** : Messages courts, moyens et longs
- **Paramètres** : Ajustement en temps réel du délai

---

*Guide d\'intégration pratique.*`,
      reasoning: 'Explication de l\'intégration et de la personnalisation dans le système existant.'
    }
  ];

  const addDemoMessage = (responseIndex: number) => {
    if (isAddingMessage) return;
    
    setIsAddingMessage(true);
    const response = demoResponses[responseIndex];
    
    const newMessage: ChatMessageType = {
      ...response,
      role: 'assistant',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Réactiver après un délai
    setTimeout(() => setIsAddingMessage(false), 1000);
  };

  const clearMessages = () => {
    setMessages([messages[0]]); // Garder seulement le message utilisateur
  };

  return (
    <div className="streaming-message-demo">
      <div className="demo-header">
        <h1>💬 Démonstration StreamingMessage</h1>
        <p>Testez l'intégration du streaming ligne par ligne dans un contexte de chat</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <label>Délai entre lignes : {lineDelay}ms</label>
          <input
            type="range"
            min="300"
            max="1500"
            step="100"
            value={lineDelay}
            onChange={(e) => setLineDelay(Number(e.target.value))}
            className="delay-slider"
          />
        </div>

        <div className="control-group">
          <label>Ajouter des messages de démonstration :</label>
          <div className="demo-buttons">
            {demoResponses.map((_, index) => (
              <button
                key={index}
                onClick={() => addDemoMessage(index)}
                disabled={isAddingMessage}
                className="add-message-button"
              >
                Message {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <button onClick={clearMessages} className="clear-button">
            🗑️ Effacer les messages
          </button>
        </div>
      </div>

      <div className="chat-simulation">
        <h3>Simulation de chat :</h3>
        
        <div className="chat-messages">
          {messages.map((message) => (
            <StreamingMessage
              key={message.id}
              message={message}
              lineDelay={lineDelay}
              onComplete={() => console.log(`Message ${message.id} terminé`)}
            />
          ))}
        </div>

        {messages.length === 1 && (
          <div className="empty-chat">
            <p>Cliquez sur "Message 1", "Message 2" ou "Message 3" pour voir l'effet de streaming</p>
          </div>
        )}
      </div>

      <div className="demo-info">
        <h4>ℹ️ Informations sur la démonstration</h4>
        <ul>
          <li><strong>Messages affichés :</strong> {messages.length - 1} réponse(s) assistant</li>
          <li><strong>Délai actuel :</strong> {lineDelay}ms entre chaque ligne</li>
          <li><strong>Statut :</strong> {isAddingMessage ? 'Ajout en cours...' : 'Prêt'}</li>
          <li><strong>Intégration :</strong> Ce composant peut remplacer ChatMessage dans le chat existant</li>
        </ul>
      </div>
    </div>
  );
};

export default StreamingMessageDemo; 