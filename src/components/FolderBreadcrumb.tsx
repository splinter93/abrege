import React from 'react';
import { Folder } from './types';
import './FolderBreadcrumb.css';

interface FolderBreadcrumbProps {
  folderPath: Folder[];
  classeurName: string;
  onGoToRoot: () => void;
  onGoToFolder: (folderId: string) => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  folderPath,
  classeurName,
  onGoToRoot,
  onGoToFolder,
}) => {
  if (folderPath.length === 0) {
    return null; // Pas de breadcrumb à la racine
  }

  return (
    <nav className="folder-breadcrumb" aria-label="Navigation des dossiers">
      <div className="breadcrumb-container">
        {/* Bouton retour à la racine */}
        <button
          className="breadcrumb-item breadcrumb-root"
          onClick={onGoToRoot}
          title="Retour à la racine"
        >
          <span className="breadcrumb-icon">🏠</span>
          <span className="breadcrumb-text">{classeurName}</span>
        </button>

        {/* Séparateur */}
        <span className="breadcrumb-separator">/</span>

        {/* Chemin des dossiers */}
        {folderPath.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <button
              className={`breadcrumb-item ${index === folderPath.length - 1 ? 'breadcrumb-current' : 'breadcrumb-link'}`}
              onClick={() => onGoToFolder(folder.id)}
              title={index === folderPath.length - 1 ? 'Dossier actuel' : `Aller à ${folder.name}`}
              disabled={index === folderPath.length - 1}
            >
              <span className="breadcrumb-icon">
                {index === folderPath.length - 1 ? '📁' : '📂'}
              </span>
              <span className="breadcrumb-text">{folder.name}</span>
            </button>
            
            {/* Séparateur (sauf pour le dernier élément) */}
            {index < folderPath.length - 1 && (
              <span className="breadcrumb-separator">/</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default FolderBreadcrumb; 