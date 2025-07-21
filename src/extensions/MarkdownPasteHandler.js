import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const MarkdownPasteHandler = Extension.create({
  name: 'markdownPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPasteHandler'),
        props: {
          handlePaste: (view, event, slice) => {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            // Détecter si le texte contient du markdown
            const markdownPatterns = [
              /^#+\s+/m,           // Headers
              /^\*\s+/m,           // Listes
              /^-\s+/m,            // Listes
              /^\d+\.\s+/m,        // Listes numérotées
              /^\>\s+/m,           // Citations
              /\*\*.*\*\*/m,       // Bold
              /\*.*\*/m,           // Italic
              /`.*`/m,             // Code inline
              /\[.*\]\(.*\)/m,     // Liens
              /!\[.*\]\(.*\)/m,    // Images
              /^\|.*\|$/m,         // Tables
              /^```/m,             // Code blocks
            ];

            const isMarkdown = markdownPatterns.some(pattern => pattern.test(text));
            
            if (isMarkdown) {
              try {
                // Supprimer le contenu sélectionné et insérer le markdown brut
                const { from, to } = view.state.selection;
                const tr = view.state.tr.delete(from, to);
                tr.insertText(text, from);
                view.dispatch(tr);
                
                return true;
              } catch (error) {
                console.error('Erreur lors du paste markdown:', error);
                return false;
              }
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

export default MarkdownPasteHandler; 