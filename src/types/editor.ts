/**
 * Types pour l'éditeur
 */

import type { Editor as TiptapEditor } from '@tiptap/react';

/**
 * Type pour un éditeur avec extension Markdown
 */
export interface EditorWithMarkdown extends TiptapEditor {
  storage: TiptapEditor['storage'] & {
    markdown?: {
      getMarkdown?: () => string;
    };
  };
}

/**
 * Type guard pour vérifier si l'éditeur a l'extension Markdown
 */
export function hasMarkdownStorage(editor: TiptapEditor | null): editor is EditorWithMarkdown {
  if (!editor) return false;
  
  // Typage strict : convertir via unknown pour éviter l'erreur de conversion
  const storage = editor.storage as unknown as Record<string, unknown>;
  const markdown = storage?.markdown;
  
  // Vérifier que markdown existe et est un objet
  if (!markdown || typeof markdown !== 'object') return false;
  
  // Vérifier que getMarkdown est une fonction
  return 'getMarkdown' in markdown && 
         typeof (markdown as { getMarkdown?: unknown }).getMarkdown === 'function';
}

/**
 * Type pour les informations de debug de la toolbar
 */
export interface ToolbarDebugInfo {
  // Container center
  containerDisplay: string;
  containerVisibility: string;
  containerOpacity: string;
  containerWidth: string;
  containerHeight: string;
  containerZIndex: string;
  containerPosition: string;
  containerTop: string;
  
  // Toolbar element
  hasToolbar: boolean;
  toolbarDisplay: string;
  toolbarVisibility: string;
  toolbarOpacity: string;
  toolbarWidth: string;
  toolbarHeight: string;
  toolbarZIndex: string;
  
  // Parent header
  hasParentHeader: boolean;
  parentHeaderDisplay: string;
  parentHeaderVisibility: string;
  parentHeaderOpacity: string;
  parentHeaderZIndex: string;
  parentHeaderPosition: string;
  parentHeaderTop: string;
  
  // Canvas context
  isInCanvas: boolean;
  canvasPaneDisplay: string;
  
  // Editor state
  hasEditor: boolean;
  shouldRenderToolbar: boolean;
  timestamp: number;
}

/**
 * Type pour la configuration Callout
 */
export interface CalloutConfig {
  type?: string;
  title?: string;
  icon?: string;
  [key: string]: unknown;
}

/**
 * Type pour une instance complète de l'éditeur (alias de EditorWithMarkdown)
 * Utilisé pour la compatibilité avec le code existant
 */
export type FullEditorInstance = EditorWithMarkdown;

/**
 * Type pour une commande slash
 * Réexport depuis slashCommands pour compatibilité
 */
export type { SlashCommand } from '@/types/slashCommands';
