"use client";

import React from 'react';
import { motion } from 'framer-motion';
import './LoadingPage.css';

interface LoadingPageProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'glassmorphism' | 'minimal';
  showSpinner?: boolean;
  showMessage?: boolean;
  className?: string;
}

/**
 * Composant de chargement standardisé pour toutes les pages
 * Design unifié avec roue de chargement au-dessus et message en dessous
 */
const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Chargement...',
  size = 'medium',
  variant = 'glassmorphism',
  showSpinner = true,
  showMessage = true,
  className = ''
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'loading-page-small';
      case 'large':
        return 'loading-page-large';
      default:
        return 'loading-page-medium';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'loading-page-minimal';
      case 'default':
        return 'loading-page-default';
      default:
        return 'loading-page-glassmorphism';
    }
  };

  return (
    <motion.div
      className={`loading-page ${getSizeClasses()} ${getVariantClasses()} ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="loading-page-content">
        {showSpinner && (
          <motion.div
            className="loading-spinner-container"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <div className="loading-spinner"></div>
          </motion.div>
        )}
        
        {showMessage && (
          <motion.p
            className="loading-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default LoadingPage; 