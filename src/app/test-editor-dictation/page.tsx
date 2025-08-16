'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import EditorToolbar from '@/components/editor/EditorToolbar';

export default function TestEditorDictation() {
  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Cliquez sur le bouton microphone dans la toolbar pour tester la dictée vocale ! 🎤</p><p>Placez votre curseur où vous voulez insérer le texte dicté.</p>',
  });

  const handleTranscriptionComplete = (text: string) => {
    if (!editor) return;
    
    try {
      // Insérer le texte transcrit à la position du curseur
      const { state, dispatch } = editor.view;
      const from = state.selection.from;
      
      // Insérer le texte avec un espace avant si nécessaire
      const insertText = from > 0 && state.doc.textBetween(from - 1, from) !== ' ' ? ` ${text}` : text;
      
      dispatch(state.tr.insertText(insertText, from));
      
      // Mettre le focus sur l'éditeur et placer le curseur après le texte inséré
      editor.commands.focus();
      editor.commands.setTextSelection(from + insertText.length);
      
      console.log(`[TestEditor] 🎤 Texte transcrit inséré: "${text}"`);
    } catch (error) {
      console.error('[TestEditor] ❌ Erreur lors de l\'insertion du texte transcrit:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎤 Test de la Dictée Vocale dans l'Éditeur
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
            <li>Cliquez dans l'éditeur pour placer votre curseur</li>
            <li>Cliquez sur le bouton microphone 🎤 dans la toolbar</li>
            <li>Parlez dans votre microphone</li>
            <li>Cliquez à nouveau pour arrêter l'enregistrement</li>
            <li>Le texte transcrit sera inséré à la position du curseur</li>
          </ol>

          <div className="border border-gray-200 rounded-lg">
            {/* Toolbar */}
            <EditorToolbar 
              editor={editor} 
              setImageMenuOpen={setImageMenuOpen}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            
            {/* Éditeur */}
            <div className="p-4 min-h-[300px]">
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Fonctionnalités testées</h3>
            <ul className="text-blue-700 space-y-1">
              <li>✅ Bouton microphone dans la toolbar</li>
              <li>✅ Enregistrement audio avec MediaRecorder</li>
              <li>✅ Transcription via API Whisper v2</li>
              <li>✅ Insertion du texte à la position du curseur</li>
              <li>✅ Gestion des erreurs et états</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 