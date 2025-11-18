import React from 'react';

interface EditorTitleProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

const EditorTitle: React.FC<EditorTitleProps> = ({
  value,
  onChange,
  onBlur,
  onFocus,
  inputRef,
  disabled,
  placeholder,
  style
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
      style={{
        width: 'var(--editor-content-width)',
        height: '45px',
        minHeight: '45px',
        maxHeight: '45px',
        padding: 0,
        margin: '20px 0 0 0', // Réduit le margin-top à 20px
        fontSize: '2.25rem',
        fontWeight: 700,
        lineHeight: 1.1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary)',
        fontFamily: 'Figtree, Geist, -apple-system, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        resize: 'none',
        textAlign: 'center',
        ...style,
      }}
    />
  );
};

export default EditorTitle; 