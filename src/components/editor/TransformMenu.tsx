/**
 * Sous-menu pour transformer le type de bloc de texte
 */
import React from 'react';
import type { Editor } from '@tiptap/react';
import { 
  FiType, 
  FiMessageSquare, 
  FiCode,
  FiCheckSquare,
  FiAlertCircle
} from 'react-icons/fi';
import { MdFormatQuote, MdGridOn } from 'react-icons/md';
import { AiOutlineOrderedList, AiOutlineUnorderedList } from 'react-icons/ai';
import './transform-menu.css';
import { insertDefaultTable } from '@/utils/editorTables';

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
    {
      id: 'bulletList',
      label: 'Liste à puces',
      icon: AiOutlineUnorderedList,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      id: 'orderedList',
      label: 'Liste numérotée',
      icon: AiOutlineOrderedList,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      id: 'taskList',
      label: 'Liste de tâches',
      icon: FiCheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive('taskList'),
    },
    {
      id: 'blockquote',
      label: 'Citation',
      icon: MdFormatQuote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      id: 'codeBlock',
      label: 'Bloc de code',
      icon: FiCode,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive('codeBlock'),
    },
    {
      id: 'callout',
      label: 'Callout',
      icon: FiAlertCircle,
      action: () => editor.chain().focus().setCallout({} as any).run(),
      isActive: () => editor.isActive('callout'),
    },
    {
      id: 'table',
      label: 'Tableau',
      icon: MdGridOn,
      action: () => insertDefaultTable(editor),
      isActive: () => editor.isActive('table'),
    },
  ];

  const handleSelect = (action: () => void) => {
    action();
    onClose();
  };

  // Organiser les options par catégories
  const textOptions = transformOptions.slice(0, 4); // Texte, H1, H2, H3
  const listOptions = transformOptions.slice(4, 7); // Listes
  const blockOptions = transformOptions.slice(7); // Citation, code, callout, tableau

  return (
    <div className="transform-menu">
      <div className="transform-menu-header">
        <FiType size={14} />
        <span>Transformer en</span>
      </div>
      <div className="transform-menu-list">
        {/* Textes et titres */}
        {textOptions.map((option) => (
          <button
            key={option.id}
            className={`transform-menu-item ${option.isActive() ? 'active' : ''}`}
            onClick={() => handleSelect(option.action)}
          >
            <option.icon size={16} className={`heading-icon-${option.id.slice(-1)}`} />
            <span>{option.label}</span>
          </button>
        ))}
        
        <div className="transform-menu-divider" />
        
        {/* Listes */}
        {listOptions.map((option) => (
          <button
            key={option.id}
            className={`transform-menu-item ${option.isActive() ? 'active' : ''}`}
            onClick={() => handleSelect(option.action)}
          >
            <option.icon size={16} />
            <span>{option.label}</span>
          </button>
        ))}
        
        <div className="transform-menu-divider" />
        
        {/* Blocs */}
        {blockOptions.map((option) => (
          <button
            key={option.id}
            className={`transform-menu-item ${option.isActive() ? 'active' : ''}`}
            onClick={() => handleSelect(option.action)}
          >
            <option.icon size={16} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TransformMenu;
