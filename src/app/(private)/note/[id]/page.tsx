'use client';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorToolbar from '@/components/EditorToolbar';
import { FiEye, FiX, FiImage } from 'react-icons/fi';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import React, { useRef, useEffect } from 'react';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import TableOfContents from '@/components/TableOfContents';
import { EditorContent } from '@tiptap/react';
import slugify from 'slugify';
import type { Heading } from '@/types/editor';
import { useParams } from 'next/navigation';
import { updateNoteREST } from '@/services/api';
import { getArticleById } from '@/services/supabase';
import useEditorSave from '@/hooks/useEditorSave';
// import { useEditorPersistence } from '@/hooks/useEditorPersistence';
// import { UnsavedChangesIndicator } from '@/components/UnsavedChangesIndicator';
import toast from 'react-hot-toast';
import EditorPreview from '@/components/EditorPreview';
import { createMarkdownIt } from '@/utils/markdownItConfig';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import EditorSlashMenu from '@/components/EditorSlashMenu';
import type { EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import CustomImage from '@/extensions/CustomImage';
import { useSession } from '@supabase/auth-helpers-react';
import { publishNoteREST } from '@/services/api';
import LogoScrivia from '@/components/LogoScrivia';
import { subscribeToNotes, unsubscribeFromAll } from '@/realtime/dispatcher';
import { useFileSystemStore } from '@/store/useFileSystemStore';

type SlashCommand = {
  id: string;
  alias: Record<string, string | string[]>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  action?: (editor: unknown) => void;
  [key: string]: unknown;
};

const Logo = () => {
  const router = useRouter();
  return (
    <div
      className="editor-header-logo"
      style={{
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
      <LogoScrivia />
    </div>
  );
};

export default function NoteEditorPage() {
  useEffect(() => {
    document.title = 'Scrivia - Editor';
  }, []);
  const router = useRouter();
  const session = useSession();
  const userId = session?.user?.id || '';
  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomImage, // Ajouté pour support image markdown
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
      Underline,
    ],
    content: '',
    immediatelyRender: false,
  });
  const [headerImageUrl, setHeaderImageUrl] = React.useState<string | null>(null);
  const [headerImageOffset, setHeaderImageOffset] = React.useState<number>(50);
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [a4Mode, setA4Mode] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);
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
  const [published, setPublished] = React.useState(false);
  const [publishedUrl, setPublishedUrl] = React.useState<string | null>(null);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [realtimeChannel, setRealtimeChannel] = React.useState<any>(null);
  const [lastSavedContent, setLastSavedContent] = React.useState<string>('');
  const [isUpdatingFromRealtime, setIsUpdatingFromRealtime] = React.useState(false);

  // Hook de persistance locale - TEMPORAIREMENT DÉSACTIVÉ
  // const {
  //   saveNoteLocally,
  //   updateNoteContent,
  //   updateNoteTitle,
  //   restorePersistedNote,
  //   clearAfterSave,
  //   hasUnsavedChangesForNote,
  // } = useEditorPersistence();

  // Hook de sauvegarde premium
  const { isSaving, handleSave } = useEditorSave({
    editor: editor ? {
      getHTML: () => editor.getHTML(),
      storage: { markdown: { getMarkdown: () => editor.storage.markdown.getMarkdown() } }
    } : undefined,
    headerImage: headerImageUrl,
    onSave: async ({ title, markdown_content, html_content, headerImage }) => {
      if (!noteId) return;
      try {
        const payload: Record<string, unknown> = {
          source_title: title,
          markdown_content,
          html_content,
        };
        // Ne sauvegarder l'image que si elle est explicitement fournie
        if (headerImage !== undefined) {
          payload.header_image = headerImage;
        }
        await updateNoteREST(noteId, payload);
        setLastSaved(new Date());
        
        // Nettoyer l'état persisté après une sauvegarde réussie
        // clearAfterSave();
      } catch {
        // toast error déjà géré dans le hook
      }
    },
  });

  // Fonction dédiée pour sauvegarder l'image d'en-tête
  const handleHeaderImageSave = async (newHeaderImage: string | null, newOffset?: number | null) => {
    if (!noteId) return;
    try {
      // Logique intelligente pour l'offset :
      // - Si newOffset est fourni (LLM) → utiliser sa valeur
      // - Si newOffset est null/undefined → réinitialiser à 50.00
      const finalOffset = newOffset !== undefined && newOffset !== null ? newOffset : 50.00;
      
      const payload: Record<string, unknown> = {
        header_image: newHeaderImage,
        header_image_offset: finalOffset,
      };
      
      if (process.env.NODE_ENV === 'development') {
        if (newOffset !== undefined && newOffset !== null) {
          console.log(`[header-image] Changement d'image avec offset LLM: ${newOffset}`);
        } else {
          console.log('[header-image] Changement d\'image - réinitialisation de l\'offset à 50.00');
        }
      }
      
      await updateNoteREST(noteId, payload);
      
      // Mettre à jour l'état local pour refléter le changement
      setHeaderImageOffset(finalOffset);
    } catch (error) {
      console.error('[header-image] Erreur lors de la sauvegarde de l\'image:', error);
    }
  };

  // Fonction dédiée pour sauvegarder l'offset de l'image d'en-tête
  const handleHeaderImageOffsetSave = async (newOffset: number) => {
    if (!noteId) return;
    try {
      // Arrondir la valeur au centième pour plus de précision
      const roundedOffset = Math.round(newOffset * 100) / 100;
      const payload: Record<string, unknown> = {
        header_image_offset: roundedOffset,
      };
      await updateNoteREST(noteId, payload);
    } catch (error) {
      console.error('[header-image-offset] Erreur lors de la sauvegarde de l\'offset:', error);
    }
  };

  // Chargement initial de la note (une seule fois)
  React.useEffect(() => {
    if (!editor || !noteId || hasInitialized) return;
    setLoading(true);
    setLoadError(null);
    
    // Vérifier s'il existe une version persistée locale
    // const persistedNote = restorePersistedNote(noteId);
    
    getArticleById(noteId)
      .then((note: Record<string, unknown>) => {
        if (note) {

          // Si une version persistée existe, l'utiliser en priorité
          // if (persistedNote) {
          //   setTitle(persistedNote.title);
          //   editor.commands.setContent(persistedNote.content);
          // } else {
            setTitle((note.source_title as string) || '');
            editor.commands.setContent((note.markdown_content as string) || '');
          // }
          setHeaderImageUrl((note.header_image as string) || null);
          setHeaderImageOffset((note.header_image_offset as number) || 50);
          setPublished(!!(note.ispublished as boolean));
          setPublishedUrl((note.public_url as string) || null);
        }
        setHasInitialized(true);
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Erreur lors du chargement de la note.');
        setLoading(false);
      });
  }, [editor, noteId, hasInitialized, getHeadingsFromEditor]);



  // Lors du chargement initial ou reload, récupérer l'URL publique si la note est publiée
  // Récupérer l'URL publiée au chargement initial seulement
  React.useEffect(() => {
    if (!noteId || !hasInitialized) return;
    if (published && !publishedUrl) {
      // Récupérer l'URL depuis la base de données sans déclencher de publish
      getArticleById(noteId)
        .then((note: Record<string, unknown>) => {
          if (note && note.public_url) {
            setPublishedUrl(note.public_url as string);
          }
        })
        .catch(() => {
          // Ignorer les erreurs
        });
    }
  }, [noteId, hasInitialized, published, publishedUrl]);

  // Fonction utilitaire pour extraire les headings du doc Tiptap
  function getHeadingsFromEditor(editorInstance: typeof editor): Heading[] {
    if (!editorInstance || !editorInstance.state) return [];
    const headings: Heading[] = [];
    const slugCount: Record<string, number> = {};
    editorInstance.state.doc.descendants((node) => {
      if (node.type.name === 'heading') {
        const baseSlug = slugify(`${node.textContent}-${node.attrs.level}`, { lower: true, strict: true });
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

  // --- Gestion centralisée de la visibilité ---
  React.useEffect(() => {
    if (!editor || !noteId) return;
    let channel: any = null;
    let unsubscribed = false;

    // Fonction pour s'abonner au realtime
    const subscribeToNoteRealtime = () => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase.channel('realtime-article-' + noteId)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
          filter: `id=eq.${noteId}`
        }, async (payload) => {

          // Recharge la note depuis la base
          setIsUpdatingFromRealtime(true);
          const note = await getArticleById(noteId);
                      if (note) {
            setTitle(note.source_title || '');
                          setHeaderImageUrl(note.header_image || null);
            setPublished(!!note.ispublished);
            editor.commands.setContent(note.markdown_content || '');
                        setLastSavedContent(note.markdown_content || '');
          }
          // Délai pour éviter les boucles infinies
          setTimeout(() => {
            setIsUpdatingFromRealtime(false);
          }, 100);
        })
        .subscribe();
      setRealtimeChannel(channel);
      if (process.env.NODE_ENV === 'development') {
        console.log('[realtime] Canal realtime abonné');
      }
    };

    // Abonnement au store Zustand pour les mises à jour d'offset
    const notesSubscription = subscribeToNotes();

    subscribeToNoteRealtime();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // Vérifie s'il y a des changements non sauvegardés
        const currentContent = editor?.storage?.markdown?.getMarkdown() || '';
        if (currentContent !== lastSavedContent && !isInitialLoad && !isUpdatingFromRealtime) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[visibility] Onglet caché, autosave avant désabonnement realtime...');
          }
          await handleSave(title, currentContent);
          setLastSavedContent(currentContent);
          if (process.env.NODE_ENV === 'development') {
            console.log('[autosave] Autosave déclenchée par visibilitychange (hidden)');
          }
        }
        if (channel) {
          supabase.removeChannel(channel);
          if (process.env.NODE_ENV === 'development') {
            console.log('[realtime] Canal realtime désabonné (onglet caché)');
          }
        }
      } else if (document.visibilityState === 'visible') {
        // Refetch la note et réabonne le canal

        setIsUpdatingFromRealtime(true);
        const note = await getArticleById(noteId);
                  if (note) {
            setTitle(note.source_title || '');
                          setHeaderImageUrl(note.header_image || null);
            setPublished(!!note.ispublished);
            editor.commands.setContent(note.markdown_content || '');
            setLastSavedContent(note.markdown_content || '');
        }
        setTimeout(() => {
          setIsUpdatingFromRealtime(false);
        }, 100);
        subscribeToNoteRealtime();
      }
    };

    // Mécanisme supplémentaire pour macOS (swipe entre fenêtres)
    const handleWindowBlur = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[window-blur] Fenêtre perd le focus (macOS swipe)...');
      }
      // Sauvegarde immédiate quand la fenêtre perd le focus
      const currentContent = editor?.storage?.markdown?.getMarkdown() || '';
      if (currentContent !== lastSavedContent && !isInitialLoad && !isUpdatingFromRealtime) {
        await handleSave(title, currentContent);
        setLastSavedContent(currentContent);
        if (process.env.NODE_ENV === 'development') {
          console.log('[autosave] Autosave déclenchée par window.blur (macOS swipe)');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      if (channel) supabase.removeChannel(channel);
      // Nettoyer l'abonnement Zustand
      if (notesSubscription) {
        unsubscribeFromAll();
      }
      unsubscribed = true;
    };
  }, [editor, noteId, title, isInitialLoad]); // Retiré handleSave et lastSavedContent des dépendances

  // --- Flag isInitialLoad pour bloquer autosave au chargement ---
  React.useEffect(() => {
    if (hasInitialized && isInitialLoad) {
      setIsInitialLoad(false);
      // Initialise les refs avec les valeurs actuelles
      lastSavedTitleRef.current = title;
      lastSavedContentRef.current = editor?.storage.markdown.getMarkdown() || '';
      if (process.env.NODE_ENV === 'development') {
        console.log('[init] Chargement initial terminé, autosave activée');
      }
    }
  }, [hasInitialized, isInitialLoad, title, editor]);

  // --- Autosave unifiée (contenu, titre uniquement) ---
  const autosaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastSavedTitleRef = React.useRef<string>('');
  const lastSavedContentRef = React.useRef<string>('');
  
  React.useEffect(() => {
    if (!editor || isInitialLoad) return;
    
    const triggerUnifiedSave = () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = setTimeout(async () => {
        // Éviter l'autosave si on vient de recevoir une mise à jour realtime
        if (isUpdatingFromRealtime) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[autosave] Ignoré car mise à jour realtime en cours');
          }
          return;
        }
        
        const currentContent = editor.storage.markdown.getMarkdown();
        const titleChanged = title !== lastSavedTitleRef.current;
        const contentChanged = currentContent !== lastSavedContentRef.current;
        
        // Ne sauvegarde que si le titre ou le contenu ont changé
        if (titleChanged || contentChanged) {
          await handleSave(title, currentContent);
          
          // Met à jour les refs après sauvegarde
          lastSavedTitleRef.current = title;
          lastSavedContentRef.current = currentContent;
          setLastSavedContent(currentContent);
          
          if (process.env.NODE_ENV === 'development') {
            const changes = [];
            if (titleChanged) changes.push('titre');
            if (contentChanged) changes.push('contenu');
            console.log(`[autosave] Autosave déclenchée (${changes.join(', ')})`);
          }
        }
      }, 1000);
    };
    
    // Écoute les transactions de l'éditeur
    editor.on('transaction', triggerUnifiedSave);
    
    // Écoute les changements de titre uniquement
    if (title !== lastSavedTitleRef.current) {
      triggerUnifiedSave();
    }
    
    return () => {
      editor.off('transaction', triggerUnifiedSave);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [editor, title, isInitialLoad, isUpdatingFromRealtime]);

  // Écouter les changements du store Zustand pour l'offset de l'image d'en-tête
  React.useEffect(() => {
    if (!noteId) return;
    
    const store = useFileSystemStore.getState();
    const note = store.notes[noteId];
    
    if (note && note.header_image_offset !== undefined) {
      setHeaderImageOffset(note.header_image_offset);
      if (process.env.NODE_ENV === 'development') {
        console.log('[store] Offset mis à jour depuis le store:', note.header_image_offset);
      }
    }
  }, [noteId]);

  // Persistance locale des changements de titre
  // React.useEffect(() => {
  //   if (!editor || !hasInitialized) return;
  //   const content = editor.storage.markdown.getMarkdown();
  //   updateNoteTitle(title);
  //   saveNoteLocally(noteId, title, content);
  // }, [title, noteId, hasInitialized, updateNoteTitle, saveNoteLocally, editor]);



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

  // Active le bouton Escape pour retourner aux dossiers
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/dossiers');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [router]);

  // Fonction dédiée pour recharger la note depuis le serveur
  const reloadNoteFromServer = React.useCallback(async () => {
    if (!editor || !noteId) return;
    const note = await getArticleById(noteId);
    if (note) {
      setTitle(note.source_title || '');
      setHeaderImageUrl(note.header_image || null);
      setPublished(!!note.ispublished);
      editor.commands.setContent(note.markdown_content || '');
    }
  }, [editor, noteId]);

  // --- RELOAD PREMIUM ---
  // Recharge la note à chaque retour de focus ou de visibilité (anti-conflit Realtime)
  // Pour désactiver, commenter ce bloc ou mettre ENABLE_AUTO_RELOAD_ON_FOCUS à false
  const ENABLE_AUTO_RELOAD_ON_FOCUS = true;
  React.useEffect(() => {
    if (!ENABLE_AUTO_RELOAD_ON_FOCUS) return;
    const handleReload = () => {
      reloadNoteFromServer();
    };
    window.addEventListener('focus', handleReload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleReload();
    });
    return () => {
      window.removeEventListener('focus', handleReload);
      document.removeEventListener('visibilitychange', handleReload);
    };
  }, [reloadNoteFromServer]);

  React.useEffect(() => {
    if (!editor) return;
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      const markdownPatterns = [
        /^#+\s+/m, /^\*\s+/m, /^-\s+/m, /^\d+\.\s+/m, /^\>\s+/m,
        /\*\*.*\*\*/m, /\*.*\*/m, /`.*`/m, /\[.*\]\(.*\)/m, /!\[.*\]\(.*\)/m,
        /^\|.*\|$/m, /^```/m,
      ];
      const isMarkdown = markdownPatterns.some(pattern => pattern.test(text));
      if (isMarkdown) {
        event.preventDefault();
        const commands: any = editor.commands;
        if (typeof commands.setMarkdown === 'function') {
          commands.setMarkdown(text);
        } else {
          editor.commands.setContent(text);
        }
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('paste', handlePaste);
    return () => dom.removeEventListener('paste', handlePaste);
  }, [editor]);

  // Handler drag & drop image dans la zone d'édition
  const handleEditorDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!editor) return;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (!imageFile) return;
    try {
      const fileName = `${userId}/${Date.now()}_${imageFile.name}`;
      const res = await fetch(`/api/v1/note/${noteId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType: imageFile.type }),
      });
      if (!res.ok) throw new Error('Erreur lors de la génération de l’URL S3');
      const { url } = await res.json();
      const uploadRes = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': imageFile.type },
        body: imageFile,
      });
      if (!uploadRes.ok) throw new Error('Erreur lors de l’upload S3');
      const publicUrl = url.split('?')[0];
      // Insère l'image dans l'éditeur (markdown ou node image)
      editor.chain().focus().setImage({ src: publicUrl }).run();
      toast.success('Image uploadée et insérée !');
    } catch (err: any) {
      toast.error('Erreur upload image : ' + (err.message || err));
    }
  };

  // Handler pour le toggle Published
  const handleTogglePublished = async (value: boolean) => {
    setIsPublishing(true);
    try {
      const res = await publishNoteREST(noteId, value);
      setPublished(value);
      if (value && res.url) {
        setPublishedUrl(res.url);
      } else {
        setPublishedUrl(null);
      }
      toast.success(value ? 'Note publiée !' : 'Note dépubliée.');
    } catch {
      toast.error('Erreur lors de la mise à jour du statut de publication.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Ajout du ref et du useEffect pour l'auto-resize du titre
  const titleRef = useRef<HTMLTextAreaElement>(null);
  
  const resizeTitle = () => {
    const ta = titleRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 6 * 45) + 'px';
    }
  };
  
  useEffect(() => {
    resizeTitle();
  }, [title, fullWidth]);
  
  const handleFontChange = (fontName: string) => {
    // Applique la police au titre
    const titleElement = titleRef.current;
    if (titleElement) {
      titleElement.style.fontFamily = fontName;
      // Recalcule la hauteur après le changement de police
      setTimeout(resizeTitle, 0);
    }
  };

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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Indicateur de changements non sauvegardés */}
      {/* <UnsavedChangesIndicator /> */}
      {/* Header sticky premium */}
      <header className="editor-header">
        <Logo />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {editor ? (
            <EditorToolbar editor={editor} setImageMenuOpen={setImageMenuOpen} onFontChange={handleFontChange} />
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
          <button
            className="editor-header-kebab"
            title="Menu"
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onClick={() => setKebabOpen(true)}
          >⋯</button>
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
              headerImageOffset={headerImageOffset}
              onHeaderChange={(newImage) => {
                handleHeaderImageSave(newImage);
              }}
              onHeaderOffsetChange={(newOffset) => {
                handleHeaderImageOffsetSave(newOffset);
              }}
              imageMenuOpen={imageMenuOpen}
              onImageMenuOpen={() => setImageMenuOpen(true)}
              onImageMenuClose={() => setImageMenuOpen(false)}
              noteId={noteId}
              userId={userId}
            />
          ) : (
            <div>
            <button
                title="Ajouter une image d’en-tête"
                style={{ position: 'fixed', top: 64, right: 0, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer', padding: '10px 18px 10px 8px', borderRadius: 8, zIndex: 1200, transition: 'background 0.18s, color 0.18s' }}
                onClick={() => {
                  const newImage = 'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop';
                  handleHeaderImageSave(newImage);
                }}
            >
                <FiImage size={20} />
            </button>
            </div>
          )}
          {/* Titre premium éditable */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <textarea
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titre de la note…"
              rows={1}
              className="editor-title"
              style={{
                width: '100%',
                maxWidth: fullWidth ? 1000 : 750,
                fontSize: '2.25rem',
                fontWeight: 700,
                fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                color: 'var(--editor-text-color)',
                background: 'none',
                border: 'none',
                outline: 'none',
                padding: '0 0 8px 0',
                margin: 0,
                textAlign: 'left',
                letterSpacing: '-0.02em',
                transition: 'font-size 0.2s, color 0.2s',
                resize: 'none',
                overflow: 'visible',
                lineHeight: 1.15,
                minHeight: '45px',
                height: 'auto',
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 6 * 45) + 'px';
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
                maxWidth: fullWidth ? 1000 : 750,
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
                padding: '18px 0 120px 0',
                margin: 0,
                boxSizing: 'border-box',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
              onDrop={handleEditorDrop}
              onDragOver={e => e.preventDefault()}
            >
              {editor && <EditorContent editor={editor} />}
              {/* SlashMenu premium */}
              <EditorSlashMenu
                ref={slashMenuRef}
                lang={slashLang}
                onInsert={(cmd: SlashCommand) => {
                  if (!editor) return;
                  if (typeof cmd.action === 'function') {
                    cmd.action(editor as unknown);
                  }
                }}
              />
            </div>
          </div>
          {/* TOC premium à droite */}
          <div style={{ position: 'fixed', top: 385, right: 20, zIndex: 1002, minWidth: 32, maxWidth: 300, padding: '0 8px 0 0', boxSizing: 'border-box' }}>
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
              {/* {hasUnsavedChangesForNote(noteId) && (
                <span style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>
                  ● Unsaved changes
                </span>
              )} */}
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              {getWordCount()} words
            </div>
          </footer>
        </>
      )}
      {/* Ajoute le menu contextuel kebab pour les options premium (dont le switch de langue) */}
      <EditorKebabMenu
        open={kebabOpen}
        position={{ top: 60, left: window.innerWidth - 260 }}
        onClose={() => setKebabOpen(false)}
        a4Mode={a4Mode}
        setA4Mode={setA4Mode}
        slashLang={slashLang}
        setSlashLang={setSlashLang}
        published={published}
        setPublished={handleTogglePublished}
        publishedUrl={publishedUrl || undefined}
        fullWidth={fullWidth}
        setFullWidth={setFullWidth}
        isPublishing={isPublishing}
      />
    </div>
  );
} 