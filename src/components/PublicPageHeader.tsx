'use client';

import React from 'react';
import Link from 'next/link';
import LogoScrivia from '@/components/LogoScrivia';
import { FiShare2, FiStar, FiMoreHorizontal, FiMaximize2, FiMinimize2, FiSearch } from 'react-icons/fi';
import { supabase } from '@/supabaseClient';
import ShareMenu from './ShareMenu';
import '@/styles/typography.css';

export default function PublicPageHeader() {
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

  // Fermer le menu kebab quand on clique à l'extérieur
  React.useEffect(() => {
    if (!isKebabMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.public-kebab-menu') && !target.closest('button[title="Options"]')) {
        setIsKebabMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isKebabMenuOpen]);



  return (
    <header className="public-page-header">

      <div className="public-header-left">
        <Link href="/" className="public-header-logo">
          <LogoScrivia />
        </Link>
        <div className="public-header-search">
          <FiSearch size={15} className="public-header-search-icon" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="public-header-search-input"
          />
        </div>
      </div>
      <div className="public-header-buttons">
        {/* Se connecter (si non connecté) */}
        {!isLoggedIn && (
          <Link href="https://scrivia.app" className="public-header-login">
            Connexion
          </Link>
        )}
        {/* Partager */}
        <button
          onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
          title="Partager cette page"
          className="public-header-button"
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
          className="public-header-button"
          onClick={() => setIsFavorite(fav => !fav)}
        >
          {isFavorite ? <FiStar size={18} fill="#FFD600" color="#FFD600" /> : <FiStar size={18} />}
        </button>
        {/* Options */}
        <button
          onClick={() => setIsKebabMenuOpen(!isKebabMenuOpen)}
          title="Options"
          className="public-header-button"
        >
          <FiMoreHorizontal size={18} />
        </button>
        
        {/* Menu kebab simple */}
        {isKebabMenuOpen && (
          <div className="public-kebab-menu">
            <div className="public-kebab-menu-item" onClick={() => {
              setFullWidth(!fullWidth);
              setIsKebabMenuOpen(false);
            }}>
              {fullWidth ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
              <span>{fullWidth ? 'Mode normal' : 'Pleine largeur'}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 