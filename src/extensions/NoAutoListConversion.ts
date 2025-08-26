import { Extension } from '@tiptap/core'

/**
 * Extension pour désactiver la conversion automatique des tirets (-) en listes
 * Cette extension remplace le comportement par défaut de StarterKit
 */
export const NoAutoListConversion = Extension.create({
  name: 'noAutoListConversion',

  addKeyboardShortcuts() {
    return {
      // Désactiver le raccourci automatique pour les listes
      'Mod-Alt-l': () => false,
      'Mod-Alt-L': () => false,
    }
  },
}) 