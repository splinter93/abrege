'use client';
import React, { useState } from 'react';
import CopyButton from './CopyButton';

const MinimalCopyButtonTest: React.FC = () => {
  const [testContent] = useState([
    {
      name: 'Message simple',
      content: 'Ceci est un message simple à copier.'
    },
    {
      name: 'Message avec code',
      content: `Voici un exemple de code :

\`\`\`javascript
function hello() {
  console.log("Hello World!");
}
\`\`\`

Et du texte normal après.`
    },
    {
      name: 'Message avec tableau',
      content: `| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Donnée 1  | Donnée 2  | Donnée 3  |
| Donnée 4  | Donnée 5  | Donnée 6  |

Voici un tableau bien formaté.`
    }
  ]);

  const [selectedTest, setSelectedTest] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string>('');

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('✅ Contenu copié !');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      setCopyStatus('❌ Erreur copie');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  return (
    <div className="minimal-copy-button-test" style={{ 
      padding: '20px', 
      background: '#0f1115', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>🧪 Test Bouton de Copie Minimal</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Scénarios de Test</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {testContent.map((test, index) => (
            <button
              key={index}
              onClick={() => setSelectedTest(index)}
              style={{
                padding: '8px 16px',
                background: selectedTest === index ? '#007acc' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {test.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Simulation Message Assistant</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #333',
          maxWidth: '600px'
        }}>
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-bubble chat-message-bubble-assistant">
              <div className="chat-markdown">
                {testContent[selectedTest]?.content}
              </div>
            </div>
            
            <div className="chat-message-actions">
              <CopyButton 
                content={testContent[selectedTest]?.content || ''}
                size="small"
                variant="icon-only"
                className="chat-copy-button"
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Bouton de Copie Minimal</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #333'
        }}>
          <div style={{ color: '#ccc', marginBottom: '10px' }}>
            <strong>Caractéristiques du style minimal :</strong>
          </div>
          <ul style={{ color: '#ccc', margin: '0', paddingLeft: '20px' }}>
            <li>✅ Pas d'encadré ni de bordure</li>
            <li>✅ Icône petite et discrète (14x14px)</li>
            <li>✅ Couleur grise discrète (#6b7280)</li>
            <li>✅ Apparition au hover uniquement</li>
            <li>✅ Positionnement sous la bulle</li>
            <li>✅ Taille minimale (padding: 2px)</li>
          </ul>
        </div>
      </div>

      {copyStatus && (
        <div style={{ 
          background: copyStatus.includes('✅') ? '#1a472a' : '#4a1a1a',
          color: copyStatus.includes('✅') ? '#90EE90' : '#ff6b6b',
          padding: '15px',
          borderRadius: '5px',
          border: `1px solid ${copyStatus.includes('✅') ? '#2d5a3d' : '#5a2d2d'}`,
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {copyStatus}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Instructions de Test</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          color: '#ccc',
          fontSize: '14px'
        }}>
          <ol style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Survolez la bulle de message pour voir apparaître le bouton de copie</li>
            <li>Observez le style minimal sans encadré ni bordure</li>
            <li>Cliquez sur le bouton pour copier le contenu</li>
            <li>Vérifiez que le contenu est bien copié dans le presse-papiers</li>
            <li>Testez avec différents types de contenu (texte, code, tableaux)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default MinimalCopyButtonTest; 