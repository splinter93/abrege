'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockWithCopy from '@/extensions/CodeBlockWithCopy';

const TestMermaidEditor: React.FC = () => {
  const [content, setContent] = useState(`
# Test de l'éditeur avec Mermaid

Voici un diagramme de flux simple :

\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\`

Et un diagramme de séquence :

\`\`\`mermaid
sequenceDiagram
    participant U as Utilisateur
    participant S as Système
    participant A as API
    
    U->>S: Demande de données
    S->>A: Requête API
    A-->>S: Réponse
    S-->>U: Affichage des données
\`\`\`

Et un diagramme de classes :

\`\`\`mermaid
classDiagram
    class EditorComponent {
        +content: string
        +isEditing: boolean
        +saveContent()
        +loadContent()
    }
    
    class MermaidRenderer {
        +chart: string
        +render()
        +validate()
    }
    
    EditorComponent --> MermaidRenderer
\`\`\`
  `);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Désactiver le code block par défaut
      }),
      CodeBlockWithCopy,
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  const insertMermaidExample = (type: string) => {
    if (!editor) return;

    const examples = {
      flowchart: `\`\`\`mermaid
flowchart TD
    A[Début] --> B{Condition}
    B -->|Oui| C[Action 1]
    B -->|Non| D[Action 2]
    C --> E[Fin]
    D --> E
\`\`\``,
      sequence: `\`\`\`mermaid
sequenceDiagram
    participant U as Utilisateur
    participant S as Système
    
    U->>S: Demande
    S-->>U: Réponse
\`\`\``,
      class: `\`\`\`mermaid
classDiagram
    class Example {
        +property: string
        +method()
    }
\`\`\``,
      pie: `\`\`\`mermaid
pie title Répartition
    "A" : 40
    "B" : 30
    "C" : 30
\`\`\``,
    };

    const example = examples[type as keyof typeof examples];
    if (example) {
      editor.commands.insertContent(example);
    }
  };

  const clearContent = () => {
    if (editor) {
      editor.commands.clearContent();
      setContent('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Test de l'éditeur avec Mermaid</h1>
          <p className="text-gray-300 mb-6">
            Cette page teste l'intégration des diagrammes Mermaid dans l'éditeur TipTap.
          </p>
          
          <div className="flex flex-wrap gap-3 mb-6">
            <button 
              onClick={() => insertMermaidExample('flowchart')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg transition-colors"
            >
              + Flowchart
            </button>
            <button 
              onClick={() => insertMermaidExample('sequence')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 border border-green-500 rounded-lg transition-colors"
            >
              + Sequence
            </button>
            <button 
              onClick={() => insertMermaidExample('class')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded-lg transition-colors"
            >
              + Class
            </button>
            <button 
              onClick={() => insertMermaidExample('pie')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 border border-orange-500 rounded-lg transition-colors"
            >
              + Pie Chart
            </button>
            <button 
              onClick={clearContent}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 border border-red-500 rounded-lg transition-colors"
            >
              Effacer
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Éditeur</h2>
            <p className="text-gray-400 text-sm">
              Tapez ou insérez des exemples de diagrammes Mermaid. Les blocs de code avec 
              <code className="bg-gray-700 px-2 py-1 rounded text-xs mx-1">mermaid</code> 
              seront automatiquement rendus.
            </p>
          </div>
          
          <div className="border border-gray-600 rounded-lg overflow-hidden">
            <EditorContent editor={editor} className="prose prose-invert max-w-none" />
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">HTML généré</h2>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-300">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestMermaidEditor;
