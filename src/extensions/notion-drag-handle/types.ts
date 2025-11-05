/**
 * Types, interfaces et constantes pour Notion Drag Handle Extension
 */

import type { Node, Slice } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

/**
 * Type pour la propriété dragging de ProseMirror
 * Utilisée en interne par ProseMirror pour gérer le drag & drop
 */
export interface DraggingInfo {
  slice: Slice;
  move: boolean;
}

/**
 * Options de configuration pour NotionDragHandleExtension
 */
export interface NotionDragHandleOptions {
  handleClass?: string;
  onNodeChange?: (options: { node: Node; pos: number; editor: EditorState }) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Version du handle pour forcer la recréation après changements de design */
export const HANDLE_VERSION = 'v5.7'; // Memory leaks fixed, listeners cleanup

/** Offsets pour positionnement des handles */
export const HANDLE_LEFT_OFFSET = -80; // px à gauche du bloc
export const HANDLE_TOP_OFFSET = 6; // px du haut du bloc

/** Largeur de la zone hover bridge (zone invisible à gauche) */
export const HOVER_BRIDGE_WIDTH = 160; // px

/** Délais avant hide des handles */
export const HIDE_DELAY_HANDLES = 200; // ms quand on quitte les handles
export const HIDE_DELAY_EDITOR = 300; // ms quand on quitte l'éditeur

/** Délai pour cleanup de la drag image */
export const DRAG_IMAGE_CLEANUP_DELAY = 100; // ms

/** Délai après dragend pour reset sélection */
export const DRAGEND_SELECTION_DELAY = 100; // ms

