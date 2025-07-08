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
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml'; // xml pour html
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import { 
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, 
  FiAlignCenter, FiAlignRight, FiX, FiCode, FiLink,
  FiImage, FiMoreHorizontal, FiMoreVertical, FiCheckSquare, FiMaximize, FiMinimize,
  FiMic, FiPlus, FiCopy, FiCheck, FiEye, FiGrid, FiMail, FiFeather, FiShare2, FiDownload, FiPrinter, FiFileText
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
import Heading from '@tiptap/extension-heading';
import slugify from 'slugify';
import TrailingNodeExtension from '../extensions/TrailingNodeExtension';
import CodeBlockWithCopy from '../extensions/CodeBlockWithCopy';
import CustomImage from '../extensions/CustomImage';
import CustomHeading, { IdPlugin } from '../extensions/CustomHeading';
import TurndownService from 'turndown';

const lowlight = createLowlight({
  javascript,
  js: javascript,
  typescript,
  ts: typescript,
  css,
  html,
  python,
  py: python,
  bash,
  sh: bash,
});

const HEADER_IMAGES = [
  'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function getRandomHeaderImage(current) {
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

// Remplacement du composant TitleTextarea par la version optimisée de l'utilisateur
function TitleTextarea({
  value,
  onChange,
  onBlur,
  onFocus,
  inputRef,
  disabled,
  placeholder,
  style
}) {
  const handleInput = e => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => {
    if (inputRef?.current) {
      const el = inputRef.current;
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value, inputRef]);

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
      onInput={handleInput}
      className="editor-title-input"
      rows={1}
      wrap="soft"
      placeholder={placeholder}
      disabled={disabled}
      style={{
        ...style,
        resize: 'none',
        width: '100%',
        minHeight: '38px',
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1.2,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: 0,
        margin: 0,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        overflow: 'hidden',
        boxSizing: 'border-box',
        whiteSpace: 'normal', // ✅ autorise le wrapping
        wordBreak: 'break-word',
        transition: 'height 0.1s ease'
      }}
      spellCheck={true}
      autoFocus
    />
  );
}

const Editor = ({ initialTitle, initialContent = '', headerImage: initialHeaderImage, onClose, onSave, initialTitleAlign = 'left' }) => {
  const [title, setTitle] = useState(initialTitle);
  const [lastSaved, setLastSaved] = useState(new Date());
  const [wordCount, setWordCount] = useState('0 mot');
  const [isCopied, setIsCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const blurTimeoutRef = useRef(null);
  const editorWrapperRef = useRef(null);
  const wordCountTimeoutRef = useRef(null);
  const titleInputRef = useRef(null);
  const noteNumberRef = useRef(1);
  const getDefaultTitle = () => `Nouvelle note #${noteNumberRef.current}`;
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
  const [headings, setHeadings] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const editorContentRef = useRef(null);
  const tocContainerRef = useRef(null);
  const [titleAlign, setTitleAlign] = useState(initialTitleAlign);
  const rootRef = useRef(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);
  const [markdownContent, setMarkdownContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const turndownService = new TurndownService();
  const [editorKey, setEditorKey] = useState(0);

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
    setEditorKey(k => k + 1);
  }, [markdownContent]);

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
      CodeBlockWithCopy.configure({
        lowlight,
      }),
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
        validate: href => /^https?:\/\//.test(href),
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
      IdPlugin,
      Markdown.configure({
        html: true,
        tightLists: true,
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
        breaks: true,
      }),
    ],
    content: markdownContent,
    onUpdate: () => {
      setTimeout(() => setContentVersion(v => v + 1), 0); // Pour déclencher le useEffect ci-dessous
    },
    editorProps: {
      attributes: {
        class: 'editor-content',
      },
    },
    autofocus: true,
    handleOpenImageMenu: () => setImageMenuOpen(true),
    immediatelyRender: false,
    onCreate: () => {
      setIsContentLoaded(true);
    },
  });

  useEffect(() => {
    if (!isContentLoaded || !editor) return;
    handleSave(title, editor.getHTML() || '', titleAlign);
  }, [title, contentVersion, isContentLoaded, editor, titleAlign]);

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

  const updateWordCount = useCallback((event) => {
    const ed = event && event.editor ? event.editor : (editor || window.__tiptapEditor);
    if (!ed) return;
    const text = ed.getText();
    const count = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(`${count} ${count <= 1 ? 'mot' : 'mots'}`);
    console.log('[WordCount] Update:', count, '| Text:', text.slice(0, 30));
  }, [editor]);

  useEffect(() => {
    if (editor) {
      // Update on any transaction (input, paste, undo, etc.)
      const transactionHandler = (event) => updateWordCount(event);
      const selectionHandler = (event) => updateWordCount(event);
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
      const input = titleInputRef.current;
      input.focus();
      // Place cursor at the end of the input
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }
  }, [isTitleFocused]);

  useEffect(() => {
    if (isTitleFocused && titleInputRef.current) {
      // Scroll automatique à droite
      const input = titleInputRef.current;
      input.scrollLeft = input.scrollWidth;
    }
  }, [title, isTitleFocused]);

  const handleSave = (newTitle, _content, align = titleAlign) => {
    if (onSave && editor) {
      const html_content = editor.getHTML();
      const markdown_content = editor.storage.markdown.getMarkdown();
      onSave({ title: newTitle, markdown_content, html_content, headerImage, titleAlign: align });
      setLastSaved(new Date());
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setIsTitleFocused(false);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInHours = Math.floor(diffInSeconds / 3600);
    
    // Si plus de 24h, afficher la date
    if (diffInHours >= 24) {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    // Si plus d'une heure mais moins de 24h
    if (diffInHours >= 1) {
      return `Il y a ${diffInHours}h`;
    }
    
    // Si moins d'une heure
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes > 0) {
      return `Il y a ${diffInMinutes} min`;
    }
    
    return 'À l\'instant';
  };

  const getWordCount = () => wordCount;

  const insertTable = () => {
    editor?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const handleCopyAll = () => {
    if (editor) {
      const content = editor.getHTML();
      navigator.clipboard.writeText(content).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
  };

  const handleHeaderImage = () => {
    setHeaderImage(prev => prev ? getRandomHeaderImage(prev) : HEADER_IMAGES[Math.floor(Math.random() * HEADER_IMAGES.length)]);
  };

  const handleInsertImage = (src) => {
    if (!editor) return;
    // Trouver le bloc image vide le plus proche (src='')
    const { state, view } = editor;
    let found = false;
    state.doc.descendants((node, pos) => {
      if (node.type.name === 'image' && (!node.attrs.src || node.attrs.src === '')) {
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, src });
          return true;
        }).run();
        found = true;
        return false;
      }
      return true;
    });
    // Si pas trouvé, insérer normalement
    if (!found) {
      editor.chain().focus().setImage({ src }).run();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+S ou Ctrl+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(title, editor?.getHTML() || '', titleAlign);
      }
      // Echap
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, editor, handleSave, onClose]);

  // Slash menu logic
  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (event) => {
      if (event.key === '/' && !slashOpen && document.activeElement === editor.view.dom) {
        setSlashOpen(true);
        setSlashSearch('');
        // Calculer la position du curseur relative à l'éditeur (plus fiable)
        let coords = { left: 24, top: 48 }; // fallback
        try {
          if (editor && editor.view) {
            const pos = editor.state.selection.from;
            const domCoords = editor.view.coordsAtPos(pos);
          const editorRect = editorWrapperRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            coords = {
              left: domCoords.left - editorRect.left,
              top: domCoords.bottom - editorRect.top + 4
            };
          }
        } catch (e) {
          // fallback déjà défini
        }
        setSlashAnchor(coords);
        slashAnchorRef.current = coords;
      } else if (event.key === 'Escape' && slashOpen) {
        setSlashOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, slashOpen]);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!slashOpen) return;
    const handleClick = (e) => {
      setSlashOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashOpen]);

  // Insertion de bloc à la sélection
  const handleSlashSelect = (cmd) => {
    setSlashOpen(false);
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
  };

  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    const dom = editor.view.dom;
    const handleBackspace = (event) => {
      if (event.key === 'Backspace') {
        const { state } = editor;
        const { $from } = state.selection;
        const parent = $from.node(-1);
        // Cas taskItem (checklist) vide : supprime le node puis force <p>
        if (
          parent.type.name === 'taskItem' &&
          $from.parent.content.size === 0 &&
          $from.parentOffset === 0
        ) {
          event.preventDefault();
          editor.chain().focus().deleteNode().setNode('paragraph').run();
          return;
        }
        // Cas bullet/numérotée : même logique
        if (
          parent.type.name === 'listItem' &&
          $from.parent.content.size === 0 &&
          $from.parentOffset === 0
        ) {
          event.preventDefault();
          editor.chain().focus().setNode('paragraph').run();
        }
      }
    };
    dom.addEventListener('keydown', handleBackspace);
    return () => dom.removeEventListener('keydown', handleBackspace);
  }, [editor]);

  // Style commun pour les boutons header
  const headerBtnStyle = {
    background: 'rgba(32,32,32,0.55)',
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

  useEffect(() => {
    if (fontMenuOpen && fontButtonRef.current) {
      const rect = fontButtonRef.current.getBoundingClientRect();
      setFontMenuPos({
        top: rect.top + rect.height + 6, // 6px de respiration sous le bouton
        left: rect.left
      });
    }
  }, [fontMenuOpen]);

  useEffect(() => {
    if (fontMenuOpen) {
      const handleClick = (e) => {
        if (fontButtonRef.current && !fontButtonRef.current.contains(e.target)) {
          setFontMenuOpen(false);
        }
      };
      const handleEsc = (e) => {
        if (e.key === 'Escape') setFontMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [fontMenuOpen]);

  useEffect(() => {
    if (kebabMenuOpen && kebabButtonRef.current) {
      const rect = kebabButtonRef.current.getBoundingClientRect();
      const menuWidth = 200; // largeur estimée du menu
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }
      setKebabMenuPos({
        top: rect.top + rect.height + 6,
        left
      });
    }
    if (kebabMenuOpen) {
      const handleClick = (e) => {
        if (kebabButtonRef.current && !kebabButtonRef.current.contains(e.target)) {
          setKebabMenuOpen(false);
        }
      };
      const handleEsc = (e) => {
        if (e.key === 'Escape') setKebabMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEsc);
      };
    }
  }, [kebabMenuOpen]);

  const handleShare = () => { /* Ouvre modale de partage */ setKebabMenuOpen(false); };
  const handleExport = () => { /* Ouvre modale d'export */ setKebabMenuOpen(false); };
  const handlePrint = () => { window.print(); setKebabMenuOpen(false); };

  // Extraction dynamique des headings
  useEffect(() => {
    if (!editor || !editor.view || !editor.view.dom) return;
    const updateHeadings = () => {
      const container = tocContainerRef.current;
      if (!container) {
        setHeadings([]);
        return;
      }
      const nodes = Array.from(container.querySelectorAll('h1, h2, h3'));
      const hs = nodes.map((node) => {
        const id = node.getAttribute('id');
        console.log('updateHeadings DEBUG: Extracted ID:', id, 'for text:', node.textContent);
        return {
          id: id,
          text: node.textContent,
          level: parseInt(node.tagName.substring(1), 10)
        };
      });
      setHeadings(hs);
    };
    editor.on('transaction', updateHeadings);
    return () => {
      editor.off('transaction', updateHeadings);
    };
  }, [editor]);

  // Scrollspy : heading visible
  useEffect(() => {
    if (!headings.length) return;
    const onScroll = () => {
      const scrollY = window.scrollY;
      let found = headings[0]?.id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 120) found = h.id;
      }
      setCurrentId(found);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  // Juste avant le render, récupérer la valeur CSS de la police sélectionnée
  const selectedFontObj = FONT_OPTIONS.find(f => f.key === selectedFont) || FONT_OPTIONS[2];

  useEffect(() => {
    if (rootRef.current && selectedFontObj) {
      console.log('Mise à jour de l\'état, nouvelle police :', selectedFontObj);
      rootRef.current.style.setProperty('--editor-font-family', selectedFontObj.value);
    }
  }, [selectedFontObj]);

  // --- PATTERN D'INJECTION ROBUSTE DU CONTENU DANS TIPTAP ---
  // Toujours injecter le markdown dans l'éditeur via setContent après création,
  // pour garantir l'hydratation du DOM même si l'extension Markdown ne le fait pas nativement.
  useEffect(() => {
    if (editor && markdownContent) {
      editor.commands.setContent(markdownContent, false);
    }
  }, [editor, markdownContent]);

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-root" ref={rootRef} style={{ width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%', height: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="editor-modal-overlay fullscreen">
            <div className="editor-container" onMouseDown={(e) => e.stopPropagation()} ref={editorWrapperRef}>
              <div className="editor-topbar" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minHeight: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '0.75rem', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', filter: 'brightness(0.8)', zIndex: 2 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="logoGradientEditor" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent-hover)" />
                        <stop offset="100%" stopColor="var(--accent-primary)" />
                      </linearGradient>
                    </defs>
                    <rect width="24" height="24" rx="6" fill="url(#logoGradientEditor)" />
                    <path d="M17 7L7 17M7 11v6h6" stroke="var(--bg-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ background: 'linear-gradient(to bottom right, var(--accent-hover), var(--accent-primary))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', fontFamily: 'Inter, sans-serif', textTransform: 'lowercase', fontSize: '1.35rem' }}>abrège</span>
                </div>
                <div className="editor-toolbar-center" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', alignItems: 'center' }}>
                  <div className="toolbar-group">
                    <div className="font-dropdown-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tooltip text="Changer la police">
                        <button
                          className="toolbar-button font-dropdown-btn"
                          ref={fontButtonRef}
                          onClick={() => setFontMenuOpen(v => !v)}
                          style={{ fontWeight: 600, fontSize: 18 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M6.5 16l5-12h1l5 12M8 13h8"/></svg>
                        </button>
                      </Tooltip>
                      {fontMenuOpen && (
                        <div
                          className="font-dropdown-menu"
                          style={{
                            position: 'fixed',
                            left: fontMenuPos.left,
                            top: fontMenuPos.top,
                            background: 'var(--surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                            zIndex: 100,
                            minWidth: 160
                          }}
                        >
                          {FONT_OPTIONS.map((font, idx) => (
                            <div
                              key={font.key}
                              className="font-dropdown-item"
                              style={{
                                padding: '10px 18px',
                                cursor: 'pointer',
                                fontFamily: font.value,
                                fontWeight: 500,
                                fontSize: 16,
                                background: fontHoverIdx === idx ? 'var(--bg-surface-hover)' : 'transparent',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background 0.18s',
                              }}
                              onClick={() => {
                                console.log('Police sélectionnée :', font.key);
                                setSelectedFont(font.key);
                                setFontMenuOpen(false);
                                if (editor) editor.commands.focus();
                              }}
                              onMouseEnter={() => setFontHoverIdx(idx)}
                              onMouseLeave={() => setFontHoverIdx(-1)}
                            >
                              <span>{font.label}</span>
                              {selectedFont === font.key && (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Tooltip text="Gras (Ctrl+B)"><button className={`toolbar-button icon-text-style ${editor.isActive('bold') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBold().run()} style={{ fontFamily: selectedFontObj.value }}><FiBold size={16} /></button></Tooltip>
                    <Tooltip text="Italique (Ctrl+I)"><button className={`toolbar-button icon-text-style ${editor.isActive('italic') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleItalic().run()}><FiItalic size={16} /></button></Tooltip>
                    <Tooltip text="Souligné (Ctrl+U)"><button className={`toolbar-button icon-text-style ${editor.isActive('underline') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleUnderline().run()}><FiUnderline size={16} /></button></Tooltip>
                  </div>
                  <div className="toolbar-group">
                    <Tooltip text="Titre 1 (H1)"><button className={`toolbar-button ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button></Tooltip>
                    <Tooltip text="Titre 2 (H2)"><button className={`toolbar-button ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button></Tooltip>
                    <Tooltip text="Titre 3 (H3)"><button className={`toolbar-button ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button></Tooltip>
                  </div>
                  <div className="toolbar-group">
                    <Tooltip text="Aligner à gauche">
                      <button
                        className={`toolbar-button ${isTitleFocused && titleAlign === 'left' ? 'active' : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          if (isTitleFocused) setTitleAlign('left');
                          else editor.chain().focus().setTextAlign('left').run();
                        }}
                      >
                        <FiAlignLeft />
                      </button>
                    </Tooltip>
                    <Tooltip text="Centrer">
                      <button
                        className={`toolbar-button ${isTitleFocused && titleAlign === 'center' ? 'active' : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          if (isTitleFocused) setTitleAlign('center');
                          else editor.chain().focus().setTextAlign('center').run();
                        }}
                      >
                        <FiAlignCenter />
                      </button>
                    </Tooltip>
                    <Tooltip text="Aligner à droite"><button className={`toolbar-button ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} onClick={() => editor.chain().focus().setTextAlign('right').run()}><FiAlignRight /></button></Tooltip>
                  </div>
                  <div className="toolbar-group">
                    <Tooltip text="Liste à puces"><button className={`toolbar-button ${editor.isActive('bulletList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBulletList().run()}><FiList /></button></Tooltip>
                    <Tooltip text="Liste numérotée"><button className={`toolbar-button ${editor.isActive('orderedList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}><AiOutlineOrderedList /></button></Tooltip>
                    <Tooltip text="Cases à cocher"><button className={`toolbar-button ${editor.isActive('taskList') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleTaskList().run()}><FiCheckSquare /></button></Tooltip>
                    <Tooltip text="Insérer un tableau"><button className="toolbar-button" onClick={insertTable}><MdGridOn size={20} style={{ borderRadius: 4 }} /></button></Tooltip>
                      <Tooltip text="Citation"><button className={`toolbar-button ${editor.isActive('blockquote') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleBlockquote().run()}><MdFormatQuote size={20} /></button></Tooltip>
                    <Tooltip text="Bloc de code"><button className={`toolbar-button ${editor.isActive('codeBlock') ? 'active' : ''}`} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><FiCode /></button></Tooltip>
                  </div>
                  <div className="toolbar-group">
                    <Tooltip text="Image">
                      <button className={`toolbar-button`} onClick={() => {
                        editor.chain().focus().setImage({ src: '' }).run();
                        setTimeout(() => setImageMenuOpen(true), 0);
                      }}><FiImage /></button>
                    </Tooltip>
                    <Tooltip text="Dictaphone IA">
                      <button
                        className="toolbar-button"
                        onClick={() => console.log('Microphone clicked')}
                      >
                        <FiMic />
                      </button>
                    </Tooltip>
                    <Tooltip text="Agent IA">
                      <button
                        className="toolbar-button"
                        onClick={() => console.log('AI button clicked')}
                        style={{ 
                          color: 'var(--accent-primary)',
                          animation: 'glow 2s ease-in-out infinite',
                          fontWeight: '600'
                        }}
                      >
                        AI
                      </button>
                    </Tooltip>
                  </div>
                  </div>
                  <div className="editor-topbar-actions" style={{ marginLeft: 'auto', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tooltip text={editorMode === 'letter' ? "Mode A4 : Mise en page." : "Mode Créatif : Mise en page libre."} placement="bottom">
                      <button
                        className="editor-action-button big-action mode-toggle-action"
                        onClick={() => setEditorMode(editorMode === 'letter' ? 'creative' : 'letter')}
                        aria-label={editorMode === 'letter' ? 'Basculer en mode créatif' : 'Basculer en mode A4'}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'none', border: 'none', boxShadow: 'none', marginLeft: 200, marginRight: 84 }}
                      >
                        {editorMode === 'letter' ? (
                          <FiFileText size={20} />
                        ) : (
                          <FiFeather size={20} />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip text="Quitter l'aperçu">
                      <button
                        className={`editor-action-button big-action preview-action${isPreview ? ' active' : ''}`}
                        onClick={() => setIsPreview(p => !p)}
                      >
                        <MdRemoveRedEye size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Plus d'actions">
                      <button
                        className="editor-action-button big-action kebab-action"
                        ref={kebabButtonRef}
                        onClick={() => setKebabMenuOpen(v => !v)}
                        aria-haspopup="true"
                        aria-expanded={kebabMenuOpen}
                        aria-label="Plus d'actions"
                      >
                        <FiMoreVertical size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Fermer">
                      <button className="editor-action-button big-action close-action" onClick={onClose}>
                        <MdClose size={22} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
                
                {!isPreview && (
                  <div
                    className="editor-content-wrapper"
                    id="editor-content"
                    style={{ position: 'relative' }}
                    ref={tocContainerRef}
                  >
                    {/* Zone d'édition texte avec TOC à droite, sous le header */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      {headerImage && (
                        <motion.div
                          className="editor-header-image"
                          key={headerImage}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            width: '100%',
                            height: 300,
                            margin: '0 0 0.5rem 0',
                            borderRadius: 0,
                            overflow: 'hidden',
                            maxWidth: '100%',
                            position: 'relative'
                          }}
                        >
                          {/* Colonne verticale de contrôle avec hover global */}
                          <div
                            className="header-image-controls"
                            style={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              zIndex: 20,
                              alignItems: 'flex-end',
                              background: headerControlsHovered ? 'rgba(24,24,24,0.32)' : 'rgba(24,24,24,0.22)',
                              borderRadius: 40,
                              padding: 4,
                              transition: 'background 0.18s',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255,255,255,0.10)',
                              boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
                            }}
                            onMouseEnter={() => setHeaderControlsHovered(true)}
                            onMouseLeave={() => setHeaderControlsHovered(false)}
                          >
                            {/* Fermer */}
                            <div style={{ position: 'relative', display: 'flex' }}>
                              <button
                                className="header-image-btn"
                                onClick={() => setHeaderImage(null)}
                                style={{ ...headerBtnStyle, background: 'none', opacity: 0.75 }}
                                title="Fermer"
                                onMouseEnter={e => e.currentTarget.nextSibling.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.nextSibling.style.opacity = 0}
                              >
                                <MdClose size={20} />
                              </button>
                              <span style={{
                                position: 'absolute',
                                right: '113%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(24,24,24,0.38)',
                                color: '#fff',
                                fontSize: 13,
                                borderRadius: 8,
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                opacity: 0,
                                transition: 'opacity 0.18s',
                                zIndex: 100,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.10)',
                              }}>
                                Fermer
                              </span>
                            </div>
                            {/* Changer d'image */}
                            <div style={{ position: 'relative', display: 'flex' }}>
                              <button
                                className="header-image-btn"
                                onClick={handleHeaderImage}
                                style={{ ...headerBtnStyle, background: 'none', opacity: 0.75 }}
                                title="Changer l'image"
                                onMouseEnter={e => e.currentTarget.nextSibling.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.nextSibling.style.opacity = 0}
                              >
                                <FiImage size={20} />
                              </button>
                              <span style={{
                                position: 'absolute',
                                right: '113%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(24,24,24,0.38)',
                                color: '#fff',
                                fontSize: 13,
                                borderRadius: 8,
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                opacity: 0,
                                transition: 'opacity 0.18s',
                                zIndex: 100,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.10)',
                              }}>
                                Changer d'image
                              </span>
                            </div>
                            {/* Overlay */}
                            <div style={{ position: 'relative', display: 'flex' }}>
                              <button
                                className="header-image-btn"
                                onClick={() => setHeaderOverlayLevel(l => (l + 1) % 6)}
                                style={{ ...headerBtnStyle, background: 'none', opacity: 0.75 }}
                                title="Overlay"
                                onMouseEnter={e => e.currentTarget.nextSibling.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.nextSibling.style.opacity = 0}
                              >
                                <LuMoon size={20} />
                              </button>
                              <span style={{
                                position: 'absolute',
                                right: '113%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(24,24,24,0.38)',
                                color: '#fff',
                                fontSize: 13,
                                borderRadius: 8,
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                opacity: 0,
                                transition: 'opacity 0.18s',
                                zIndex: 100,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.10)',
                              }}>
                                Overlay: {headerOverlayLevel}/5
                              </span>
                            </div>
                            {/* Blur */}
                            <div style={{ position: 'relative', display: 'flex' }}>
                              <button
                                className="header-image-btn"
                                onClick={() => setHeaderBlurLevel(l => (l + 1) % 6)}
                                style={{ ...headerBtnStyle, background: 'none', opacity: 0.75 }}
                                title="Flou"
                                onMouseEnter={e => e.currentTarget.nextSibling.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.nextSibling.style.opacity = 0}
                              >
                                <LuCloudFog size={20} />
                              </button>
                              <span style={{
                                position: 'absolute',
                                right: '113%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(24,24,24,0.38)',
                                color: '#fff',
                                fontSize: 13,
                                borderRadius: 8,
                                padding: '3px 10px',
                                whiteSpace: 'nowrap',
                                pointerEvents: 'none',
                                opacity: 0,
                                transition: 'opacity 0.18s',
                                zIndex: 100,
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.10)',
                              }}>
                                Blur: {headerBlurLevel}/5
                              </span>
                            </div>
                          </div>
                          {/* Overlay visuel et blur appliqués sur l'image */}
                          <img
                            className="header-image"
                            src={headerImage + '?auto=format&fit=crop&w=1200&q=80'}
                            alt="Header visuel"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              borderRadius: 0,
                              filter: `blur(${headerBlurLevel * 2}px)`,
                              transition: 'filter 0.2s',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: `rgba(24,24,24,${0.08 + 0.14 * headerOverlayLevel})`,
                              pointerEvents: 'none',
                              transition: 'background 0.2s',
                            }}
                          />
                        </motion.div>
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {!headerImage && (
                            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30, display: 'flex', gap: 8 }}>
                              <button
                                className="floating-copy-btn"
                                onClick={handleCopyAll}
                                title="Copier tout le contenu"
                                style={{
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 6,
                                  padding: 6,
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                  color: isCopied ? 'var(--accent-primary)' : 'var(--text-2)',
                                  fontSize: 18,
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                                  cursor: 'pointer',
                                  opacity: 0.85
                                }}
                                onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                                onMouseOut={e => (e.currentTarget.style.opacity = '0.85')}
                              >
                                {isCopied ? <FiCheck /> : <FiCopy />}
                              </button>
                              <button
                                className="floating-image-btn"
                                onClick={handleHeaderImage}
                                title="Générer une image de couverture"
                                style={{
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 6,
                                  padding: 6,
                                  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                  color: 'var(--text-2)',
                                  fontSize: 18,
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                                  cursor: 'pointer',
                                  opacity: 0.85
                                }}
                                onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                                onMouseOut={e => (e.currentTarget.style.opacity = '0.85')}
                              >
                                <FiImage />
                              </button>
                            </div>
                          )}
                          {/* Title field above the editor content */}
                          <div className="editor-title-section" style={{ width: '100%', maxWidth: 750, margin: '0 auto', padding: '2.5rem 3rem 0.1rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <TitleTextarea
                              value={title}
                              onChange={handleTitleChange}
                              onFocus={() => {
                                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                                setIsTitleFocused(true);
                              }}
                              onBlur={handleTitleBlur}
                              inputRef={titleInputRef}
                              disabled={isPreview}
                              placeholder="Nouvelle note..."
                              style={{
                                fontSize: '2.25rem',
                                fontWeight: 700,
                                lineHeight: 1.3,
                                letterSpacing: '-0.02em',
                                color: 'var(--text-1)',
                                margin: '0.1rem 0 0rem',
                                paddingBottom: '0.1rem',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                resize: 'none',
                                width: '100%',
                                minHeight: '38px',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                transition: 'height 0.1s ease',
                                textAlign: titleAlign,
                                fontFamily: selectedFontObj.value,
                              }}
                            />
                            {(!title || title.trim() === '') && !isTitleFocused && (
                              <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 22, marginTop: 6, opacity: 0.7, pointerEvents: 'none', position: 'absolute', left: 0, top: 0 }}>
                                Nouvelle note...
                              </span>
                            )}
                          </div>
                          <EditorContent editor={editor} key={editorKey} className="editor-content" />
                          <SelectionOverlay containerId="editor-content" editor={editor} />
                          <SlashMenu
                            open={slashOpen}
                            onSelect={handleSlashSelect}
                            search={slashSearch}
                            setSearch={setSlashSearch}
                            anchorRef={{ current: slashAnchor }}
                            lang={lang}
                          />
                        </div>
                      </div>
                    </div>
                    {/* TOC à droite, flottante */}
                    {headings.length > 0 && (
                      <div style={{
                        position: 'sticky',
                        top: '3.5rem', // décale la TOC juste sous la topbar, à hauteur du titre
                        right: 0,
                        zIndex: 21,
                        alignSelf: 'flex-start',
                        marginLeft: 32,
                      }}>
                        <TableOfContents headings={headings} currentId={currentId} containerRef={tocContainerRef} />
                      </div>
                    )}
                  </div>
                )}
              <div className="editor-footer">
                <div className="editor-time">
                  Dernière sauvegarde : {formatTimeAgo(lastSaved)}
                </div>
                <div className="editor-stats">
                  <span id="word-count">{wordCount}</span>
                </div>
              </div>
            </div>
            <ImageMenu open={imageMenuOpen} onClose={() => setImageMenuOpen(false)} onInsertImage={handleInsertImage} />
            { kebabMenuOpen && (
              <div
                className="kebab-dropdown-menu"
                style={{
                  position: 'fixed',
                  top: kebabMenuPos.top,
                  left: kebabMenuPos.left,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  zIndex: 100,
                  minWidth: 180,
                  padding: '6px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0
                }}
              >
                {[{
                  icon: <FiShare2 size={18} style={{ flexShrink: 0 }} />, label: 'Partager', onClick: handleShare
                }, {
                  icon: <FiDownload size={18} style={{ flexShrink: 0 }} />, label: 'Exporter', onClick: handleExport
                }, {
                  icon: <FiPrinter size={18} style={{ flexShrink: 0 }} />, label: 'Imprimer', onClick: handlePrint
                }].map((item, idx) => (
                  <div
                    key={item.label}
                    className="kebab-menu-item"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 16,
                      background: kebabHoverIdx === idx ? 'var(--bg-surface-hover)' : 'transparent',
                      transition: 'background 0.18s'
                    }}
                    onClick={item.onClick}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && item.onClick()}
                    role="menuitem"
                    onMouseEnter={() => setKebabHoverIdx(idx)}
                    onMouseLeave={() => setKebabHoverIdx(-1)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
                {/* Prévoir d'autres options ici */}
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => setShowPreview(p => !p)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        {showPreview ? 'Édition' : 'Aperçu HTML'}
      </button>
      {showPreview ? (
        <div className="html-preview" style={{ padding: 32, background: '#fff', minHeight: 400 }}>
          <div dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
        </div>
      ) : (
        <EditorContent editor={editor} key={editorKey} className="editor-content" />
      )}
    </div>
  );
};

export default Editor;