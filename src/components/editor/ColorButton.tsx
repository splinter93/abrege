import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { FiType, FiEdit3 } from 'react-icons/fi';

interface ColorButtonProps {
  editor: Editor | null;
  type: 'text' | 'highlight';
}

const ColorButton: React.FC<ColorButtonProps> = ({ editor, type }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isTextColor = type === 'text';
  const isHighlight = type === 'highlight';

  // Couleurs prédéfinies
  const colors = [
    { name: 'Par défaut', value: '', class: 'default' },
    { name: 'Rouge', value: '#ef4444', class: 'red' },
    { name: 'Orange', value: '#f97316', class: 'orange' },
    { name: 'Jaune', value: '#eab308', class: 'yellow' },
    { name: 'Vert', value: '#22c55e', class: 'green' },
    { name: 'Bleu', value: '#3b82f6', class: 'blue' },
    { name: 'Violet', value: '#8b5cf6', class: 'purple' },
    { name: 'Rose', value: '#ec4899', class: 'pink' },
    { name: 'Gris', value: '#6b7280', class: 'gray' },
  ];

  // Couleurs de surlignage (plus claires)
  const highlightColors = [
    { name: 'Par défaut', value: '', class: 'default' },
    { name: 'Rouge clair', value: '#fecaca', class: 'red-light' },
    { name: 'Orange clair', value: '#fed7aa', class: 'orange-light' },
    { name: 'Jaune clair', value: '#fef3c7', class: 'yellow-light' },
    { name: 'Vert clair', value: '#dcfce7', class: 'green-light' },
    { name: 'Bleu clair', value: '#dbeafe', class: 'blue-light' },
    { name: 'Violet clair', value: '#e9d5ff', class: 'purple-light' },
    { name: 'Rose clair', value: '#fce7f3', class: 'pink-light' },
    { name: 'Gris clair', value: '#f3f4f6', class: 'gray-light' },
  ];

  const colorList = isHighlight ? highlightColors : colors;

  // Fermer le popover si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
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

  // Obtenir la couleur actuelle
  useEffect(() => {
    if (!editor) return;

    const currentColor = isTextColor 
      ? editor.getAttributes('textStyle').color
      : editor.getAttributes('highlight').color;

    setSelectedColor(currentColor || '');
  }, [editor, isTextColor]);

  const handleColorSelect = (color: string) => {
    if (!editor) return;

    if (isTextColor) {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    } else {
      if (color) {
        editor.chain().focus().setHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }

    setSelectedColor(color);
    setIsOpen(false);
  };

  const isActive = isTextColor 
    ? editor?.isActive('textStyle', { color: selectedColor })
    : editor?.isActive('highlight', { color: selectedColor });

  return (
    <div className="color-button-container">
      <button
        ref={buttonRef}
        className={`color-button ${isActive ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isTextColor ? 'Couleur du texte' : 'Surlignage'}
        disabled={!editor}
      >
        {isTextColor ? <FiType size={16} /> : <FiEdit3 size={16} />}
        {selectedColor && (
          <div 
            className="color-indicator"
            style={{ backgroundColor: selectedColor }}
          />
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="color-popover"
        >
          <div className="color-popover-header">
            {isTextColor ? 'Couleur du texte' : 'Surlignage'}
          </div>
          <div className="color-grid">
            {colorList.map((color) => (
              <button
                key={color.value}
                className={`color-option ${color.class} ${
                  selectedColor === color.value ? 'selected' : ''
                }`}
                onClick={() => handleColorSelect(color.value)}
                title={color.name}
                style={color.value ? { backgroundColor: color.value } : {}}
              >
                {color.value === '' && (
                  <span className="color-option-default">A</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorButton;
