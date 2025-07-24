"use client";
import { FiFeather } from 'react-icons/fi';

export default function CraftedBadge() {
  return (
    <a
      href="https://scrivia.app"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: 18,
        right: 18,
        background: 'linear-gradient(90deg, #232325 0%, #44444a 100%)',
        color: '#D4D4D4',
        fontWeight: 400,
        fontSize: '0.92rem',
        borderRadius: 14,
        padding: '5px 16px',
        fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        boxShadow: '0 2px 8px 0 rgba(44,44,44,0.10)',
        letterSpacing: '0.01em',
        opacity: 0.82,
        userSelect: 'none',
        textTransform: 'none',
        transition: 'box-shadow 0.18s, opacity 0.18s',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
        textDecoration: 'none',
      }}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = '0 0 16px 2px #ffb86c, 0 2px 8px 0 rgba(44,44,44,0.10)';
        e.currentTarget.style.opacity = '1';
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(44,44,44,0.10)';
        e.currentTarget.style.opacity = '0.82';
      }}
    >
      <FiFeather size={17} style={{ marginRight: 2, color: '#D4D4D4', flexShrink: 0 }} />
      Crafted with Scrivia
    </a>
  );
} 