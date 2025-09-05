import React from 'react';
import { Editor } from '@tiptap/react';
import { FiChevronDown, FiType, FiMessageSquare, FiCode, FiList, FiHash, FiMinus } from 'react-icons/fi';

interface TurnIntoDropdownProps {
  editor: Editor;
}

const TurnIntoDropdown: React.FC<TurnIntoDropdownProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const blockTypes = [
    { 
      type: 'paragraph', 
      label: 'Paragraph', 
      icon: FiType,
      command: () => editor.chain().focus().setParagraph().run()
    },
    { 
      type: 'heading1', 
      label: 'Heading 1', 
      icon: FiType,
      command: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    { 
      type: 'heading2', 
      label: 'Heading 2', 
      icon: FiType,
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    { 
      type: 'heading3', 
      label: 'Heading 3', 
      icon: FiType,
      command: () => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    { 
      type: 'blockquote', 
      label: 'Quote', 
      icon: FiMessageSquare,
      command: () => editor.chain().focus().toggleBlockquote().run()
    },
    { 
      type: 'codeBlock', 
      label: 'Code Block', 
      icon: FiCode,
      command: () => editor.chain().focus().toggleCodeBlock().run()
    },
    { 
      type: 'bulletList', 
      label: 'Bullet List', 
      icon: FiList,
      command: () => editor.chain().focus().toggleBulletList().run()
    },
    { 
      type: 'orderedList', 
      label: 'Numbered List', 
      icon: FiHash,
      command: () => editor.chain().focus().toggleOrderedList().run()
    },
    { 
      type: 'horizontalRule', 
      label: 'Divider', 
      icon: FiMinus,
      command: () => editor.chain().focus().setHorizontalRule().run()
    },
  ];

  const getCurrentBlockType = () => {
    if (!editor) return blockTypes[0]; // Default to paragraph if no editor
    if (editor.isActive('heading', { level: 1 })) return blockTypes[1];
    if (editor.isActive('heading', { level: 2 })) return blockTypes[2];
    if (editor.isActive('heading', { level: 3 })) return blockTypes[3];
    if (editor.isActive('blockquote')) return blockTypes[4];
    if (editor.isActive('codeBlock')) return blockTypes[5];
    if (editor.isActive('bulletList')) return blockTypes[6];
    if (editor.isActive('orderedList')) return blockTypes[7];
    return blockTypes[0]; // Default to paragraph
  };

  const currentBlockType = getCurrentBlockType();
  const CurrentIcon = currentBlockType.icon;

  const handleBlockChange = (command: () => void) => {
    if (!editor) return;
    command();
    setIsOpen(false);
  };

  return (
    <div className="turn-into-dropdown">
      <button
        className="turn-into-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      >
        <CurrentIcon className="turn-into-dropdown-icon" />
        <span className="turn-into-dropdown-label">{currentBlockType.label}</span>
        <FiChevronDown className={`turn-into-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="turn-into-dropdown-menu">
          {blockTypes.map((blockType) => {
            const Icon = blockType.icon;
            const isActive = currentBlockType.type === blockType.type;
            return (
              <button
                key={blockType.type}
                className={`turn-into-dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => handleBlockChange(blockType.command)}
              >
                <Icon className="turn-into-dropdown-item-icon" />
                <span className="turn-into-dropdown-item-label">{blockType.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TurnIntoDropdown;
