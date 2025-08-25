"use client";

import React from 'react';
import { motion } from 'framer-motion';
import './PageLoading.css';

interface PageLoadingProps {
  message?: string;
  theme?: 'dossiers' | 'files' | 'trash' | 'default';
  className?: string;
}

/**
 * Composant de chargement minimaliste pour les pages
 * Roue de chargement au-dessus, message "Chargement" en dessous
 */
const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Chargement',
  theme = 'default',
  className = ''
}) => {
  return (
    <motion.div
      className={`page-loading page-loading-${theme} ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-loading-content">
        {/* Roue de chargement au-dessus */}
        <motion.div
          className="page-loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Message "Chargement" en dessous */}
        <motion.p
          className="page-loading-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default PageLoading; 