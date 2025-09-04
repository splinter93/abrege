import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import type MarkdownIt from 'markdown-it'
import { createMarkdownIt } from '@/utils/markdownItConfig'

// Type Options défini mais non utilisé - supprimé pour éviter l'erreur TypeScript

function looksLikeMarkdown(text: string): boolean {
  if (!text) return false
  const patterns = [
    /(^|\n)#{1,6}\s+\S/,              // # Heading
    /(^|\n)(?:-|\*)\s+\S/,            // - list ou * list
    /(^|\n)\d+\.\s+\S/,               // 1. list
    /(^|\n)>\s+\S/,                   // > quote
    /(^|\n)```[\s\S]*?```/,           // ``` code block
    /\*\*[^*\n]+?\*\*/,               // **bold**
    /(?:^|[^\*])\*[^*\n]+?\*(?:$|[^\*])/, // *italic* (evite le greedy)
    /$begin:math:display$[^$end:math:display$]+?\]$begin:math:text$[^)]+?$end:math:text$/,          // [link](url)
    /!$begin:math:display$[^$end:math:display$]*?\]$begin:math:text$[^)]+?$end:math:text$/,         // ![img](src)
    /(^|\n)\|.+\|/,                    // table row
    /(^|\n)(?:-{3,}|\*{3,}|_{3,})\s*$/ // hr
  ]
  return patterns.some(rx => rx.test(text))
}

const MarkdownPasteHandler = Extension.create<Options>({
  name: 'markdownPasteHandler',

  addOptions() {
    return {
      preferPlainText: false, // laisse le comportement natif par défaut
      markdownIt: undefined,
    }
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('markdownPasteHandler')

    return [
      new Plugin({
        key,
        props: {
          handlePaste: (view, event) => {
            const data = (event as ClipboardEvent).clipboardData
            if (!data) return false

            // 1) Essaie d’abord un "vrai" Markdown s’il est exposé
            const mdText =
              data.getData('text/markdown') ||
              data.getData('text/x-markdown') ||
              data.getData('text/plain')

            const hasMarkdown = looksLikeMarkdown(mdText)

            // Si c’est du Markdown → on convertit via markdown-it, on parse en PM Slice, et on remplace la sélection.
            if (hasMarkdown) {
              event.preventDefault()
              try {
                const md = this.options.markdownIt ?? createMarkdownIt()
                const html = md.render(mdText.trim())

                const wrap = document.createElement('div')
                wrap.innerHTML = html

                const schema = view.state.schema
                const parser = ProseMirrorDOMParser.fromSchema(schema)
                // parseSlice → évite de recréer un doc complet, parfait pour remplacer la sélection
                const slice = parser.parseSlice(wrap)

                const tr = view.state.tr.replaceSelection(slice).scrollIntoView()
                view.dispatch(tr)
                return true
              } catch (err) {
                console.error('[markdownPasteHandler] convert error:', err)
                // Fallback: insertText propre
                const tr = view.state.tr.insertText(mdText, view.state.selection.from, view.state.selection.to).scrollIntoView()
                view.dispatch(tr)
                return true
              }
            }

            // 2) Sinon, si on veut éviter le HTML du presse-papier (doubles espaces de TipTap),
            // on force le collage en texte brut.
            if (this.options.preferPlainText) {
              const plain = data.getData('text/plain')
              if (plain) {
                event.preventDefault()
                const tr = view.state.tr.insertText(plain, view.state.selection.from, view.state.selection.to).scrollIntoView()
                view.dispatch(tr)
                return true
              }
            }

            // 3) Laisse TipTap gérer le HTML normalement
            return false
          },
        },
      }),
    ]
  },
})

export default MarkdownPasteHandler