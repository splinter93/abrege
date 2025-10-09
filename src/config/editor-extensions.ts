/**
 * Configuration centralisée des extensions de l'éditeur
 * Permet de gérer facilement l'activation/désactivation des extensions
 */

import StarterKit from '@tiptap/starter-kit';
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
// ⚠️ DRAG HANDLES - NE PAS MODIFIER - Voir docs/DRAG-HANDLES-AUDIT.md
import { SimpleDragHandleExtension } from '@/extensions/SimpleDragHandleExtension'; // Backup
import { NotionDragHandleExtension } from '@/extensions/NotionDragHandleExtension'; // ACTIF
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

  // Extensions de base (toujours activées)
  if (config.core) {
    extensions.push(
      StarterKit.configure({ 
        // Configuration minimale pour éviter les conflits
        codeBlock: false, // Désactiver - on utilise UnifiedCodeBlockExtension
        hardBreak: false, // Désactiver les sauts de ligne forcés
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
      TaskItem,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      // TableWithTildeFix, // ❌ DÉSACTIVÉ - Cause une erreur
      UnifiedCodeBlockExtension.configure({ 
        lowlight: lowlightInstance,
      }),
      LinkExtension.configure({ 
        openOnClick: false, 
        autolink: true, 
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'link',
        },
      }),
      CustomImage.configure({ inline: false }),
      Markdown.configure({ 
        html: false, // Désactive la génération de HTML
        transformPastedText: true,
        transformCopiedText: true,
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
      })
      // LinkExtension SUPPRIMÉ ICI - déjà configuré ligne 99 !
      // Emoji temporairement désactivé - problème d'affichage avec les crochets
      // Emoji.configure({
      //   enableEmoticons: true,
      //   enableShortcuts: true,
      //   HTMLAttributes: {
      //     class: 'emoji',
      //   },
      // }),
      // FloatingMenu désactivé - on utilise notre composant personnalisé
      // FloatingMenu.configure({
      //   element: typeof window !== 'undefined' ? document.createElement('div') : null,
      //   tippyOptions: {
      //     duration: 100,
      //   },
      // }),
      // SlashMenuExtension // Temporairement désactivé
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

  // ⚠️ DRAG HANDLES - NE PAS MODIFIER SANS AUDIT COMPLET
  // Voir docs/DRAG-HANDLES-AUDIT.md pour détails complets
  // Extension active: NotionDragHandleExtension (version finale)
  // Extensions backup: SimpleDragHandleExtension, DragHandleExtension (conservées)
  extensions.push(
    NotionDragHandleExtension.configure({
      handleClass: 'notion-drag-handle',
      // onNodeChange désactivé en prod pour performance
      // onNodeChange: ({ node, pos }) => {
      //   if (process.env.NODE_ENV === 'development') {
      //     console.log('🎯 Drag handle:', { 
      //       nodeType: node?.type.name, 
      //       pos 
      //     });
      //   }
      // },
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
