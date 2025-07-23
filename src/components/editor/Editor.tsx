import React, { useMemo } from 'react';
import '../editor/editor-header.css';
import '@/styles/markdown.css';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { createMarkdownIt } from '@/utils/markdownItConfig';

const Logo = () => (
  <div className="editor-header-logo">
    <span style={{ fontSize: 26, marginRight: 6 }}>🟧</span> abrège
  </div>
);

/**
 * Editor - Composant d’édition/lecture Markdown synchronisé en temps réel
 *
 * @param noteId string - identifiant de la note à éditer/afficher
 * @param readonly boolean - mode lecture (par défaut true)
 *
 * - Le contenu est auto-synchronisé via WebSocket (événements editor.*)
 * - Toute mutation LLM/editor reçue via WebSocket est appliquée automatiquement (sans diff pour l’instant)
 * - Le markdown est rendu fidèlement, sans effet/animation
 * - Fallback "Chargement..." si la note n’existe pas
 */
const Editor: React.FC<{ noteId: string; readonly?: boolean }> = ({ noteId, readonly = true }) => {
  const note = useFileSystemStore((s: FileSystemState) => s.notes[noteId]);
  const content = note?.content || '';
  const md = useMemo(() => createMarkdownIt(), []);
  const html = useMemo(() => md.render(content), [md, content]);

  if (!note) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Chargement…</div>;
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'var(--surface-1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header sticky premium */}
      <header className="editor-header" style={{ position: 'sticky', top: 0, left: 0, width: '100vw', zIndex: 100, background: '#18181c', minHeight: 54, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', boxSizing: 'border-box', padding: 0, justifyContent: 'space-between' }}>
        <Logo />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>
          TOOLBAR ICI
        </div>
        <div className="editor-header-toolbar" style={{ gap: 10 }}>
          <button className="editor-header-close" style={{ fontSize: 22, color: '#fff' }}>×</button>
        </div>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 820, margin: '0 auto', padding: '32px 0' }}>
        <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
    </div>
  );
};

export default Editor; 