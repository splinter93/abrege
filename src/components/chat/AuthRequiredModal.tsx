'use client';

/**
 * Modale affichée quand l'utilisateur n'est pas connecté.
 * Fond flouté, CTA vers /auth. Remplace l'ancien bandeau dans la zone input.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import './AuthRequiredModal.css';

interface AuthRequiredModalProps {
  isOpen: boolean;
}

const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="auth-required-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-required-title">
      <div className="auth-required-modal">
        <h2 id="auth-required-title" className="auth-required-modal-title">
          Connexion requise
        </h2>
        <p className="auth-required-modal-text">
          Connectez-vous pour utiliser le chat et les outils.
        </p>
        <Link href="/auth" className="auth-required-modal-button">
          <LogIn size={18} aria-hidden />
          Se connecter
        </Link>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AuthRequiredModal;
