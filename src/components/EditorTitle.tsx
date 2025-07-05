import React, { useEffect } from 'react';

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
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => {
    if (inputRef?.current) {
      const el = inputRef.current;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value, inputRef]);

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
      onInput={handleInput}
      className="editor-title-input"
      rows={1}
      wrap="soft"
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...style,
        resize: 'none',
        width: '100%',
        minHeight: '38px',
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1.2,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: 0,
        margin: 0,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        overflow: 'hidden',
        boxSizing: 'border-box',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        transition: 'height 0.1s ease'
      }}
      spellCheck={true}
      autoFocus
    />
  );
};

export default EditorTitle; 