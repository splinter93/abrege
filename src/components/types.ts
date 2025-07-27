// Types partagés pour le FolderManager et ses sous-composants

export interface Folder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string; // Ajouté pour filtrage
}

export interface FileArticle {
  id: string;
  source_title: string;
  source_type?: string;
  updated_at?: string;
  classeur_id?: string; // Ajouté pour filtrage
  folder_id?: string | null;   // Ajouté pour navigation
}

export interface ItemProps {
  item: Folder | FileArticle;
  viewMode: string;
  onRename: (id: string, type: 'folder' | 'file', newName: string) => Promise<void>;
  isRenaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onDoubleClick?: () => void;
}

export interface SortableItemProps {
  id: string;
  item: Folder | FileArticle;
  viewMode: string;
  onRename: (id: string, type: 'folder' | 'file', newName: string) => Promise<void>;
  isRenaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  onClick: () => void;
  onDoubleClick: () => void;
}

export interface SortableListProps {
  items: (Folder | FileArticle)[];
  viewMode: string;
  onRename: (id: string, type: 'folder' | 'file', newName: string) => Promise<void>;
  renamingItemId: string | null;
  onStartRename: (item: Folder | FileArticle) => void;
  onCancelRename: () => void;
  handleContextMenu: (e: React.MouseEvent, item: Folder | FileArticle) => void;
  handleItemClick: (item: Folder | FileArticle) => void;
  handleItemDoubleClick: (item: Folder | FileArticle) => void;
}

// Types pour les événements de drag & drop
export interface DropEventDetail {
  classeurId: string;
  itemId: string;
  itemType: 'folder' | 'file';
  target: string;
}

export interface CustomDropEvent extends CustomEvent {
  detail: DropEventDetail;
}

// Types pour les données filtrées
export interface FilteredData {
  folders: Folder[];
  notes: FileArticle[];
}

// Types pour les éléments du menu contextuel
export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

// Types pour l'état du menu contextuel
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: Folder | FileArticle | null;
} 