/**
 * Extension Tiptap pour les Note Embeds (Notion-style)
 * 
 * Fonctionnalités:
 * - Node custom `noteEmbed` avec attributs (noteRef, depth)
 * - Détection automatique URLs Scrivia au paste
 * - Conversion URL → embed via PasteRule
 * - Command `setNoteEmbed(noteRef, options)`
 * - React NodeView pour rendering
 * 
 * Prévention récursion: MAX_DEPTH = 3 niveaux
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import NoteEmbedView from '@/components/editor/NoteEmbedView';
import { MAX_EMBED_DEPTH, type NoteEmbedDisplayStyle } from '@/types/noteEmbed';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Type pour l'événement dans stopEvent
 * Peut être directement un Event ou un objet avec une propriété event
 */
type StopEventParameter = Event | { event: Event };

/**
 * Type pour le paramètre update dans ReactNodeViewRenderer
 * Contient oldNode et newNode
 */
interface UpdateParameter {
  oldNode: ProseMirrorNode;
  newNode: ProseMirrorNode;
  oldDecorations?: unknown;
  newDecorations?: unknown;
  oldInnerDecorations?: unknown;
  innerDecorations?: unknown;
  updateProps?: () => void;
}

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
      setNoteEmbed: (
        noteRef: string,
        options?: number | {
          depth?: number;
          display?: NoteEmbedDisplayStyle;
          noteTitle?: string | null;
        }
      ) => ReturnType;
    };
  }
}

