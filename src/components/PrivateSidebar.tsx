"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Book, Share, Star, File, User, Settings, LogOut } from 'lucide-react';
import './PrivateSidebar.css';

const navItems = [
  { href: '/private/dossiers', icon: Book, label: 'Mes Classeurs' },
  { href: '/private/shared', icon: Share, label: 'Notes Partagées' },
  { href: '/private/favorites', icon: Star, label: 'Favoris' },
  { href: '/private/files', icon: File, label: 'Mes Fichiers' },
];

const PrivateSidebar = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname.startsWith(href);
  };

  return (
    <aside className="private-sidebar">
      <div className="private-sidebar-nav">
        <nav className="private-sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={`private-nav-link ${isActive(item.href) ? 'active' : ''}`}>
                  <item.icon size={20} className="private-nav-icon" />
                  <span className="private-nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="private-sidebar-bottom">
        <ul>
          <li>
            <Link href="/private/account" className={`private-nav-link ${isActive('/private/account') ? 'active' : ''}`}>
              <User size={20} className="private-nav-icon" />
              <span className="private-nav-label">Mon Compte</span>
            </Link>
          </li>
          <li>
            <Link href="/private/settings" className={`private-nav-link ${isActive('/private/settings') ? 'active' : ''}`}>
              <Settings size={20} className="private-nav-icon" />
              <span className="private-nav-label">Réglages</span>
            </Link>
          </li>
          <li className="logout-item">
            <button className="private-nav-link private-logout-button">
              <LogOut size={20} className="private-nav-icon" />
              <span className="private-nav-label">Déconnexion</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default PrivateSidebar; 