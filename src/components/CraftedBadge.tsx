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
        fontSize: '0.85rem',
        borderRadius: 14,
        padding: '6px 14px',
        fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
        boxShadow: '0 2px 8px 0 rgba(44,44,44,0.10)',
        letterSpacing: '0.01em',
        opacity: 0.82,
        userSelect: 'none',
        textTransform: 'none',
        transition: 'opacity 0.18s, color 0.18s',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        pointerEvents: 'auto',
        textDecoration: 'none',
      }}
      onMouseOver={e => {
        e.currentTarget.style.opacity = '1';
        const feather = e.currentTarget.querySelector('svg');
        if (feather) feather.style.color = '#ffb86c';
      }}
      onMouseOut={e => {
        e.currentTarget.style.opacity = '0.82';
        const feather = e.currentTarget.querySelector('svg');
        if (feather) feather.style.color = '#D4D4D4';
      }}
    >
      <FiFeather size={15} style={{ marginRight: 1, color: '#D4D4D4', flexShrink: 0, transition: 'color 0.18s' }} />
      Crafted with Scrivia
    </a>
  );
} 