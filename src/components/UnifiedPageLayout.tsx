'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';

interface UnifiedPageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Layout unifié pour toutes les pages avec sidebar
 * Applique le design glassmorphism moderne et cohérent
 */
const UnifiedPageLayout: React.FC<UnifiedPageLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`page-wrapper ${className}`}>
      {/* Sidebar fixe avec glassmorphism */}
      <aside className="page-sidebar-fixed">
        <Sidebar />
      </aside>

      {/* Zone de contenu principal */}
      <main className="page-content-area">
        <motion.div
          className="page-content-inner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default UnifiedPageLayout;