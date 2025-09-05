import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify, FiChevronDown } from 'react-icons/fi';
import Tooltip from '@/components/Tooltip';

interface SimpleAlignButtonProps {
  editor: Editor | null;
}

const SimpleAlignButton: React.FC<SimpleAlignButtonProps> = ({ editor }) => {
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

  const alignments = [
    { 
      alignment: 'left', 
      icon: FiAlignLeft,
      label: 'Gauche',
      command: () => editor.chain().focus().setTextAlign('left').run()
    },
    { 
      alignment: 'center', 
      icon: FiAlignCenter,
      label: 'Centre',
      command: () => editor.chain().focus().setTextAlign('center').run()
    },
    { 
      alignment: 'right', 
      icon: FiAlignRight,
      label: 'Droite',
      command: () => editor.chain().focus().setTextAlign('right').run()
    },
    { 
      alignment: 'justify', 
      icon: FiAlignJustify,
      label: 'Justifié',
      command: () => editor.chain().focus().setTextAlign('justify').run()
    },
  ];

  const getCurrentAlignment = () => {
    if (editor.isActive({ textAlign: 'left' })) return alignments[0];
    if (editor.isActive({ textAlign: 'center' })) return alignments[1];
    if (editor.isActive({ textAlign: 'right' })) return alignments[2];
    if (editor.isActive({ textAlign: 'justify' })) return alignments[3];
    return alignments[0]; // Default to left
  };

  const currentAlignment = getCurrentAlignment();
  const CurrentIcon = currentAlignment.icon;

  const handleClick = (command: () => void) => {
    command();
    setIsOpen(false);
  };

  return (
    <div className="simple-dropdown" ref={dropdownRef}>
      <Tooltip text="Alignement du texte">
        <button
          className="toolbar-btn dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Alignement du texte"
        >
          <CurrentIcon size={16} />
          <FiChevronDown size={12} className={`chevron ${isOpen ? 'open' : ''}`} />
        </button>
      </Tooltip>
      
      {isOpen && (
        <div className="dropdown-menu align-menu">
          {alignments.map((alignment) => {
            const Icon = alignment.icon;
            const isActive = currentAlignment.alignment === alignment.alignment;
            return (
              <button
                key={alignment.alignment}
                className={`dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleClick(alignment.command)}
              >
                <Icon size={14} />
                <span className="dropdown-item-label">{alignment.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimpleAlignButton;
