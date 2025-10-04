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
// import BoxSelectionExtension from '@/extensions/BoxSelectionExtension'; // Désactivé - cause des problèmes
// import BlockDragDropExtension from '@/extensions/BlockDragDropExtension'; // Désactivé temporairement
// import { BlockDragDropHandler } from '@/extensions/BlockDragDropHandler'; // Désactivé temporairement
// import { SelectionExtension } from '@/extensions/SelectionExtension'; // Désactivé - cause des problèmes
// import { TrailingNodeExtension } from '@/extensions/TrailingNodeExtension'; // Désactivé - cause des problèmes
// import { SpaceHandlingExtension } from '@/extensions/SpaceHandlingExtension'; // Supprimé - causait des conflits
import SlashMenuExtension from '@/extensions/SlashMenuExtension';
import { SimpleDragHandleExtension } from '@/extensions/SimpleDragHandleExtension';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Mention from '@tiptap/extension-mention';
import Emoji from '@tiptap/extension-emoji';
import FloatingMenu from '@tiptap/extension-floating-menu';
import type { Extension } from '@tiptap/core';
import type { lowlight } from '@/utils/lowlightInstance';

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
): Extension[] {
  const extensions: Extension[] = [];

  // Extensions de base (toujours activées)
  if (config.core) {
    extensions.push(
      StarterKit.configure({ 
        // Configuration minimale pour éviter les conflits de curseur
        codeBlock: false, // Désactiver le codeBlock natif
        hardBreak: false, // Désactiver les sauts de ligne forcés
        blockquote: false, // Désactiver le blockquote natif pour utiliser notre extension
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
      UnifiedCodeBlockExtension.configure({ 
        lowlight: lowlightInstance,
      }),
      LinkExtension.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      CustomImage.configure({ inline: false }),
      Markdown.configure({ 
        html: false,
        transformPastedText: true,
        transformCopiedText: true
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
      // Emoji temporairement désactivé - problème d'affichage avec les crochets
      // Emoji.configure({
      //   enableEmoticons: true,
      //   enableShortcuts: true,
      //   HTMLAttributes: {
      //     class: 'emoji',
      //   },
      // }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'link',
        },
      }),
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
  if (config.experimental) {
    extensions.push(
      // BoxSelectionExtension, // Désactivé - cause des problèmes
      // SelectionExtension, // Désactivé - cause des problèmes
      // TrailingNodeExtension, // Désactivé - cause des problèmes
      // SpaceHandlingExtension supprimé - causait des conflits
    );
  }

  // Extensions de drag and drop (toujours activées pour l'UX)
  extensions.push(
    SimpleDragHandleExtension.configure({
      onNodeChange: ({ node, pos }) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Simple drag handle node change:', { 
            nodeType: node?.type.name, 
            pos 
          });
        }
      },
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
