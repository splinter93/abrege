/**
 * CraftedButton - Badge "Crafted with Scrivia" en bas à droite
 * Visible en mode preview uniquement
 */

import React from 'react';
import { FiFeather } from 'react-icons/fi';
import Link from 'next/link';
import './crafted-button.css';

const CraftedButton: React.FC = () => {
  return (
    <Link 
      href="/" 
      className="crafted-button"
      target="_blank"
      rel="noopener noreferrer"
      title="Créé avec Scrivia"
    >
      <FiFeather size={14} className="crafted-icon" />
      <span className="crafted-text">Crafted with Scrivia</span>
    </Link>
  );
};

export default CraftedButton;

