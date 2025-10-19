'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  number: string | number;
  label: string;
}

interface UnifiedPageTitleProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  stats?: StatItem[];
  action?: React.ReactNode; // Action button ou autre élément à droite
  className?: string;
  initialAnimation?: boolean;
}

/**
 * Composant de titre uniforme pour toutes les pages de la sidebar
 * Applique le même style que le dashboard avec bloc icône à gauche
 */
const UnifiedPageTitle: React.FC<UnifiedPageTitleProps> = ({
  icon: Icon,
  title,
  subtitle,
  stats = [],
  action,
  className = '',
  initialAnimation = true
}) => {
  const containerClass = `unified-page-title-container ${className}`.trim();
  
  const content = (
    <div className="unified-page-title-content">
      {/* Bloc icône à gauche - style identique au dashboard */}
      <div className="unified-page-title-logo">
        <Icon size={40} />
      </div>
      
      {/* Section titre */}
      <div className="unified-page-title-section">
        <h1 className="unified-page-title-text">{title}</h1>
        {subtitle && <p className="unified-page-title-subtitle">{subtitle}</p>}
      </div>

      {/* Statistiques à droite */}
      {stats.length > 0 && (
        <div className="unified-page-title-stats">
          {stats.map((stat, index) => (
            <div key={index} className="unified-page-title-stat-item">
              <span className="unified-page-title-stat-number">{stat.number}</span>
              <span className="unified-page-title-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Action button ou autre à droite */}
      {action && (
        <div className="unified-page-title-action">
          {action}
        </div>
      )}
    </div>
  );

  if (initialAnimation) {
    return (
      <motion.div 
        className={containerClass}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={containerClass}>
      {content}
    </div>
  );
};

export default UnifiedPageTitle;
