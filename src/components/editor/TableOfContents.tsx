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
 * Table des matières dynamique pour l’éditeur
 */
const TableOfContents: React.FC<TableOfContentsProps> = ({ items, currentId, onClickItem }) => {
  return (
    <nav className="editor-toc" style={{ width: 220, background: 'transparent', border: 'none', borderRadius: 16, color: 'var(--text-2)', overflowY: 'auto', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 0, padding: 0, boxShadow: 'none', maxHeight: '80vh' }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            padding: '6px 18px',
            fontWeight: item.id === currentId ? 700 : 400,
            opacity: item.id === currentId ? 1 : 0.7,
            cursor: 'pointer',
            marginLeft: item.level === 2 ? 0 : 18,
            fontSize: item.level === 2 ? 17 : 15,
          }}
          onClick={() => onClickItem?.(item.id)}
        >
          {item.text}
        </div>
      ))}
    </nav>
  );
};

export default TableOfContents; 