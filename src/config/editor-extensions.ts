/**
 * Configuration centralisée des extensions de l'éditeur
 * Permet de gérer facilement l'activation/désactivation des extensions
 */

import StarterKit from '@tiptap/starter-kit';
import { simpleLogger as logger } from '@/utils/logger';
import Blockquote from '@tiptap/extension-blockquote';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import LinkExtension from '@tiptap/extension-link';
import CustomImage from '@/extensions/CustomImage';
import { NoAutoListConversion } from '@/extensions/NoAutoListConversion';
import Placeholder from '@tiptap/extension-placeholder';
import UnifiedCodeBlockExtension from '@/extensions/UnifiedCodeBlockExtension';
import ContextMenuExtension from '@/extensions/ContextMenuExtension';
import CalloutExtension from '@/extensions/CalloutExtension';
// ⚠️ EXTENSIONS PROBLÉMATIQUES RETIRÉES (non liées aux drag handles):
// - BoxSelectionExtension: Causait des problèmes de sélection
// - SelectionExtension: Causait des problèmes de sélection
// - TrailingNodeExtension: Causait des problèmes d'édition
// - SpaceHandlingExtension: Causait des conflits (déjà supprimé)
// - BlockDragDropExtension: Désactivé temporairement
import SlashMenuExtension from '@/extensions/SlashMenuExtension';
// ✅ DRAG HANDLE - Notion-style (SEUL utilisé en prod)
import { NotionDragHandleExtension } from '@/extensions/NotionDragHandleExtension';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Mention from '@tiptap/extension-mention';
import Emoji from '@tiptap/extension-emoji';
import FloatingMenu from '@tiptap/extension-floating-menu';
import type { Extension, AnyExtension } from '@tiptap/core';
import type lowlight from '@/utils/lowlightInstance';

export interface EditorExtensionsConfig {
  // Extensions de base (toujours activées)
  core: boolean;
  // Extensions avancées (peuvent être désactivées)
  advanced: boolean;
  // Extensions expérimentales (en développement)
  experimental: boolean;
  // Extensions de performance (pour les gros documents)
  performance: boolean;
}

export const DEFAULT_EXTENSIONS_CONFIG: EditorExtensionsConfig = {
  core: true,
  advanced: true,
  experimental: false, // Désactivées par défaut pour la production
  performance: true,
};

/**
 * Crée la liste des extensions selon la configuration
 */
