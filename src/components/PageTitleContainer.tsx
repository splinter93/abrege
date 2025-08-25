import React from 'react';
import { motion } from 'framer-motion';

interface PageTitleContainerProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  stats?: Array<{
    number: string | number;
    label: string;
  }>;
  className?: string;
  initialAnimation?: boolean;
}

/**
 * Composant réutilisable pour les containers de titre uniformes
 * Utilise le style glassmorphism uniforme défini dans page-title-containers.css
 */
export default function PageTitleContainer({
  icon,
  title,
  subtitle,
  stats,
  className = '',
  initialAnimation = true
}: PageTitleContainerProps) {
  const containerClass = `page-title-container-glass ${className}`.trim();
  
  const content = (
    <div className="page-title-content">
      <motion.div 
        className="page-title-icon-container"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <span className="page-title-icon">{icon}</span>
      </motion.div>
      
      <div className="page-title-section">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      
      {stats && stats.length > 0 && (
        <div className="page-title-stats">
          {stats.map((stat, index) => (
            <div key={index} className="page-title-stats-item">
              <span className="page-title-stats-number">{stat.number}</span>
              <span className="page-title-stats-label">{stat.label}</span>
            </div>
          ))}
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
} 