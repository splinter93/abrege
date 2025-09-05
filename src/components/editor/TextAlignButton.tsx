import React from 'react';
import { Editor } from '@tiptap/react';
import { FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify } from 'react-icons/fi';

interface TextAlignButtonProps {
  editor: Editor;
}

const TextAlignButton: React.FC<TextAlignButtonProps> = ({ editor }) => {
  const alignments = [
    { 
      alignment: 'left', 
      icon: FiAlignLeft,
      label: 'Align Left'
    },
    { 
      alignment: 'center', 
      icon: FiAlignCenter,
      label: 'Align Center'
    },
    { 
      alignment: 'right', 
      icon: FiAlignRight,
      label: 'Align Right'
    },
    { 
      alignment: 'justify', 
      icon: FiAlignJustify,
      label: 'Justify'
    },
  ];

  const getCurrentAlignment = () => {
    if (!editor) return alignments[0]; // Default to left if no editor
    if (editor.isActive({ textAlign: 'left' })) return alignments[0];
    if (editor.isActive({ textAlign: 'center' })) return alignments[1];
    if (editor.isActive({ textAlign: 'right' })) return alignments[2];
    if (editor.isActive({ textAlign: 'justify' })) return alignments[3];
    return alignments[0]; // Default to left
  };

  const currentAlignment = getCurrentAlignment();
  const CurrentIcon = currentAlignment.icon;

  const handleAlignmentChange = (alignment: string) => {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment as 'left' | 'center' | 'right' | 'justify').run();
  };

  return (
    <div className="text-align-button">
      <button
        className="text-align-trigger"
        onClick={() => {
          const currentIndex = alignments.findIndex(a => a.alignment === currentAlignment.alignment);
          const nextIndex = (currentIndex + 1) % alignments.length;
          handleAlignmentChange(alignments[nextIndex].alignment);
        }}
        title={currentAlignment.label}
      >
        <CurrentIcon className="text-align-icon" />
      </button>
      
      <div className="text-align-menu">
        {alignments.map((alignment) => {
          const Icon = alignment.icon;
          const isActive = currentAlignment.alignment === alignment.alignment;
          return (
            <button
              key={alignment.alignment}
              className={`text-align-item ${isActive ? 'active' : ''}`}
              onClick={() => handleAlignmentChange(alignment.alignment)}
              title={alignment.label}
            >
              <Icon className="text-align-item-icon" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TextAlignButton;
