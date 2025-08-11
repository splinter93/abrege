import React from 'react';
import Link from 'next/link';

interface LogoScriviaProps {
  width?: number;
}

export default function LogoScrivia({ width = 120 }: LogoScriviaProps) {
  return (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <div style={{ position: 'relative', display: 'inline-block', margin: '0', cursor: 'pointer' }}>
        <img
          src="/logo%20scrivia.png"
          alt="Scrivia Logo"
          style={{ height: 'auto', width: `${width}px`, display: 'block' }}
        />
      </div>
    </Link>
  );
} 