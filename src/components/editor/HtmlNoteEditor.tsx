'use client';

import React from 'react';
import { FiFeather } from 'react-icons/fi';
import { Code2, Eye, X } from 'lucide-react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { logger, LogCategory } from '@/utils/logger';
import HtmlNoteRenderer from './HtmlNoteRenderer';

interface HtmlNoteEditorProps {
  noteId: string;
  title: string;
  rawContent: string | undefined;
  updateNote: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

const HtmlNoteEditor: React.FC<HtmlNoteEditorProps> = ({
  noteId,
  title,
  rawContent,
  updateNote,
  onClose,
}) => {
  const [showSource, setShowSource] = React.useState(false);
  const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveNow = React.useCallback(async () => {
    const currentContent = useFileSystemStore.getState().notes[noteId]?.markdown_content;
    if (!currentContent) return;
    try {
      const { editorSaveService } = await import('@/services/editor/EditorSaveService');
      await editorSaveService.saveNote(noteId, { markdown_content: currentContent });
    } catch (e) {
      logger.error(LogCategory.EDITOR, '[HtmlNoteEditor] Save failed', e);
    }
  }, [noteId]);

  const handleContentChange = React.useCallback((newContent: string) => {
    updateNote(noteId, { markdown_content: newContent });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveNow, 800);
  }, [noteId, updateNote, saveNow]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveNow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveNow]);

  React.useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  return (
    <div className="html-fullscreen-view">
      <div className="html-fullscreen-header">
        <div className="html-fullscreen-header__left">
          <FiFeather className="html-fullscreen-header__logo" />
          <span className="html-fullscreen-header__title">{title}</span>
          <span className="html-fullscreen-header__badge">HTML</span>
        </div>
        <div className="html-fullscreen-header__right">
          <button
            className="html-fullscreen-header__btn"
            onClick={() => setShowSource(prev => !prev)}
            title={showSource ? 'Aperçu' : 'Code source'}
          >
            {showSource ? <Eye size={15} /> : <Code2 size={15} />}
            {showSource ? 'Aperçu' : 'Source'}
          </button>
          <button
            className="html-fullscreen-header__btn"
            onClick={onClose}
            title="Fermer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="html-fullscreen-body">
        <HtmlNoteRenderer
          htmlContent={rawContent}
          showSource={showSource}
          hideToolbar
          fullscreen
          onContentChange={handleContentChange}
        />
      </div>
    </div>
  );
};

export default HtmlNoteEditor;
