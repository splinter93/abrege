import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CalloutNodeView from '@/components/editor/CalloutNodeView';

export interface CalloutOptions {
  HTMLAttributes: Record<string, string | number | boolean>;
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes: { type: string; title?: string }) => ReturnType;
      toggleCallout: (attributes: { type: string; title?: string }) => ReturnType;
    };
  }
}

const CalloutExtension = Node.create<CalloutOptions>({
  name: 'callout',

  addOptions() {
    return {
      HTMLAttributes: {},
      types: ['info', 'warning', 'error', 'success', 'note', 'tip']
    };
  },

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => ({
          'data-type': attributes.type,
        }),
      },
      title: {
        default: '',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({
          'data-title': attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            type: element.getAttribute('data-type'),
            title: element.getAttribute('data-title'),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { type, title } = node.attrs;
    const defaultTitle = this.options.types.includes(type) 
      ? this.getDefaultTitle(type)
      : 'Note';

    return [
      'div',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-type': type,
          'data-title': title || defaultTitle,
          class: `callout callout-${type}`,
        }
      ),
      [
        'div',
        { class: 'callout-header' },
        [
          'div',
          { class: 'callout-icon' },
          this.getIcon(type),
        ],
        [
          'div',
          { class: 'callout-title' },
          title || defaultTitle,
        ],
      ],
      [
        'div',
        { class: 'callout-content' },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attributes);
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  // Méthodes utilitaires
  getDefaultTitle(type: string): string {
    const titles: Record<string, string> = {
      info: 'Information',
      warning: 'Attention',
      error: 'Erreur',
      success: 'Succès',
      note: 'Note',
      tip: 'Conseil',
    };
    return titles[type] || 'Note';
  },

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅',
      note: '📝',
      tip: '💡',
    };
    return icons[type] || '📝';
  },
});

export default CalloutExtension;
