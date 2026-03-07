'use client';
import React from 'react';
import { Folder } from 'react-feather';
import '@/styles/ImageSourceModal.css';

export interface ImageSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComputer: () => void;
  onSelectFiles: () => void;
  /** Titre de la modale (défaut: "Charger une image") */
  title?: string;
  /** Libellé carte 1 (défaut: "Depuis mon ordinateur" / "Parcourir vos fichiers locaux") */
  card1Title?: string;
  card1Subtitle?: string;
  /** Libellé carte 2 (défaut: "Depuis mes Files" / "Choisir dans vos images uploadées") */
  card2Title?: string;
  card2Subtitle?: string;
}

const ImageSourceModal: React.FC<ImageSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectComputer,
  onSelectFiles,
  title = 'Charger une image',
  card1Title = 'Depuis mon ordinateur',
  card1Subtitle = 'Parcourir vos fichiers locaux',
  card2Title = 'Depuis mes Files',
  card2Subtitle = 'Choisir dans vos images uploadées'
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
          <h3>{title}</h3>
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
              <h4>{card1Title}</h4>
              <p>{card1Subtitle}</p>
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
              <h4>{card2Title}</h4>
              <p>{card2Subtitle}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSourceModal;

