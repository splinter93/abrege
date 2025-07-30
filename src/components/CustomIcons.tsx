import React from 'react';

export const FolderIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e55a2c" />
        <stop offset="100%" stopColor="#d14a1c" />
      </linearGradient>
    </defs>
    {/* Dossier macOS style */}
    <path
      d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      fill="url(#folderGradient)"
      stroke="url(#folderGradient)"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Détail du pli */}
    <path
      d="M9 5l2 3h8"
      stroke="url(#folderGradient)"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Page principale horizontale */}
    <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#232323" stroke="#222" strokeWidth="1.2" />
    {/* Plume orange en petit, coin supérieur droit */}
    <g transform="translate(17 6) scale(0.4)">
      <defs>
        <linearGradient id="logoGradientFile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-hover)" />
          <stop offset="100%" stopColor="var(--accent-primary)" />
        </linearGradient>
      </defs>
      <path d="M20.62,2.62a1,1,0,0,0-1.41,0L3,18.83l-1.41-1.42a1,1,0,0,0-1.42,1.42l3.54,3.53a1,1,0,0,0,1.41,0L20.62,4A1,1,0,0,0,20.62,2.62ZM6.22,21.22l-1-1,10-10,1,1Z" fill="url(#logoGradientFile)" />
    </g>
    {/* Lignes d'écriture horizontales */}
    <rect x="6" y="8" width="12" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
    <rect x="6" y="10" width="9" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
    <rect x="6" y="12" width="7" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
  </svg>
); 