import React from 'react';
import BubbleButtons from '../chat/BubbleButtons';
import '../chat/BubbleButtons.css';

const TestBubbleButtons: React.FC = () => {
  const sampleContent = `Voici un exemple de message avec du contenu markdown :

## Titre de section

- Point 1
- Point 2
- Point 3

\`\`\`javascript
console.log("Hello World!");
\`\`\`

Et du **texte en gras** et *en italique*.`;

  const handleCopy = () => {
    console.log('Message copié !');
  };

  const handleEdit = () => {
    console.log('Édition du message...');
  };

  return (
    <div style={{ 
      padding: '40px', 
      background: '#1a1a1a', 
      color: '#e5e7eb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ marginBottom: '40px', textAlign: 'center' }}>
        🧪 Test BubbleButtons - Version Simplifiée
      </h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Message utilisateur */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '24px' 
        }}>
          <div style={{
            background: '#2a2a2a',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '18px',
            borderBottomRightRadius: '6px',
            maxWidth: '60%',
            wordWrap: 'break-word'
          }}>
            Salut ! Peux-tu m'expliquer comment fonctionnent les nouveaux boutons ?
          </div>
        </div>

        {/* Message assistant avec boutons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          marginBottom: '24px' 
        }}>
          <div style={{ maxWidth: '1000px' }}>
            <div style={{
              background: 'transparent',
              color: '#e5e7eb',
              padding: '16px 0px 16px 20px',
              borderRadius: '18px',
              borderBottomLeftRadius: '6px',
              wordWrap: 'break-word'
            }}>
              {sampleContent}
            </div>
            
            {/* Boutons sous la bulle */}
            <BubbleButtons
              content={sampleContent}
              messageId="test-1"
              onCopy={handleCopy}
              onEdit={handleEdit}
            />
          </div>
        </div>

        {/* Message simple avec boutons */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          marginBottom: '24px' 
        }}>
          <div style={{ maxWidth: '1000px' }}>
            <div style={{
              background: 'transparent',
              color: '#e5e7eb',
              padding: '16px 0px 16px 20px',
              borderRadius: '18px',
              borderBottomLeftRadius: '6px',
              wordWrap: 'break-word'
            }}>
              Message simple pour tester les boutons.
            </div>
            
            <BubbleButtons
              content="Message simple pour tester les boutons."
              messageId="test-2"
              onCopy={handleCopy}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#2a2a2a', 
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h3>Instructions de test :</h3>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Survolez les bulles de messages pour voir apparaître les boutons</li>
          <li>Bouton <strong>📋 Copier</strong> : Copie le contenu du message</li>
          <li>Bouton <strong>✏️ Éditer</strong> : Prêt pour l'édition du message</li>
          <li>Design épuré : Pas de background, juste les icônes</li>
        </ul>
      </div>
    </div>
  );
};

export default TestBubbleButtons; 