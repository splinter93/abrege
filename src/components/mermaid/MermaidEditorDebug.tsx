"use client";
import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { detectMermaidBlocks, validateMermaidSyntax, normalizeMermaidContent } from '@/services/mermaid';
import CodeBlockWithCopy from '@/extensions/CodeBlockWithCopy';
import '@/styles/mermaid.css';

const MermaidEditorDebug: React.FC = () => {
  const [content, setContent] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockWithCopy, // Utiliser l'extension qui fonctionne déjà
    ],
    content: `
      <h1>Test Mermaid dans l'éditeur</h1>
      
      <p>Voici un diagramme de flux simple :</p>
      
      <pre><code class="language-mermaid">graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E</code></pre>
      
      <p>Et un diagramme de séquence :</p>
      
      <pre><code class="language-mermaid">sequenceDiagram
    participant U as User
    participant S as System
    U->>S: Request
    S->>U: Response</code></pre>
      
      <p>Et un diagramme de classe :</p>
      
      <pre><code class="language-mermaid">classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }</code></pre>
    `,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Éditeur Mermaid</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Éditeur avec debug</h2>
        <div className="border rounded p-4">
          <EditorContent editor={editor} />
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Contenu HTML de l'éditeur</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-64">
          {content}
        </pre>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Instructions</h2>
        <div className="bg-blue-100 p-4 rounded">
          <p className="text-sm">
            <strong>Ce composant affiche :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>Le contenu brut extrait de chaque bloc de code</li>
            <li>La détection automatique des blocs Mermaid</li>
            <li>La validation de la syntaxe Mermaid</li>
            <li>Le contenu normalisé</li>
            <li>Les informations de debug du nœud Tiptap</li>
          </ul>
          <p className="text-sm mt-2">
            <strong>Utilisez ce composant pour :</strong>
          </p>
          <ul className="text-sm mt-2 list-disc list-inside">
            <li>Vérifier que le contenu est correctement extrait</li>
            <li>Identifier pourquoi le contenu est tronqué</li>
            <li>Valider la détection automatique des blocs Mermaid</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MermaidEditorDebug;
