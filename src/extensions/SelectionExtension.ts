import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const SelectionExtension = Extension.create({
  name: 'selection',

  addProseMirrorPlugins() {
    return [
      // Plugin pour améliorer la sélection
      new Plugin({
        key: new PluginKey('selection'),
        props: {
          // Suppression de la logique de navigation qui cause des problèmes
          // La navigation native de ProseMirror est plus fiable
        },
      }),
    ];
  },
});
