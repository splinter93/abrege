'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface SidebarToggleProps {
  onClick: () => void;
  isOpen?: boolean;
}

const SidebarToggle: React.FC<SidebarToggleProps> = ({ onClick, isOpen = false }) => {
  return (
    <motion.button
      className="sidebar-toggle-btn"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300 }}
      aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
    >
      <div className={`hamburger ${isOpen ? 'active' : ''}`}>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </motion.button>
  );
};

export default SidebarToggle;


