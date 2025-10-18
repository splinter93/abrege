import type { Editor as TiptapEditor, ChainedCommands, CanCommands } from '@tiptap/react';

// Type pour le storage markdown de Tiptap
export interface MarkdownStorage {
  getMarkdown?: () => string;
}

// Type utilitaire qui étend Editor avec le storage markdown typé
export type EditorWithMarkdown = TiptapEditor & {
  storage: TiptapEditor['storage'] & {
    markdown?: MarkdownStorage;
  };
};

// Garde de type pour vérifier si l'éditeur a le storage markdown
export function hasMarkdownStorage(editor: TiptapEditor | null): editor is EditorWithMarkdown {
  if (!editor) return false;
  
  // Typage strict sans `as any`
  const storage = editor.storage as Record<string, unknown>;
  const markdown = storage?.markdown;
  
  // Vérifier que markdown existe et est un objet
  if (!markdown || typeof markdown !== 'object') return false;
  
  // Vérifier que getMarkdown est une fonction
  return 'getMarkdown' in markdown && 
         typeof (markdown as { getMarkdown?: unknown }).getMarkdown === 'function';
}

// Export de FullEditorInstance pour compatibilité (deprecated)
/** @deprecated Use EditorWithMarkdown or Editor directly */
export type FullEditorInstance = EditorWithMarkdown;

// Types pour les props des composants
export interface EditorProps {
  noteId: string;
  readonly?: boolean;
  userId?: string;
}

export interface EditorToolbarProps {
  editor: FullEditorInstance | null;
  setImageMenuOpen: (open: boolean) => void;
  onFontChange?: (fontName: string) => void;
  currentFont?: string;
  onTranscriptionComplete?: (text: string) => void;
}

export interface SlashCommand {
  id: string;
  alias: Record<string, string | string[]>;
  label: Record<string, string>;
  description: Record<string, string>;
  preview?: string;
  action?: (editor: FullEditorInstance) => void;
  [key: string]: unknown;
}

// Types pour les extensions personnalisées
export interface CustomImageExtension {
  configure?: (options: { inline: boolean }) => CustomImageExtension;
}

export interface CodeBlockWithCopyExtension {
  configure?: (options: { lowlight: unknown }) => CodeBlockWithCopyExtension;
}

// Type pour les hooks d'éditeur
export interface EditorHookInstance {
  getHTML: () => string;
  storage: {
    markdown: {
      getMarkdown: () => string;
    };
  };
} 