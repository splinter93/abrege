'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StatItem {
  number: string | number;
  label: string;
}

interface PageTitleSimpleProps {
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  className?: string;
  loading?: boolean;
}

/**
 * Composant de titre simple unifié pour toutes les pages
 * Design cohérent sans encadré glass, avec stats optionnelles à droite
 */
const PageTitleSimple: React.FC<PageTitleSimpleProps> = ({
  title,
  subtitle,
  stats = [],
  className = '',
  loading = false
}) => {
  return (
    <motion.header 
      className={`page-title-simple ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="page-title-simple-content">
        <div className="page-title-simple-left">
          <h1 className="page-title-simple-title">{title}</h1>
          {subtitle && (
            <p className="page-title-simple-subtitle">{subtitle}</p>
          )}
        </div>
        {stats.length > 0 && (
          <div className="page-title-simple-stats">
            {stats.map((stat, index) => (
              <div key={index} className="page-title-simple-stat-item">
                <span className="page-title-simple-stat-number">
                  {loading ? '...' : stat.number}
                </span>
                <span className="page-title-simple-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default PageTitleSimple;
