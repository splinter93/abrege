/**
 * Extension Tiptap pour les Note Embeds (Notion-style)
 * 
 * Fonctionnalités:
 * - Node custom `noteEmbed` avec attributs (noteRef, depth)
 * - Détection automatique URLs Scrivia au paste
 * - Conversion URL → embed via PasteRule
 * - Command `setNoteEmbed(noteRef, depth)`
 * - React NodeView pour rendering
 * 
 * Prévention récursion: MAX_DEPTH = 3 niveaux
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import NoteEmbedView from '@/components/editor/NoteEmbedView';
import { MAX_EMBED_DEPTH } from '@/types/noteEmbed';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options de l'extension
 */
export interface NoteEmbedOptions {
  maxDepth: number;
  HTMLAttributes: Record<string, unknown>;
}

/**
 * Regex pour détecter les URLs Scrivia
 * Formats supportés:
 * - /@username/[uuid]
 * - /@username/[slug]
 * - https://scrivia.app/@username/[uuid]
 * - https://scrivia.app/@username/[slug]
 * - https://www.scrivia.app/@username/[uuid]
 * - https://www.scrivia.app/@username/[slug]
 * - http://localhost:3000/@username/[uuid] (dev)
 */
const SCRIVIA_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:scrivia\.app|localhost:\d+)?\/(@[^/]+)\/([a-f0-9-]{36}|[a-z0-9-]+)/i;

/**
 * Extraire le noteRef d'une URL Scrivia
 */
function extractNoteRef(url: string): string | null {
  const match = url.match(SCRIVIA_URL_REGEX);
  if (!match) return null;
  
  // match[2] = UUID ou slug
  return match[2];
}

/**
 * Détecter si une URL est une URL Scrivia
 */
function isScriviaUrl(url: string): boolean {
  return SCRIVIA_URL_REGEX.test(url);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXTENSION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteEmbed: {
      /** Insérer un note embed */
      setNoteEmbed: (noteRef: string, depth?: number) => ReturnType;
    };
  }
}

const NoteEmbedExtension = Node.create<NoteEmbedOptions>({
  name: 'noteEmbed',

  addOptions() {
    return {
      maxDepth: MAX_EMBED_DEPTH,
      HTMLAttributes: {}
    };
  },

  onCreate() {
    logger.dev('[NoteEmbed] ✅ Extension créée et active !');
  },

  group: 'block',

  atom: true,

  draggable: false, // ✅ Drag désactivé - utiliser les handles Notion

  addAttributes() {
    return {
      noteRef: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-ref'),
        renderHTML: attributes => ({
          'data-note-ref': attributes.noteRef,
        }),
      },
      noteTitle: {
        default: null,
        parseHTML: element => element.getAttribute('data-note-title'),
        renderHTML: attributes => ({
          'data-note-title': attributes.noteTitle,
        }),
      },
      depth: {
        default: 0,
        parseHTML: element => {
          const depth = element.getAttribute('data-depth');
          return depth ? parseInt(depth, 10) : 0;
        },
        renderHTML: attributes => ({
          'data-depth': attributes.depth,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="note-embed"]',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;
          
          const noteRef = element.getAttribute('data-note-ref');
          const noteTitle = element.getAttribute('data-note-title');
          const depth = element.getAttribute('data-depth');
          
          return {
            noteRef,
            noteTitle,
            depth: depth ? parseInt(depth, 10) : 0,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-type': 'note-embed',
        }
      ),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Sérialiser en format {{embed:noteRef}} ou {{embed:noteRef|title}}
          const noteRef = node.attrs.noteRef;
          const noteTitle = node.attrs.noteTitle;
          
          if (noteTitle) {
            state.write(`{{embed:${noteRef}|${noteTitle}}}`);
          } else {
            state.write(`{{embed:${noteRef}}}`);
          }
          state.closeBlock(node);
        },
      },
    };
  },

  addCommands() {
    return {
      setNoteEmbed:
        (noteRef: string, depth = 0) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              noteRef,
              depth,
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteEmbedView, {
      // ✅ FIX React 18: Éviter les re-renders synchrones qui causent flushSync error
      as: 'div',
      // ✅ Autoriser contextmenu et click, bloquer le reste
      stopEvent: (event) => {
        // Autoriser le menu contextuel (clic droit)
        if (event.type === 'contextmenu') return false;
        // Autoriser le click pour la navigation (géré par React)
        if (event.type === 'click') return false;
        // Bloquer les autres événements (mousedown, keydown, etc.)
        return true;
      },
      // ✅ CRITIQUE: Ne jamais re-render sauf si les attrs changent
      update: (node, decorations) => {
        // Retourner false = ne pas re-render ce NodeView quand l'éditeur update
        // Le contenu React se gère lui-même avec ses propres states
        return node.type.name === 'noteEmbed';
      },
    });
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('noteEmbedPaste');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handlePaste: (view, event) => {
            const clipboardData = (event as ClipboardEvent).clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData('text/plain');
            if (!text) return false;

            // Vérifier si c'est une URL Scrivia
            const isScrivia = isScriviaUrl(text.trim());

            if (isScrivia) {
              const noteRef = extractNoteRef(text.trim());
              
              if (noteRef) {
                event.preventDefault();
                
                // Insérer un embed au lieu d'un lien
                const node = view.state.schema.nodes.noteEmbed.create({
                  noteRef,
                  depth: 0,
                });
                
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
                
                logger.dev('[NoteEmbed] ✅ Embed inséré:', noteRef);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },

});

export default NoteEmbedExtension;

