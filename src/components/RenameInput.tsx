import React, { useState, useRef, useEffect } from 'react';

interface RenameInputProps {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
}

const RenameInput: React.FC<RenameInputProps> = ({ initialValue, onSubmit, onCancel, autoFocus }) => {
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
      if (value.trim() !== '') onSubmit(value.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (value.trim() !== '') onSubmit(value.trim());
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="item-rename-input"
      autoFocus={autoFocus}
      spellCheck={false}
    />
  );
};

export default RenameInput; 