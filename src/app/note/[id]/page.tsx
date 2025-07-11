'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '../../../components/Editor';
import EditorPreview from '../../../components/EditorPreview';
import { getArticleById, updateArticle, createArticle } from '../../../services/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import type { Article } from '../../../types/supabase';
import { supabase } from '../../../supabaseClient';
import { FiMoreHorizontal } from 'react-icons/fi';
import { MdClose } from 'react-icons/md';

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [initialContent, setInitialContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [noteId, setNoteId] = useState<string>(id);
  const [classeurId, setClasseurId] = useState<string | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef<boolean>(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [titleAlign, setTitleAlign] = useState<string>('left');
  const [isPreview, setIsPreview] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    const fetchNote = async () => {
      if (noteId === 'new') {
        setTitle('');
        setInitialContent('');
        setHeaderImage('https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
        setTitleAlign('left');
        setHtmlContent('');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const note: Article = await getArticleById(noteId);
        setTitle(note.source_title || '');
        const markdownContent = note.markdown_content || '';
        setInitialContent(markdownContent);
        setClasseurId(note.classeur_id);
        setHeaderImage(note.header_image || null);
        setTitleAlign(note.title_align || 'left');
        setHtmlContent(note.html_content || '');
      } catch (err) {
        console.error('Failed to load note:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 0);
  }, [noteId]);

  useEffect(() => {
    if (!noteId || noteId === 'new') return;
    // Subscribe to realtime updates for this note
    const channel = supabase
      .channel('realtime-note-' + noteId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
          filter: 'id=eq.' + noteId,
        },
        (payload) => {
          const newContent = payload.new?.markdown_content;
          if (typeof newContent === 'string') {
            setInitialContent(newContent);
            // Optionnel : afficher un toast ou indicateur "synced"
            // Optionnel : bloquer la sauvegarde auto pendant le refresh
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  const handleSave = ({ title, markdown_content, html_content, headerImage, titleAlign: newAlign }: {
    title: string;
    markdown_content: string;
    html_content: string;
    headerImage?: string | null;
    titleAlign?: string;
  }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    hasUnsavedChanges.current = true;
    setHtmlContent(html_content || '');
    saveTimer.current = setTimeout(async () => {
      try {
        const dataToSave = {
          source_title: title || 'Nouvelle note',
          markdown_content,
          html_content,
          classeur_id: classeurId,
          header_image: headerImage,
          title_align: newAlign || titleAlign || 'left',
        };
        if (noteId === 'new') {
          if (!classeurId) {
            console.error('Classeur ID is missing. Cannot create a new note.');
            return;
          }
          const newNote: Article = await createArticle(dataToSave);
          if (newNote) {
            setNoteId(newNote.id);
            router.replace(`/note/${newNote.id}`);
          }
        } else {
          await updateArticle(noteId, dataToSave);
        }
        hasUnsavedChanges.current = false;
      } catch (err) {
        console.error('Failed to save note:', err);
      }
    }, 1000);
  };

  const handleClose = () => {
    if (hasUnsavedChanges.current && saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    router.back();
  };

  if (loading) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={noteId + (isPreview ? '-preview' : '-edit')}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        style={{ minHeight: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, zIndex: 1000, background: 'none' }}
      >
        {isPreview ? (
          <EditorPreview
            title={title}
            htmlContent={htmlContent}
            headerImage={headerImage ?? undefined}
            titleAlign={titleAlign as 'left' | 'center' | 'right'}
            markdownContent={initialContent}
          />
        ) : (
          <Editor
            key={noteId}
            initialTitle={title}
            initialContent={initialContent}
            headerImage={headerImage ?? undefined}
            initialTitleAlign={titleAlign}
            onClose={handleClose}
            onSave={handleSave}
            onTogglePreview={() => setIsPreview(true)}
          />
        )}
        {/* Bouton pour quitter le mode preview */}
        {isPreview && (
          <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 2000, display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 18, boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '2px 2px' }}>
            <button
              style={{ background: 'none', color: '#fff', border: 'none', borderRadius: 14, padding: 10, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s, color 0.18s' }}
              aria-label="Options preview"
            >
              <FiMoreHorizontal size={22} />
            </button>
            <button
              onClick={() => setIsPreview(false)}
              style={{ background: 'none', color: '#fff', border: 'none', borderRadius: 14, padding: 10, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s, color 0.18s' }}
              aria-label="Quitter le mode Preview"
            >
              <MdClose size={22} />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 