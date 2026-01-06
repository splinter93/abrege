import React from 'react';
import { Folder } from './types';
import './FolderBreadcrumb.css';

interface FolderBreadcrumbProps {
  folderPath: Folder[];
  classeurName: string;
  classeurIcon?: string;
  onGoToRoot: () => void;
  onGoToFolder: (folderId: string) => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({
  folderPath,
  classeurName,
  classeurIcon,
  onGoToRoot,
  onGoToFolder,
}) => {
  if (folderPath.length === 0) {
    return null; // Pas de breadcrumb à la racine
  }

  return (
    <nav className="folder-breadcrumb-clean" aria-label="Navigation des dossiers">
      <div className="breadcrumb-hierarchy">
        {/* Classeur - H1 */}
        <h1 
          className="breadcrumb-classeur"
          onClick={onGoToRoot}
          title="Retour à la racine"
        >
          {classeurIcon && (
            <span className="breadcrumb-emoji">{classeurIcon}</span>
          )}
          {classeurName}
        </h1>

        {/* Dossiers - H2, H3, etc. */}
        {folderPath.map((folder, index) => {
          const headingLevel = Math.min(index + 2, 6);
          const HeadingTag = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const isLast = index === folderPath.length - 1;
          
          return (
            <React.Fragment key={folder.id}>
              <span className="breadcrumb-separator">/</span>
              {React.createElement(HeadingTag, {
                className: `breadcrumb-folder ${isLast ? 'breadcrumb-current' : 'breadcrumb-link'}`,
                onClick: isLast ? undefined : () => onGoToFolder(folder.id),
                title: isLast ? 'Dossier actuel' : `Aller à ${folder.name}`,
                style: { cursor: isLast ? 'default' : 'pointer' }
              }, folder.name)}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};

export default FolderBreadcrumb; 