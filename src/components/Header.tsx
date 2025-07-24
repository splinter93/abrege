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

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Appliquer la largeur pleine au contenu de la page
  React.useEffect(() => {
    // Cibler le conteneur principal qui englobe titre et contenu
    const mainContainer = document.querySelector('div[style*="maxWidth: 750"][style*="width: 750"]');
    
    if (mainContainer) {
      if (fullWidth) {
        (mainContainer as HTMLElement).style.maxWidth = '1000px';
        (mainContainer as HTMLElement).style.width = '1000px';
      } else {
        (mainContainer as HTMLElement).style.maxWidth = '750px';
        (mainContainer as HTMLElement).style.width = '750px';
      }
    }
    
    // Ajuster le contenu markdown
    const contentElements = document.querySelectorAll('.markdown-body');
    contentElements.forEach((element) => {
      if (fullWidth) {
        (element as HTMLElement).style.maxWidth = '1000px';
        (element as HTMLElement).style.width = '1000px';
      } else {
        (element as HTMLElement).style.maxWidth = '750px';
        (element as HTMLElement).style.width = '750px';
      }
    });

    // Ajuster les titres H1 spécifiquement
    const titleElements = document.querySelectorAll('h1');
    titleElements.forEach((element) => {
      const style = (element as HTMLElement).style;
      if (style.maxWidth && style.width) {
        if (fullWidth) {
          style.maxWidth = '1000px';
          style.width = '1000px';
        } else {
          style.maxWidth = '750px';
          style.width = '750px';
        }
      }
    });
  }, [fullWidth]);

  const kebabMenuOptions = [
    {
      id: 'fullWidth',
      label: 'Pleine largeur',
      icon: fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />,
      onClick: () => { 
        setFullWidth(!fullWidth); 
        setIsKebabMenuOpen(false); 
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
          <Link href="/login" style={{
            color: '#fff',
            background: 'linear-gradient(135deg, rgba(229,90,44,0.15) 0%, rgba(255,106,0,0.1) 100%)',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
            fontSize: 14,
            textDecoration: 'none',
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            letterSpacing: '0.01em',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            border: '1px solid rgba(229,90,44,0.2)',
          }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(229,90,44,0.25) 0%, rgba(255,106,0,0.2) 100%)';
              e.currentTarget.style.border = '1px solid rgba(229,90,44,0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(229,90,44,0.15) 0%, rgba(255,106,0,0.1) 100%)';
              e.currentTarget.style.border = '1px solid rgba(229,90,44,0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Se connecter
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
            e.currentTarget.style.background = 'rgba(229,90,44,0.13)';
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Noto Sans, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(229,90,44,0.13)';
            e.currentTarget.style.color = '#D4D4D4';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#D4D4D4';
          }}
        >
          <FiStar size={18} />
        </button>
        {/* Options */}
        <button
          onClick={() => setIsKebabMenuOpen(!isKebabMenuOpen)}
          title="Options"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#D4D4D4', width: 36, height: 36, borderRadius: '50%', transition: 'background 0.18s, color 0.18s', boxShadow: 'none', fontFamily: 'Noto Sans, sans-serif', outline: 'none', fontSize: 0, cursor: 'pointer',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(229,90,44,0.13)';
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