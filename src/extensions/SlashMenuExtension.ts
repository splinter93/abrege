/**
 * Extension Slash Menu utilisant @tiptap/suggestion
 * Comportement exact de Notion : le slash reste dans le texte
 */

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import SlashMenu from '@/components/SlashMenu';
import { slashCommands, type SlashCommand } from '@/types/slashCommands';

export interface SlashMenuOptions {
  suggestion: {
    char: string;
    command: (props: {
      editor: any;
      range: any;
      props: any;
    }) => void;
    items: (query: string) => SlashCommand[];
    render: () => {
      onStart: (props: any) => void;
      onUpdate: (props: any) => void;
      onKeyDown: (props: any) => boolean;
      onExit: () => void;
    };
  };
}

const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          // Remplacer le texte de la suggestion par le bloc choisi
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.content)
            .run();
        },
        items: ({ query }) => {
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
          let popup: any;

          return {
            onStart: (props) => {
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

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
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

            onUpdate(props) {
              component.updateProps({
                ...props,
                onSelect: (item: SlashCommand) => {
                  props.command(item);
                },
              });

              if (!props.clientRect) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              return component.ref?.onKeyDown?.(props);
            },

            onExit() {
              popup[0].destroy();
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
