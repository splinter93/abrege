'use client';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorToolbar from '../../../components/EditorToolbar';
import { FiMoreVertical, FiEye, FiX, FiImage } from 'react-icons/fi';
import EditorKebabMenu from '../../../components/EditorKebabMenu';
import React from 'react';
import '../../../components/editor/editor-header.css';
import EditorHeaderImage from '../../../components/EditorHeaderImage';
import TableOfContents from '../../../components/TableOfContents';
import { EditorContent } from '@tiptap/react';
import slugify from 'slugify';
import type { Heading } from '@/types/editor';
import { useParams } from 'next/navigation';
import { updateArticle } from '@/services/api';
import { getArticleById } from '@/services/supabase';
import useEditorSave from '@/hooks/useEditorSave';
import toast from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';
import EditorPreview from '@/components/EditorPreview';
import { createMarkdownIt } from '@/utils/markdownItConfig';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import EditorSlashMenu from '@/components/EditorSlashMenu';
import { SLASH_COMMANDS } from '@/components/slashCommands';
import type { EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useRouter } from 'next/navigation';
type SlashCommand = {
  id: string;
  alias: Record<string, string>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  action?: (editor: any) => void;
  [key: string]: any;
};

const Logo = () => {
  const router = useRouter();
  return (
    <div
      className="editor-header-logo"
      style={{
        marginLeft: 18, // décolle du bord gauche
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none',
        gap: 8,
      }}
      onClick={() => router.push('/')}
      title="Retour à l'accueil"
      tabIndex={0}
      role="button"
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push('/'); }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'scale(0.95)' }}>
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-hover)" />
            <stop offset="100%" stopColor="var(--accent-primary)" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#logoGradient)" />
        <path d="M17 7L7 17M7 11v6h6" stroke="var(--bg-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{
        background: 'linear-gradient(to bottom right, var(--accent-hover), var(--accent-primary))',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        textTransform: 'lowercase',
        fontWeight: 600,
        fontSize: 19, // réduit de 5%
        fontFamily: 'Noto Sans, Inter, Arial, sans-serif'
      }}>abrège</span>
    </div>
  );
};

