'use client';
import React, { useState } from 'react';
import ChatModeToggle from '@/components/chat/ChatModeToggle';

const TestChatTogglePage: React.FC = () => {
  const [defaultMode, setDefaultMode] = useState<'fullscreen' | 'widget'>('fullscreen');
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');

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
          Test Chat Mode Toggle
        </h1>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Configuration</h2>
          
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                Mode par défaut:
              </label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as 'fullscreen' | 'widget')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <option value="fullscreen">Fullscreen</option>
                <option value="widget">Widget</option>
              </select>
            </div>

            <div>
              <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                Position du widget:
              </label>
              <select
                value={widgetPosition}
                onChange={(e) => setWidgetPosition(e.target.value as any)}
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
                Taille du widget:
              </label>
              <select
                value={widgetSize}
                onChange={(e) => setWidgetSize(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
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
            <li>Le composant ChatModeToggle permet de basculer facilement entre les modes fullscreen et widget</li>
            <li>En mode fullscreen, un bouton flottant permet de passer en mode widget</li>
            <li>En mode widget, vous pouvez configurer la position et la taille</li>
            <li>Les deux modes utilisent exactement les mêmes composants sous-jacents</li>
            <li>Seul le CSS change pour adapter l'affichage</li>
          </ul>
        </div>
      </div>

      {/* Composant de test */}
      <ChatModeToggle
        defaultMode={defaultMode}
        widgetPosition={widgetPosition}
        widgetSize={widgetSize}
      />
    </div>
  );
};

export default TestChatTogglePage; 