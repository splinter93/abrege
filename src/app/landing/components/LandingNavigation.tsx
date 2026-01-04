'use client';

import Link from 'next/link';

export default function LandingNavigation() {
  return (
    <nav 
      className="fixed w-full z-50 top-0 transition-all duration-300 glass-nav"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors duration-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8L2 22" stroke="#FF5722" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight text-textMain group-hover:text-white transition-colors">Scrivia</span>
        </Link>
        
        {/* Menu */}
        <div className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.1em] text-textMuted font-semibold">
          <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How it works</a>
          <a href="#use-cases" className="hover:text-white transition-colors duration-200">Use Cases</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-200">Pricing</a>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-5">
          <Link href="/auth" className="text-xs uppercase tracking-[0.1em] font-semibold text-textMuted hover:text-white transition-colors hidden sm:block">
            Log in
          </Link>
          <Link href="/auth" className="btn-primary text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded transition-all">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

