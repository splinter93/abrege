import type { Editor as TiptapEditor, ChainedCommands, CanCommands } from '@tiptap/react';

// Type pour le storage markdown de Tiptap
export interface MarkdownStorage {
  getMarkdown?: () => string;
}

// Type simplifié pour l'éditeur avec les capacités essentielles
export interface FullEditorInstance extends TiptapEditor {
  chain: () => ChainedCommands;
  can: () => CanCommands;
  isActive: (type: string, attrs?: { level?: number }) => boolean;
  storage: {
    markdown?: MarkdownStorage;
    [key: string]: unknown;
  };
}

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