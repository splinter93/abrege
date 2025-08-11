'use client';
import React, { useState } from 'react';
import CopyButton from './CopyButton';

const CopyButtonTest: React.FC = () => {
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
    },
    {
      name: 'Message très long',
      content: `Ceci est un message très long qui contient beaucoup de contenu pour tester le comportement du bouton de copie avec des messages de différentes tailles. 

Il contient plusieurs paragraphes et peut même inclure du code, des listes, et d'autres éléments de formatage.

- Point 1
- Point 2
- Point 3

Et finalement, une conclusion qui termine ce message de test.`
    }
  ]);

  const [selectedTest, setSelectedTest] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string>('');

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus('✅ Contenu copié avec succès !');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (error) {
      setCopyStatus('❌ Erreur lors de la copie');
      setTimeout(() => setCopyStatus(''), 3000);
    }
  };

  return (
    <div className="copy-button-test" style={{ 
      padding: '20px', 
      background: '#0f1115', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ color: '#fff', marginBottom: '20px' }}>🧪 Test Bouton de Copie</h1>
      
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
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>Contenu à Copier</h3>
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #333',
          marginBottom: '10px'
        }}>
          <pre style={{ 
            color: '#90EE90',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {testContent[selectedTest]?.content}
          </pre>
        </div>
        
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '5px',
          border: '1px solid #333'
        }}>
          <h4 style={{ color: '#fff', marginBottom: '10px' }}>Boutons de Copie (Différentes Variantes)</h4>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Default</label>
              <CopyButton 
                content={testContent[selectedTest]?.content || ''} 
                size="medium"
                variant="default"
              />
            </div>
            
            <div>
              <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Minimal</label>
              <CopyButton 
                content={testContent[selectedTest]?.content || ''} 
                size="medium"
                variant="minimal"
              />
            </div>
            
            <div>
              <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Icon Only</label>
              <CopyButton 
                content={testContent[selectedTest]?.content || ''} 
                size="medium"
                variant="icon-only"
              />
            </div>
            
            <div>
              <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Small</label>
              <CopyButton 
                content={testContent[selectedTest]?.content || ''} 
                size="small"
                variant="minimal"
              />
            </div>
            
            <div>
              <label style={{ color: '#ccc', fontSize: '12px', display: 'block', marginBottom: '5px' }}>Large</label>
              <CopyButton 
                content={testContent[selectedTest]?.content || ''} 
                size="large"
                variant="default"
              />
            </div>
          </div>
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
                variant="minimal"
                className="chat-copy-button"
              />
            </div>
          </div>
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
            <li>Cliquez sur un scénario de test pour changer le contenu</li>
            <li>Testez les différentes variantes de boutons de copie</li>
            <li>Vérifiez que le contenu est bien copié dans le presse-papiers</li>
            <li>Observez les animations et feedbacks visuels</li>
            <li>Testez le bouton dans la simulation de message assistant</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CopyButtonTest; 