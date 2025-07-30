import React, { useEffect, useState } from 'react';
import { Change } from 'diff';

interface DiffHighlighterProps {
  changes: Change[];
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

const DiffHighlighter: React.FC<DiffHighlighterProps> = ({
  changes,
  isVisible,
  onAnimationComplete
}) => {
  const [animatedChanges, setAnimatedChanges] = useState<Change[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isVisible && changes.length > 0) {
      // Animer les changements un par un
      setAnimatedChanges([]);
      setCurrentIndex(0);
      
      const animateChanges = () => {
        if (currentIndex < changes.length) {
          setAnimatedChanges(prev => [...prev, changes[currentIndex]]);
          setCurrentIndex(prev => prev + 1);
          
          setTimeout(animateChanges, 100); // 100ms entre chaque changement
        } else {
          // Animation terminée
          setTimeout(() => {
            onAnimationComplete?.();
          }, 2000); // Garder visible 2 secondes
        }
      };
      
      setTimeout(animateChanges, 500); // Délai initial
    }
  }, [isVisible, changes, currentIndex, onAnimationComplete]);

  if (!isVisible || animatedChanges.length === 0) {
    return null;
  }

  return (
    <div className="diff-highlighter" role="alert" aria-live="polite">
      <style jsx>{`
        .diff-highlighter {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.95);
          border-radius: 8px;
          padding: 16px;
          max-width: 400px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          /* animation: slideIn 0.3s ease-out; */ /* Animation désactivée pour interface simple */
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        } */ /* Animation désactivée pour interface simple */
        
        .change-item {
          margin-bottom: 8px;
          padding: 8px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 12px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
          border-left: 3px solid transparent;
        }
        
        .added {
          background: rgba(34, 197, 94, 0.15);
          border-left-color: #22c55e;
          color: #22c55e;
          /* Indicateur pour daltoniens */
          position: relative;
        }
        
        .added::before {
          content: "➕";
          position: absolute;
          left: -20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
        }
        
        .removed {
          background: rgba(239, 68, 68, 0.15);
          border-left-color: #ef4444;
          color: #ef4444;
          text-decoration: line-through;
          /* Indicateur pour daltoniens */
          position: relative;
        }
        
        .removed::before {
          content: "➖";
          position: absolute;
          left: -20px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
        }
        
        .unchanged {
          color: #9ca3af;
          opacity: 0.7;
        }
        
        .change-type {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 4px;
          opacity: 0.8;
          color: #ffffff;
        }
        
        /* Amélioration du contraste pour l'accessibilité */
        .diff-highlighter {
          color: #ffffff;
        }
        
        /* Support pour le mode sombre/clair */
        @media (prefers-color-scheme: light) {
          .diff-highlighter {
            background: rgba(255, 255, 255, 0.95);
            color: #000000;
            border: 1px solid rgba(0, 0, 0, 0.1);
          }
          
          .change-type {
            color: #000000;
          }
          
          .added {
            background: rgba(34, 197, 94, 0.1);
            color: #15803d;
          }
          
          .removed {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
          }
        }
        
        /* Support pour la réduction de mouvement */
        @media (prefers-reduced-motion: reduce) {
          .diff-highlighter {
            animation: none;
          }
          
          .change-item {
            animation: none !important;
          }
        }
      `}</style>
      
      <div className="change-type">
        Changements détectés ({animatedChanges.length})
      </div>
      
      {animatedChanges.map((change, index) => (
        <div
          key={index}
          className={`change-item ${
            change.added ? 'added' : 
            change.removed ? 'removed' : 
            'unchanged'
          }`}
          style={{
            animation: `fadeIn 0.2s ease-out ${index * 0.1}s both`
          }}
          role="status"
          aria-label={
            change.added ? `Ajouté: ${change.value}` :
            change.removed ? `Supprimé: ${change.value}` :
            `Inchangé: ${change.value}`
          }
        >
          <div style={{ marginTop: 4 }}>
            {change.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DiffHighlighter; 