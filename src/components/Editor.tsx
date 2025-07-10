'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import lowlight from '../utils/lowlightInstance';
import { 
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, 
  FiAlignCenter, FiAlignRight, FiX, FiCode, FiLink,
  FiImage, FiMoreHorizontal, FiMoreVertical, FiCheckSquare, FiMaximize, FiMinimize,
  FiMic, FiPlus, FiCopy, FiCheck, FiEye, FiGrid, FiMail, FiFeather, FiShare2, FiDownload, FiPrinter, FiFileText, FiEdit, FiSettings, FiAlignJustify
} from 'react-icons/fi';
import { MdGridOn, MdFormatQuote, MdClose, MdFullscreen, MdFullscreenExit, MdRemoveRedEye } from 'react-icons/md';
import { AiOutlineOrderedList } from 'react-icons/ai';
import SelectionOverlay from './SelectionOverlay';
import Tooltip from './Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import SlashMenu from './SlashMenu';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ImageMenu from './ImageMenu';
import { LuMoon, LuCloudFog } from 'react-icons/lu';
import TableOfContents from './TableOfContents';
import slugify from 'slugify';
import TrailingNodeExtension from '../extensions/TrailingNodeExtension';
import CodeBlockWithCopy from '../extensions/CodeBlockWithCopy';
import CustomImage from '../extensions/CustomImage';
import CustomHeading, { IdPlugin } from '../extensions/CustomHeading';
import EditorHeaderImage from './EditorHeaderImage';
import EditorTitle from './EditorTitle';
import EditorFooter from './EditorFooter';
import type { Heading } from '../types/editor';
import EditorSlashMenu from './EditorSlashMenu';
import EditorToolbar from './EditorToolbar';
import TurndownService from 'turndown';
import '@/styles/markdown_style.css';

const HEADER_IMAGES = [
  'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function getRandomHeaderImage(current: string) {
  const others = HEADER_IMAGES.filter(url => url !== current);
  return others[Math.floor(Math.random() * others.length)];
}

const FONT_OPTIONS = [
  { key: 'inter', label: 'Inter', value: 'Inter, sans-serif' },
  { key: 'roboto', label: 'Roboto', value: 'Roboto, sans-serif' },
  { key: 'noto', label: 'Noto Sans', value: 'Noto Sans, sans-serif' },
  { key: 'ibm', label: 'IBM Plex Sans', value: 'IBM Plex Sans, sans-serif' },
  { key: 'ebgaramond', label: 'EB Garamond', value: 'EB Garamond, serif' },
  { key: 'garamond', label: 'Garamond', value: 'Garamond, serif' },
];

interface TitleTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

function TitleTextarea({
  value,
  onChange,
  onBlur,
  onFocus,
  inputRef,
  disabled,
  placeholder,
  style
}: TitleTextareaProps) {
  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          inputRef?.current?.blur();
        }
      }}
      className="editor-title-input"
      rows={1}
      wrap="soft"
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '750px',
        height: '45px',
        minHeight: '45px',
        maxHeight: '45px',
        padding: 0,
        margin: 0,
        fontSize: '2.25rem',
        fontWeight: 700,
        lineHeight: 1.1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary)',
        fontFamily: 'Noto Sans, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        resize: 'none',
        textAlign: 'center'
      }}
      spellCheck={true}
      autoFocus
    />
  );
}

interface SavePayload {
  title: string;
  markdown_content: string;
  html_content: string;
  headerImage?: string | null;
  titleAlign?: string;
}

interface EditorProps {
  initialTitle: string;
  initialContent?: string;
  headerImage?: string;
  onClose?: () => void;
  onSave?: (data: SavePayload) => void;
  initialTitleAlign?: string;
}

function debounce(
  func: (title: string, content: string, align: string) => void,
  wait: number
): (title: string, content: string, align: string) => void {
  let timeout: NodeJS.Timeout;
  return (title: string, content: string, align: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(title, content, align), wait);
  };
}

