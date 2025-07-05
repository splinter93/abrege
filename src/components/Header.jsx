import React from 'react';
import Link from 'next/link';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <Link href="/" className="logo-link">
        <div className="logo">
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
          <span>Abrège.</span>
        </div>
      </Link>
      {/* Navigation links or user profile can go here */}
    </header>
  );
};

export default Header; 