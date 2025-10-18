import React, { useState, useCallback } from 'react';
import { FiShare2, FiCopy, FiLink, FiLock, FiGlobe, FiX, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import type { ShareSettings, ShareSettingsUpdate } from '@/types/sharing';
import './ShareMenu.css';

interface ShareMenuProps {
  noteId: string;
  currentSettings: ShareSettings;
  publicUrl?: string;
  onSettingsChange: (settings: ShareSettingsUpdate) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
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

  // Gérer la fermeture en cliquant à l'extérieur
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.share-menu')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const visibilityOptions = [
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

  const handleVisibilityChange = (newVisibility: string) => {
    setVisibility(newVisibility);
  };

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
      toast.success('Paramètres sauvegardés !');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error('Erreur sauvegarde:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [currentSettings, visibility, onSettingsChange, onClose]);

  if (!isOpen) return null;

  return (
    <>
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
          <h4>Qui peut voir cette note ?</h4>
          <div className="visibility-options">
            {visibilityOptions.map((option) => (
              <label key={option.value} className="visibility-option">
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

        {/* Section lien public */}
        {(visibility === 'link-public' || visibility === 'link-private') && publicUrl && (
          <div className="share-menu-section">
            <h4>🔗 Lien de partage</h4>
            <div className="link-section">
              <div className="link-input-group">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="link-input"
                />
                <button
                  onClick={handleCopyLink}
                  className="copy-button"
                  disabled={copySuccess}
                >
                  {copySuccess ? <FiCheck size={16} /> : <FiCopy size={16} />}
                </button>
              </div>
              
              {visibility === 'link-public' && (
                <div className="seo-warning">
                  <FiGlobe size={16} />
                  <span>Cette note sera indexée par les moteurs de recherche</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="share-menu-actions">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="save-button"
          >
            {isUpdating ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          <button onClick={onClose} className="cancel-button">
            Annuler
          </button>
        </div>
      </div>
    </>
  );
};

export default ShareMenu; 