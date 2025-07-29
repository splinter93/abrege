'use client';

import React from 'react';
import Link from 'next/link';
import LogoScrivia from '@/components/LogoScrivia';
import '@/styles/typography.css';

export default function PublicPageHeader() {
  return (
    <header className="public-page-header">
      <Link href="/" className="public-header-logo">
        <LogoScrivia />
      </Link>
      <div className="public-header-buttons">
        <Link href="https://scrivia.app" className="public-header-login">
          Connexion
        </Link>
      </div>
    </header>
  );
} 