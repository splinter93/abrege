'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguageContext } from '../contexts/LanguageContext';
import LogoScrivia from '@/components/LogoScrivia';
import { FiShare2 } from 'react-icons/fi';

const Header: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { t } = useLanguageContext();
  return (
    <header style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 32px', // padding réduit
      background: 'none',
      boxShadow: 'none',
      border: 'none',
      position: 'relative',
      zIndex: 100
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <LogoScrivia />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          title="Partager cette page"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: '#fff',
            width: 36,
            height: 36,
            borderRadius: '50%',
            transition: 'background 0.18s, color 0.18s',
            boxShadow: 'none',
            fontFamily: 'Noto Sans, sans-serif',
            outline: 'none',
            fontSize: 0,
            cursor: 'pointer',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(229,90,44,0.13)';
            e.currentTarget.style.color = '#e55a2c';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#fff';
          }}
        >
          <FiShare2 size={18} />
        </button>
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontWeight: 400,
            fontSize: 16,
            cursor: 'pointer',
            marginRight: 0,
            padding: 0,
            borderRadius: 0,
            boxShadow: 'none',
            fontFamily: 'Noto Sans, sans-serif',
            transition: 'color 0.2s, text-decoration 0.2s',
            textDecoration: 'none',
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          {t('nav.logout')}
        </button>
      </div>
    </header>
  );
}

export default Header; 