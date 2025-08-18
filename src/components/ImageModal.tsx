import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ImageModal.css';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
  onOpenInNewTab: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Icône SVG pour agrandir
const ExpandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15 3H21V9M9 21H3V15M21 3L14 10M3 21L10 14" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icône SVG pour fermer
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M18 6L6 18M6 6L18 18" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icône SVG pour précédent
const PreviousIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15 18L9 12L15 6" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icône SVG pour suivant
const NextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M9 18L15 12L9 6" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onOpenInNewTab,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {
  // Gestion des touches clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="image-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="image-modal-content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header avec boutons */}
          <div className="image-modal-header">
            <h3 className="image-modal-title">{imageName}</h3>
            <div className="image-modal-actions">
              <button
                className="image-modal-btn expand-btn"
                onClick={onOpenInNewTab}
                title="Ouvrir dans un nouvel onglet"
              >
                <span className="btn-icon">
                  <ExpandIcon />
                </span>
              </button>
              <button
                className="image-modal-btn close-btn"
                onClick={onClose}
                title="Fermer"
              >
                <span className="btn-icon">
                  <CloseIcon />
                </span>
              </button>
            </div>
          </div>

          {/* Contenu de l'image avec boutons de navigation */}
          <div className="image-modal-body">
            {/* Bouton précédent */}
            {hasPrevious && onPrevious && (
              <button
                className="image-modal-nav-btn nav-prev"
                onClick={onPrevious}
                title="Image précédente"
              >
                <PreviousIcon />
              </button>
            )}

            {/* Image centrale */}
            <div className="image-container">
              <img
                src={imageUrl}
                alt={imageName}
                className="image-modal-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="image-error-message hidden">
                <div className="error-icon">🖼️</div>
                <p>Impossible de charger l&apos;image</p>
              </div>
            </div>

            {/* Bouton suivant */}
            {hasNext && onNext && (
              <button
                className="image-modal-nav-btn nav-next"
                onClick={onNext}
                title="Image suivante"
              >
                <NextIcon />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageModal; 