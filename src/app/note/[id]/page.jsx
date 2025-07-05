'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '../../../components/Editor';
import { getArticleById, updateArticle, createArticle } from '../../../services/supabase';

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [initialContent, setInitialContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [noteId, setNoteId] = useState(id);
  const [classeurId, setClasseurId] = useState(null);
  const saveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);
  const [headerImage, setHeaderImage] = useState(null);
  const [titleAlign, setTitleAlign] = useState('left');

  useEffect(() => {
    const fetchNote = async () => {
      if (noteId === 'new') {
        setTitle('');
        setInitialContent('');
        setHeaderImage(null);
        setTitleAlign('left');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const note = await getArticleById(noteId);
        setTitle(note.source_title || '');
        const htmlContent = note.html_content || '';
        setInitialContent(htmlContent);
        setClasseurId(note.classeur_id);
        setHeaderImage(note.headerImage || note.header_image || null);
        setTitleAlign(note.title_align || 'left');
      } catch (err) {
        console.error('Failed to load note:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [noteId]);

  const handleSave = ({ title, markdown_content, html_content, headerImage, titleAlign: newAlign }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    hasUnsavedChanges.current = true;
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
          const newNote = await createArticle(dataToSave);
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
    return (
      <div className="note-editor-loading">
        <span>Chargement...</span>
      </div>
    );
  }

  return (
    <Editor
      key={noteId}
      initialTitle={title}
      initialContent={initialContent}
      headerImage={headerImage}
      initialTitleAlign={titleAlign}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
} 