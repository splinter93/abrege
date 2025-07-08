import React from 'react';
import ContextMenu from './ContextMenu';
import { Folder, FileArticle } from './types';

interface FolderContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  item: Folder | FileArticle | null;
  onOpen?: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const FolderContextMenu: React.FC<FolderContextMenuProps> = ({ x, y, visible, item, onOpen, onRename, onDelete, onClose }) => {
  if (!visible || !item) return null;
  const contextMenuItems = [
    { label: 'Ouvrir', action: onOpen || (() => {}) },
    { label: 'Renommer', action: onRename },
    { label: 'Supprimer', action: onDelete },
  ];
  return (
    <ContextMenu
      x={x}
      y={y}
      visible={visible}
      items={contextMenuItems}
      onClose={onClose}
    />
  );
};

export default FolderContextMenu; 