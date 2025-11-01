/**
 * CenteredLoadingState - État de chargement centré et propre
 * Roue de chargement + texte simple
 */

import React from 'react';
import './CenteredLoadingState.css';

interface CenteredLoadingStateProps {
  message?: string;
}

const CenteredLoadingState: React.FC<CenteredLoadingStateProps> = ({ message = 'Chargement' }) => {
  return (
    <div className="centered-loading-container">
      <div className="centered-loading-content">
        {/* Spinner simple */}
        <div className="centered-loading-spinner">
          <svg className="spinner-svg" viewBox="0 0 50 50">
            <circle
              className="spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              strokeWidth="3"
            />
          </svg>
        </div>
        
        {/* Message */}
        <p className="centered-loading-message">{message}</p>
      </div>
    </div>
  );
};

export default CenteredLoadingState;

