'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useActiveSidebarLink } from '@/hooks/useActiveSidebarLink';
import { motion } from 'framer-motion';
import { Feather } from 'react-feather';

// Icônes SVG optimisées
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
  </svg>
);

const TeamIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14,2 14,8 20,8"/>
  </svg>
);

const AccountIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const DocumentationIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const AgentsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Tête de robot */}
    <rect x="4" y="8" width="16" height="12" rx="2" />
    {/* Yeux */}
    <circle cx="9" cy="13" r="1.5" fill="currentColor" />
    <circle cx="15" cy="13" r="1.5" fill="currentColor" />
    {/* Antenne */}
    <path d="M12 8V5" />
    <circle cx="12" cy="4" r="1" fill="currentColor" />
    {/* Bouche */}
    <path d="M9 17h6" />
  </svg>
);

const PromptsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);


interface UnifiedSidebarProps {
  isOpen?: boolean;
  isDesktop?: boolean;
  onClose?: () => void;
  className?: string;
}

const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({ 
  isOpen = true, 
  isDesktop = true, 
  onClose = () => {},
  className = ''
}) => {
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const activeLink = useActiveSidebarLink();
  
  // État pour la sidebar rétractable
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Gestion du hover pour déployer/réduire
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsCollapsed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Petit délai pour éviter les fermetures accidentelles
    hoverTimeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 150);
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🔧 Déconnexion: Tentative de déconnexion...');
      
      // Déconnexion directe avec le client Supabase existant
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔧 Déconnexion: Erreur lors de la déconnexion:', error.message);
        // Même en cas d'erreur, on redirige pour s'assurer que l'utilisateur est déconnecté
      } else {
        console.log('🔧 Déconnexion: Déconnexion réussie');
      }
      
      // Rediriger vers la page d'accueil dans tous les cas
      router.push('/');
      
    } catch (error) {
      console.error('🔧 Déconnexion: Erreur inattendue:', error);
      // Même en cas d'erreur, on redirige
      router.push('/');
    }
  };

  // Navigation items principaux
  const navigationItems = [
    { href: '/', label: 'Dashboard', icon: DashboardIcon, key: 'home' },
    { href: '/private/dossiers', label: 'Mes Classeurs', icon: FolderIcon, key: 'dossiers' },
    { href: '/private/files', label: 'Mes Fichiers', icon: FileIcon, key: 'files' },
    { href: '/private/agents2', label: 'Agents v2', icon: AgentsIcon, key: 'agents2' },
    { href: '/private/prompts', label: 'Prompts', icon: PromptsIcon, key: 'prompts' },
    { href: '/private/shared', label: 'TeamMates', icon: TeamIcon, key: 'shared' },
    { href: '/private/documentation', label: 'Documentation', icon: DocumentationIcon, key: 'documentation' },
    { href: '/private/settings', label: 'Paramètres', icon: SettingsIcon, key: 'settings' },
    { href: '/private/trash', label: 'Corbeille', icon: TrashIcon, key: 'trash' },
  ];

  // Items du bas (Mon Compte et Déconnexion)
  const bottomItems = [
    { href: '/private/account', label: 'Mon Compte', icon: AccountIcon, key: 'account' },
  ];

  return (
      <aside 
        className={`unified-sidebar ${isOpen ? 'open' : 'closed'} ${isDesktop ? 'desktop' : 'mobile'} ${isCollapsed ? 'collapsed' : ''} ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      <div className="unified-sidebar-content">
        {/* Header Sidebar (Workspace Switcher) */}
        <div className="h-14 px-3 flex items-center shrink-0 hover:bg-white/[0.03] cursor-pointer transition-colors group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[#141414] border border-white/[0.1] shadow-sm flex items-center justify-center text-neutral-300 group-hover:text-white group-hover:border-white/[0.2] transition-colors">
                <Feather className="w-3.5 h-3.5" />
              </div>
              {!isCollapsed && (
                <span className="text-[14px] font-medium tracking-tight text-neutral-200 group-hover:text-white transition-colors">
                  Scrivia
                </span>
              )}
            </div>
            {!isCollapsed && (
              <ChevronsUpDown className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0" />
            )}
          </div>
        </div>

        {/* Navigation principale */}
        <motion.div 
          className="unified-sidebar-section unified-sidebar-nav-main"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <nav className="unified-sidebar-nav">
            {navigationItems.map((item) => (
              <motion.div
                key={item.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link 
                  href={item.href} 
                  className={`unified-nav-link ${activeLink === item.key ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  onClick={onClose}
                >
                  <item.icon />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </motion.div>
            ))}
          </nav>
        </motion.div>

        {/* Section bas : Mon Compte et Déconnexion */}
        <motion.div 
          className="unified-sidebar-section unified-sidebar-nav-bottom"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <nav className="unified-sidebar-nav">
            {bottomItems.map((item) => (
              <motion.div
                key={item.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Link 
                  href={item.href} 
                  className={`unified-nav-link ${activeLink === item.key ? 'active' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                  onClick={onClose}
                >
                  <item.icon />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </motion.div>
            ))}
            <motion.button 
              onClick={() => { onClose(); handleLogout(); }} 
              className="unified-nav-link unified-logout-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
              title={isCollapsed ? "Déconnexion" : undefined}
            >
              <LogoutIcon />
              {!isCollapsed && <span>Déconnexion</span>}
            </motion.button>
          </nav>
        </motion.div>
      </div>
    </aside>
  );
};

export default UnifiedSidebar;
