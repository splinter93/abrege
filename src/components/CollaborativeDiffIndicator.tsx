import React from 'react';

interface CollaboratorInfo {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface CollaborativeDiffIndicatorProps {
  collaboratorInfo?: CollaboratorInfo;
  changeSource: 'local' | 'remote' | 'collaborative';
  isVisible: boolean;
  onDismiss: () => void;
}

const CollaborativeDiffIndicator: React.FC<CollaborativeDiffIndicatorProps> = ({
  collaboratorInfo,
  changeSource,
  isVisible,
  onDismiss
}) => {
  if (!isVisible || changeSource === 'local') {
    return null;
  }

  const getChangeSourceText = () => {
    switch (changeSource) {
      case 'remote':
        return 'Changement distant détecté';
      case 'collaborative':
        return collaboratorInfo ? `${collaboratorInfo.name} a modifié` : 'Modification collaborative';
      default:
        return 'Changement détecté';
    }
  };

  const getChangeSourceIcon = () => {
    switch (changeSource) {
      case 'remote':
        return '🔄';
      case 'collaborative':
        return '👥';
      default:
        return '📝';
    }
  };

  return (
    <div className="collaborative-diff-indicator">
      <style jsx>{`
        .collaborative-diff-indicator {
          position: fixed;
          top: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 8px;
          padding: 12px 16px;
          z-index: 1001;
          display: flex;
          align-items: center;
          gap: 12px;
          /* animation: slideInLeft 0.3s ease-out; */ /* Animation désactivée pour interface simple */
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 300px;
        }
        
        /* @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        } */ /* Animation désactivée pour interface simple */
        
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          color: white;
          flex-shrink: 0;
        }
        
        .content {
          flex: 1;
          min-width: 0;
        }
        
        .title {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 2px;
        }
        
        .subtitle {
          font-size: 11px;
          color: #9ca3af;
        }
        
        .dismiss-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 16px;
          line-height: 1;
          /* transition: color 0.2s; */ /* Transition désactivée pour interface simple */
        }
        
        .dismiss-btn:hover {
          color: #ffffff;
        }
        
        /* Responsive mobile */
        @media (max-width: 768px) {
          .collaborative-diff-indicator {
            top: 10px;
            left: 10px;
            right: 10px;
            max-width: none;
            padding: 10px 12px;
          }
          
          .avatar {
            width: 28px;
            height: 28px;
            font-size: 12px;
          }
          
          .title {
            font-size: 11px;
          }
          
          .subtitle {
            font-size: 10px;
          }
        }
        
        /* Support pour la réduction de mouvement */
        @media (prefers-reduced-motion: reduce) {
          .collaborative-diff-indicator {
            animation: none;
          }
        }
      `}</style>
      
      {collaboratorInfo && (
        <div 
          className="avatar"
          style={{ 
            backgroundColor: collaboratorInfo.color,
            border: `2px solid ${collaboratorInfo.color}20`
          }}
        >
          {collaboratorInfo.avatar ? (
            <img 
              src={collaboratorInfo.avatar} 
              alt={collaboratorInfo.name}
              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
            />
          ) : (
            collaboratorInfo.name.charAt(0).toUpperCase()
          )}
        </div>
      )}
      
      <div className="content">
        <div className="title">
          {getChangeSourceIcon()} {getChangeSourceText()}
        </div>
        {collaboratorInfo && (
          <div className="subtitle">
            {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
      
      <button 
        className="dismiss-btn"
        onClick={onDismiss}
        aria-label="Fermer la notification"
      >
        ×
      </button>
    </div>
  );
};

export default CollaborativeDiffIndicator; 