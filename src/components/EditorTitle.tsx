import React from 'react';

interface EditorTitleProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
}

const EditorTitle: React.FC<EditorTitleProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  inputRef,
  disabled,
  placeholder
}) => {
  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          inputRef?.current?.blur();
        }
      }}
      className="editor-title-input"
      rows={1}
      wrap="soft"
      placeholder={placeholder}
      disabled={disabled}
      spellCheck={true}
      autoFocus
    />
  );
};

export default EditorTitle; 