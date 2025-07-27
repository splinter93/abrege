import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { createMarkdownIt } from '@/utils/markdownItConfig';

const MarkdownPasteHandler = Extension.create({
  name: 'markdownPasteHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPasteHandler'),
        props: {
          handlePaste: (view, event) => {
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
                // Convertir le markdown en HTML
                const md = createMarkdownIt();
                const html = md.render(text);
                
                // Supprimer le contenu sélectionné
                const { from, to } = view.state.selection;
                const tr = view.state.tr.delete(from, to);
                
                // Insérer le HTML converti en utilisant insertContent
                // On va utiliser une approche différente : insérer le HTML directement
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Créer un fragment ProseMirror à partir du HTML
                const fragment = view.domSerializer.serializeFragment(
                  tempDiv,
                  { schema: view.state.schema }
                );
                
                tr.replaceWith(from, from, fragment);
                view.dispatch(tr);
                
                return true;
              } catch (error) {
                console.error('Erreur lors de la conversion markdown:', error);
                // Fallback : insérer le texte brut
                const { from, to } = view.state.selection;
                const tr = view.state.tr.delete(from, to);
                tr.insertText(text, from);
                view.dispatch(tr);
                return true;
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