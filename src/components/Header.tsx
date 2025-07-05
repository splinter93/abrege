import React from 'react';
import Link from 'next/link';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <Link href="/" className="logo-link">
        <div className="logo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--accent-hover)" />
                <stop offset="100%" stopColor="var(--accent-primary)" />
              </linearGradient>
            </defs>
            <rect width="16" height="16" rx="4" fill="url(#logoGradient)" />
            <path d="M11.33 4.67L4.67 11.33M4.67 7.33v4h4" stroke="var(--bg-main)" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Abrège.</span>
        </div>
      </Link>
      {/* Navigation links or user profile can go here */}
    </header>
  );
};

export default Header; 