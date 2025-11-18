import React from 'react';
import { useAutoResize } from '@/hooks/editor/useAutoResize';
import './editor-title.css';

interface EditorTitleProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  wideMode?: boolean; // Nouvelle prop pour le mode wide
  disabled?: boolean; // Mode readonly
}

/**
 * Champ de titre de l'éditeur, auto-resize, centré.
 */
const EditorTitle: React.FC<EditorTitleProps> = ({ value, onChange, onBlur, placeholder, wideMode, disabled = false }) => {
  // ✅ Nettoyer le titre : supprimer les sauts de ligne en fin de chaîne
  const cleanedValue = value.replace(/\n+$/, '').replace(/\r+$/, '');
  
  const { textareaRef } = useAutoResize({ 
    value: cleanedValue, 
    wideMode,
    minHeight: 45,
    maxHeight: 600 // Permet jusqu'à 10-12 lignes sans scroll
  });

  return (
    <div className="editor-title-wrapper">
      <textarea
        ref={textareaRef}
        className="editor-title-field"
        value={cleanedValue}
        onChange={e => {
          // ✅ Nettoyer aussi lors du onChange pour éviter l'accumulation
          const cleaned = e.target.value.replace(/\n+$/, '').replace(/\r+$/, '');
          onChange(cleaned);
        }}
        onBlur={onBlur}
        placeholder={placeholder || 'Titre de la note...'}
        rows={1}
        wrap="soft"
        autoComplete="off"
        spellCheck={true}
        aria-label="Titre de la note"
        role="textbox"
        tabIndex={0}
        disabled={disabled}
        readOnly={disabled}
      />
    </div>
  );
};

export default EditorTitle; 