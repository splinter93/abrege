'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import CodeBlock from '@tiptap/extension-code-block';
import Blockquote from '@tiptap/extension-blockquote';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

export default function TestEditorCursor() {
  const [content, setContent] = useState('# Test Curseur\n\nCeci est un test pour vérifier que le curseur reste en place.\n\nTapez du texte ici pour tester.');
  
  // États pour tester les personnalisations
  const [headerBlur, setHeaderBlur] = useState(0);
  const [headerOverlay, setHeaderOverlay] = useState(0);
  const [titleInImage, setTitleInImage] = useState(false);
  const [wideMode, setWideMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlock,
      Blockquote,
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({ 
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
        tightLists: true,       // Listes plus compactes
        bulletListMarker: '-'   // Utiliser des tirets pour les listes
      })
    ],
    immediatelyRender: false,
    content: content,
    onUpdate: ({ editor }) => {
      const md = editor.storage?.markdown?.getMarkdown?.() || '';
      if (md !== content) {
        console.log('🔄 Contenu mis à jour, ancien curseur:', editor.state.selection.from);
        
        // Nettoyer le Markdown pour éviter les échappements
        const cleanMarkdown = md
          .replace(/\\\*/g, '*')           // Supprimer l'échappement des *
          .replace(/\\_/g, '_')            // Supprimer l'échappement des _
          .replace(/\\`/g, '`')            // Supprimer l'échappement des `
          .replace(/\\\[/g, '[')           // Supprimer l'échappement des [
          .replace(/\\\]/g, ']')           // Supprimer l'échappement des ]
          .replace(/\\\(/g, '(')           // Supprimer l'échappement des (
          .replace(/\\\)/g, ')')           // Supprimer l'échappement des )
          .replace(/\\>/g, '>')            // Supprimer l'échappement des >
          .replace(/\\-/g, '-')            // Supprimer l'échappement des -
          .replace(/\\\|/g, '|')           // Supprimer l'échappement des |
          .replace(/\\~/g, '~')            // Supprimer l'échappement des ~
          .replace(/\\=/g, '=')            // Supprimer l'échappement des =
          .replace(/\\#/g, '#')            // Supprimer l'échappement des #
          .replace(/&gt;/g, '>')           // Supprimer l'échappement HTML des >
          .replace(/&lt;/g, '<')           // Supprimer l'échappement HTML des <
          .replace(/&amp;/g, '&');         // Supprimer l'échappement HTML des &
        
        setContent(cleanMarkdown);
      }
    },
    onPaste: (event) => {
      // Sauvegarder la position du curseur avant le collage
      const cursorPos = editor?.state.selection.from;
      console.log('🧪 Collage détecté - Position curseur:', cursorPos);
      
      // Détecter le type de contenu collé
      const clipboardData = event.clipboardData;
      if (clipboardData) {
        const plainText = clipboardData.getData('text/plain');
        
        if (clipboardData.types.includes('text/html')) {
          console.log('🧪 HTML riche collé, conversion en Markdown...');
          // Tiptap va automatiquement convertir l'HTML en Markdown propre
        } else if (clipboardData.types.includes('text/plain')) {
          console.log('🧪 Texte brut collé:', plainText);
          
          // Vérifier si c'est du Markdown brut
          if (this.isMarkdownText(plainText)) {
            console.log('🧪 Markdown brut détecté, parsing...');
            
            // Empêcher le comportement par défaut
            event.preventDefault();
            
            // Insérer le Markdown parsé
            if (editor) {
              editor.commands.insertContent(plainText);
              
              // Forcer le parsing Markdown après insertion
              setTimeout(() => {
                this.parseMarkdownContent(editor);
              }, 50);
            }
            
            return false; // Empêcher Tiptap de traiter
          }
        }
      }
      
      // Restaurer la position du curseur après le collage
      setTimeout(() => {
        if (editor && cursorPos !== undefined) {
          try {
            const newPos = Math.min(cursorPos, editor.state.doc.content.size);
            editor.commands.setTextSelection(newPos);
            console.log('✅ Curseur restauré à la position:', newPos);
          } catch (error) {
            console.log('⚠️ Impossible de restaurer le curseur:', error);
          }
        }
      }, 10);
      
      return true; // Laisser Tiptap gérer le collage
    },
    onDrop: (props) => {
      console.log('🧪 Drop détecté:', props);
      return false; // Laisser Tiptap gérer
    }
  });

  // Test de mise à jour du contenu externe
  const updateContent = () => {
    const newContent = content + '\n\nNouveau contenu ajouté à ' + new Date().toLocaleTimeString();
    setContent(newContent);
  };

  // Test des personnalisations
  const testPersonalization = async (type: string, value: any) => {
    console.log(`🧪 Test personnalisation ${type}:`, value);
    
    // Simuler un appel API
    try {
      const response = await fetch('/api/v2/note/test/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: value })
      });
      
      if (response.ok) {
        console.log(`✅ ${type} mis à jour avec succès`);
      } else {
        console.log(`❌ Erreur mise à jour ${type}:`, response.status);
      }
    } catch (error) {
      console.log(`❌ Erreur API ${type}:`, error);
    }
  };

  // Test de collage manuel
  const testPaste = async () => {
    try {
      // Simuler un collage de texte riche
      const richText = '<h2>Titre collé</h2><p>Paragraphe avec <strong>gras</strong> et <em>italique</em>.</p>';
      
      // Simuler l'insertion
      if (editor) {
        const cursorPos = editor.state.selection.from;
        console.log('🧪 Test collage manuel - Position curseur:', cursorPos);
        
        // Insérer le contenu à la position du curseur
        editor.commands.insertContent(richText);
        
        // Vérifier que le curseur est bien positionné
        setTimeout(() => {
          const newPos = editor.state.selection.from;
          console.log('✅ Curseur après collage manuel:', newPos);
        }, 100);
      }
    } catch (error) {
      console.log('❌ Erreur test collage:', error);
    }
  };

  // Fonction utilitaire pour nettoyer le Markdown échappé
  const cleanEscapedMarkdown = (markdown: string): string => {
    return markdown
      .replace(/\\\*/g, '*')           // Supprimer l'échappement des *
      .replace(/\\_/g, '_')            // Supprimer l'échappement des _
      .replace(/\\`/g, '`')            // Supprimer l'échappement des `
      .replace(/\\\[/g, '[')           // Supprimer l'échappement des [
      .replace(/\\\]/g, ']')           // Supprimer l'échappement des [
      .replace(/\\\(/g, '(')           // Supprimer l'échappement des (
      .replace(/\\\)/g, ')')           // Supprimer l'échappement des )
      .replace(/\\>/g, '>')            // Supprimer l'échappement des >
      .replace(/\\-/g, '-')            // Supprimer l'échappement des -
      .replace(/\\\|/g, '|')           // Supprimer l'échappement des |
      .replace(/\\~/g, '~')            // Supprimer l'échappement des ~
      .replace(/\\=/g, '=')            // Supprimer l'échappement des =
      .replace(/\\#/g, '#')            // Supprimer l'échappement des #
      .replace(/&gt;/g, '>')           // Supprimer l'échappement HTML des >
      .replace(/&lt;/g, '<')           // Supprimer l'échappement HTML des <
      .replace(/&amp;/g, '&');         // Supprimer l'échappement HTML des &
  };

  // Détecter si le texte est du Markdown
  const isMarkdownText = (text: string): boolean => {
    const markdownPatterns = [
      /^#+\s/,           // Titres (# ## ###)
      /\*\*.*?\*\*/,      // **gras**
      /\*.*?\*/,          // *italique*
      /`.*?`/,            // `code`
      /\[.*?\]\(.*?\)/,   // [lien](url)
      /^[-*+]\s/,         // Listes à puces
      /^\d+\.\s/,         // Listes numérotées
      /^>/,               // Citations
      /^```/,             // Blocs de code
      /^\|.*\|$/,         // Tableaux
      /^---+$/,           // Séparateurs
      /~~.*?~~/,          // ~~barré~~
      /==.*?==/           // ==surligné==
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  };

  // Parser le contenu Markdown après insertion
  const parseMarkdownContent = (editor: any) => {
    try {
      // Récupérer le contenu actuel
      const currentContent = editor.getHTML();
      
      // Forcer la mise à jour du Markdown
      const markdown = editor.storage?.markdown?.getMarkdown?.() || '';
      
      // Nettoyer les échappements
      const cleanMarkdown = markdown
        .replace(/\\\*/g, '*')
        .replace(/\\_/g, '_')
        .replace(/\\`/g, '`')
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\>/g, '>')
        .replace(/\\-/g, '-')
        .replace(/\\\|/g, '|')
        .replace(/\\~/g, '~')
        .replace(/\\=/g, '=')
        .replace(/\\#/g, '#');
      
      // Mettre à jour le contenu avec le Markdown parsé
      if (cleanMarkdown !== markdown) {
        editor.commands.setContent(cleanMarkdown);
        console.log('✅ Markdown parsé et formaté');
      }
      
      // Forcer le rendu des éléments spéciaux
      setTimeout(() => {
        try {
          // Forcer la mise à jour de l'éditeur
          editor.commands.focus();
          console.log('✅ Rendu forcé des éléments Markdown');
        } catch (error) {
          console.log('⚠️ Erreur rendu forcé:', error);
        }
      }, 100);
      
    } catch (error) {
      console.log('⚠️ Erreur parsing Markdown:', error);
    }
  };

  // Test de collage Markdown brut
  const testPasteMarkdown = () => {
    const markdownText = `# Titre principal

## Sous-titre

**Texte en gras** et *texte en italique*

- **Liste à puces**
- Avec du **gras** et de l*italique*
- Et du \`code inline\`

1. **Liste numérotée**
2. Avec des liens [exemple](https://example.com)
3. Et des citations

> Ceci est une citation
> Sur plusieurs lignes
> Avec du **gras** et de l*italique*

\`\`\`javascript
// Code block avec syntax highlighting
function hello() {
  console.log('Hello World');
  return true;
}
\`\`\`

| Tableau | Test | Status |
|---------|------|--------|
| Cellule 1 | Données A | ✅ |
| Cellule 2 | Données B | ❌ |
| Cellule 3 | Données C | ⚠️ |

---

~~Texte barré~~

==Texte surligné==

\`code\` et **gras** et *italique*`;

    if (editor) {
      const cursorPos = editor.state.selection.from;
      console.log('🧪 Test collage Markdown brut - Position curseur:', cursorPos);
      
      // Insérer le Markdown brut
      editor.commands.insertContent(markdownText);
      
      // Forcer le parsing après insertion
      setTimeout(() => {
        parseMarkdownContent(editor);
        console.log('✅ Markdown brut parsé et formaté');
      }, 100);
    }
  };

  // Test des éléments spécifiques problématiques
  const testSpecificElements = () => {
    if (editor) {
      console.log('🧪 Test des éléments spécifiques...');
      
      // Test 1: Bloc de code
      console.log('🧪 Test bloc de code...');
      editor.commands.insertContent('\n\n```javascript\nconsole.log("Test bloc de code");\n```\n\n');
      
      // Test 2: Citation
      setTimeout(() => {
        console.log('🧪 Test citation...');
        editor.commands.insertContent('\n\n> Ceci est une citation de test\n> Sur plusieurs lignes\n\n');
      }, 200);
      
      // Test 3: Tableau
      setTimeout(() => {
        console.log('🧪 Test tableau...');
        editor.commands.insertContent('\n\n| Col1 | Col2 | Col3 |\n|------|------|------|\n| A1 | A2 | A3 |\n| B1 | B2 | B3 |\n\n');
      }, 400);
      
      // Forcer le parsing final
      setTimeout(() => {
        parseMarkdownContent(editor);
        console.log('✅ Test des éléments spécifiques terminé');
      }, 600);
    }
  };

  // Test des échappements Markdown
  const testEscapedMarkdown = () => {
    if (editor) {
      console.log('🧪 Test des échappements Markdown...');
      
      // Insérer du Markdown avec échappements (comme celui que vous avez montré)
      const escapedMarkdown = `# Titre principal

## Sous-titre

**Texte en gras** et *texte en italique*

\\- **Liste à puces**

\\- Avec du **gras** et de l\\*italique\\*

\\- Et du \\\`code inline\\\`

1\\. **Liste numérotée**

2\\. Avec des liens \\[exemple\\](<https://example.com>)

3\\. Et des citations &gt; Ceci est une citation

\\\`\\\`\\\`javascript

// Code block

console.log('Hello World');

\\\`\\\`\\\`

| Tableau | Test |

|---------|------|

| Cellule | Données |

\\---

~~Texte barré~~

==Texte surligné==

\\\`code\\\` et **gras** et *italique*`;
      
      // Insérer le contenu échappé
      editor.commands.setContent(escapedMarkdown);
      
      // Récupérer le Markdown généré par Tiptap
      setTimeout(() => {
        const generatedMarkdown = editor.storage?.markdown?.getMarkdown?.() || '';
        console.log('🧪 Markdown généré par Tiptap (avec échappements):', generatedMarkdown);
        
        // Nettoyer les échappements
        const cleanMarkdown = cleanEscapedMarkdown(generatedMarkdown);
        console.log('🧪 Markdown nettoyé:', cleanMarkdown);
        
        // Mettre à jour avec le contenu nettoyé
        editor.commands.setContent(cleanMarkdown);
        console.log('✅ Contenu nettoyé appliqué');
      }, 100);
    }
  };

  // Test de nettoyage Markdown
  const testMarkdownCleaning = () => {
    const escapedMarkdown = '# Titre principal\n\n## Sous-titre\n\n**Texte en gras** et *texte en italique*\n\n\\- **Liste à puces**\n\n\\- Avec du **gras** et de l\\*italique\\*\n\n\\- Et du \\`code inline\\`';
    
    const cleanMarkdown = escapedMarkdown
      .replace(/\\\*/g, '*')
      .replace(/\\_/g, '_')
      .replace(/\\`/g, '`')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\>/g, '>')
      .replace(/\\-/g, '-')
      .replace(/\\\|/g, '|')
      .replace(/\\~/g, '~')
      .replace(/\\=/g, '=')
      .replace(/\\#/g, '#');
    
    console.log('🧪 Test nettoyage Markdown:');
    console.log('Avant (échappé):', escapedMarkdown);
    console.log('Après (nettoyé):', cleanMarkdown);
    
    // Mettre à jour l'éditeur avec le contenu nettoyé
    if (editor) {
      editor.commands.setContent(cleanMarkdown);
    }
  };

  // Test de nettoyage principal de l'éditeur
  const testMainEditorCleaning = () => {
    if (editor) {
      console.log('🧪 Test de nettoyage principal de l\'éditeur...');
      const currentContent = editor.getHTML();
      console.log('Contenu actuel avant nettoyage:', currentContent);

      // Forcer la mise à jour du Markdown
      const markdown = editor.storage?.markdown?.getMarkdown?.() || '';
      const cleanMarkdown = markdown
        .replace(/\\\*/g, '*')
        .replace(/\\_/g, '_')
        .replace(/\\`/g, '`')
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\>/g, '>')
        .replace(/\\-/g, '-')
        .replace(/\\\|/g, '|')
        .replace(/\\~/g, '~')
        .replace(/\\=/g, '=')
        .replace(/\\#/g, '#');

      console.log('Contenu après nettoyage:', cleanMarkdown);
      editor.commands.setContent(cleanMarkdown);
      console.log('✅ Nettoyage principal de l\'éditeur terminé');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Test Curseur Éditeur</h1>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Instructions de test :</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Cliquez dans l'éditeur à un endroit spécifique</li>
            <li>Tapez quelques lettres - le curseur devrait rester en place</li>
            <li>Collez du texte riche (Word, Google Docs, etc.) - le curseur devrait être préservé</li>
            <li>Cliquez sur "Mettre à jour contenu" pour simuler une mise à jour externe</li>
            <li>Vérifiez que le curseur reste à sa position</li>
          </ol>
        </div>

        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">⚠️ Problème des échappements Markdown :</h2>
          <p className="text-sm mb-2">
            L'extension <code>tiptap-markdown</code> échappe automatiquement les caractères spéciaux 
            (ajoute des backslashes <code>\</code>) pour éviter les conflits de parsing.
          </p>
          <p className="text-sm mb-2">
            <strong>Résultat :</strong> Le Markdown sauvegardé contient des <code>\*</code>, <code>\-</code>, etc.
            qui cassent la mise en forme lors de l'affichage.
          </p>
          <p className="text-sm">
            <strong>Solution :</strong> Utilisez le bouton "Test échappements" pour voir le nettoyage automatique.
          </p>
        </div>

        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">🧪 Test Personnalisations :</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Header Blur</label>
              <input
                type="range"
                min="0"
                max="20"
                value={headerBlur}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setHeaderBlur(value);
                  testPersonalization('header_image_blur', value);
                }}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{headerBlur}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Header Overlay</label>
              <input
                type="range"
                min="0"
                max="100"
                value={headerOverlay}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setHeaderOverlay(value);
                  testPersonalization('header_image_overlay', value);
                }}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{headerOverlay}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Title in Image</label>
              <input
                type="checkbox"
                checked={titleInImage}
                onChange={(e) => {
                  const value = e.target.checked;
                  setTitleInImage(value);
                  testPersonalization('header_title_in_image', value);
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">{titleInImage ? 'ON' : 'OFF'}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Wide Mode</label>
              <input
                type="checkbox"
                checked={wideMode}
                onChange={(e) => {
                  const value = e.target.checked;
                  setWideMode(value);
                  testPersonalization('wide_mode', value);
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">{wideMode ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={updateContent}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Mettre à jour contenu externe
          </button>
          
          <button
            onClick={testPaste}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test collage manuel
          </button>
          
          <button
            onClick={testMarkdownCleaning}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test nettoyage Markdown
          </button>
          
          <button
            onClick={() => testPasteMarkdown()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Test collage Markdown brut
          </button>
          
          <button
            onClick={() => testSpecificElements()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Test éléments spécifiques
          </button>
          
          <button
            onClick={() => testEscapedMarkdown()}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Test échappements
          </button>
          
          <button
            onClick={() => testMainEditorCleaning()}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            Test nettoyage éditeur principal
          </button>
        </div>

        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <EditorContent editor={editor} />
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info :</h3>
          <p><strong>Contenu actuel :</strong> {content.length} caractères</p>
          <p><strong>Position curseur :</strong> {editor?.state.selection.from || 'N/A'}</p>
          <p><strong>Contenu éditeur :</strong> {editor?.storage?.markdown?.getMarkdown?.()?.length || 'N/A'} caractères</p>
          <p><strong>Header Blur :</strong> {headerBlur}</p>
          <p><strong>Header Overlay :</strong> {headerOverlay}</p>
          <p><strong>Title in Image :</strong> {titleInImage ? 'ON' : 'OFF'}</p>
          <p><strong>Wide Mode :</strong> {wideMode ? 'ON' : 'OFF'}</p>
        </div>
      </div>
    </div>
  );
} 