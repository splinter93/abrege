import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { FiType, FiChevronDown } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface SimpleHeadingButtonProps {
  editor: Editor | null;
}

const SimpleHeadingButton: React.FC<SimpleHeadingButtonProps> = ({ editor }) => {
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

  const headingLevels = [
    { level: 1, label: 'H1', command: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { level: 2, label: 'H2', command: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { level: 3, label: 'H3', command: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { level: 0, label: 'P', command: () => editor.chain().focus().setParagraph().run() },
  ];

  const getCurrentLevel = () => {
    if (editor.isActive('heading', { level: 1 })) return 1;
    if (editor.isActive('heading', { level: 2 })) return 2;
    if (editor.isActive('heading', { level: 3 })) return 3;
    return 0; // Paragraph
  };

  const currentLevel = getCurrentLevel();
  const currentLabel = headingLevels.find(h => h.level === currentLevel)?.label || 'P';

  const handleClick = (command: () => void) => {
    command();
    setIsOpen(false);
  };

  return (
    <div className="simple-dropdown" ref={dropdownRef}>
      <Tooltip text="Titres et paragraphes">
        <button
          className="toolbar-btn dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Titres et paragraphes"
        >
          <FiType size={16} />
          <span className="dropdown-label">{currentLabel}</span>
          <FiChevronDown size={12} className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>
      </Tooltip>
      
      {isOpen && (
        <div className="dropdown-menu">
          {headingLevels.map((heading) => (
            <button
              key={heading.level}
              className={`dropdown-item ${currentLevel === heading.level ? 'active' : ''}`}
              onClick={() => handleClick(heading.command)}
            >
              <span className="dropdown-item-label">{heading.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleHeadingButton;
