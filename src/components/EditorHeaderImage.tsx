import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { LuMoon, LuCloudFog } from 'react-icons/lu';
import { FiImage } from 'react-icons/fi';
import Tooltip from './Tooltip';
import ImageMenu from './ImageMenu';

interface EditorHeaderImageProps {
  headerImageUrl: string | null;
  headerImageOffset?: number;
  onHeaderChange: (url: string | null) => void;
  onHeaderOffsetChange?: (offset: number) => void;
  imageMenuOpen: boolean;
  onImageMenuOpen: () => void;
  onImageMenuClose: () => void;
  noteId: string;
  userId: string;
}

const HEADER_IMAGES = [
  'https://images.unsplash.com/photo-1454982523318-4b6396f39d3a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1544084944-15269ec7b5a0?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=3003&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1431631927486-6603c868ce5e?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/30/green-mountain.jpg?q=80&w=2948&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function getRandomHeaderImage(current: string | null) {
  const others = HEADER_IMAGES.filter(url => url !== current);
  return others[Math.floor(Math.random() * others.length)];
}

const EditorHeaderImage: React.FC<EditorHeaderImageProps> = ({
  headerImageUrl,
  headerImageOffset = 50,
  onHeaderChange,
  onHeaderOffsetChange,
  imageMenuOpen,
  onImageMenuClose,
  noteId,
  userId,
}) => {
  const [headerOverlayLevel, setHeaderOverlayLevel] = useState(0);
  const [headerBlurLevel, setHeaderBlurLevel] = useState(0);
  // const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
  const [imageOffsetY, setImageOffsetY] = useState(Math.round(headerImageOffset * 100) / 100); // 0-100 (%)
  const [isAnimating, setIsAnimating] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startOffsetY = useRef(Math.round(headerImageOffset * 100) / 100);
  const currentOffsetRef = useRef(Math.round(headerImageOffset * 100) / 100);
  const previousImageUrl = useRef(headerImageUrl);

  // Synchroniser l'état local avec la prop headerImageOffset
  React.useEffect(() => {
    const newOffset = Math.round(headerImageOffset * 100) / 100;
    setImageOffsetY(newOffset);
    currentOffsetRef.current = newOffset;
  }, [headerImageOffset]);

  // Déclencher l'animation lors du changement d'image
  React.useEffect(() => {
    if (headerImageUrl !== previousImageUrl.current && headerImageUrl) {
      setIsAnimating(true);
      // Réinitialiser l'animation après 300ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    previousImageUrl.current = headerImageUrl;
  }, [headerImageUrl]);

  // Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    // Capturer la position de départ actuelle
    startOffsetY.current = currentOffsetRef.current;
    document.body.style.cursor = 'grabbing';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    const deltaY = e.clientY - startY.current;
    // 220px de hauteur, on veut un offset de 0 à 100 (%)
    let newOffset = startOffsetY.current + (deltaY / 220) * 100;
    newOffset = Math.max(0, Math.min(100, newOffset));
    // Arrondir au centième pour plus de précision
    const roundedOffset = Math.round(newOffset * 100) / 100;
    setImageOffsetY(roundedOffset);
    currentOffsetRef.current = roundedOffset;
  };
  const handleMouseUp = () => {
    dragging.current = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    
    // Sauvegarder la position finale (utiliser la ref qui a toujours la valeur la plus récente)
    if (onHeaderOffsetChange) {
      onHeaderOffsetChange(currentOffsetRef.current);
    }
  };

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
    <div className="editor-header-image">
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={isAnimating ? { opacity: [1, 0.8, 1], scale: [1, 0.98, 1] } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ width: '100%', height: '100%' }}
      >
        <img
          src={headerImageUrl}
          alt="Header"
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            filter: `blur(${headerBlurLevel * 2}px)`, 
            transition: 'filter 0.2s', 
            objectPosition: `center ${imageOffsetY}%`, 
            cursor: dragging.current ? 'grabbing' : 'grab' 
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </motion.div>
      {/* Overlay visuel appliqué sur l'image */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(24,24,24,${0.08 + 0.14 * headerOverlayLevel})`, pointerEvents: 'none', transition: 'background 0.2s' }} />
      <div className="editor-header-image-btns" style={{
        position: 'absolute',
        top: '50%',
        right: 14,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: 20,
        alignItems: 'flex-end',
        background: 'rgba(255,255,255,0.10)',
        borderRadius: 18,
        padding: '18px 2px',
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
      <ImageMenu open={imageMenuOpen} onClose={onImageMenuClose} onInsertImage={onHeaderChange} noteId={noteId} userId={userId} />
      {/* Modal ou menu pour les réglages */}
      {/* {imageSettingsOpen && (
        <div className="image-settings-modal">Réglages à implémenter…</div>
      )} */}
    </div>
  );
};

export default EditorHeaderImage; 