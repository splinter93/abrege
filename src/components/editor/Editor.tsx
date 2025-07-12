import React from 'react';
import '../editor/editor-header.css';

const Logo = () => (
  <div className="editor-header-logo">
    <span style={{ fontSize: 26, marginRight: 6 }}>🟧</span> abrège
  </div>
);

const Editor = () => {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--surface-1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header sticky premium */}
      <header className="editor-header" style={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100vw',
        zIndex: 100,
        background: '#18181c',
        minHeight: 54,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        boxSizing: 'border-box',
        padding: 0,
        justifyContent: 'space-between'
      }}>
        <Logo />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 700, fontSize: 20 }}>
          TOOLBAR ICI
        </div>
        <div className="editor-header-toolbar" style={{ gap: 10 }}>
          <button className="editor-header-close" style={{ fontSize: 22, color: '#fff' }}>×</button>
        </div>
      </header>
    </div>
  );
};

export default Editor; 