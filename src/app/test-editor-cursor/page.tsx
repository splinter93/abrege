'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

export default function TestEditorCursor() {
  const [content, setContent] = useState('# Test Curseur\n\nCeci est un test pour vérifier que le curseur reste en place.\n\nTapez du texte ici pour tester.');
  
  // États pour tester les personnalisations
  const [headerBlur, setHeaderBlur] = useState(0);
  const [headerOverlay, setHeaderOverlay] = useState(0);
  const [titleInImage, setTitleInImage] = useState(false);
  const [wideMode, setWideMode] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Markdown.configure({ html: false })],
    content: content,
    onUpdate: ({ editor }) => {
      const md = editor.storage?.markdown?.getMarkdown?.() || '';
      if (md !== content) {
        console.log('🔄 Contenu mis à jour, ancien curseur:', editor.state.selection.from);
        setContent(md);
      }
    },
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🧪 Test Curseur Éditeur</h1>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Instructions de test :</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Cliquez dans l'éditeur à un endroit spécifique</li>
            <li>Tapez quelques lettres - le curseur devrait rester en place</li>
            <li>Cliquez sur "Mettre à jour contenu" pour simuler une mise à jour externe</li>
            <li>Vérifiez que le curseur reste à sa position</li>
          </ol>
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

        <div className="mb-4">
          <button
            onClick={updateContent}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Mettre à jour contenu externe
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