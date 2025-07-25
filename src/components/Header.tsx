'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageContext } from '../contexts/LanguageContext';
import LogoScrivia from '@/components/LogoScrivia';
import { FiShare2, FiStar, FiMoreHorizontal, FiMaximize2, FiMinimize2, FiCheck } from 'react-icons/fi';
import { supabase } from '@/supabaseClient';
import ShareMenu from './ShareMenu';

const Header: React.FC = () => {
  const { t } = useLanguageContext();
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = React.useState<boolean>(false);
  const [isKebabMenuOpen, setIsKebabMenuOpen] = React.useState<boolean>(false);
  const [fullWidth, setFullWidth] = React.useState<boolean>(false);
  const [isFavorite, setIsFavorite] = React.useState<boolean>(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Appliquer la largeur pleine au contenu de la page
  React.useEffect(() => {
    // Cibler uniquement le container principal data-main-content
    const mainContent = document.querySelector('div[data-main-content]') as HTMLElement | null;
    if (mainContent) {
      mainContent.style.maxWidth = fullWidth ? '1000px' : '750px';
      mainContent.style.width = fullWidth ? '1000px' : '750px';
      mainContent.style.margin = '0 auto';
      mainContent.style.flexShrink = '0';
      mainContent.style.alignSelf = 'center';
    }
  }, [fullWidth]);

  const kebabMenuOptions = [
    {
      id: 'fullWidth',
      label: 'Pleine largeur',
      icon: fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />,
      onClick: () => { 
        setFullWidth(!fullWidth); 
        // Ne pas fermer le menu ici
      },
      color: fullWidth ? '#10b981' : '#D4D4D4'
    }
  ];

  return (
    <header style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 16px', // padding réduit
      background: '#18181b',
      boxShadow: 'none',
      border: 'none',
      position: 'relative',
      zIndex: 100
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <LogoScrivia />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
        {/* Se connecter (si non connecté) */}
        {!isLoggedIn && (
          <Link href="https://scrivia.app" style={{
            color: '#e55a2c',
            background: 'none',
            fontWeight: 500,
            fontSize: 13,
            textDecoration: 'none',
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            letterSpacing: '0.01em',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid #e55a2c',
          }}
            onMouseOver={e => {
              e.currentTarget.style.color = '#ff6a00';
              e.currentTarget.style.borderColor = '#ff6a00';
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = '#e55a2c';
              e.currentTarget.style.borderColor = '#e55a2c';
            }}
          >
            Connexion
          </Link>
        )}
        {/* Partager */}
        <button
          onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
          title="Partager cette page"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Noto Sans, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#D4D4D4';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#D4D4D4';
          }}
        >
          <FiShare2 size={18} />
        </button>
        
        {/* Menu de partage */}
        <ShareMenu
          url={typeof window !== 'undefined' ? window.location.href : ''}
          title="Note Scrivia"
          description="Découvrez cette note créée avec Scrivia"
          isOpen={isShareMenuOpen}
          onClose={() => setIsShareMenuOpen(false)}
        />
        {/* Favori */}
        <button
          title="Ajouter aux favoris"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: isFavorite ? '#FFD600' : '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Noto Sans, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
          }}
          onClick={() => setIsFavorite(fav => !fav)}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = isFavorite ? '#FFD600' : '#D4D4D4';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = isFavorite ? '#FFD600' : '#D4D4D4';
          }}
        >
          {isFavorite ? <FiStar size={18} fill="#FFD600" color="#FFD600" /> : <FiStar size={18} />}
        </button>
        {/* Options */}
        <button
          onClick={() => setIsKebabMenuOpen(!isKebabMenuOpen)}
          title="Options"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Noto Sans, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#D4D4D4';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#D4D4D4';
          }}
        >
          <FiMoreHorizontal size={18} />
        </button>

        {/* Menu kebab */}
        {isKebabMenuOpen && (
          <>
            {/* Overlay pour fermer le menu */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
              onClick={() => setIsKebabMenuOpen(false)}
            />
            
            {/* Menu kebab */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: '#1a1a1c',
                border: '1px solid #2a2a2c',
                borderRadius: 12,
                padding: '6px 0',
                minWidth: 200,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                zIndex: 1000,
                backdropFilter: 'blur(10px)'
              }}
            >
              {kebabMenuOptions.map((option, index) => (
                <div key={option.id}>
                  <button
                    onClick={option.onClick}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      color: option.color,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
                      borderRadius: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {option.icon}
                      {option.label}
                    </div>
                    {fullWidth && <FiCheck size={16} color="#10b981" />}
                  </button>
                  
                  {/* Séparateur élégant entre les options (sauf pour la dernière) */}
                  {index < kebabMenuOptions.length - 1 && (
                    <div
                      style={{
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent 0%, #2a2a2c 20%, #2a2a2c 80%, transparent 100%)',
                        margin: '0 16px',
                        opacity: 0.6
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}


      </div>
    </header>
  );
}

export default Header; 