const NoteEmbedExtension = Node.create<NoteEmbedOptions>({
  priority: 1000,

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

  content: '',

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
      display: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-display') || 'inline',
        renderHTML: attributes => ({
          'data-display': attributes.display,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'note-embed',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') return false;

          const noteRef = element.getAttribute('data-note-ref');
          if (!noteRef) return false;

          return {
            noteRef,
            noteTitle: element.getAttribute('data-note-title'),
            depth: parseInt(element.getAttribute('data-depth') || '0', 10),
            display: element.getAttribute('data-display') || 'inline',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'note-embed',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          if (node.type.name !== 'noteEmbed') {
            return;
          }

          const attrs: Record<string, unknown> | null | undefined = node.attrs;
          if (!attrs) {
            return;
          }

          const noteRefRaw = attrs['noteRef'];
          if (typeof noteRefRaw !== 'string' || noteRefRaw.length === 0) {
            return;
          }

          const noteTitleRaw = attrs['noteTitle'];
          const displayRaw = attrs['display'];

          const noteTitle = typeof noteTitleRaw === 'string' && noteTitleRaw.length > 0 ? noteTitleRaw : null;
          const display = typeof displayRaw === 'string' ? displayRaw as NoteEmbedDisplayStyle : undefined;

          let markdown = `{{embed:${noteRefRaw}`;

          if (noteTitle) {
            markdown += `|${noteTitle}`;
          }

          if (display && display !== 'inline') {
            if (!noteTitle) {
              markdown += '|';
            }
            markdown += `|display:${display}`;
          }

          markdown += '}}';
          state.write(markdown);
          state.closeBlock(node);
        },
      },
    };
  },

  addCommands() {
    return {
      setNoteEmbed:
        (
          noteRef: string,
          options?: number | Partial<{
            depth: number;
            display: NoteEmbedDisplayStyle;
            noteTitle: string | null;
          }>
        ) =>
        ({ commands }) => {
          let depth = 0;
          let display: NoteEmbedDisplayStyle = 'inline';
          let noteTitle: string | null = null;

          if (typeof options === 'number') {
            depth = options;
          } else if (options && typeof options === 'object') {
            depth = options.depth ?? 0;
            if (options.display && ['card', 'inline', 'compact'].includes(options.display)) {
              display = options.display;
            }
            noteTitle = options.noteTitle ?? null;
          }
 
          return commands.insertContent({
            type: this.name,
            attrs: {
              noteRef,
              depth,
              display,
              noteTitle,
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
      stopEvent: (event: StopEventParameter) => {
        // Gérer les deux formats possibles : Event direct ou { event: Event }
        const ev: Event | null = 'event' in event && event.event instanceof Event 
          ? event.event 
          : event instanceof Event 
            ? event 
            : null;
        
        // Autoriser le menu contextuel (clic droit)
        if (ev?.type === 'contextmenu') return false;
        // Autoriser le click pour la navigation (géré par React)
        if (ev?.type === 'click') return false;
        // Bloquer les autres événements (mousedown, keydown, etc.)
        return true;
      },
      // ✅ CRITIQUE: Ne jamais re-render sauf si les attrs changent
      update: (updateParam: UpdateParameter) => {
        if (!updateParam?.newNode || !updateParam.newNode.type) {
          return false;
        }

        // Retourner false = ne pas re-render ce NodeView quand l'éditeur update
        // Le contenu React se gère lui-même avec ses propres states
        return updateParam.newNode.type.name === 'noteEmbed';
      },
    });
  },

  addProseMirrorPlugins() {
    const pastePluginKey = new PluginKey('noteEmbedPaste');
    const cleanupPluginKey = new PluginKey('noteEmbedCleanup');

    const plugins: Plugin[] = [];

    plugins.push(
      new Plugin({
        key: pastePluginKey,
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
                  display: 'inline',
                });
                
                const tr = view.state.tr.replaceSelectionWith(node);
                view.dispatch(tr);
                
                logger.dev('[NoteEmbed] ✅ Embed inséré via paste:', noteRef);
                return true;
              }
            }

            return false;
          },

          handleDrop: (view, event) => {
            const dataTransfer = (event as DragEvent).dataTransfer;
            if (!dataTransfer) return false;

            // Récupérer le noteId depuis le drag
            const noteId = dataTransfer.getData('application/x-scrivia-note-id');
            if (!noteId) return false;

            logger.dev('[NoteEmbed] 📥 Drop détecté:', { noteId });

            // Valider le format UUID ou slug
            const isValidFormat = /^[a-f0-9-]{36}$|^[a-z0-9-]+$/.test(noteId);
            if (!isValidFormat) {
              logger.warn('[NoteEmbed] ⚠️  Format noteId invalide:', noteId);
              return false;
            }

            event.preventDefault();
            
            // Obtenir la position du drop
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY
            });
            
            if (!coordinates) {
              logger.warn('[NoteEmbed] ⚠️  Impossible de déterminer la position du drop');
              return false;
            }

            try {
              // Créer le node noteEmbed
              const node = view.state.schema.nodes.noteEmbed.create({
                noteRef: noteId,
                depth: 0,
                display: 'inline',
              });
              
              // Insérer à la position du drop
              const tr = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(tr);
              
              logger.info('[NoteEmbed] ✅ Embed inséré via drag & drop:', {
                noteId,
                position: coordinates.pos
              });
              
              return true;
            } catch (error) {
              logger.error('[NoteEmbed] ❌ Erreur insertion embed:', error);
              return false;
            }
          },
        },
      }),
    );

    plugins.push(
      new Plugin({
        key: cleanupPluginKey,
        appendTransaction(transactions, _oldState, newState) {
          const changed = transactions.some(tr => tr.docChanged);
          if (!changed) {
            return null;
          }

          let tr: Transaction | null = null;
          const { schema } = newState;
          const paragraphNode = schema.nodes.paragraph;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'noteEmbed') {
              return;
            }

            const noteRef = typeof node.attrs.noteRef === 'string' ? node.attrs.noteRef.trim() : '';
            if (noteRef.length > 0) {
              return;
            }

            if (!tr) {
              tr = newState.tr;
            }

            if (paragraphNode) {
              tr = tr.replaceWith(pos, pos + node.nodeSize, paragraphNode.create());
            } else {
              tr = tr.delete(pos, pos + node.nodeSize);
            }
          });

          return tr;
        },
      })
    );

    return plugins;
  },

});

export default NoteEmbedExtension;

