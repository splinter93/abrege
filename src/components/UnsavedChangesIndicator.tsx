import React from 'react';
import { useUnsavedChangesIndicator } from '@/hooks/useEditorPersistence';

/**
 * Composant pour afficher un indicateur visuel des changements non sauvegardés
 */
export const UnsavedChangesIndicator: React.FC = () => {
  const { hasUnsavedChanges } = useUnsavedChangesIndicator();

  if (!hasUnsavedChanges) {
    return null;
  }

  return (
    <div
      className="unsaved-changes-indicator"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'var(--accent-primary)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '500',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        animation: 'pulse 2s infinite',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'white',
          animation: 'blink 1s infinite',
        }}
      />
      Changements non sauvegardés
    </div>
  );
};

// Styles CSS pour les animations
const styles = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }
`;

// Injecter les styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default UnsavedChangesIndicator; 