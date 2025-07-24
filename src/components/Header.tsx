'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageContext } from '../contexts/LanguageContext';
import LogoScrivia from '@/components/LogoScrivia';
import { FiShare2, FiStar, FiMoreHorizontal } from 'react-icons/fi';
import { supabase } from '@/supabaseClient';
import ShareMenu from './ShareMenu';

const Header: React.FC = () => {
  const { t } = useLanguageContext();
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

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
        {/* Se connecter (si non connecté) */}
        {!isLoggedIn && (
          <Link href="/login" style={{
            marginLeft: 12,
            color: '#fff',
            background: 'rgba(44,44,44,0.18)',
            borderRadius: 8,
            padding: '7px 18px',
            fontWeight: 500,
            fontSize: 15,
            textDecoration: 'none',
            fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
            letterSpacing: '0.01em',
            transition: 'background 0.18s, color 0.18s',
            display: 'flex', alignItems: 'center',
          }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(229,90,44,0.13)';
              e.currentTarget.style.color = '#e55a2c';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(44,44,44,0.18)';
              e.currentTarget.style.color = '#fff';
            }}
          >
            <span style={{ fontSize: 17, marginRight: 6, fontWeight: 400 }}>🔐</span>
            Se connecter
          </Link>
        )}
      </div>
    </header>
  );
}

export default Header; 