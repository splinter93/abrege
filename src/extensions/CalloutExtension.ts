import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CalloutNodeView from '@/components/editor/CalloutNodeView';

const CALLOUT_TITLES: Record<string, string> = {
  info: 'Information',
  warning: 'Attention',
  error: 'Erreur',
  success: 'Succès',
  note: 'Note',
  tip: 'Conseil',
};

const CALLOUT_ICONS: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
  note: '📝',
  tip: '💡',
};

function resolveCalloutTitle(type: string): string {
  return CALLOUT_TITLES[type] || 'Note';
}

function resolveCalloutIcon(type: string): string {
  return CALLOUT_ICONS[type] || '📝';
}

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
           const dataType = element.getAttribute('data-type');
           if (!dataType || dataType === 'note-embed') {
             return false;
           }
           return {
             type: dataType,
             title: element.getAttribute('data-title'),
           };
         },
       },
     ];
   },

  renderHTML({ node, HTMLAttributes }) {
    const { title } = node.attrs;
    const rawType = node.attrs.type;
    const type = typeof rawType === 'string' && rawType.trim().length > 0
      ? rawType
      : 'info';

    const defaultTitle = this.options.types.includes(type)
      ? resolveCalloutTitle(type)
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
          resolveCalloutIcon(type),
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
});

export default CalloutExtension;
