import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import { ChatMessage as ChatMessageType } from '@/types/chat';

export default function TestStreamingIntegrationPage() {
  const testMessages: ChatMessageType[] = [
    {
      id: 'user-1',
      role: 'user',
      content: 'Peux-tu m\'expliquer comment fonctionne le streaming ligne par ligne ?',
      timestamp: new Date(Date.now() - 30000).toISOString()
    },
    {
      id: 'assistant-1',
      role: 'assistant',
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
      timestamp: new Date(Date.now() - 20000).toISOString()
    },
    {
      id: 'assistant-2',
      role: 'assistant',
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
      timestamp: new Date(Date.now() - 10000).toISOString()
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Test d'intégration du Streaming
          </h1>
          <p className="text-lg text-gray-600">
            Testez l'intégration du streaming ligne par ligne dans ChatMessage
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Instructions :</strong> Cliquez sur l'icône ⚡ (FiZap) sous les messages assistant 
              pour ouvrir les paramètres de streaming. Ajustez la vitesse et observez l'effet !
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {testMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              className="test-message"
            />
          ))}
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ℹ️ Comment ça fonctionne
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>1. Intégration native :</strong> Le streaming est maintenant intégré directement dans 
              <code className="bg-gray-100 px-2 py-1 rounded">ChatMessage</code> sans casser l'existant.
            </p>
            <p>
              <strong>2. Contrôles dans le menu kebab :</strong> Cliquez sur l'icône ⚡ pour ouvrir les paramètres 
              de streaming avec un slider de vitesse et des options avancées.
            </p>
            <p>
              <strong>3. Préférences persistantes :</strong> Vos réglages sont sauvegardés localement et 
              appliqués automatiquement à tous les messages assistant.
            </p>
            <p>
              <strong>4. Ajustement automatique :</strong> La vitesse s'adapte automatiquement selon la 
              longueur du message pour une expérience optimale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 