export function createEditorExtensions(
  config: EditorExtensionsConfig = DEFAULT_EXTENSIONS_CONFIG,
  lowlightInstance: typeof lowlight
): AnyExtension[] {
  const extensions: AnyExtension[] = [];

  // 🔧 DEBUG: Si aucune config n'est activée, retourner config minimale mais fonctionnelle
  if (!config.core && !config.advanced && !config.experimental) {
    logger.dev('[EditorExtensions] 🔧 Mode PROGRESSIF - Réactivation extensions essentielles');
    extensions.push(
      // StarterKit avec configuration optimale
      StarterKit.configure({
        // ✅ Essentiel
        document: true,
        paragraph: true,
        text: true,
        history: true,
        
        // ✅ Formats de base
        bold: true,
        italic: true,
        strike: true,
        code: true,
        
        // ✅ Structure
        heading: true,
        blockquote: true,
        bulletList: true,
        orderedList: true,
        listItem: true,
        horizontalRule: true,
        codeBlock: true,
        
        // ✅ Réactivé pour les blockquotes (Shift+Enter pour line break)
        hardBreak: true,
        dropcursor: true,
        gapcursor: true,
      }),
      
      // ✅ Extensions essentielles réactivées
      Placeholder.configure({
        placeholder: 'Écrivez quelque chose d\'incroyable...',
        showOnlyWhenEditable: true,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item-wrapper',
        },
      }),
      
      // ✅ Tables réactivées
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      
      // ✅ Images
      CustomImage.configure({ inline: false }),
      
      // ✅ Links SANS autolink (safe)
      LinkExtension.configure({ 
        openOnClick: false, 
        autolink: false,      // ❌ Désactivé définitivement - Cause des updates inattendus
        linkOnPaste: false,   // ❌ Désactivé définitivement - Cause des updates inattendus
        HTMLAttributes: {
          class: 'link',
        },
      }),
      
      // ✅ Code blocks avec syntax highlighting
      UnifiedCodeBlockExtension.configure({ 
        lowlight: lowlightInstance,
      }),
      
      // ✅ Extensions custom safe
      NoAutoListConversion,
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
      }),
      
      // ✅ Markdown RÉACTIVÉE en mode SAFE
      // CRITIQUE : transformPastedText et transformCopiedText DOIVENT rester false
      Markdown.configure({ 
        html: false,
        breaks: true, // ✅ TEST - Convertir retours simples en <br> (comme markdown-it)
        transformPastedText: false,   // ✅ SAFE - Ne transforme PAS automatiquement
        transformCopiedText: false,   // ✅ SAFE - Ne transforme PAS automatiquement
      }),
      
      // ✅ Extensions avancées réactivées
      ContextMenuExtension,
      CalloutExtension,
      
      // ✅ Floating Menu pour la sélection
      FloatingMenu.configure({
        element: typeof window !== 'undefined' ? document.createElement('div') : null,
        tippyOptions: {
          duration: 100,
        },
      }),
      
      // ✅ Drag Handles Notion-style
      NotionDragHandleExtension.configure({
        handleClass: 'notion-drag-handle',
      })
    );
    logger.dev('[EditorExtensions] 🔧 Extensions actives:', extensions.length);
    return extensions;
  }

  // Extensions de base (toujours activées)
  if (config.core) {
    extensions.push(
      StarterKit.configure({ 
        // Configuration minimale pour éviter les conflits
        codeBlock: false, // Désactiver - on utilise UnifiedCodeBlockExtension
        hardBreak: true, // ✅ TEST - Réactivé pour blockquotes (Shift+Enter)
        blockquote: false, // Désactiver - on utilise Blockquote standalone
        bulletList: false, // Désactiver - on utilise BulletList standalone
        orderedList: false, // Désactiver - on utilise OrderedList standalone  
        listItem: false, // Désactiver - on utilise ListItem standalone
      }),
      Blockquote,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item-wrapper',
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      UnifiedCodeBlockExtension.configure({ 
        lowlight: lowlightInstance,
      }),
      LinkExtension.configure({ 
        openOnClick: false, 
        // ✅ SAFE - Désactivé définitivement (causait des updates inattendus)
        autolink: false,
        linkOnPaste: false,
        HTMLAttributes: {
          class: 'link',
        },
      }),
      CustomImage.configure({ inline: false }),
      Markdown.configure({ 
        html: false,
        breaks: true, // ✅ TEST - Convertir retours simples en <br> (comme markdown-it)
        // ✅ SAFE - Désactivé définitivement (causait espace → retour ligne)
        transformPastedText: false,
        transformCopiedText: false,
      }),
      Placeholder.configure({
        placeholder: 'Écrivez quelque chose d\'incroyable...',
        showOnlyWhenEditable: true,
      }),
      NoAutoListConversion,
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
      }),
      FloatingMenu.configure({
        element: typeof window !== 'undefined' ? document.createElement('div') : null,
        tippyOptions: {
          duration: 100,
        },
      })
    );
  }

  // Extensions avancées
  if (config.advanced) {
    extensions.push(
      ContextMenuExtension,
      CalloutExtension
    );
  }

  // Extensions expérimentales (désactivées par défaut)
  // ⚠️ Extensions problématiques retirées en Phase 6 du refactoring
  // Voir docs/DRAG-HANDLES-AUDIT.md pour détails
  if (config.experimental) {
    // Aucune extension expérimentale pour le moment
    // Les extensions problématiques ont été retirées
  }

  // ✅ DRAG HANDLE Notion-style (seule extension utilisée)
  extensions.push(
    NotionDragHandleExtension.configure({
      handleClass: 'notion-drag-handle',
    })
  );

  // Extensions de performance
  if (config.performance) {
    // Extensions optimisées pour les gros documents
    // (actuellement aucune extension spécifique)
  }

  return extensions;
}

/**
 * Configuration MINIMALE pour debug curseur
 */
export const MINIMAL_EXTENSIONS_CONFIG: EditorExtensionsConfig = {
  core: false,      // ❌ Désactivé
  advanced: false,  // ❌ Désactivé
  experimental: false,
  performance: false,
};

/**
 * Configuration optimisée pour la production
 */
export const PRODUCTION_EXTENSIONS_CONFIG: EditorExtensionsConfig = {
  core: true,
  advanced: true, // Réactivé - nécessaire pour le fonctionnement
  experimental: false, // Reste désactivé - c'est là le problème
  performance: true,
};

/**
 * Configuration optimisée pour le développement
 */
export const DEVELOPMENT_EXTENSIONS_CONFIG: EditorExtensionsConfig = {
  core: true,
  advanced: true,
  experimental: true, // Activées en développement
  performance: false, // Désactivées pour les tests
};
