/**
 * Extension Slash Menu utilisant @tiptap/suggestion
 * Comportement exact de Notion : le slash reste dans le texte
 */

import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import SlashMenu from '@/components/SlashMenu';
import { slashCommands, type SlashCommand } from '@/types/slashCommands';
import { Editor } from '@tiptap/core';

// Types pour les props de suggestion
interface CommandProps {
  editor: Editor;
  range: { from: number; to: number };
  props: SlashCommand;
}

export interface SlashMenuOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: CommandProps) => {
          // Remplacer le texte de la suggestion par le bloc choisi
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.content)
            .run();
        },
        items: ({ query }: { query: string }) => {
          // Filtrer les commandes basé sur la query
          return slashCommands.filter(item => 
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.alias.some(alias => 
              alias.toLowerCase().includes(query.toLowerCase())
            )
          );
        },
        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance | undefined;

          return {
            onStart: (props: SuggestionProps) => {
              component = new ReactRenderer(SlashMenu, {
                props: {
                  ...props,
                  onSelect: (item: SlashCommand) => {
                    props.command(item);
                  },
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy(document.body, {
                getReferenceClientRect: () => props.clientRect?.() || new DOMRect(0, 0, 0, 0),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'slash-menu',
                arrow: false,
                offset: [0, 8],
              });
            },

            onUpdate(props: SuggestionProps) {
              component.updateProps({
                ...props,
                onSelect: (item: SlashCommand) => {
                  props.command(item);
                },
              });

              if (!props.clientRect) {
                return;
              }

              popup?.setProps({
                getReferenceClientRect: () => props.clientRect?.() || new DOMRect(0, 0, 0, 0),
              });
            },

            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                popup?.hide();
                return true;
              }

              const handler = (component as any)?.ref?.onKeyDown;
              return handler ? handler(props) : false;
            },

            onExit() {
              popup?.destroy();
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashMenuExtension;
