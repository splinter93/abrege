import React from 'react';
import { FolderPlus, Pencil, Grid, List } from 'lucide-react';

export type ViewMode = 'list' | 'grid';

interface FolderToolbarProps {
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onToggleView: (mode: ViewMode) => void;
  viewMode: ViewMode;
}

const FolderToolbar: React.FC<FolderToolbarProps> = ({ onCreateFolder, onCreateFile, onToggleView, viewMode }) => {
  return (
    <div className="folder-toolbar-simple">
      <button
        className="toolbar-icon-btn"
        title="Nouvelle note"
        onClick={onCreateFile}
        type="button"
      >
        <Pencil size={20} />
      </button>
      <button
        className="toolbar-icon-btn"
        title="Nouveau dossier"
        onClick={onCreateFolder}
        type="button"
      >
        <FolderPlus size={20} />
      </button>
      <button
        className={`toolbar-icon-btn${viewMode === 'list' ? ' active' : ''}`}
        title="Vue liste"
        onClick={() => onToggleView('list')}
        type="button"
      >
        <List size={20} />
      </button>
      <button
        className={`toolbar-icon-btn${viewMode === 'grid' ? ' active' : ''}`}
        title="Vue grille"
        onClick={() => onToggleView('grid')}
        type="button"
      >
        <Grid size={20} />
      </button>
    </div>
  );
};

export default FolderToolbar; 