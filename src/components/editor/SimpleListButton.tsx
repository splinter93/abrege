import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { FiList, FiCheckSquare, FiChevronDown } from 'react-icons/fi';
import { AiOutlineOrderedList } from 'react-icons/ai';
import Tooltip from '@/components/Tooltip';

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
      label: '•', 
      icon: FiList,
      command: () => editor.chain().focus().toggleBulletList().run() 
    },
    { 
      type: 'orderedList', 
      label: '1.', 
      icon: AiOutlineOrderedList,
      command: () => editor.chain().focus().toggleOrderedList().run() 
    },
    { 
      type: 'taskList', 
      label: '☐', 
      icon: FiCheckSquare,
      command: () => editor.chain().focus().toggleTaskList().run() 
    },
  ];

  const getCurrentType = () => {
    if (editor.isActive('bulletList')) return 'bulletList';
    if (editor.isActive('orderedList')) return 'orderedList';
    if (editor.isActive('taskList')) return 'taskList';
    return null;
  };

  const currentType = getCurrentType();
  const currentList = listTypes.find(l => l.type === currentType);
  const currentLabel = currentList?.label || '•';
  const CurrentIcon = currentList?.icon || FiList;

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
          <span className="dropdown-label">{currentLabel}</span>
          <FiChevronDown size={12} className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>
      </Tooltip>
      
      {isOpen && (
        <div className="dropdown-menu">
          {listTypes.map((list) => {
            const Icon = list.icon;
            return (
              <button
                key={list.type}
                className={`dropdown-item ${currentType === list.type ? 'active' : ''}`}
                onClick={() => handleClick(list.command)}
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
