'use client';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import EditorToolbar from '@/components/EditorToolbar';
import { FiEye, FiX, FiImage } from 'react-icons/fi';
import EditorKebabMenu from '@/components/EditorKebabMenu';
import React, { useRef, useEffect } from 'react';
import EditorHeaderImage from '@/components/EditorHeaderImage';
import NoteHeaderLayout from '@/components/NoteHeaderLayout';
import TableOfContents from '@/components/TableOfContents';
import { EditorContent } from '@tiptap/react';
import slugify from 'slugify';
import type { Heading } from '@/types/editor';
import { useParams } from 'next/navigation';
import { optimizedApi } from '@/services/optimizedApi';
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
import EditorFooter from '@/components/editor/EditorFooter';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import CustomImage from '@/extensions/CustomImage';
import { useSession } from '@supabase/auth-helpers-react';
import LogoScrivia from '@/components/LogoScrivia';


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
      Placeholder.configure({
        placeholder: 'Écrivez quelque chose d\'incroyable...',
      }),
    ],
    content: '',
    immediatelyRender: false,
  });
  const [headerImageUrl, setHeaderImageUrl] = React.useState<string | null>(null);
  const [headerImageOffset, setHeaderImageOffset] = React.useState<number>(50);
  const [headerImageBlur, setHeaderImageBlur] = React.useState<number>(0);
  const [headerImageOverlay, setHeaderImageOverlay] = React.useState<number>(0);
  const [headerTitleInImage, setHeaderTitleInImage] = React.useState<boolean>(false);
  const [imageMenuOpen, setImageMenuOpen] = React.useState(false);
  const [kebabOpen, setKebabOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [a4Mode, setA4Mode] = React.useState(false);
  const [fullWidth, setFullWidth] = React.useState(false);
  const [fontFamily, setFontFamily] = React.useState<string>('Noto Sans');
  const [slashLang, setSlashLang] = React.useState<'fr' | 'en'>('en');
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
  const { handleSave } = useEditorSave({
    editor: editor ? {
      getHTML: () => editor.getHTML(),
      storage: { markdown: { getMarkdown: () => editor.storage.markdown.getMarkdown() } }
    } : undefined,
    onSave: async ({ title, markdown_content, html_content }) => {
      if (!noteId) return;
      try {
        const payload: Record<string, unknown> = {
          source_title: title,
          markdown_content,
          html_content,
        };
        await optimizedApi.updateNote(noteId, payload);
        setLastSaved(new Date());
        
        // Nettoyer l'état persisté après une sauvegarde réussie
        // clearAfterSave();
      } catch {
        // toast error déjà géré dans le hook
      }
    },
  });

  // Fonction dédiée pour sauvegarder l'image d'en-tête
  const handleHeaderImageSave = async (newHeaderImage: string | null) => {
    if (!noteId) return;
    try {
      // SIMPLIFICATION : Toujours réinitialiser à 50 lors du changement d'image
      const payload: Record<string, unknown> = {
        header_image: newHeaderImage,
        header_image_offset: 50,
        header_image_blur: 0,
        header_image_overlay: 0,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[header-image] Changement d\'image - réinitialisation offset à 50, blur et overlay à 0');
      }
      
      await optimizedApi.updateNote(noteId, payload);
      
      // Mettre à jour l'état local
      setHeaderImageUrl(newHeaderImage);
      setHeaderImageOffset(50);
      setHeaderImageBlur(0);
      setHeaderImageOverlay(0);
    } catch (error) {
      console.error('[header-image] Erreur lors de la sauvegarde de l\'image:', error);
    }
  };

  // Fonction dédiée pour sauvegarder l'offset de l'image d'en-tête
  const handleHeaderImageOffsetSave = async (newOffset: number) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        header_image_offset: newOffset,
      };
      await optimizedApi.updateNote(noteId, payload);
      setHeaderImageOffset(newOffset);
    } catch (error) {
      console.error('[header-image-offset] Erreur lors de la sauvegarde de l\'offset:', error);
    }
  };

  // Fonction dédiée pour sauvegarder le blur de l'image d'en-tête
  const handleHeaderImageBlurSave = async (newBlur: number) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        header_image_blur: newBlur,
      };
      await optimizedApi.updateNote(noteId, payload);
      setHeaderImageBlur(newBlur);
    } catch (error) {
      console.error('[header-image-blur] Erreur lors de la sauvegarde du blur:', error);
    }
  };

  // Fonction dédiée pour sauvegarder l'overlay de l'image d'en-tête
  const handleHeaderImageOverlaySave = async (newOverlay: number) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        header_image_overlay: newOverlay,
      };
      await optimizedApi.updateNote(noteId, payload);
      setHeaderImageOverlay(newOverlay);
    } catch (error) {
      console.error('[header-image-overlay] Erreur lors de la sauvegarde de l\'overlay:', error);
    }
  };

  // Fonction dédiée pour sauvegarder la position du titre
  const handleHeaderTitleInImageSave = async (newValue: boolean) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        header_title_in_image: newValue,
      };
      await optimizedApi.updateNote(noteId, payload);
      setHeaderTitleInImage(newValue);
      if (process.env.NODE_ENV === 'development') {
        console.log('[header-image] Toggle titre dans image →', newValue);
      }
    } catch (error) {
      console.error('[header-title-in-image] Erreur lors de la sauvegarde de la position du titre:', error);
    }
  };

  // Fonction dédiée pour sauvegarder le mode pleine largeur
  const handleFullWidthSave = async (newValue: boolean) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        wide_mode: newValue,
      };
      await optimizedApi.updateNote(noteId, payload);
      setFullWidth(newValue);
      if (process.env.NODE_ENV === 'development') {
        console.log('[wide-mode] Toggle mode pleine largeur →', newValue);
      }
    } catch (error) {
      console.error('[wide-mode] Erreur lors de la sauvegarde du mode pleine largeur:', error);
    }
  };

  // Fonction dédiée pour sauvegarder la police
  const handleFontFamilySave = async (newFontFamily: string) => {
    if (!noteId) return;
    try {
      const payload: Record<string, unknown> = {
        font_family: newFontFamily,
      };
      await optimizedApi.updateNote(noteId, payload);
      setFontFamily(newFontFamily);
      if (process.env.NODE_ENV === 'development') {
        console.log('[font-family] Changement de police →', newFontFamily);
      }
    } catch (error) {
      console.error('[font-family] Erreur lors de la sauvegarde de la police:', error);
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
          setHeaderImageOffset((note.header_image_offset as number) ?? 50);
          setHeaderImageBlur((note.header_image_blur as number) ?? 0);
          setHeaderImageOverlay((note.header_image_overlay as number) ?? 0);
          setHeaderTitleInImage((note.header_title_in_image as boolean) ?? false);
          setFullWidth((note.wide_mode as boolean) ?? false);
          setFontFamily((note.font_family as string) ?? 'Noto Sans');
          // Appliquer la police au titre et au contenu avec !important
          setTimeout(() => {
            const titleElement = titleRef.current;
            if (titleElement) {
              titleElement.style.setProperty('font-family', (note.font_family as string) ?? 'Noto Sans', 'important');
            }
            // Appliquer la police au contenu de l'éditeur avec !important
            if (editor) {
              const editorElement = editor.view.dom;
              if (editorElement) {
                editorElement.style.setProperty('font-family', (note.font_family as string) ?? 'Noto Sans', 'important');
              }
            }
          }, 0);
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
  }, [editor, noteId, hasInitialized]);



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



  // --- Gestion centralisée de la visibilité ---
  React.useEffect(() => {
    if (!editor || !noteId) return;

    // Fonction pour s'abonner au realtime
    const subscribeToNoteRealtime = () => {
      const channel = supabase.channel('realtime-article-' + noteId)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
          filter: `id=eq.${noteId}`
        }, async () => {

          // Recharge la note depuis la base
          setIsUpdatingFromRealtime(true);
          const note = await getArticleById(noteId);
                      if (note) {
            setTitle(note.source_title || '');
                          setHeaderImageUrl(note.header_image || null);
            setHeaderImageOffset(note.header_image_offset ?? 50);
            setHeaderImageBlur(note.header_image_blur ?? 0);
            setHeaderImageOverlay(note.header_image_overlay ?? 0);
            setFullWidth(note.wide_mode ?? false);
            setFontFamily(note.font_family ?? 'Noto Sans');
            // Appliquer la police au titre et au contenu
            setTimeout(() => {
              const titleElement = titleRef.current;
              if (titleElement) {
                titleElement.style.fontFamily = note.font_family ?? 'Noto Sans';
              }
              // Appliquer la police au contenu de l'éditeur
              if (editor) {
                const editorElement = editor.view.dom;
                if (editorElement) {
                  editorElement.style.fontFamily = note.font_family ?? 'Noto Sans';
                }
              }
            }, 0);
            setPublished(!!note.ispublished);
            editor.commands.setContent(note.markdown_content || '');
                        setLastSavedContent(note.markdown_content || '');
          }
          // Délai pour éviter les boucles infinies
          setTimeout(() => {
            setIsUpdatingFromRealtime(false);
          }, 500);
        })
        .subscribe();
      if (process.env.NODE_ENV === 'development') {
        console.log('[realtime] Canal realtime abonné');
      }
      return channel; // Retourner le channel pour le cleanup
    };

    const channel = subscribeToNoteRealtime();

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
        // L'abonnement Zustand reste actif, pas besoin de le désabonner
        if (process.env.NODE_ENV === 'development') {
          console.log('[realtime] Abonnement Zustand maintenu (onglet caché)');
        }
      } else if (document.visibilityState === 'visible') {
        // Refetch la note pour s'assurer de la synchronisation
        setIsUpdatingFromRealtime(true);
        const note = await getArticleById(noteId);
                  if (note) {
            setTitle(note.source_title || '');
                          setHeaderImageUrl(note.header_image || null);
            setHeaderImageOffset(note.header_image_offset ?? 50);
            setHeaderImageBlur(note.header_image_blur ?? 0);
            setHeaderImageOverlay(note.header_image_overlay ?? 0);
            setFullWidth(note.wide_mode ?? false);
            setFontFamily(note.font_family ?? 'Noto Sans');
            // Appliquer la police au titre et au contenu
            setTimeout(() => {
              const titleElement = titleRef.current;
              if (titleElement) {
                titleElement.style.fontFamily = note.font_family ?? 'Noto Sans';
              }
              // Appliquer la police au contenu de l'éditeur
              if (editor) {
                const editorElement = editor.view.dom;
                if (editorElement) {
                  editorElement.style.fontFamily = note.font_family ?? 'Noto Sans';
                }
              }
            }, 0);
            setPublished(!!note.ispublished);
            editor.commands.setContent(note.markdown_content || '');
            setLastSavedContent(note.markdown_content || '');
        }
        setTimeout(() => {
          setIsUpdatingFromRealtime(false);
        }, 500);
        if (process.env.NODE_ENV === 'development') {
          console.log('[realtime] Synchronisation effectuée (onglet visible)');
        }
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

      // Nettoyer l'abonnement Supabase Realtime
      if (channel) {
        channel.unsubscribe();
        if (process.env.NODE_ENV === 'development') {
          console.log('[realtime] Canal realtime désabonné');
        }
      }
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

  // Applique la police par défaut au chargement initial
  React.useEffect(() => {
    if (!editor) return;
    
    // Applique la police par défaut à l'éditeur
    const editorElement = editor.view.dom;
    if (editorElement) {
      editorElement.style.setProperty('font-family', fontFamily, 'important');
    }
    
    // Applique la police par défaut au titre
    const titleElement = titleRef.current;
    if (titleElement) {
      titleElement.style.setProperty('font-family', fontFamily, 'important');
    }
  }, [editor, fontFamily]);

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
      setHeaderImageOffset(note.header_image_offset || 50);
      setHeaderImageBlur(note.header_image_blur || 0);
      setHeaderImageOverlay(note.header_image_overlay || 0);
      setFullWidth(note.wide_mode || false);
      setFontFamily(note.font_family || 'Noto Sans');
      // Appliquer la police au titre et au contenu
      setTimeout(() => {
        const titleElement = titleRef.current;
        if (titleElement) {
          titleElement.style.fontFamily = note.font_family || 'Noto Sans';
        }
        // Appliquer la police au contenu de l'éditeur
        if (editor) {
          const editorElement = editor.view.dom;
          if (editorElement) {
            editorElement.style.fontFamily = note.font_family || 'Noto Sans';
          }
        }
      }, 0);
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
      const res = await optimizedApi.publishNoteREST(noteId, value);
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
    // Log pour debug
    console.log('[Font] handleFontChange appelé avec:', fontName);
    
    // Vérifier si la police est chargée
    const testElement = document.createElement('div');
    testElement.style.fontFamily = fontName;
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.textContent = 'Test';
    document.body.appendChild(testElement);
    
    const computedFont = window.getComputedStyle(testElement).fontFamily;
    console.log('[Font] Police calculée pour titre:', computedFont);
    
    document.body.removeChild(testElement);
    
    // MODIFIER LA VARIABLE CSS AU LIEU D'APPLIQUER DIRECTEMENT
    const fontWithFallback = `${fontName}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif`;
    
    // Modifier la variable CSS globale
    document.documentElement.style.setProperty('--editor-font-family', fontWithFallback);
    console.log('[Font] Variable CSS modifiée:', fontWithFallback);
    
    // Applique la police au titre avec !important pour dominer
    const titleElement = titleRef.current;
    if (titleElement) {
      titleElement.style.setProperty('font-family', fontWithFallback, 'important');
      console.log('[Font] Police appliquée au titre:', fontWithFallback);
      
      // Recalcule la hauteur après le changement de police
      setTimeout(resizeTitle, 0);
    }
    
    // Applique la police au contenu de l'éditeur avec !important pour dominer
    if (editor) {
      const editorElement = editor.view.dom;
      if (editorElement) {
        // Appliquer à l'élément principal de l'éditeur
        editorElement.style.setProperty('font-family', fontWithFallback, 'important');
        
        // Appliquer à TOUS les éléments de l'éditeur
        const allElements = editorElement.querySelectorAll('*');
        allElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.setProperty('font-family', fontWithFallback, 'important');
          }
        });
        
        console.log('[Font] Police appliquée à tous les éléments ProseMirror:', fontWithFallback);
      }
    }
    
    // Sauvegarde la police en base de données
    handleFontFamilySave(fontName);
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
            <EditorToolbar editor={editor} setImageMenuOpen={setImageMenuOpen} onFontChange={handleFontChange} currentFont={fontFamily} />
          ) : (
            <div style={{ color: '#888', fontWeight: 500 }}>Chargement…</div>
          )}
        </div>
        <div className="editor-header-toolbar" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <button
            className="editor-header-preview"
            title={showPreview ? 'Quitter l\'aperçu' : 'Aperçu'}
            style={{ background: 'none', border: 'none', color: showPreview ? 'var(--accent-primary)' : 'var(--text-2)', fontSize: 17, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onClick={() => setShowPreview(p => !p)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6b35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = showPreview ? 'var(--accent-primary)' : 'var(--text-2)';
            }}
          >
            <FiEye size={17} />
          </button>
          <button
            className="editor-header-kebab"
            title="Menu"
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onClick={() => setKebabOpen(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6b35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >⋯</button>
          <button 
            className="editor-header-close" 
            title="Fermer" 
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 17, cursor: 'pointer', padding: '0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff6b35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >
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
          <div style={{ position: 'relative', width: '100%' }}>
            {/* Header image premium */}
            {headerImageUrl ? (
              <EditorHeaderImage
                headerImageUrl={headerImageUrl}
                headerImageOffset={headerImageOffset}
                headerImageBlur={headerImageBlur}
                headerImageOverlay={headerImageOverlay}
                headerTitleInImage={headerTitleInImage}
                onHeaderChange={(newImage) => {
                  handleHeaderImageSave(newImage);
                }}
                onHeaderOffsetChange={(newOffset) => {
                  handleHeaderImageOffsetSave(newOffset);
                }}
                onHeaderBlurChange={(newBlur) => {
                  handleHeaderImageBlurSave(newBlur);
                }}
                onHeaderOverlayChange={(newOverlay) => {
                  handleHeaderImageOverlaySave(newOverlay);
                }}
                onHeaderTitleInImageChange={(newValue) => {
                  handleHeaderTitleInImageSave(newValue);
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
            {/* Zone de texte premium sous le titre */}
            <NoteHeaderLayout
              headerImageUrl={headerImageUrl}
              showTitleInHeader={headerTitleInImage}
              fullWidth={fullWidth}
              title={
                <textarea
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Titre de la note…"
                  rows={1}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 6 * 45) + 'px';
                  }}
                />
              }
              content={
                <div
                  className="editor-content markdown-body"
                  ref={editorContainerRef}
                  style={{
                    width: '100%',
                    maxWidth: 'var(--editor-content-width)',
                    minHeight: 220,
                    background: 'none',
                    color: 'var(--editor-text-color)',
                    fontSize: 'var(--editor-body-size)',
                    fontWeight: 400,
                    lineHeight: 1.8,
                    border: 'none',
                    outline: 'none',
                    borderRadius: 10,
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
              }
            />
          </div>
          {/* TOC premium à droite */}
          <div style={{ position: 'fixed', top: 385, right: 20, zIndex: 1002, minWidth: 32, maxWidth: 300, padding: '0 8px 0 0', boxSizing: 'border-box' }}>
            <TableOfContents headings={tocHeadings} containerRef={editorContainerRef} />
          </div>
          {/* Le reste de la page éditeur ici... */}
          {/* Footer fixe premium */}
          <EditorFooter
            lastSaved={lastSaved}
            getRelativeTime={getRelativeTime}
            getWordCount={getWordCount}
          />
        </>
      )}
      {/* Ajoute le menu contextuel kebab pour les options premium (dont le switch de langue) */}
      <EditorKebabMenu
        open={kebabOpen}
        position={{ top: 48, left: window.innerWidth - 270 }}
        onClose={() => setKebabOpen(false)}
        a4Mode={a4Mode}
        setA4Mode={setA4Mode}
        slashLang={slashLang}
        setSlashLang={setSlashLang}
        published={published}
        setPublished={handleTogglePublished}
        publishedUrl={publishedUrl || undefined}
        fullWidth={fullWidth}
        setFullWidth={handleFullWidthSave}
        isPublishing={isPublishing}
      />
    </div>
  );
} 