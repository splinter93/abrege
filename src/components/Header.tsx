'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageContext } from '../contexts/LanguageContext';

const Header: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { t } = useLanguageContext();
  return (
    <header style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 32px 10px 24px',
      background: 'none',
      boxShadow: 'none',
      border: 'none',
      position: 'relative',
      zIndex: 100
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-hover)" />
              <stop offset="100%" stopColor="var(--accent-primary)" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#logoGradient)" />
          <path d="M17 7L7 17M7 11v6h6" stroke="var(--bg-main)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          background: 'linear-gradient(to bottom right, var(--accent-hover), var(--accent-primary))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          textTransform: 'lowercase',
          fontWeight: 600,
          fontSize: 20,
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif'
        }}>abrège</span>
      </Link>
      <button
        onClick={onLogout}
        style={{
          background: 'none',
          border: 'none',
          color: '#b3a9a0',
          fontWeight: 400,
          fontSize: 16,
          cursor: 'pointer',
          marginRight: 0,
          padding: 0,
          borderRadius: 0,
          boxShadow: 'none',
          fontFamily: 'Noto Sans, sans-serif',
          transition: 'color 0.2s'
        }}
        onMouseOver={e => (e.currentTarget.style.color = '#fff')}
        onMouseOut={e => (e.currentTarget.style.color = '#b3a9a0')}
      >
        {t('nav.logout')}
      </button>
    </header>
  );
};

export default Header; 