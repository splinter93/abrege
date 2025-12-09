import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { MarkdownSerializerState } from 'prosemirror-markdown';
import { isValidYouTubeVideoId, parseYouTubeInput, parseYouTubeTimestamp } from '@/utils/youtube';
import { simpleLogger as logger } from '@/utils/logger';
import YouTubeEmbedView from '@/components/editor/YouTubeEmbedView';

export interface YouTubeEmbedAttributes {
  videoId: string;
  depth: number;
  autoplay: boolean;
  startSeconds: number | null;
}

export interface YouTubeEmbedOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      /**
       * Insère un embed YouTube
       * @param input ID ou URL YouTube
       * @param options Options supplémentaires
       */
      setYouTubeEmbed: (
        input: string,
        options?: Partial<Pick<YouTubeEmbedAttributes, 'autoplay' | 'startSeconds' | 'depth'>>
      ) => ReturnType;
    };
  }
}

const YOUTUBE_PASTE_REGEX = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[\w?&=%-]+/i;

const YouTubeEmbedExtension = Node.create<YouTubeEmbedOptions>({
  name: 'youtubeEmbed',
  group: 'block',
  content: '',
  atom: true,
  draggable: false,
  defining: true,
  priority: 990,

  addOptions() {
    return {
      HTMLAttributes: {},
    } satisfies YouTubeEmbedOptions;
  },

  onCreate() {
    logger.dev('[YouTubeEmbed] ✅ Extension initialisée');
  },

  addAttributes() {
    return {
      videoId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-video-id') ?? null,
        renderHTML: (attributes: { videoId: string | null }) => ({
          'data-video-id': attributes.videoId,
        }),
      },
      depth: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-depth');
          return value ? Number.parseInt(value, 10) : 0;
        },
        renderHTML: (attributes: { depth: number }) => ({
          'data-depth': attributes.depth,
        }),
      },
      autoplay: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-autoplay') === 'true',
        renderHTML: (attributes: { autoplay: boolean }) => (
          attributes.autoplay ? { 'data-autoplay': 'true' } : {}
        ),
      },
      startSeconds: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-start');
          return parseYouTubeTimestamp(value);
        },
        renderHTML: (attributes: { startSeconds: number | null }) => (
          attributes.startSeconds != null
            ? { 'data-start': attributes.startSeconds }
            : {}
        ),
      },
    } satisfies Record<string, unknown>;
  },

  parseHTML() {
    return [
      {
        tag: 'youtube-embed',
        getAttrs: (element: HTMLElement | string) => {
          if (typeof element === 'string') {
            return false;
          }

          const videoId = element.getAttribute('data-video-id');
          if (!videoId || !isValidYouTubeVideoId(videoId)) {
            return false;
          }

          return {
            videoId,
            depth: Number.parseInt(element.getAttribute('data-depth') ?? '0', 10) || 0,
            autoplay: element.getAttribute('data-autoplay') === 'true',
            startSeconds: parseYouTubeTimestamp(element.getAttribute('data-start')),
          } satisfies Partial<YouTubeEmbedAttributes>;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'youtube-embed',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: ProseMirrorNode) {
          if (node.type.name !== 'youtubeEmbed') {
            return;
          }

          const attrs: Record<string, unknown> | null | undefined = node.attrs;
          if (!attrs) {
            return;
          }

          const videoIdRaw = attrs['videoId'];
          if (typeof videoIdRaw !== 'string') {
            return;
          }

          const startAttr = attrs['startSeconds'];
          const startSeconds = typeof startAttr === 'number'
            ? startAttr
            : typeof startAttr === 'string'
              ? parseYouTubeTimestamp(startAttr)
              : null;

          let markdown = `{{youtube:${videoIdRaw}`;
          if (typeof startSeconds === 'number' && startSeconds > 0) {
            markdown += `|start=${startSeconds}`;
          }
          markdown += '}}';

          state.write(markdown);
          state.closeBlock(node);
        },
      },
    };
  },

  addCommands() {
    return {
      setYouTubeEmbed:
        (input, options = {}) =>
        ({ commands }) => {
          const { videoId, startSeconds: parsedStart } = parseYouTubeInput(input);
          if (!videoId) {
            logger.warn('[YouTubeEmbed] ⚠️ ID/URL invalide', { input });
            return false;
          }

          const depth = options.depth ?? 0;
          const requestedStart = typeof options.startSeconds === 'string'
            ? parseYouTubeTimestamp(options.startSeconds)
            : options.startSeconds ?? null;
          const startSeconds = requestedStart ?? parsedStart ?? null;
          const autoplay = options.autoplay ?? false;

          return commands.insertContent({
            type: this.name,
            attrs: {
              videoId,
              depth,
              autoplay,
              startSeconds,
            },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('youtubeEmbedPaste');

    return [
      new Plugin({
        key: pluginKey,
        props: {
          handlePaste: (view, event) => {
            const clipboardData = (event as ClipboardEvent).clipboardData;
            if (!clipboardData) {
              return false;
            }

            const text = clipboardData.getData('text/plain');
            if (!text || !YOUTUBE_PASTE_REGEX.test(text)) {
              return false;
            }

            const { videoId, startSeconds } = parseYouTubeInput(text.trim());
            if (!videoId) {
              return false;
            }

            event.preventDefault();

            const node = view.state.schema.nodes.youtubeEmbed.create({
              videoId,
              depth: 0,
              autoplay: false,
              startSeconds: startSeconds ?? null,
            });

            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);
            logger.dev('[YouTubeEmbed] ✅ Embed inséré via paste', { videoId });
            return true;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeEmbedView, {
      as: 'div',
      stopEvent: (event) => {
        const ev = (event as any).event ?? (event as any);
        if (ev?.type === 'contextmenu') {
          return false;
        }
        if (ev?.type === 'click') {
          return false;
        }
        return true;
      },
      update: (node: any) => node?.type?.name === 'youtubeEmbed',
    });
  },
});

export default YouTubeEmbedExtension;