export default function NoteEditorPage() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: true,
        tightLists: true,
        linkify: true,
        breaks: true,
      }),
      TaskList,
      TaskItem,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: '',
    immediatelyRender: false,
  });
  const [headerImageUrl, setHeaderImageUrl] = React.useState<string | null>(null);
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [wideMode, setWideMode] = React.useState(false);
  const [a4Mode, setA4Mode] = React.useState(false);
  const [autosaveOn, setAutosaveOn] = React.useState(true);
  const [slashLang, setSlashLang] = React.useState<'fr' | 'en'>('fr');
  const [title, setTitle] = React.useState('');
  const [tocHeadings, setTocHeadings] = React.useState<Heading[]>([]);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);
  const slashMenuRef = React.useRef<EditorSlashMenuHandle>(null);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = React.useState(false);
  const params = useParams();
  const noteId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  // Hook de sauvegarde premium
  const { isSaving, handleSave } = useEditorSave({
    editor: (editor as any) ?? undefined,
    headerImage: headerImageUrl,
    onSave: async ({ title, markdown_content, html_content, headerImage }) => {
      if (!noteId) return;
      try {
        await updateArticle(noteId, {
          sourceTitle: title,
          markdownContent: markdown_content,
          htmlContent: html_content,
          headerImage,
        });
        setLastSaved(new Date());
      } catch (err) {
        // toast error déjà géré dans le hook
      }
    },
  });

  // Chargement initial de la note (une seule fois)
  React.useEffect(() => {
    if (!editor || !noteId || hasInitialized) return;
    setLoading(true);
    setLoadError(null);
    getArticleById(noteId)
      .then((note: any) => {
        if (note) {
          setTitle(note.source_title || '');
          setHeaderImageUrl(note.header_image || null);
          editor.commands.setContent(note.markdown_content || '');
        }
        setHasInitialized(true);
        setLoading(false);
      })
      .catch((err: any) => {
        setLoadError('Erreur lors du chargement de la note.');
        setLoading(false);
      });
  }, [editor, noteId, hasInitialized]);

  // Fonction utilitaire pour extraire les headings du doc Tiptap
  function getHeadingsFromEditor(editorInstance: typeof editor): Heading[] {
    if (!editorInstance || !editorInstance.state) return [];
    const headings: Heading[] = [];
    const slugCount: Record<string, number> = {};
    editorInstance.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        let baseSlug = slugify(`${node.textContent}-${node.attrs.level}`, { lower: true, strict: true });
        let slug = baseSlug;
        if (slugCount[baseSlug] !== undefined) {
          slug = `${baseSlug}-${++slugCount[baseSlug]}`;
        } else {
          slugCount[baseSlug] = 0;
        }
        headings.push({
          id: slug,
          text: node.textContent,
          level: node.attrs.level,
        });
      }
    });
    return headings;
  }

  // Fonction pour compter les mots du contenu
  function getWordCount(): number {
    if (!editor) return 0;
    const text = editor.getText();
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  // Fonction pour afficher la date de sauvegarde en format relatif
  function getRelativeTime(date: Date | null): string {
    if (!date) return '—';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // en secondes
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min. ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  // Met à jour la TOC à chaque changement du doc
  React.useEffect(() => {
    if (!editor) return;
    const updateTOC = () => setTocHeadings(getHeadingsFromEditor(editor));
    updateTOC();
    editor.on('transaction', updateTOC);
    return () => {
      editor.off('transaction', updateTOC);
    };
  }, [editor]);

  // Autosave à chaque modif (debounce 1s)
  React.useEffect(() => {
    if (!editor) return;
    let timeout: NodeJS.Timeout | null = null;
    let savingToastId: string | undefined;
    const triggerSave = () => {
      if (timeout) clearTimeout(timeout);
      // Affiche le toast "sauvegarde en cours" (icône disquette orange)
      savingToastId = toast(
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiSave color="#FFA500" size={18} style={{ marginRight: 4 }} />
          <span style={{ color: '#FFA500', fontWeight: 500, fontSize: 13 }}>Saving…</span>
        </span>,
        {
          id: 'autosave-toast',
          duration: 999999, // reste tant que la sauvegarde n'est pas finie
          position: 'bottom-right',
          style: {
            background: 'rgba(30,30,40,0.98)',
            color: '#FFA500',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
            borderRadius: 10,
            padding: '8px 16px',
            minWidth: 0,
            fontSize: 13,
          },
          icon: null,
        }
      );
      timeout = setTimeout(() => {
        handleSave(title, editor.getText());
        // Ferme le toast "sauvegarde en cours" après la sauvegarde (succès ou erreur)
        toast.dismiss('autosave-toast');
      }, 1000);
    };
    editor.on('transaction', triggerSave);
    // Ajoute le raccourci clavier Cmd+S / Ctrl+S pour sauvegarde manuelle
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(title, editor.getText());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      editor.off('transaction', triggerSave);
      if (timeout) clearTimeout(timeout);
      toast.dismiss('autosave-toast');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, title, handleSave]);

  // Sauvegarde automatique du header image
  React.useEffect(() => {
    if (!editor || !hasInitialized) return;
    handleSave(title, editor.getText());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerImageUrl]);

  // Ajoute des lignes vides à la fin pour garantir au moins 7 lignes éditables (sans boucle infinie)
  React.useEffect(() => {
    if (!editor) return;
    const minLines = 5;
    const padEmptyParagraphs = () => {
      const doc = editor.state.doc;
      // Récupère tous les paragraphes
      const paragraphs = [];
      doc.forEach(node => {
        if (node.type.name === 'paragraph') paragraphs.push(node);
      });
      // Si le doc est vide ou a moins de minLines, on pad
      if (paragraphs.length < minLines) {
        let toAdd = minLines - paragraphs.length;
        // Vérifie si les derniers nœuds du doc sont déjà des paragraphes vides
        const childCount = doc.childCount;
        let i = childCount - 1;
        while (toAdd > 0 && i >= 0) {
          const child = doc.child(i);
          if (child.type.name === 'paragraph' && child.content.size === 0) {
            toAdd--;
            i--;
          } else {
            break;
          }
        }
        if (toAdd > 0) {
          let emptyParas = '';
          for (let j = 0; j < toAdd; j++) emptyParas += '<p></p>';
          editor.commands.insertContent(emptyParas);
        }
      }
    };
    padEmptyParagraphs();
  }, [editor]);

  // Génère le HTML à partir du markdown courant (toujours avant tout return)
  const markdownContent = editor?.storage?.markdown?.getMarkdown ? editor.storage.markdown.getMarkdown() : '';
  const htmlContent = React.useMemo(() => {
    const md = createMarkdownIt();
    return md.render(markdownContent || '');
  }, [markdownContent]);

  // Ouvre le menu slash sur '/' dans la zone de texte
  React.useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement && editorContainerRef.current && editorContainerRef.current.contains(document.activeElement)) {
        // Calcule la position du caret pour placer le menu
        const selection = window.getSelection();
        let left = 0, top = 0;
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0).cloneRange();
          let rect = range.getBoundingClientRect();
          // Si la ligne est vide, getBoundingClientRect() peut retourner un rect vide
          if (rect && (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0)) {
            // On tente d'insérer un span temporaire pour obtenir la vraie position du caret
            const span = document.createElement('span');
            span.textContent = '\u200b';
            range.insertNode(span);
            rect = span.getBoundingClientRect();
            span.parentNode?.removeChild(span);
            // Replace le caret après le span
            selection.removeAllRanges();
            selection.addRange(range);
          }
          left = rect.left;
          top = rect.bottom;
        }
        if (slashMenuRef.current && typeof slashMenuRef.current.openMenu === 'function') {
          slashMenuRef.current.openMenu({ left, top });
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  if (loading) {
    return <div style={{ color: '#aaa', fontSize: 18, padding: 48, textAlign: 'center' }}>Chargement…</div>;
  }
  if (loadError) {
    return <div style={{ color: 'red', fontSize: 18, padding: 48, textAlign: 'center' }}>{loadError}</div>;
  }
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#18181c',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header sticky premium */}
      <header className="editor-header" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100vw',
        zIndex: 100,
        background: '#18181c',
        minHeight: 54,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        boxSizing: 'border-box',
        padding: 0,
        justifyContent: 'space-between'
      }}>
        <Logo />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {editor ? (
            <EditorToolbar editor={editor} setImageMenuOpen={setImageMenuOpen} />
          ) : (
            <div style={{ color: '#888', fontWeight: 500 }}>Chargement…</div>
          )}
        </div>
        <div className="editor-header-toolbar" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <button
            className="editor-header-preview"
            title={showPreview ? 'Quitter l’aperçu' : 'Aperçu'}
            style={{ background: 'none', border: 'none', color: showPreview ? 'var(--accent-primary)' : 'var(--text-2)', fontSize: 17, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onClick={() => setShowPreview(p => !p)}
          >
            <FiEye size={17} />
          </button>
          <button className="editor-header-kebab" title="Menu" style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>⋯</button>
          <button className="editor-header-close" title="Fermer" style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 17, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <FiX size={17} />
          </button>
        </div>
      </header>
      {/* Mode preview : EditorPreview */}
      {showPreview ? (
        <EditorPreview
          title={title}
          htmlContent={htmlContent}
          markdownContent={markdownContent}
          headerImage={headerImageUrl}
        />
      ) : (
        <>
          {/* Header image premium */}
          {headerImageUrl ? (
            <EditorHeaderImage
              headerImageUrl={headerImageUrl}
              onHeaderChange={setHeaderImageUrl}
              imageMenuOpen={imageMenuOpen}
              onImageMenuOpen={() => setImageMenuOpen(true)}
              onImageMenuClose={() => setImageMenuOpen(false)}
            />
          ) : (
            <div>
              <button
                title="Ajouter une image d’en-tête"
                style={{ position: 'fixed', top: 64, right: 0, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer', padding: '10px 18px 10px 8px', borderRadius: 8, zIndex: 1200, transition: 'background 0.18s, color 0.18s' }}
                onClick={() => setHeaderImageUrl('https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop')}
              >
                <FiImage size={20} />
              </button>
            </div>
          )}
          {/* Titre premium éditable */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <textarea
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de la note…"
              rows={1}
              style={{
                width: '100%',
                maxWidth: 750,
                fontSize: '2.25rem',
                fontWeight: 700,
                fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                color: 'var(--text-1)',
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: '0 0 8px 0',
                margin: 0,
                textAlign: 'left', // aligner le texte à gauche
                letterSpacing: '-0.02em',
                transition: 'font-size 0.2s, color 0.2s',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: 1.15,
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 3 * 45) + 'px';
              }}
            />
          </div>
          {/* Zone de texte premium sous le titre */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '0.5px' }}>
            <div
              className="editor-content markdown-body"
              ref={editorContainerRef}
              style={{
                width: '100%',
                maxWidth: 750,
                minHeight: 220,
                background: 'none',
                color: 'var(--text-1)',
                fontSize: '1.13rem',
                fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                fontWeight: 400,
                lineHeight: 1.8,
                border: 'none',
                outline: 'none',
                borderRadius: 10,
                padding: '18px 0 120px 0', // Ajoute 120px de padding en bas (environ 7 lignes)
                margin: 0,
                boxSizing: 'border-box',
                textAlign: 'left',
                transition: 'box-shadow 0.18s',
                position: 'relative',
              }}
            >
              {editor && <EditorContent editor={editor} />}
              {/* SlashMenu premium */}
              <EditorSlashMenu
                ref={slashMenuRef}
                lang={slashLang}
                onInsert={(cmd: SlashCommand) => {
                  if (!editor) return;
                  if (typeof cmd.action === 'function') {
                    cmd.action(editor);
                  }
                }}
              />
            </div>
          </div>
          {/* TOC premium à droite */}
          <div style={{ position: 'fixed', top: 385, right: 0, zIndex: 1002, minWidth: 32, maxWidth: 300, padding: '0 18px 0 0', boxSizing: 'border-box' }}>
            <TableOfContents headings={tocHeadings} containerRef={editorContainerRef} />
          </div>
          {/* Le reste de la page éditeur ici... */}
          {/* Footer fixe premium */}
          <footer style={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: '100vw',
            background: 'rgba(24,24,28,0.98)',
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-3)',
            fontSize: 12,
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: 28,
            zIndex: 1201,
            letterSpacing: 0.01,
            boxSizing: 'border-box',
            userSelect: 'none',
          }}>
            <div style={{ flex: 1, textAlign: 'left' }}>
              Last Saved : {getRelativeTime(lastSaved)}
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              {getWordCount()} words
            </div>
          </footer>
        </>
      )}
    </div>
  );
} 