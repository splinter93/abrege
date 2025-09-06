/**
 * Sous-menu pour transformer le type de bloc de texte (H1, P, etc.)
 */
import React from 'react';
import type { Editor } from '@tiptap/react';
import { FiType, FiMessageSquare } from 'react-icons/fi';
import './transform-menu.css';

interface TransformMenuProps {
  editor: Editor;
  onClose: () => void;
}

const TransformMenu: React.FC<TransformMenuProps> = ({ editor, onClose }) => {
  const transformOptions = [
    {
      id: 'paragraph',
      label: 'Texte',
      icon: FiMessageSquare,
      action: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive('paragraph'),
    },
    {
      id: 'heading1',
      label: 'Titre 1',
      icon: FiType,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive('heading', { level: 1 }),
    },
    {
      id: 'heading2',
      label: 'Titre 2',
      icon: FiType,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      id: 'heading3',
      label: 'Titre 3',
      icon: FiType,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
  ];

  const handleSelect = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="transform-menu">
      <div className="transform-menu-header">
        <FiType size={14} />
        <span>Transformer en</span>
      </div>
      <div className="transform-menu-list">
        {transformOptions.map((option) => (
          <button
            key={option.id}
            className={`transform-menu-item ${option.isActive() ? 'active' : ''}`}
            onClick={() => handleSelect(option.action)}
          >
            <option.icon size={16} className={`heading-icon-${option.id.slice(-1)}`} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TransformMenu;
