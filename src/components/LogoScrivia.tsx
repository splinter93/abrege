import React from 'react';
import Link from 'next/link';

interface LogoScriviaProps {
  width?: number;
}

export default function LogoScrivia({ width = 200 }: LogoScriviaProps) {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <div style={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 0 0 12px', 
        cursor: 'pointer',
        height: '100%'
      }}>
        <img
          src="/logo-scrivia-white.png"
          alt="Scrivia Logo"
          style={{ 
            height: 'auto', 
            width: `${width}px`, 
            display: 'block',
            maxHeight: '32px'
          }}
        />
      </div>
    </Link>
  );
} 