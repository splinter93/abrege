'use client';

/**
 * Modale affichée quand l'utilisateur n'est pas connecté.
 * Fond flouté, CTA vers /auth. Clic overlay ou Escape = ferme.
 */

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import './AuthRequiredModal.css';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ isOpen, onClose }) => {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="auth-required-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-required-title"
      onClick={onClose}
    >
      <div
        className="auth-required-modal"
        onClick={e => e.stopPropagation()}
      >
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
