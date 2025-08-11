'use client';
import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import './Sidebar.css';

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9,22 9,12 15,12 15,22"></polyline>
  </svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
    <polyline points="16,6 12,2 8,6"></polyline>
    <line x1="12" y1="2" x2="12" y2="15"></line>
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14,2 14,8 20,8"></polyline>
  </svg>
);

/* Icônes supprimées - plus utilisées */

const AccountIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

interface SidebarProps {
  onToggleFoldersPanel?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggleFoldersPanel = () => {} }) => {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-main-content">
        {/* Logo supprimé pour la page dossiers */}
        
        {/* -- Navigation principale -- */}
        <div className="sidebar-block">
          <nav className="sidebar-nav">
            <Link href="/" className="nav-link">
              <HomeIcon />
              <span>Accueil</span>
            </Link>
            <Link href="/private/dossiers" className="nav-link">
              <FolderIcon />
              <span>Mes Classeurs</span>
            </Link>
            <Link href="/private/shared" className="nav-link">
              <ShareIcon />
              <span>Notes Partagées</span>
            </Link>
            <Link href="/private/favorites" className="nav-link">
              <StarIcon />
              <span>Favoris</span>
            </Link>
            <Link href="/private/files" className="nav-link">
              <FileIcon />
              <span>Mes Fichiers</span>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* -- Compte Utilisateur (tout en bas) -- */}
      <div className="sidebar-footer">
        <Link href="/private/account" className="nav-link">
          <AccountIcon />
          <span>Mon Compte</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
