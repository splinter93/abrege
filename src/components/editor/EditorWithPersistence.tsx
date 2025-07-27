import React, { useEffect, useState } from 'react';
import { useEditorPersistence } from '@/hooks/useEditorPersistence';
import { UnsavedChangesIndicator } from '@/components/UnsavedChangesIndicator';
import useEditorSave from '@/hooks/useEditorSave';

interface EditorWithPersistenceProps {
  noteId: string;
  initialTitle: string;
  initialContent: string;
  onSave: (data: { title: string; markdown_content: string; html_content: string }) => Promise<void>;
}

/**
 * Exemple de composant d'éditeur avec persistance locale
 * 
 * Fonctionnalités :
 * - Sauvegarde automatique locale des changements
 * - Restauration automatique au chargement
 * - Indicateur visuel des changements non sauvegardés
 * - Nettoyage après sauvegarde réussie
 */
export const EditorWithPersistence: React.FC<EditorWithPersistenceProps> = ({
  noteId,
  initialTitle,
  initialContent,
  onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  
  const {
    saveNoteLocally,
    updateNoteContent,
    updateNoteTitle,
    restorePersistedNote,
    clearNote,
    hasUnsavedChangesForNote,
  } = useEditorPersistence();

  // Mock de l'éditeur pour l'exemple
  const mockEditor = {
    getHTML: () => `<div>${content}</div>`,
    storage: { 
      markdown: { 
        getMarkdown: () => content 
      } 
    }
  };

  const { isSaving, handleSave } = useEditorSave({
    onSave,
    editor: mockEditor,
  });

  // Restaurer la note persistée au chargement
  useEffect(() => {
    const persistedNote = restorePersistedNote(noteId);
    if (persistedNote) {
      setTitle(persistedNote.title);
      setContent(persistedNote.content);
    }
  }, [noteId, restorePersistedNote]);

  // Sauvegarder localement les changements
  useEffect(() => {
    if (title !== initialTitle || content !== initialContent) {
      saveNoteLocally(noteId, title, content);
    }
  }, [noteId, title, content, initialTitle, initialContent, saveNoteLocally]);

  // Gérer les changements de titre
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    updateNoteTitle(newTitle);
  };

  // Gérer les changements de contenu
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    updateNoteContent(newContent);
  };

  // Gérer la sauvegarde
  const handleSaveClick = async () => {
    await handleSave(title, content);
  };

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      clearNote();
    };
  }, [clearNote]);

  return (
    <div className="editor-with-persistence">
      {/* Indicateur de changements non sauvegardés */}
      <UnsavedChangesIndicator />
      
      {/* Interface de l'éditeur */}
      <div className="editor-container">
        <div className="editor-header">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Titre de la note"
            className="editor-title-input"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '18px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-1)',
              outline: 'none',
            }}
          />
          
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="save-button"
            style={{
              padding: '8px 16px',
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Contenu de la note..."
          className="editor-content"
          style={{
            width: '100%',
            minHeight: '400px',
            padding: '16px',
            fontSize: '14px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-1)',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'monospace',
          }}
        />
        
        {/* Indicateur de statut */}
        <div className="editor-status">
          {hasUnsavedChangesForNote(noteId) && (
            <span style={{ color: 'var(--accent-primary)', fontSize: '12px' }}>
              ● Changements non sauvegardés
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorWithPersistence; 