const turndownService = new TurndownService();
const convertHtmlToMarkdown = (html: string) => turndownService.turndown(html);

// Ajoute ce helper pour parser un tableau markdown GFM
function parseGfmTable(markdown: string): string[][] | null {
  // Détecte un tableau GFM
  const lines = markdown.trim().split('\n');
  if (lines.length < 2) return null;
  if (!/^\|.*\|$/.test(lines[0])) return null;
  if (!/^\|[-:| ]+\|$/.test(lines[1])) return null;
  const rows = lines.filter(l => /^\|.*\|$/.test(l));
  return rows.map(row => row.slice(1, -1).split('|').map(cell => cell.trim()));
}

const Editor: React.FC<EditorProps> = ({ initialTitle, initialContent = '', headerImage: initialHeaderImage, onClose, onSave, initialTitleAlign = 'left' }) => {
  const [title, setTitle] = useState(initialTitle);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState('0 mot');
  const [isCopied, setIsCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const blurTimeoutRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const wordCountTimeoutRef = useRef(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const noteNumberRef = useRef(1);
  const getDefaultTitle = () => `Nouvelle note`;
  const [headerImage, setHeaderImage] = useState(initialHeaderImage || null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const [slashAnchor, setSlashAnchor] = useState({ left: 0, top: 0 });
  const slashAnchorRef = useRef({ left: 0, top: 0 });
  const lang = 'fr'; // ou détecter dynamiquement selon l'UI
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [headerOverlayLevel, setHeaderOverlayLevel] = useState(0);
  const [headerBlurLevel, setHeaderBlurLevel] = useState(0);
  const [headerControlsHovered, setHeaderControlsHovered] = useState(false);
  const [editorMode, setEditorMode] = useState('letter');
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[2].key);
  const fontButtonRef = useRef(null);
  const [fontMenuPos, setFontMenuPos] = useState({ top: 0, left: 0 });
  const kebabButtonRef = useRef(null);
  const [kebabMenuOpen, setKebabMenuOpen] = useState(false);
  const [kebabMenuPos, setKebabMenuPos] = useState({ top: 0, left: 0 });
  const [kebabHoverIdx, setKebabHoverIdx] = useState(-1);
  const [fontHoverIdx, setFontHoverIdx] = useState(-1);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const editorContentRef = useRef(null);
  const tocContainerRef = useRef(null);
  const [titleAlign, setTitleAlign] = useState(initialTitleAlign);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const [markdownContent, setMarkdownContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [headerImageUrl, setHeaderImageUrl] = useState(initialHeaderImage || null);
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
  const slashMenuRef = useRef<{ openMenu: (anchor: { left: number; top: number }) => void }>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isReadyToSave, setIsReadyToSave] = useState(false);
  const hydratedOnce = useRef(false);
  const [editorKey, setEditorKey] = useState(0);

  // Style commun pour les boutons header image
  const headerBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    borderRadius: 8,
    padding: '6px 8px',
    opacity: 0.75,
    color: '#fff',
    cursor: 'pointer',
    transition: 'opacity 0.18s, background 0.18s',
    margin: 0,
    outline: 'none',
  };

  // Police par défaut
  const defaultFont = 'Noto Sans, sans-serif';
  let selectedFontObj = FONT_OPTIONS.find(f => f.key === selectedFont);
  // Si aucune police sélectionnée ou police inconnue, on force Noto Sans
  if (!selectedFontObj) {
    selectedFontObj = { key: 'noto', label: 'Noto Sans', value: defaultFont };
  }

  useEffect(() => {
    if (!title || title.trim() === '') {
      setTitle(getDefaultTitle());
      noteNumberRef.current += 1;
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setHeaderImage(initialHeaderImage || null);
  }, [initialHeaderImage]);

  useEffect(() => {
    if (headerImage !== undefined) {
      handleSave(title, editor?.getHTML() || '', titleAlign);
    }
    // eslint-disable-next-line
  }, [headerImage]);

  useEffect(() => {
    if (initialContent) {
      let markdown = initialContent;
      if (/<[a-z][\s\S]*>/i.test(initialContent)) {
        markdown = turndownService.turndown(initialContent);
        console.log('[Editor] Markdown généré via Turndown:', markdown);
      } else {
        console.log('[Editor] Contenu déjà en markdown:', markdown);
      }
      setMarkdownContent(markdown);
    }
  }, [initialContent]);

  useEffect(() => {
    setLastSaved(new Date());
  }, []);

  console.log('[AUDIT][editor-init] content donné à useEditor:', markdownContent);
  console.log('[AUDIT][editor-init] extensions:', [
    'StarterKit', 'CustomHeading', 'TaskList', 'TaskItem', 'CodeBlockWithCopy', 'Placeholder', 'Link', 'CustomImage', 'TextAlign', 'Underline', 'CharacterCount', 'Typography', 'Highlight', 'Table', 'TableRow', 'TableHeader', 'TableCell', 'TrailingNodeExtension', 'IdPlugin', 'Markdown'
  ]);
  console.log('[AUDIT][editor-init] config Markdown:', {
    html: true,
    tightLists: true,
    linkify: true,
    breaks: true,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      CustomHeading.configure({ levels: [1, 2, 3] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ...(typeof window !== 'undefined' ? [
        CodeBlockWithCopy.configure({
          lowlight,
        })
      ] : []),
      Placeholder.configure({
        placeholder: 'Écrivez quelque chose d\'incroyable...',
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
          class: 'editor-link'
        },
        validate: (href: string) => /^https?:\/\//.test(href),
        protocols: ['http', 'https', 'mailto', 'tel'],
      }),
      CustomImage.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      CharacterCount.configure({
        limit: null,
      }),
      Typography,
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TrailingNodeExtension,
      Markdown.configure({
        html: true,
        tightLists: true,
        linkify: true,
        breaks: true,
      }),
    ],
    content: markdownContent,
    onUpdate: ({ editor }) => {
      try {
        setTimeout(() => setContentVersion(v => v + 1), 0);
      } catch (error) {
        console.error('[Editor] Erreur lors de onUpdate :', error);
      }
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
      handleDOMEvents: {
        beforeinput: (view, event) => {
          try {
            return false;
          } catch (error) {
            console.error('[Editor] Erreur lors de beforeinput :', error);
            return true;
          }
        }
      },
      handlePaste(view, event, slice) {
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          const table = parseGfmTable(text);
          if (table && table.length >= 2 && editor) {
            // Enlève la ligne de séparation
            const header = table[0];
            const body = table.slice(2);
            const rows = body.length;
            const cols = header.length;
            // Insère le tableau
            editor.chain().focus().insertTable({ rows: Math.max(rows, 1), cols, withHeaderRow: true }).run();
            // Remplit les cellules
            setTimeout(() => {
              // Sélectionne toutes les cellules du tableau
              const tableNode = editor.view.dom.querySelector('table');
              if (!tableNode) return;
              const cellNodes = tableNode.querySelectorAll('td, th');
              let cellIndex = 0;
              // Remplit l'en-tête
              for (let c = 0; c < cols; c++) {
                if (cellNodes[cellIndex]) {
                  editor.chain().focus().setNodeSelection(editor.view.posAtDOM(cellNodes[cellIndex], 0)).insertContent(header[c]).run();
                  cellIndex++;
                }
              }
              // Remplit le corps
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  if (cellNodes[cellIndex]) {
                    const value = body[r]?.[c] || '';
                    editor.chain().focus().setNodeSelection(editor.view.posAtDOM(cellNodes[cellIndex], 0)).insertContent(value).run();
                    cellIndex++;
                  }
                }
              }
            }, 10);
            return true;
          }
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      try {
        setIsContentLoaded(true);
        if (editor && (editor.getText() || '').trim().length > 0 && !isReadyToSave) {
          setIsReadyToSave(true);
          console.log('[Editor] isReadyToSave → true (onCreate, contenu détecté)');
        }
        console.log('[Editor] Création réussie');
      } catch (error) {
        console.error('[Editor] Erreur lors de onCreate :', error);
      }
    },
    onDestroy: () => {
      try {
        console.log('[Editor] Éditeur détruit');
      } catch (error) {
        console.error('[Editor] Erreur lors de onDestroy :', error);
      }
    },
    autofocus: true,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor) {
      setTimeout(() => {
        console.log('[AUDIT][post-editor-init] Editor.getJSON():', editor.getJSON());
        console.log('[AUDIT][post-editor-init] Editor.getText():', editor.getText());
        if (editor.storage && editor.storage.markdown) {
          console.log('[AUDIT][post-editor-init] Editor.getMarkdown():', editor.storage.markdown.getMarkdown());
        }
      }, 500);
    }
  }, [editor]);

  const triggerSavedToast = useCallback(() => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 1500);
  }, []);

  const handleSave = useCallback((newTitle: string, _content: string, align = titleAlign) => {
    if (!onSave || !editor) return;
    const markdownContent = (editor.storage as any).markdown.getMarkdown();
    if (!isReadyToSave && !markdownContent.trim()) {
      console.warn('[Editor] handleSave bloqué : markdown vide au premier montage');
      return;
    }
    try {
      const htmlContent = editor.getHTML();
      console.log('[Editor] handleSave appelé. markdownContent:', markdownContent, 'htmlContent:', htmlContent);
      if (!markdownContent.trim()) {
        console.warn('[Editor] Markdown généré vide');
      }
      if (!htmlContent.trim()) {
        console.warn('[Editor] HTML généré vide');
      }
      onSave({
        title: newTitle,
        markdown_content: markdownContent,
        html_content: htmlContent,
        headerImage,
        titleAlign: align,
      });
      setLastSaved(new Date());
      triggerSavedToast();
    } catch (error) {
      console.error('[Editor] Erreur lors de la sauvegarde :', error);
      onSave({
        title: newTitle,
        markdown_content: '',
        html_content: editor.getHTML(),
        headerImage,
        titleAlign: align,
      });
    }
  }, [onSave, editor, headerImage, titleAlign, triggerSavedToast, isReadyToSave]);

  const debouncedSave = useCallback(
    debounce((title: string, content: string, align: string) => {
      handleSave(title, content, align);
    }, 500),
    [handleSave]
  );

  useEffect(() => {
    if (isReadyToSave && isHydrated && isContentLoaded && editor) {
      console.log('[Editor] Auto-save déclenchée. markdownContent:', markdownContent);
      debouncedSave(title, editor.getHTML() || '', titleAlign);
    }
  }, [title, contentVersion, isReadyToSave, isHydrated, isContentLoaded, editor, titleAlign, debouncedSave]);

  useEffect(() => {
    if (editor) {
      console.log('[Editor] Éditeur monté. State:', editor.getJSON());
    }
  }, [editor]);

  interface EditorEvent { editor: typeof editor }
  const updateWordCount = useCallback((event?: EditorEvent) => {
    const ed = event && event.editor ? event.editor : editor;
    if (!ed) return;
    const text = ed.getText();
    const count = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    setWordCount(`${count} ${count <= 1 ? 'mot' : 'mots'}`);
    console.log('[WordCount] Update:', count, '| Text:', text.slice(0, 30));
  }, [editor]);

  useEffect(() => {
    if (editor) {
      // Update on any transaction (input, paste, undo, etc.)
      const transactionHandler = (event?: EditorEvent) => updateWordCount(event);
      const selectionHandler = (event?: EditorEvent) => updateWordCount(event);
      editor.on('transaction', transactionHandler);
      editor.on('selectionUpdate', selectionHandler);
      // Initial count
      updateWordCount({ editor });
      return () => {
        editor.off('transaction', transactionHandler);
        editor.off('selectionUpdate', selectionHandler);
      };
    }
  }, [editor, updateWordCount]);

  useEffect(() => {
    if (editor) {
      editor.commands.focus('start');
    }
  }, [editor]);

  useEffect(() => {
    if (isTitleFocused && titleInputRef.current) {
      const input = titleInputRef.current as HTMLInputElement | null;
      if (input && typeof input.focus === 'function') {
        input.focus();
        // Place cursor at the end of the input
        const len = input.value.length;
        if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(len, len);
        }
      }
    }
  }, [isTitleFocused]);

  useEffect(() => {
    if (isTitleFocused && titleInputRef.current) {
      // Scroll automatique à droite
      const input = titleInputRef.current as HTMLInputElement | null;
      if (input && typeof input.scrollLeft !== 'undefined' && typeof input.scrollWidth !== 'undefined') {
        input.scrollLeft = input.scrollWidth;
      }
    }
  }, [title, isTitleFocused]);

  useEffect(() => {
    const ta = titleTextareaRef.current;
    if (ta) {
      ta.style.height = '45px';
    }
  }, []);

  useEffect(() => {
    if (isContentLoaded) handleSave(title, editor?.getHTML() || '', titleAlign);
    // eslint-disable-next-line
  }, [title]);

  useEffect(() => {
    if (isContentLoaded) handleSave(title, editor?.getHTML() || '', titleAlign);
    // eslint-disable-next-line
  }, [headerImageUrl]);

  useEffect(() => {
    if (isContentLoaded) handleSave(title, editor?.getHTML() || '', titleAlign);
    // eslint-disable-next-line
  }, [contentVersion]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(title, editor?.getHTML() || '', titleAlign);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [title, editor, titleAlign, handleSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsTitleFocused(false);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInHours = Math.floor(diffInSeconds / 3600);
    // Si plus de 24h, afficher la date
    if (diffInHours >= 24) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (diffInHours >= 1) {
      return `il y a ${diffInHours}h`;
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes >= 1) {
      return `il y a ${diffInMinutes} min`;
    }
    return 'il y a quelques secondes';
  };

  useEffect(() => {
    if (rootRef.current) {
      // Si aucune police sélectionnée ou police inconnue, on applique Noto Sans
      const fontObj = FONT_OPTIONS.find(f => f.key === selectedFont) || { value: defaultFont };
      rootRef.current.style.setProperty('--editor-font-family', fontObj.value);
    }
  }, [selectedFont]);

  const handleImageSelect = (url: string) => {
    setHeaderImageUrl(url);
    setImageMenuOpen(false);
  };

  // Extraction dynamique des titres (headings) pour la TOC à partir de TipTap/ProseMirror
  useEffect(() => {
    if (!editor) return;
    const extractHeadings = () => {
      const headingsArr: Heading[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const level = node.attrs.level;
          const text = node.textContent;
          // Unicité garantie : texte + niveau + position
          const id = slugify(`${text}-${level}-${pos}`, { lower: true, strict: true });
          headingsArr.push({ id, text, level });
        }
      });
      setHeadings(headingsArr);
    };
    extractHeadings();
    editor.on('update', extractHeadings);
    return () => {
      editor.off('update', extractHeadings);
    };
  }, [editor]);

  // Fermer le menu de police au clic extérieur
  useEffect(() => {
    if (!fontMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const menu = document.querySelector('.editor-font-menu');
      const btn = document.querySelector('.editor-font-btn');
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fontMenuOpen]);

  useEffect(() => {
    if (editor && isContentLoaded) {
      const checkMarkdownQuality = () => {
        try {
          const markdown = (editor.storage as any).markdown.getMarkdown();
          const hasUnclosedTags = /<[^>]*$/.test(markdown);
          const hasInvalidLinks = /\[([^\]]*)\]\([^)]*\)/.test(markdown) && !/\[([^\]]*)\]\([^)]+\)/.test(markdown);
          if (hasUnclosedTags || hasInvalidLinks) {
            console.warn('[Editor] Problèmes détectés dans le Markdown :', {
              unclosedTags: hasUnclosedTags,
              invalidLinks: hasInvalidLinks,
            });
          }
        } catch (error) {
          console.error('[Editor] Erreur lors de la vérification de la qualité du Markdown :', error);
        }
      };
      const interval = setInterval(checkMarkdownQuality, 10000);
      return () => clearInterval(interval);
    }
  }, [editor, isContentLoaded]);

  // Fonction pour fermer la note et revenir au Folder Manager
  const closeNote = useCallback(() => {
    if (editor) {
      editor.commands.clearContent();
      editor.destroy();
    }
    if (onClose) onClose();
  }, [editor, onClose]);

  // Gestion de la touche Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNote();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeNote]);

  useEffect(() => {
    setEditorKey(k => k + 1);
  }, [markdownContent]);

  useEffect(() => {
    if (editor && markdownContent) {
      editor.commands.setContent(markdownContent, false);
      // Forcer extraction des headings après setContent
      setTimeout(() => {
        const headingsArr: Heading[] = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            const level = node.attrs.level;
            const text = node.textContent;
            const id = slugify(`${text}-${level}-${pos}`, { lower: true, strict: true });
            headingsArr.push({ id, text, level });
          }
        });
        setHeadings(headingsArr);
      }, 0);
    }
  }, [editor, markdownContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-root" ref={rootRef} style={{ width: '100%', height: '100%' }}>
      {/* Affichage de la date de sauvegarde si disponible */}
      {lastSaved && (
        <div style={{ position: 'absolute', top: 8, right: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
          Dernière sauvegarde : {formatTimeAgo(lastSaved)}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="editor-modal-overlay fullscreen">
            <motion.div
              className="editor-container"
              onMouseDown={(e) => e.stopPropagation()}
              ref={editorWrapperRef}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* === TOPBAR (barre d'outils supérieure) === */}
              <div className="editor-topbar" style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '0.1rem', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', filter: 'brightness(0.8)', zIndex: 2 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="logoGradientEditor" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent-hover)" />
                        <stop offset="100%" stopColor="var(--accent-primary)" />
                      </linearGradient>
                    </defs>
                    <rect width="18" height="18" rx="4.5" fill="url(#logoGradientEditor)" />
                    <path d="M12.75 5.25L5.25 12.75M5.25 8.25v5h5" stroke="var(--bg-main)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ background: 'linear-gradient(to bottom right, var(--accent-hover), var(--accent-primary))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontFamily: 'Inter, sans-serif', textTransform: 'lowercase', fontSize: '18px', marginLeft: 8 }}>abrège</span>
                </div>
                {/* === TOOLBAR PRINCIPALE === */}
                <EditorToolbar editor={editor} setImageMenuOpen={setImageMenuOpen} />
                {/* Actions à droite (fermer, preview, etc.) à intégrer ensuite */}
                <div className="editor-topbar-actions" style={{ marginLeft: 'auto', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                  <Tooltip text="Aperçu"><button className="editor-action-button big-action preview-action"><MdRemoveRedEye size={20} /></button></Tooltip>
                  <Tooltip text="Plus d'actions"><button className="editor-action-button big-action kebab-action"><FiMoreVertical size={20} /></button></Tooltip>
                  <Tooltip text="Fermer la note"><button className="editor-action-button big-action close-action" style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeNote}><MdClose size={22} /></button></Tooltip>
                </div>
              </div>
              {/* === FIN TOPBAR === */}
              {/* === ZONE PRINCIPALE D'ÉDITION === */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                {/* === HEADER IMAGE === */}
                {headerImage ? (
                  <EditorHeaderImage
                    headerImageUrl={headerImage}
                    onHeaderChange={setHeaderImage}
                    imageMenuOpen={imageMenuOpen}
                    onImageMenuOpen={() => setImageMenuOpen(true)}
                    onImageMenuClose={() => setImageMenuOpen(false)}
                  />
                ) : (
                  <button
                    className="editor-header-image-btn"
                    style={{
                      position: 'absolute',
                      top: 18,
                      right: 24,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      padding: 4,
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => setHeaderImage(getRandomHeaderImage(''))}
                    aria-label="Ajouter une image d'en-tête"
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FiImage size={18} color="var(--accent-primary)" />
                  </button>
                )}
                {/* === TITRE DIRECTEMENT === */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '20px 0 25px 0', padding: '0 24px', boxSizing: 'border-box' }}>
                  <textarea
                    ref={titleInputRef as any}
                    className="editor-title"
                    value={title}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    onFocus={() => setIsTitleFocused(true)}
                    placeholder="Titre de la note..."
                    rows={1}
                    wrap="soft"
                    style={{
                      resize: 'none',
                      height: '45px',
                      minHeight: '45px',
                      maxHeight: '45px',
                      overflow: 'hidden'
                    }}
                    autoComplete="off"
                    spellCheck={true}
                  />
                </div>
                {/* === ZONE MARKDOWN DIRECTEMENT EN DESSOUS === */}
                <div
                  className="editor-content markdown-body"
                  style={{
                    width: '1000px',
                    margin: '0 auto',
                    padding: 0,
                    minHeight: '100vh',
                    height: 'auto',
                    boxSizing: 'border-box',
                  }}
                >
                  <EditorContent
                    editor={editor}
                    key={editorKey}
                    onKeyDown={e => {
                      if (e.key === '/' && editor) {
                        // Calculer la position du caret dans la fenêtre (viewport)
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0).cloneRange();
                          const rect = range.getBoundingClientRect();
                          const anchor = { left: rect.left, top: rect.bottom };
                          slashMenuRef.current?.openMenu(anchor);
                        }
                      }
                    }}
                  />
                </div>
                {/* === TOC FIXE À DROITE === */}
                {headings.length > 0 && (
                  <div style={{
                    position: 'fixed',
                    top: 395,
                    right: 24,
                    zIndex: 9999,
                    maxHeight: '80vh',
                    overflowY: 'auto'
                  }}>
                    <TableOfContents 
                      headings={headings} 
                      currentId={currentId} 
                      pinned={false} 
                      onPin={() => {}} 
                      onClose={() => {}} 
                      containerRef={rootRef} 
                    />
                  </div>
                )}
                {/* === SLASH MENU === */}
                <EditorSlashMenu
                  ref={slashMenuRef}
                  onInsert={(cmd: any) => {
                    if (!editor) return;
                    const { from } = editor.state.selection;
                    const lineStart = editor.state.doc.resolve(from).start();
                    const textBefore = editor.state.doc.textBetween(lineStart, from, '\0', '\0');
                    const slashIndex = textBefore.lastIndexOf('/');
                    if (slashIndex !== -1) {
                      editor.commands.command(({ tr, state }) => {
                        tr.delete(lineStart + slashIndex, from);
                        return true;
                      });
                    }
                    if (cmd && cmd.id === 'image') {
                      editor.chain().focus().setImage({ src: '' }).run();
                      setTimeout(() => setImageMenuOpen(true), 0);
                      return;
                    }
                    if (cmd && typeof cmd.action === 'function') {
                      cmd.action(editor);
                    }
                  }}
                  lang={lang}
                />
              </div>
              {/* ... autres sous-blocs à migrer ensuite ... */}
            </motion.div>
          </div>
        </div>
      </div>
      {/* === FOOTER : compteur de mots et date de dernière modif === */}
      <EditorFooter lastSaved={lastSaved} wordCount={wordCount} formatTimeAgo={formatTimeAgo} />
      {/* Toast "Saved" en bas à droite */}
      {showSavedToast && (
        <div style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 9999,
          background: 'linear-gradient(90deg, var(--accent-hover) 0%, var(--accent-primary) 100%)',
          color: '#fff',
          padding: '7px 18px',
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 15,
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          letterSpacing: '0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeInOut 1.5s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.18"/><path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Saved
        </div>
      )}
    </div>
  );
}

export default Editor; 