/**
 * Composant de démonstration de l'éditeur avec chat widget
 * Permet de tester l'intégration du chat dans l'éditeur
 */

'use client';

import React, { useState } from 'react';
import Editor from './Editor';
import { useUIContext } from '@/hooks/useUIContext';

interface EditorWithChatDemoProps {
  noteId: string;
  readonly?: boolean;
  userId?: string;
}

export default function EditorWithChatDemo({ 
  noteId, 
  readonly = false, 
  userId 
}: EditorWithChatDemoProps) {
  const [showContextInfo, setShowContextInfo] = useState(false);
  
  // Collecter le contexte UI pour démonstration
  const uiContext = useUIContext({
    activeNote: {
      id: noteId,
      slug: `note-${noteId}`,
      name: 'Note de démonstration avec chat'
    }
  });

  return (
    <div className="editor-with-chat-demo">
      {/* Bouton de debug pour afficher le contexte */}
      <div className="debug-panel">
        <button 
          onClick={() => setShowContextInfo(!showContextInfo)}
          className="debug-button"
        >
          {showContextInfo ? 'Masquer' : 'Afficher'} le contexte UI
        </button>
        
        {showContextInfo && (
          <div className="context-info">
            <h4>Contexte UI collecté :</h4>
            <pre>{JSON.stringify(uiContext, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Éditeur avec chat widget intégré */}
      <Editor 
        noteId={noteId}
        readonly={readonly}
        userId={userId}
      />

      <style jsx>{`
        .editor-with-chat-demo {
          position: relative;
          width: 100%;
          height: 100vh;
        }

        .debug-panel {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 2000;
          background: rgba(0, 0, 0, 0.8);
          padding: 15px;
          border-radius: 8px;
          color: white;
          font-family: 'Noto Sans', sans-serif;
        }

        .debug-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .debug-button:hover {
          background: #2563eb;
        }

        .context-info {
          margin-top: 15px;
          max-width: 400px;
          max-height: 300px;
          overflow-y: auto;
        }

        .context-info h4 {
          margin: 0 0 10px 0;
          color: #fbbf24;
        }

        .context-info pre {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}

