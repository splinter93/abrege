import React, { useState, useRef, useEffect } from 'react';
import './RenameInput.css';

interface RenameInputProps {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  /** Variante visuelle : 'default', 'tab', 'pill', 'item' (grille), 'item-list' (liste, taille au texte) */
  variant?: 'default' | 'tab' | 'pill' | 'item' | 'item-list';
}

const RenameInput: React.FC<RenameInputProps> = ({ initialValue, onSubmit, onCancel, autoFocus, variant = 'default' }) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() !== '') {
        onSubmit(value.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (value.trim() !== '') {
      onSubmit(value.trim());
    } else {
      onCancel();
    }
  };

  const isSizedToContent = variant === 'tab' || variant === 'pill' || variant === 'item-list';
  const isItemFixed = variant === 'item';

  return (
    <span className={`item-rename-input-wrap ${isSizedToContent ? 'item-rename-input-wrap--sized' : ''} ${isItemFixed ? 'item-rename-input-wrap--fixed' : ''}`}>
      {isSizedToContent && (
        <span className="item-rename-input-ghost" aria-hidden>
          {value || '\u00A0'}
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`item-rename-input item-rename-input--${variant === 'item-list' ? 'item' : variant}`}
        autoFocus={autoFocus}
        spellCheck={false}
        aria-label="Nouveau nom"
      />
    </span>
  );
};

export default RenameInput; 