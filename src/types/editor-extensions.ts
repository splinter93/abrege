import type { Editor } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { Transaction, EditorState } from '@tiptap/pm/state';

/**
 * Types stricts pour les extensions de l'éditeur
 * Évite l'utilisation d'`any` et améliore la sécurité des types
 */

// Types pour les Node Views
export interface StrictNodeViewProps extends NodeViewProps {
  editor: Editor;
  getPos: () => number;
  node: NodeViewProps['node'];
  updateAttributes: (attrs: Record<string, unknown>) => void;
  deleteNode: () => void;
}

// Types pour les extensions de transaction
export interface TransactionHandler {
  (transactions: Transaction[], oldState: EditorState, newState: EditorState): Transaction | null;
}

// Types pour les attributs des nœuds
export interface CalloutAttributes {
  type: 'info' | 'warning' | 'error' | 'success' | 'note' | 'tip';
  title?: string;
}

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
}

// Types pour les commandes d'éditeur
export interface EditorCommands {
  setCallout: (attributes: CalloutAttributes) => boolean;
  toggleCallout: (attributes: CalloutAttributes) => boolean;
}

// Types pour les options d'extensions
export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
  types: string[];
}

// Types pour les événements personnalisés
export interface ContextMenuEvent extends CustomEvent {
  detail: {
    coords: { x: number; y: number };
    nodeType: string;
    hasSelection: boolean;
    position: number;
  };
}

// Types pour les plugins ProseMirror
export interface PluginState {
  selectedBlock?: number | null;
  isDragging?: boolean;
  isSelecting?: boolean;
  startPos?: number | null;
  endPos?: number | null;
  decorations?: unknown;
}

// Types pour les décorations
export interface DecorationConfig {
  class?: string;
  style?: Record<string, string>;
  'data-*'?: Record<string, string>;
}
