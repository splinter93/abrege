import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import type MarkdownIt from 'markdown-it';
import { createMarkdownIt } from '@/utils/markdownItConfig';
import { simpleLogger as logger } from '@/utils/logger';

interface Options {
  /**
   * Si true, quand aucun Markdown n'est détecté,
   * on colle en "text/plain" (évite les doubles espaces issus du HTML du presse-papier).
   */
  preferPlainText: boolean;
  /**
   * Possibilité d'injecter ton instance markdown-it custom.
   */
  markdownIt?: MarkdownIt;
}

function looksLikeMarkdown(text: string): boolean {
  if (!text) return false;
  
  const patterns = [
    /(^|\n)#{1,6}\s+\S/,              // # Heading
    /(^|\n)(?:-|\*)\s+\S/,            // - list ou * list
    /(^|\n)\d+\.\s+\S/,               // 1. list
    /(^|\n)>\s+\S/,                   // > quote
    /(^|\n)```[\s\S]*?```/,           // ``` code block
    /\*\*[^*\n]+?\*\*/,               // **bold**
    /(?:^|[^\*])\*[^*\n]+?\*(?:$|[^\*])/, // *italic* (evite le greedy)
    /\[([^\]]+)\]\(([^)]+)\)/,        // [link](url)
    /!\[([^\]]*)\]\(([^)]+)\)/,       // ![img](src)
    /(^|\n)\|.+\|/,                   // table row
    /(^|\n)(?:-{3,}|\*{3,}|_{3,})\s*$/ // hr
  ];
  
  return patterns.some(rx => rx.test(text));
}

const MarkdownPasteHandler = Extension.create<Options>({
  name: 'markdownPasteHandler',

  addOptions() {
    return {
      preferPlainText: false, // laisse le comportement natif par défaut
      markdownIt: undefined,
    };
  },

  onCreate() {
    logger.dev('[MarkdownPasteHandler] ✅ Extension créée et active !');
  },

  addProseMirrorPlugins() {
    logger.dev('[MarkdownPasteHandler] 🔌 addProseMirrorPlugins appelé');
    const key = new PluginKey('markdownPasteHandler');

    return [
      new Plugin({
        key,
        props: {
          handlePaste: (view, event) => {
            logger.dev('[MarkdownPasteHandler] 🚨 PASTE EVENT INTERCEPTÉ !');

            const data = (event as ClipboardEvent).clipboardData;
            if (!data) return false;

            // 1) Essaie d'abord un "vrai" Markdown s'il est exposé
            const mdText =
              data.getData('text/markdown') ||
              data.getData('text/x-markdown') ||
              data.getData('text/plain');

            logger.dev('[MarkdownPasteHandler] 📋 Paste détecté:', {
              length: mdText.length,
              preview: mdText.substring(0, 100)
            });

            const hasMarkdown = looksLikeMarkdown(mdText);
            logger.dev('[MarkdownPasteHandler] 🔍 Markdown détecté ?', hasMarkdown);

            // Si c'est du Markdown → on convertit via markdown-it, on parse en PM Slice, et on remplace la sélection.
            if (hasMarkdown) {
              logger.dev('[MarkdownPasteHandler] ✅ Conversion markdown → HTML...');
              event.preventDefault();
              try {
                const md = this.options.markdownIt ?? createMarkdownIt();
                const html = md.render(mdText.trim());

                logger.dev('[MarkdownPasteHandler] 📝 HTML généré:', html.substring(0, 200));

                const wrap = document.createElement('div');
                wrap.innerHTML = html;

                const schema = view.state.schema;
                const parser = ProseMirrorDOMParser.fromSchema(schema);
                // parseSlice → évite de recréer un doc complet, parfait pour remplacer la sélection
                const slice = parser.parseSlice(wrap);

                logger.dev('[MarkdownPasteHandler] 🎯 ProseMirror slice créé, insertion...');

                const tr = view.state.tr.replaceSelection(slice).scrollIntoView();
                view.dispatch(tr);
                
                logger.dev('[MarkdownPasteHandler] ✅ Markdown collé et formaté !');
                return true;
              } catch (err) {
                logger.error('[MarkdownPasteHandler] convert error:', err);
                // Fallback: insertText propre
                const tr = view.state.tr.insertText(mdText, view.state.selection.from, view.state.selection.to).scrollIntoView();
                view.dispatch(tr);
                return true;
              }
            }

            // 2) Sinon, si on veut éviter le HTML du presse-papier (doubles espaces de TipTap),
            // on force le collage en texte brut.
            if (this.options.preferPlainText) {
              const plain = data.getData('text/plain');
              if (plain) {
                event.preventDefault();
                const tr = view.state.tr.insertText(plain, view.state.selection.from, view.state.selection.to).scrollIntoView();
                view.dispatch(tr);
                return true;
              }
            }

            // 3) Laisse TipTap gérer le HTML normalement
            return false;
          },
        },
      }),
    ];
  },
});

export default MarkdownPasteHandler;






