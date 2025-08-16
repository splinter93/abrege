import React from 'react';
import Link from 'next/link';
import './LogoHeader.css';

interface LogoHeaderProps {
  /**
   * Taille du logo
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'xl';
  
  /**
   * Position du logo dans le header
   * @default 'left'
   */
  position?: 'left' | 'center' | 'right';
  
  /**
   * URL de destination (désactive le lien si non fourni)
   * @default '/'
   */
  href?: string;
  
  /**
   * Classe CSS additionnelle
   */
  className?: string;
  
  /**
   * Fonction de clic personnalisée
   */
  onClick?: () => void;
  
  /**
   * Désactive le lien (affiche juste l'image)
   * @default false
   */
  noLink?: boolean;
}

export default function LogoHeader({
  size = 'medium',
  position = 'left',
  href = '/',
  className = '',
  onClick,
  noLink = false
}: LogoHeaderProps) {
  // Construire les classes CSS
  const logoClasses = [
    'logo-header',
    `size-${size}`,
    `position-${position}`,
    className
  ].filter(Boolean).join(' ');

  // Contenu du logo
  const logoContent = (
    <div className={logoClasses} onClick={onClick}>
      <img
        src="/logo-scrivia-white.png"
        alt="Scrivia Logo"
        draggable={false}
      />
    </div>
  );

  // Si pas de lien, retourner juste le contenu
  if (noLink) {
    return logoContent;
  }

  // Si fonction onClick personnalisée, wrapper dans un div cliquable
  if (onClick) {
    return logoContent;
  }

  // Sinon, wrapper dans un lien
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {logoContent}
    </Link>
  );
} 