import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { FiCheckSquare } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

// Icônes personnalisées pour les listes - Design moderne et épuré
const BulletListIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <circle cx="3" cy="6" r="1.5"/>
    <circle cx="3" cy="12" r="1.5"/>
    <circle cx="3" cy="18" r="1.5"/>
  </svg>
);

const OrderedListIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6"/>
    <line x1="10" y1="12" x2="21" y2="12"/>
    <line x1="10" y1="18" x2="21" y2="18"/>
    <path d="M4 6h1v4"/>
    <path d="M4 10h2"/>
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
  </svg>
);

const TaskListIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="21" y2="6"/>
    <line x1="9" y1="12" x2="21" y2="12"/>
    <line x1="9" y1="18" x2="21" y2="18"/>
    <polyline points="9,12 12,15 15,12"/>
    <path d="M21 12v.01"/>
    <path d="M21 6v.01"/>
    <path d="M21 18v.01"/>
  </svg>
);

interface SimpleListButtonProps {
  editor: Editor | null;
}

const SimpleListButton: React.FC<SimpleListButtonProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!editor) return null;

  const listTypes = [
    { 
      type: 'bulletList', 
      label: 'Liste à puces', 
      icon: BulletListIcon,
      command: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      type: 'orderedList', 
      label: 'Liste numérotée', 
      icon: OrderedListIcon,
      command: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      type: 'taskList', 
      label: 'Liste de tâches', 
      icon: TaskListIcon,
      command: () => editor.chain().focus().toggleTaskList().run() 
    },
  ];

  const getCurrentList = () => {
    if (editor.isActive('bulletList')) return listTypes[0];
    if (editor.isActive('orderedList')) return listTypes[1];
    if (editor.isActive('taskList')) return listTypes[2];
    return listTypes[0]; // Default to bullet list
  };

  const currentList = getCurrentList();
  const CurrentIcon = currentList.icon;

  const handleClick = (command: () => void) => {
    command();
    setIsOpen(false);
  };

  return (
    <div className="simple-dropdown" ref={dropdownRef}>
      <Tooltip text="Listes">
        <button
          className="toolbar-btn dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Listes"
        >
          <CurrentIcon size={16} />
        </button>
      </Tooltip>
      
      {isOpen && (
        <div className="dropdown-menu">
          {listTypes.map((list) => {
            const Icon = list.icon;
            const isActive = currentList.type === list.type;
            return (
              <button
                key={list.type}
                className={`dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleClick(list.command)}
                title={list.label}
              >
                <Icon size={14} />
                <span className="dropdown-item-label">{list.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimpleListButton;
