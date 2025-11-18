'use client';

import React from 'react';
import Link from 'next/link';

import LogoScrivia from '@/components/LogoScrivia';
import { FiShare2, FiStar, FiMoreHorizontal, FiMaximize2, FiMinimize2, FiCheck } from 'react-icons/fi';
import { supabase } from '@/supabaseClient';
import ShareMenu from './ShareMenu';

const Header: React.FC = () => {
  // const { t } = useLanguageContext();
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
    const markdown = mainContent?.querySelector('.markdown-body') as HTMLElement | null;
    if (mainContent) {
      mainContent.classList.add('smooth-transition');
      mainContent.style.maxWidth = fullWidth ? '1000px' : '750px';
      mainContent.style.width = fullWidth ? '1000px' : '750px';
      mainContent.style.margin = '0 auto';
      mainContent.style.flexShrink = '0';
      mainContent.style.alignSelf = 'center';
    }
    if (markdown) {
      markdown.classList.add('smooth-transition');
      if (fullWidth) {
        markdown.style.margin = '0';
        markdown.style.maxWidth = '1000px';
        markdown.style.width = '1000px';
      } else {
        markdown.style.margin = '0 auto';
        markdown.style.maxWidth = '750px';
        markdown.style.width = '750px';
      }
    }
    const title = mainContent?.querySelector('h1') as HTMLElement | null;
    if (title) {
      title.classList.add('smooth-transition');
    }
  }, [fullWidth]);

  const kebabMenuOptions = [
    {
      id: 'fullScreen',
      label: 'Quitter Plein écran',
      icon: <FiMinimize2 size={18} />,
      onClick: () => {
        // Logique pour quitter le plein écran
        console.log('Quitter plein écran');
      },
      color: '#D4D4D4'
    },
    {
      id: 'history',
      label: 'Historique des messages réglable',
      icon: <FiMoreHorizontal size={18} />,
      onClick: () => {
        // Logique pour l'historique des messages
        console.log('Historique des messages');
      },
      color: '#D4D4D4'
    },
    {
      id: 'model',
      label: 'Modèle: Groq Mixtral 8x7B',
      icon: <FiMoreHorizontal size={18} />,
      onClick: () => {
        // Logique pour afficher les détails du modèle
        console.log('Détails du modèle');
      },
      color: '#D4D4D4'
    },
    {
      id: 'provider',
      label: 'Provider: Groq',
      icon: <FiMoreHorizontal size={18} />,
      onClick: () => {
        // Logique pour afficher les détails du provider
        console.log('Détails du provider');
      },
      color: '#D4D4D4'
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
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <LogoScrivia />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
        {/* Se connecter (si non connecté) */}
        {!isLoggedIn && (
          <Link href="https://scrivia.app" style={{
            color: '#e55a2c',
            background: 'none',
            fontWeight: 500,
            fontSize: 13,
            textDecoration: 'none',
            fontFamily: 'Figtree, Geist, -apple-system, sans-serif',
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Figtree, Geist, -apple-system, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: isFavorite ? '#FFD600' : '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Figtree, Geist, -apple-system, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Figtree, Geist, -apple-system, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
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
                      fontFamily: 'Figtree, Geist, -apple-system, sans-serif',
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