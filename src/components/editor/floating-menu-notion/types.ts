/**
 * Types et interfaces pour le FloatingMenuNotion
 */

import type { Editor } from '@tiptap/react';
import type { IconType } from 'react-icons';

// Props du composant principal
export interface FloatingMenuNotionProps {
  editor: Editor | null;
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
  /** Contexte de l'éditeur : 'editor' (normal) ou 'canvas' (mode canvas) */
  toolbarContext?: 'editor' | 'canvas';
}

// Position du menu
export interface MenuPosition {
  top: number;
  left: number;
  visible: boolean;
}

// Commande de formatage
export interface FormatCommand {
  id: string;
  icon: IconType;
  label: string;
  action: () => void;
  isActive: () => boolean;
}

// Contexte enrichi de la note pour l'API
export interface NoteContext {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  noteSlug?: string;
  classeurId?: string;
  classeurName?: string;
}

// Modes d'insertion pour les prompts
export type InsertionMode = 'replace' | 'append' | 'prepend';

// Résultat de l'exécution d'un prompt
export interface PromptExecutionResult {
  success: boolean;
  content?: string;
  error?: string;
}

