import React from 'react';
import { Feather } from 'react-feather';

export const FolderIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Dossier avec design moderne */}
    <path
      d="M3 7a2 2 0 0 1 2-2h4.586a2 2 0 0 1 1.414.586L12 7h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
      stroke="#fb923c"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Ligne de pliure du dossier */}
    <path
      d="M7 5l5 2h5"
      stroke="#fb923c"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const FileIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <Feather size={size} className={className} />
); 