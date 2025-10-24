'use client';
import React from 'react';
import { Folder } from 'react-feather';
import '@/styles/ImageSourceModal.css';

interface ImageSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComputer: () => void;
  onSelectFiles: () => void;
}

const ImageSourceModal: React.FC<ImageSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectComputer,
  onSelectFiles
}) => {
  // Fermer avec Echap
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-source-modal-overlay" onClick={handleOverlayClick}>
      <div className="image-source-modal">
        <div className="image-source-modal-header">
          <h3>Charger une image</h3>
        </div>

        <div className="image-source-modal-content">
          <button 
            className="image-source-card"
            onClick={onSelectComputer}
          >
            <div className="image-source-card-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div className="image-source-card-content">
              <h4>Depuis mon ordinateur</h4>
              <p>Parcourir vos fichiers locaux</p>
            </div>
          </button>

          <button 
            className="image-source-card"
            onClick={onSelectFiles}
          >
            <div className="image-source-card-icon">
              <Folder size={48} strokeWidth={1.5} />
            </div>
            <div className="image-source-card-content">
              <h4>Depuis mes Files</h4>
              <p>Choisir dans vos images uploadées</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSourceModal;

