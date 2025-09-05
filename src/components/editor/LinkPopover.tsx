import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { FiLink, FiExternalLink, FiUnlink } from 'react-icons/fi';

interface LinkPopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

const LinkPopover: React.FC<LinkPopoverProps> = ({ editor, isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && editor) {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      setText(selectedText);
      
      // Vérifier si c'est déjà un lien
      const linkMark = editor.getAttributes('link');
      if (linkMark.href) {
        setUrl(linkMark.href);
      } else {
        setUrl('');
      }
      
      // Focus sur l'input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editor) return;
    
    if (url) {
      if (text) {
        // Remplacer le texte sélectionné par un lien
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
      } else {
        // Ajouter un lien au texte sélectionné
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    
    onClose();
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  const handleOpenLink = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="link-popover">
      <div className="link-popover-content">
        <div className="link-popover-header">
          <FiLink size={16} />
          <span>Lien</span>
        </div>
        
        <form onSubmit={handleSubmit} className="link-popover-form">
          <div className="link-popover-field">
            <label htmlFor="link-text">Texte</label>
            <input
              id="link-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Texte du lien"
              className="link-popover-input"
            />
          </div>
          
          <div className="link-popover-field">
            <label htmlFor="link-url">URL</label>
            <input
              ref={inputRef}
              id="link-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemple.com"
              className="link-popover-input"
              required
            />
          </div>
          
          <div className="link-popover-actions">
            <button
              type="button"
              onClick={handleRemoveLink}
              className="link-popover-button link-popover-button-danger"
              disabled={!editor?.isActive('link')}
            >
              <FiUnlink size={14} />
              Supprimer
            </button>
            
            {url && (
              <button
                type="button"
                onClick={handleOpenLink}
                className="link-popover-button link-popover-button-secondary"
              >
                <FiExternalLink size={14} />
                Ouvrir
              </button>
            )}
            
            <button
              type="submit"
              className="link-popover-button link-popover-button-primary"
              disabled={!url}
            >
              Appliquer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkPopover;
