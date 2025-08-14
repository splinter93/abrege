'use client';
import React, { useState } from 'react';
import ChatWidget from '@/components/chat/ChatWidget';

const TestChatWidgetPage: React.FC = () => {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '40px',
          fontSize: '2.5rem',
          fontWeight: '700'
        }}>
          Test Chat Widget
        </h1>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Configuration du Widget</h2>
          
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                Position:
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>

            <div>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                Taille:
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <option value="small">Small (320x480)</option>
                <option value="medium">Medium (400x600)</option>
                <option value="large">Large (500x700)</option>
              </select>
            </div>

            <div>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                État:
              </label>
              <button
                onClick={() => setWidgetOpen(!widgetOpen)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: widgetOpen ? '#ef4444' : '#10b981',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                {widgetOpen ? 'Fermer le Widget' : 'Ouvrir le Widget'}
              </button>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Instructions</h2>
          <ul style={{ color: 'white', lineHeight: '1.6' }}>
            <li>Utilisez les contrôles ci-dessus pour configurer le widget</li>
            <li>Le widget peut être positionné dans 4 coins différents</li>
            <li>3 tailles disponibles : Small, Medium, Large</li>
            <li>Le widget peut être minimisé en cliquant sur le bouton de réduction</li>
            <li>Cliquez sur le bouton de fermeture pour fermer complètement le widget</li>
            <li>Le bouton flottant réapparaîtra pour rouvrir le widget</li>
          </ul>
        </div>
      </div>

      {/* Widget du chat */}
      <ChatWidget
        isOpen={widgetOpen}
        onToggle={setWidgetOpen}
        position={position}
        size={size}
      />
    </div>
  );
};

export default TestChatWidgetPage; 