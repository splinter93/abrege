import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { LuMoon, LuCloudFog } from 'react-icons/lu';
import { FiImage } from 'react-icons/fi';
import Tooltip from './Tooltip';
import ImageMenu from './ImageMenu';

interface EditorHeaderImageProps {
  headerImageUrl: string | null;
  onHeaderChange: (url: string | null) => void;
  imageMenuOpen: boolean;
  onImageMenuOpen: () => void;
  onImageMenuClose: () => void;
}

const HEADER_IMAGES = [
  'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function getRandomHeaderImage(current: string | null) {
  const others = HEADER_IMAGES.filter(url => url !== current);
  return others[Math.floor(Math.random() * others.length)];
}

const EditorHeaderImage: React.FC<EditorHeaderImageProps> = ({
  headerImageUrl,
  onHeaderChange,
  imageMenuOpen,
  onImageMenuOpen,
  onImageMenuClose,
}) => {
  const [headerOverlayLevel, setHeaderOverlayLevel] = useState(0);
  const [headerBlurLevel, setHeaderBlurLevel] = useState(0);
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false);

  const headerBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    borderRadius: 8,
    padding: '4px 6px',
    opacity: 0.92,
    color: 'var(--text-2)',
    cursor: 'pointer',
    transition: 'color 0.18s',
    margin: 0,
    outline: 'none',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!headerImageUrl) return null;

  return (
    <div className="editor-header-image" style={{ position: 'relative', width: '100%', height: 220, background: '#f7f7f7', overflow: 'hidden', marginBottom: 16, marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
      <img
        src={headerImageUrl}
        alt="Header"
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `blur(${headerBlurLevel * 2}px)`, transition: 'filter 0.2s' }}
      />
      {/* Overlay visuel appliqué sur l'image */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(24,24,24,${0.08 + 0.14 * headerOverlayLevel})`, pointerEvents: 'none', transition: 'background 0.2s' }} />
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 20,
        alignItems: 'flex-end',
        background: 'rgba(255,255,255,0.10)',
        borderRadius: 18,
        padding: '8px 2px',
        boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)'
      }}>
        {/* Fermer */}
        <Tooltip text="Fermer">
          <button
            className="header-image-btn"
            onClick={() => onHeaderChange(null)}
            style={headerBtnStyle}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <MdClose size={18} />
          </button>
        </Tooltip>
        {/* Overlay */}
        <Tooltip text={`Overlay: ${headerOverlayLevel}/5`}>
          <button
            className="header-image-btn"
            onClick={() => setHeaderOverlayLevel(l => (l + 1) % 6)}
            style={headerBtnStyle}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <LuMoon size={18} />
          </button>
        </Tooltip>
        {/* Blur */}
        <Tooltip text={`Blur: ${headerBlurLevel}/5`}>
          <button
            className="header-image-btn"
            onClick={() => setHeaderBlurLevel(l => (l + 1) % 6)}
            style={headerBtnStyle}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <LuCloudFog size={18} />
          </button>
        </Tooltip>
        {/* Changer d'image */}
        <Tooltip text="Changer d'image">
          <button
            className="header-image-btn"
            onClick={() => onHeaderChange(getRandomHeaderImage(headerImageUrl))}
            style={headerBtnStyle}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <FiImage size={18} />
          </button>
        </Tooltip>
      </div>
      {/* Menu contextuel pour l'image */}
      <ImageMenu open={imageMenuOpen} onClose={onImageMenuClose} onInsertImage={onHeaderChange} />
      {/* Modal ou menu pour les réglages */}
      {imageSettingsOpen && (
        <div className="image-settings-modal">Réglages à implémenter…</div>
      )}
    </div>
  );
};

export default EditorHeaderImage; 