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
    <path
      d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      fill="#E65100"
      stroke="#E65100"
      strokeWidth="1.5"
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
    {/* Page principale simple */}
    <rect x="4" y="3" width="16" height="18" rx="2.5" fill="#232323" stroke="#222" strokeWidth="1.2" />
    {/* Logo abrège original en petit, coin supérieur droit */}
    <g transform="translate(15 4) scale(0.38)">
      <defs>
        <linearGradient id="logoGradientFile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-hover)" />
          <stop offset="100%" stopColor="var(--accent-primary)" />
        </linearGradient>
      </defs>
      <rect width="16" height="16" rx="4" fill="url(#logoGradientFile)" />
      <path d="M11.33 4.67L4.67 11.33M4.67 7.33v4h4" stroke="var(--bg-main)" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    {/* Lignes d'écriture */}
    <rect x="7" y="16" width="10" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
    <rect x="7" y="18" width="7" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
    <rect x="7" y="20" width="5" height="1.1" rx="0.55" fill="#fff" fillOpacity="0.18" />
  </svg>
); 