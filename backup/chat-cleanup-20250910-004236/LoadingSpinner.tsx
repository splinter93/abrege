'use client';
import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'dots' | 'pulse' | 'spinner';
  color?: string;
}

/**
 * Composant LoadingSpinner standardisé et réutilisable
 * Fournit différents styles de loading pour une expérience cohérente
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 16,
  className = '',
  variant = 'default',
  color = 'currentColor'
}) => {
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="loading-dots" style={{ color }}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        );
      
      case 'pulse':
        return (
          <div className="loading-pulse" style={{ color }}>
            <div className="pulse-circle"></div>
          </div>
        );
      
      case 'spinner':
        return (
          <svg 
            className="loading-spinner" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={color} 
            strokeWidth="2"
          >
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              strokeDasharray="31.416" 
              strokeDashoffset="31.416"
            >
              <animate 
                attributeName="stroke-dasharray" 
                dur="2s" 
                values="0 31.416;15.708 15.708;0 31.416" 
                repeatCount="indefinite"
              />
              <animate 
                attributeName="stroke-dashoffset" 
                dur="2s" 
                values="0;-15.708;-31.416" 
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        );
      
      default:
        return (
          <svg 
            className="loading-default" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={color} 
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        );
    }
  };

  return (
    <div className={`loading-spinner-container ${className}`}>
      {renderSpinner()}
    </div>
  );
};

export default LoadingSpinner; 