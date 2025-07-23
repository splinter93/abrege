// Types partagés pour le FolderManager et ses sous-composants

export interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  classeur_id?: string; // Ajouté pour filtrage
}

export interface FileArticle {
  id: string;
  source_title: string;
  source_type?: string;
  updated_at?: string;
  classeur_id?: string; // Ajouté pour filtrage
  folder_id?: string;   // Ajouté pour navigation
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