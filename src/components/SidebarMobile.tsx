'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
const Sidebar: React.FC = () => null;

interface SidebarMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarMobile: React.FC<SidebarMobileProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
    } else {
      // Réactiver le scroll du body
      document.body.style.overflow = 'unset';
      // Délai pour permettre l'animation de sortie
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Fermer la sidebar si on clique sur l'overlay
  const handleOverlayClick = () => {
    onClose();
  };

  // Empêcher la propagation du clic sur la sidebar
  const handleSidebarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="chatgpt-sidebar-overlay visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleOverlayClick}
          />
          
          {/* Sidebar mobile */}
          <motion.div
            className="sidebar mobile-visible"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200 
            }}
            onClick={handleSidebarClick}
          >
            <Sidebar />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidebarMobile;


