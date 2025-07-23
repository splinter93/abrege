import React from 'react';

/**
 * LogoScrivia - Logo vectoriel Scrivia (plume dans un carré + texte)
 * @param size (hauteur en px, défaut 36)
 * @param color ("black" | "white", défaut "black")
 * @param showText (affiche le texte Scrivia, défaut true)
 */
const LogoScrivia: React.FC<{ size?: number; color?: 'black' | 'white'; showText?: boolean }> = ({ size = 36, color = 'black', showText = true }) => {
  const fill = color === 'white' ? '#fff' : '#111';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: showText ? 12 : 0 }}>
      <svg height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <rect x="7" y="7" width="38" height="38" rx="6" stroke={fill} strokeWidth="5" fill="none" />
        <path d="M40 13C36 18 28 32 22 44C21.5 45 22.5 46 23.5 45.5C35 39 44 28 47 22C47.5 21 46.5 20 45.5 20.5C44 21.5 41.5 23.5 39 27C36.5 30.5 34 35 32 39C31.5 40 32.5 41 33.5 40.5C38 38 44 32 48 25" stroke={fill} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {showText && (
        <span style={{
          color: fill,
          fontFamily: 'Noto Sans, Inter, Arial, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.8,
          letterSpacing: 0.5,
          userSelect: 'none',
        }}>
          Scrivia
        </span>
      )}
    </div>
  );
};

export default LogoScrivia; 