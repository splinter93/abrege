import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FiShare2, FiCopy, FiLink, FiLock, FiGlobe, FiX, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import type { ShareSettings, ShareSettingsUpdate, VisibilityLevel } from '@/types/sharing';
import './ShareMenu.css';

interface ShareMenuProps {
  noteId: string;
  currentSettings: ShareSettings;
  publicUrl?: string;
  onSettingsChange: (settings: ShareSettingsUpdate) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
  description?: string;
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  noteId,
  currentSettings,
  publicUrl,
  onSettingsChange,
  isOpen,
  onClose
}) => {
  const [visibility, setVisibility] = useState(currentSettings?.visibility || 'private');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Synchroniser l'état local avec les props quand elles changent
  React.useEffect(() => {
    if (currentSettings?.visibility) {
      setVisibility(currentSettings.visibility);
    }
  }, [currentSettings?.visibility]);

  const visibilityOptions: { value: VisibilityLevel; label: string; description: string; icon: string }[] = [
    {
      value: 'private',
      label: 'Privé',
      description: 'Seul vous pouvez voir cette note',
      icon: '🔒'
    },
    {
      value: 'link-private',
      label: 'Lien privé',
      description: 'Accessible via le lien, non indexé',
      icon: '🔗'
    },
    {
      value: 'link-public',
      label: 'Lien public',
      description: 'Accessible via le lien et indexé',
      icon: '🌐'
    }
  ];

  const handleVisibilityChange = (newVisibility: VisibilityLevel) => {
    setVisibility(newVisibility);
  };

  const getLinkInfo = () => {
    if (visibility === 'private') {
      return {
        icon: <FiLock size={14} />,
        text: 'Lien inactif tant que la note est privée'
      };
    }
    if (visibility === 'link-public') {
      return {
        icon: <FiGlobe size={14} />,
        text: 'Cette note sera indexée par les moteurs de recherche'
      };
    }
    return {
      icon: <FiLink size={14} />,
      text: 'Accessible via le lien, non indexé'
    };
  };
  const linkInfo = getLinkInfo();

  const handleCopyLink = useCallback(async () => {
    if (!publicUrl) {
      toast.error('URL publique non disponible');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié !');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Erreur copie lien:', error);
      toast.error('Erreur lors de la copie');
    }
  }, [publicUrl]);

  const handleSave = useCallback(async () => {
    if (!visibility) {
      toast.error('Veuillez sélectionner un niveau de visibilité');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedSettings = {
        ...currentSettings,
        visibility: visibility
      };
      
      await onSettingsChange(updatedSettings);
      // 🔧 FIX: Toast géré par EditorShareManager, pas besoin de dupliquer ici
      onClose();
    } catch (error) {
      // 🔧 FIX: Toast d'erreur géré par EditorShareManager
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [currentSettings, visibility, onSettingsChange, onClose]);

  if (!isOpen) return null;

  // Render dans un portal pour éviter les problèmes de z-index/CSS
  return ReactDOM.createPortal(
    <>
      {/* Overlay pour fermer en cliquant à l'extérieur */}
      <div className="share-menu-overlay" onClick={onClose} />
      
      <div className="share-menu">
        {/* Header */}
        <div className="share-menu-header">
          <h3>Partager cette note</h3>
          <button onClick={onClose} className="close-button">
            <FiX size={20} />
          </button>
        </div>

        {/* Options de visibilité */}
        <div className="share-menu-section">
          <h4>Visibilité</h4>
          <div className="visibility-options">
            {visibilityOptions.map((option) => (
              <label key={option.value} className={`visibility-option ${visibility === option.value ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => handleVisibilityChange(option.value)}
                />
                <span className="option-icon">{option.icon}</span>
                <div className="option-content">
                  <span className="option-label">{option.label}</span>
                  <span className="option-description">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section lien public - Afficher TOUJOURS */}
        <div className="share-menu-section">
          <h4>🔗 Lien de partage</h4>
          <div className="link-section">
            <div className="link-input-group">
              <input
                type="text"
                value={publicUrl || ''}
                readOnly
                className="link-input"
                placeholder={publicUrl ? '' : 'Le lien sera généré après sauvegarde'}
                disabled={!publicUrl}
              />
              <button
                onClick={handleCopyLink}
                className="share-menu-copy-button"
                disabled={copySuccess || !publicUrl}
              >
                {copySuccess ? <FiCheck size={16} /> : <FiCopy size={16} />}
              </button>
            </div>
            <div className="share-link-info">
              {linkInfo.icon}
              <span>{linkInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="share-menu-actions">
          <button onClick={onClose} className="cancel-button">
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="save-button"
          >
            {isUpdating ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ShareMenu; 