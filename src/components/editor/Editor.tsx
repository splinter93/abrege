import React from 'react';
import './editor-header.css';
import '@/styles/markdown.css';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import LogoScrivia from '@/components/LogoScrivia';

const Logo = () => (
  <LogoScrivia />
);

/**
 * Editor - Composant d'édition/lecture Markdown synchronisé en temps réel
 *
 * @param noteId string - identifiant de la note à éditer/afficher
 * @param readonly boolean - mode lecture (par défaut true)
 *
 * - Le contenu est auto-synchronisé via WebSocket (événements editor.*)
 * - Toute mutation LLM/editor reçue via WebSocket est appliquée automatiquement (sans diff pour l'instant)
 * - Le markdown est rendu fidèlement, sans effet/animation
 * - Fallback "Chargement..." si la note n'existe pas
 */
const Editor: React.FC<{ noteId: string; readonly?: boolean }> = ({ noteId }) => {
  // Sélecteur Zustand stable pour une note par ID
  const makeSelectNote = (noteId: string) => (s: FileSystemState) => s.notes[noteId];
  const note = useFileSystemStore(makeSelectNote(noteId));
  const content = note?.content || '';
  const { html } = useMarkdownRender({ content });

  if (!note) {
    return <div className="editor-flex-center editor-padding-standard">Chargement…</div>;
  }

  return (
    <div className="editor-full-height editor-full-width editor-bg-surface-1 editor-flex-column editor-flex-center">
      {/* Header sticky premium */}
      <header className="editor-header editor-sticky-top editor-z-100 editor-bg-surface-2 editor-border-bottom editor-flex-between editor-padding-compact">
        <div className="editor-margin-left-small">
          <Logo />
        </div>
        <div className="editor-flex-center editor-text-center editor-font-bold editor-text-white">
          TOOLBAR ICI
        </div>
        <div className="editor-header-toolbar">
          <button className="editor-header-close editor-text-white">×</button>
        </div>
      </header>
      <main className="editor-content-width editor-padding-standard">
        <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
    </div>
  );
};

export default Editor; 