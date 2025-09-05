import React from 'react';
import { Editor } from '@tiptap/react';
import { FiChevronDown, FiType } from 'react-icons/fi';

interface HeadingDropdownProps {
  editor: Editor;
}

const HeadingDropdown: React.FC<HeadingDropdownProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const headings = [
    { level: 0, label: 'Paragraph', icon: FiType },
    { level: 1, label: 'Heading 1', icon: FiType },
    { level: 2, label: 'Heading 2', icon: FiType },
    { level: 3, label: 'Heading 3', icon: FiType },
    { level: 4, label: 'Heading 4', icon: FiType },
    { level: 5, label: 'Heading 5', icon: FiType },
    { level: 6, label: 'Heading 6', icon: FiType },
  ];

  const getCurrentHeading = () => {
    if (!editor) return headings[0]; // Default to paragraph if no editor
    if (editor.isActive('heading', { level: 1 })) return headings[1];
    if (editor.isActive('heading', { level: 2 })) return headings[2];
    if (editor.isActive('heading', { level: 3 })) return headings[3];
    if (editor.isActive('heading', { level: 4 })) return headings[4];
    if (editor.isActive('heading', { level: 5 })) return headings[5];
    if (editor.isActive('heading', { level: 6 })) return headings[6];
    return headings[0];
  };

  const currentHeading = getCurrentHeading();
  const CurrentIcon = currentHeading.icon;

  const handleHeadingChange = (level: number) => {
    if (!editor) return;
    if (level === 0) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
    setIsOpen(false);
  };

  return (
    <div className="heading-dropdown">
      <button
        className="heading-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      >
        <CurrentIcon className="heading-dropdown-icon" />
        <span className="heading-dropdown-label">{currentHeading.label}</span>
        <FiChevronDown className={`heading-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="heading-dropdown-menu">
          {headings.map((heading) => {
            const Icon = heading.icon;
            return (
              <button
                key={heading.level}
                className={`heading-dropdown-item ${currentHeading.level === heading.level ? 'active' : ''}`}
                onClick={() => handleHeadingChange(heading.level)}
              >
                <Icon className="heading-dropdown-item-icon" />
                <span className="heading-dropdown-item-label">{heading.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HeadingDropdown;
