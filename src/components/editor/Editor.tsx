import React from 'react';
import '@/styles/markdown.css';
import EditorLayout from './EditorLayout';
import EditorHeader from './EditorHeader';
import EditorContent from './EditorContent';
import EditorToolbar from '@/components/EditorToolbar';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import EditorTitle from './EditorTitle';
import PublicTableOfContents from '@/components/TableOfContents';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import useEditorSave from '@/hooks/useEditorSave';
import { useEditor, EditorContent as TiptapEditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import Link from '@tiptap/extension-link';
import CustomImage from '@/extensions/CustomImage';
import EditorSlashMenu, { type EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import { useRouter } from 'next/navigation';
import { FiEye, FiX } from 'react-icons/fi';
import { OptimizedApi } from '@/services/optimizedApi';
import { supabase } from '@/supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * Full Editor – markdown is source of truth; HTML only for display.
 */
const Editor: React.FC<{ noteId: string; readonly?: boolean; userId?: string }> = ({ noteId, readonly = false, userId = 'me' }) => {
  const router = useRouter();
  const selectNote = React.useCallback((s: FileSystemState) => s.notes[noteId], [noteId]);
  const note = useFileSystemStore(selectNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  const content = note?.content || note?.markdown_content || '';
  const { html } = useMarkdownRender({ content });

  const [title, setTitle] = React.useState<string>(note?.source_title || note?.title || '');
  React.useEffect(() => { setTitle(note?.source_title || note?.title || ''); }, [note?.source_title, note?.title]);

  const [headerImageUrl, setHeaderImageUrl] = React.useState<string | null>(note?.header_image || null);
  const [headerOffset, setHeaderOffset] = React.useState<number>(50);
  const [headerBlur, setHeaderBlur] = React.useState<number>(0);
  const [headerOverlay, setHeaderOverlay] = React.useState<number>(0);
  const [titleInImage, setTitleInImage] = React.useState<boolean>(false);
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);

  // header actions state
  const [previewMode, setPreviewMode] = React.useState(false);

  // Kebab state
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const kebabBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const [kebabPos, setKebabPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [published, setPublished] = React.useState(false);
  const publishInitRef = React.useRef(false);
  const [a4Mode, setA4Mode] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);
  const [slashLang, setSlashLang] = React.useState<'fr' | 'en'>('en');

  const isReadonly = readonly || previewMode;

  React.useEffect(() => {
    if (kebabOpen && kebabBtnRef.current) {
      const r = kebabBtnRef.current.getBoundingClientRect();
      setKebabPos({ top: r.bottom + 8, left: r.right - 200 });
    }
  }, [kebabOpen]);

  // Ref to the element that contains .ProseMirror so TOC can scroll into view
  const editorContainerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (note?.header_image) setHeaderImageUrl(note.header_image);
  }, [note?.header_image]);

  // Hydrate appearance fields from note
  React.useEffect(() => {
    if (typeof note?.header_image_offset === 'number') setHeaderOffset(note.header_image_offset);
  }, [note?.header_image_offset]);
  React.useEffect(() => {
    if (typeof note?.header_image_blur === 'number') setHeaderBlur(note.header_image_blur);
  }, [note?.header_image_blur]);
  React.useEffect(() => {
    if (typeof note?.header_image_overlay === 'number') setHeaderOverlay(note.header_image_overlay as number);
  }, [note?.header_image_overlay]);
  React.useEffect(() => {
    if (typeof note?.header_title_in_image === 'boolean') setTitleInImage(note.header_title_in_image);
  }, [note?.header_title_in_image]);
  React.useEffect(() => {
    if (typeof note?.wide_mode === 'boolean') setFullWidth(note.wide_mode);
  }, [note?.wide_mode]);

  const slashMenuRef = React.useRef<EditorSlashMenuHandle | null>(null);

  // Real Tiptap editor instance (Markdown as source of truth)
  const editor = useEditor({
    editable: !isReadonly,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      // Custom image node view to hook our image menu
      (CustomImage as any).configure?.({}) ?? (CustomImage as any),
      Markdown.configure({ html: false })
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      try {
        const md = (editor.storage as any)?.markdown?.getMarkdown?.() as string | undefined;
        const nextMarkdown = typeof md === 'string' ? md : content;
        if (nextMarkdown !== content) {
          updateNote(noteId, { content: nextMarkdown, markdown_content: nextMarkdown });
        }
      } catch {
        // ignore
      }
    },
    // Option read by CustomImage
    handleOpenImageMenu: () => setImageMenuOpen(true),
  } as any);

  // Open slash menu on '/'
  React.useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;
    const onKeyDown = (e: KeyboardEvent) => {
      // If user types a space right after '/', close menu but do not delete any text
      if (e.key === ' ' && (editor as any)) {
        try {
          const { state } = editor.view;
          const pos = state.selection.from;
          const $pos = state.doc.resolve(pos);
          const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
          if (/^\/$/.test(textBefore)) {
            // User typed "/ ": close menu and keep the slash in content
            slashMenuRef.current?.closeMenu?.();
            return; // do not open
          }
        } catch {}
      }
      if (e.key === '/') {
        // Only open if at start of block or after whitespace
        const { state } = editor.view;
        const pos = state.selection.from;
        const $pos = state.doc.resolve(pos);
        const indexInParent = $pos.parentOffset;
        let shouldOpen = indexInParent === 0;
        if (!shouldOpen && indexInParent > 0) {
          const charBefore = $pos.parent.textBetween(indexInParent - 1, indexInParent, undefined, '\uFFFC');
          if (!charBefore || /\s/.test(charBefore)) shouldOpen = true;
        }
        if (shouldOpen) {
          e.preventDefault();
          const coords = editor.view.coordsAtPos(state.selection.from);
          slashMenuRef.current?.openMenu({ left: coords.left, top: coords.top });
        }
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [editor, isReadonly]);

  // Save hook
  const { handleSave } = useEditorSave({
    editor: editor as any,
    onSave: async ({ title: newTitle, markdown_content, html_content }) => {
      const api = OptimizedApi.getInstance();
      await api.updateNote(noteId, {
        source_title: newTitle ?? title ?? 'Untitled',
        markdown_content,
        html_content,
      });
    }
  });

  // Persist publish toggle to DB
  React.useEffect(() => {
    if (!publishInitRef.current) { publishInitRef.current = true; return; }
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Authentification requise');
        const res = await fetch(`/api/v1/note/${encodeURIComponent(noteId)}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ispublished: published })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Erreur publication');
        if (json?.url) {
          useFileSystemStore.getState().updateNote(noteId, { public_url: json.url } as any);
        }
        toast.success(published ? 'Note publiée' : 'Note dépubliée');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erreur publication');
      }
    })();
  }, [published, noteId]);

  // Persist font changes via toolbar callback
  const handleFontChange = React.useCallback(async (fontName: string) => {
    try {
      const api = OptimizedApi.getInstance();
      await api.updateNoteAppearance(noteId, { font_family: fontName } as any);
      useFileSystemStore.getState().updateNote(noteId, { font_family: fontName } as any);
    } catch {}
  }, [noteId]);

  // Ctrl/Cmd+S
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(title || 'Untitled', content); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave, title, content]);

  // Save title on blur
  const handleTitleBlur = React.useCallback(() => {
    handleSave(title || 'Untitled', content);
  }, [handleSave, title, content]);

  // Build headings for TOC
  const headings = React.useMemo(() => {
    if (typeof document === 'undefined') return [] as { id: string; text: string; level: number }[];
    const container = document.createElement('div');
    container.innerHTML = html || '';
    const items: { id: string; text: string; level: number }[] = [];
    container.querySelectorAll('h2, h3').forEach((el) => {
      const level = el.tagName === 'H2' ? 2 : 3;
      let id = el.id || el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '';
      if (!el.id) el.id = id;
      items.push({ id, text: el.textContent || '', level });
    });
    return items.map(h => ({ id: h.id, text: h.text, level: h.level }));
  }, [html]);

  const handlePreviewClick = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      let url: string | null = null;

      // Try to use stored public_url if available
      const n = useFileSystemStore.getState().notes[noteId];
      const publicUrl = (n as any)?.public_url as string | null | undefined;
      if (publicUrl) {
        url = publicUrl;
      } else {
        // Fallback: fetch user to build /@username/id/[noteId]
        const { data: { user } } = await supabase.auth.getUser();
        const username = (user as any)?.user_metadata?.username;
        if (username) {
          url = `/@${username}/id/${noteId}`;
        }
      }
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch {}
  }, [noteId]);

  if (!note) {
    return <div className="editor-flex-center editor-padding-standard">Chargement…</div>;
  }

  return (
    <>
      <div style={{ position: 'fixed', right: 8, top: 383, zIndex: 30 }}>
        <PublicTableOfContents headings={headings as any} containerRef={editorContainerRef as any} />
      </div>
      <EditorLayout
        layoutClassName={headerImageUrl ? (titleInImage ? 'noteLayout imageWithTitle' : 'noteLayout imageOnly') : 'noteLayout noImage'}
        header={(
          <>
            <EditorHeader
              headerImageUrl={null}
              rightSlot={(
                <>
                  <button
                    className={`editor-header-preview${previewMode ? ' active' : ''}`}
                    aria-label="Aperçu"
                    title="Aperçu"
                    onClick={handlePreviewClick}
                  >
                    <FiEye size={16} />
                  </button>
                  <button ref={kebabBtnRef} className="editor-header-kebab" aria-label="Options" title="Options" onClick={() => setKebabOpen(v => !v)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="5" r="2" fill="currentColor" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      <circle cx="12" cy="19" r="2" fill="currentColor" />
                    </svg>
                  </button>
                  <button
                    className="editor-header-close"
                    aria-label="Fermer"
                    title="Fermer"
                    onClick={() => router.back()}
                  >
                    <FiX size={16} />
                  </button>
                </>
              )}
            >
              <EditorToolbar editor={isReadonly ? null : (editor as any)} setImageMenuOpen={setImageMenuOpen} onFontChange={handleFontChange} />
            </EditorHeader>
            <EditorHeaderImage
              headerImageUrl={headerImageUrl}
              headerImageOffset={headerOffset}
              headerImageBlur={headerBlur}
              headerImageOverlay={headerOverlay}
              headerTitleInImage={titleInImage}
              onHeaderChange={async (url) => {
                setHeaderImageUrl(url);
                try {
                  const api = OptimizedApi.getInstance();
                  // Optimistic update
                  updateNote(noteId, { header_image: url });
                  await api.updateNoteAppearance(noteId, { header_image: url ?? null });
                } catch {}
              }}
              onHeaderOffsetChange={async (offset) => {
                setHeaderOffset(offset);
                try {
                  const api = OptimizedApi.getInstance();
                  updateNote(noteId, { header_image_offset: offset } as any);
                  await api.updateNoteAppearance(noteId, { header_image_offset: offset });
                } catch {}
              }}
              onHeaderBlurChange={async (blur) => {
                setHeaderBlur(blur);
                try {
                  const api = OptimizedApi.getInstance();
                  updateNote(noteId, { header_image_blur: blur } as any);
                  await api.updateNoteAppearance(noteId, { header_image_blur: blur });
                } catch {}
              }}
              onHeaderOverlayChange={async (overlay) => {
                setHeaderOverlay(overlay);
                try {
                  const api = OptimizedApi.getInstance();
                  updateNote(noteId, { header_image_overlay: overlay } as any);
                  await api.updateNoteAppearance(noteId, { header_image_overlay: overlay });
                } catch {}
              }}
              onHeaderTitleInImageChange={async (v) => {
                setTitleInImage(v);
                try {
                  const api = OptimizedApi.getInstance();
                  updateNote(noteId, { header_title_in_image: v } as any);
                  await api.updateNoteAppearance(noteId, { header_title_in_image: v });
                } catch {}
              }}
              imageMenuOpen={imageMenuOpen}
              onImageMenuOpen={() => setImageMenuOpen(true)}
              onImageMenuClose={() => setImageMenuOpen(false)}
              noteId={note.id}
              userId={userId}
            />
            <EditorKebabMenu
              open={kebabOpen}
              position={kebabPos}
              onClose={() => setKebabOpen(false)}
              a4Mode={a4Mode}
              setA4Mode={setA4Mode}
              slashLang={slashLang}
              setSlashLang={setSlashLang}
              published={published}
              setPublished={setPublished}
              fullWidth={fullWidth}
              setFullWidth={setFullWidth}
            />
          </>
        )}
        title={<EditorTitle value={title} onChange={setTitle} onBlur={handleTitleBlur} placeholder="Titre de la note..." />}
        content={(
          <EditorContent>
            {!isReadonly && (
              <div className="tiptap-editor-container" ref={editorContainerRef as any}>
                <TiptapEditorContent editor={editor} />
                {/* Slash commands menu */}
                <EditorSlashMenu
                  ref={slashMenuRef}
                  lang={slashLang}
                  onInsert={(cmd) => {
                    if (!editor) return;
                    try {
                      // Remove any preceding slash token if present
                      const { state, dispatch } = editor.view;
                      const from = state.selection.from;
                      const $pos = state.doc.resolve(from);
                      const start = $pos.start();
                      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
                      const match = textBefore.match(/\/?[\w-]*$/);
                      if (match) {
                        const deleteFrom = start + $pos.parentOffset - match[0].length;
                        dispatch(state.tr.delete(deleteFrom, from));
                      }
                    } catch {}
                    // Execute command action
                    if (typeof cmd.action === 'function') {
                      (cmd.action as any)(editor);
                    }
                  }}
                />
              </div>
            )}
            {isReadonly && (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </EditorContent>
        )}
      />
    </>
  );
};

export default Editor; 