'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageContext } from '../contexts/LanguageContext';
import LogoScrivia from '@/components/LogoScrivia';

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
        <LogoScrivia size={36} color="white" />
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