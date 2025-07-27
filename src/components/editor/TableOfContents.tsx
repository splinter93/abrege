import React from 'react';
import './editor-toc.css';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TOCItem[];
  currentId?: string;
  onClickItem?: (id: string) => void;
}

/**
 * Table des matières dynamique pour l'éditeur
 */
const TableOfContents: React.FC<TableOfContentsProps> = ({ items, currentId, onClickItem }) => {
  return (
    <nav className="editor-toc">
      {items.map(item => (
        <button
          key={item.id}
          className={`editor-toc-item ${item.id === currentId ? 'editor-toc-item-active' : ''} ${
            item.level === 2 ? 'editor-toc-item-h2' : 'editor-toc-item-h3'
          }`}
          onClick={() => onClickItem?.(item.id)}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
};

export default TableOfContents; 