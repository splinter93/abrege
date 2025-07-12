import React, { useRef, useEffect } from 'react';

interface EditorTitleProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}

/**
 * Champ de titre de l’éditeur, auto-resize, centré.
 */
const EditorTitle: React.FC<EditorTitleProps> = ({ value, onChange, onBlur, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = '45px';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="editor-title-wrapper" style={{ minHeight: 45, width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 0, marginBottom: 24 }}>
      <textarea
        ref={textareaRef}
        className="editor-title"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder || 'Titre de la note...'}
        rows={1}
        wrap="soft"
        style={{
          width: '750px',
          minHeight: '45px',
          maxHeight: '200px',
          height: 'auto',
          margin: 0,
          padding: 0,
          resize: 'none',
          overflow: 'hidden',
          fontSize: '2.25rem',
          fontWeight: 700,
          lineHeight: 1.1,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: 'inherit',
          fontFamily: 'inherit',
          whiteSpace: 'pre-line',
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
        autoComplete="off"
        spellCheck={true}
      />
    </div>
  );
};

export default EditorTitle; 