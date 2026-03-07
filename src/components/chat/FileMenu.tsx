/**
 * Menu fichier pour le chat
 * Gère l'upload d'images, fichiers et capture photo
 * @module components/chat/FileMenu
 */

'use client';
import React from 'react';
import { Folder, Image as ImageIcon } from 'react-feather';
import ImageSourceModal from './ImageSourceModal';
import { IMAGE_VALIDATION_LIMITS } from '@/types/image';

interface FileMenuProps {
  // État
  showFileMenu: boolean;
  showImageSourceModal: boolean;
  showFileSourceModal: boolean;
  imagesCount: number;
  
  // Actions
  onToggle: () => void;
  onLoadImageClick: () => void;
  onLoadFileClick: () => void;
  onTakePhoto: () => void;
  onCloseImageModal: () => void;
  onCloseFileModal: () => void;
  onBrowseComputer: () => void;
  onBrowseFiles: () => void;
  onFileSelectComputer: () => void;
  onFileSelectFiles: () => void;
  
  // UI state
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Composant FileMenu
 * Affiche un menu pour charger des images, fichiers ou prendre une photo
 */
const FileMenu: React.FC<FileMenuProps> = ({
  showFileMenu,
  showImageSourceModal,
  showFileSourceModal,
  imagesCount,
  onToggle,
  onLoadImageClick,
  onLoadFileClick,
  onTakePhoto,
  onCloseImageModal,
  onCloseFileModal,
  onBrowseComputer,
  onBrowseFiles,
  onFileSelectComputer,
  onFileSelectFiles,
  disabled = false,
  loading = false
}) => {
  return (
    <div style={{ position: 'relative' }}>
      <button 
        className={`chatgpt-input-file ${showFileMenu ? 'active' : ''} ${imagesCount > 0 ? 'has-files' : ''}`}
        aria-label="Ajouter des fichiers"
        onClick={onToggle}
        disabled={disabled || loading}
      >
        <Folder size={18} />
        {imagesCount > 0 && (
          <span className="chatgpt-input-file-badge">{imagesCount}</span>
        )}
      </button>

      {/* Menu contextuel Fichier */}
      {showFileMenu && (
        <div className="chat-file-menu">
          <button 
            className="chat-file-menu-item" 
            onClick={onLoadImageClick}
            title={`Formats acceptés : JPEG, PNG, GIF, WebP\nTaille maximale : ${(IMAGE_VALIDATION_LIMITS.MAX_SIZE_BYTES / (1024 * 1024)).toFixed(0)} Mo`}
          >
            <ImageIcon size={16} />
            <span>Charger une image</span>
          </button>
          <button className="chat-file-menu-item" onClick={onLoadFileClick}>
            <Folder size={16} />
            <span>Charger un fichier</span>
          </button>
          <button className="chat-file-menu-item" onClick={onTakePhoto}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>Prendre une photo</span>
          </button>
        </div>
      )}

      {/* Modale de sélection source image */}
      <ImageSourceModal
        isOpen={showImageSourceModal}
        onClose={onCloseImageModal}
        onSelectComputer={onBrowseComputer}
        onSelectFiles={onBrowseFiles}
      />

      {/* Modale "Charger un fichier" — même style (bordure/background chat input) */}
      <ImageSourceModal
        isOpen={showFileSourceModal}
        onClose={onCloseFileModal}
        onSelectComputer={onFileSelectComputer}
        onSelectFiles={onFileSelectFiles}
        title="Charger un fichier"
        card1Title="Depuis mon ordinateur"
        card1Subtitle="Parcourir vos fichiers locaux"
        card2Title="Depuis mes Files"
        card2Subtitle="Choisir dans vos fichiers uploadés"
      />
    </div>
  );
};

// Mémoisation pour éviter re-renders inutiles
export default React.memo(FileMenu);

