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
    <div className="folder-toolbar" style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '10px 0' }}>
      <button
        className="fm-control-btn"
        title="Nouvelle note"
        aria-label="Nouvelle note"
        onClick={onCreateFile}
        type="button"
      >
        <Pencil size={20} />
      </button>
      <button
        className="fm-control-btn"
        title="Nouveau dossier"
        aria-label="Nouveau dossier"
        onClick={onCreateFolder}
        type="button"
      >
        <FolderPlus size={20} />
      </button>
      <button
        className={`fm-control-btn${viewMode === 'list' ? ' active' : ''}`}
        title="Vue liste"
        aria-label="Vue liste"
        onClick={() => onToggleView('list')}
        type="button"
      >
        <List size={20} />
      </button>
      <button
        className={`fm-control-btn${viewMode === 'grid' ? ' active' : ''}`}
        title="Vue grille"
        aria-label="Vue grille"
        onClick={() => onToggleView('grid')}
        type="button"
      >
        <Grid size={20} />
      </button>
    </div>
  );
};

export default FolderToolbar; 