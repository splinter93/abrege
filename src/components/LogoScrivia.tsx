import React from 'react';

interface LogoScriviaProps {
  width?: number;
}

export default function LogoScrivia({ width = 120 }: LogoScriviaProps) {
  return (
    <div style={{ position: 'relative', display: 'inline-block', margin: '0' }}>
      <img
        src="/logo%20scrivia.png"
        alt="Scrivia Logo"
        style={{ height: 'auto', width: `${width}px`, display: 'block' }}
      />
    </div>
  );
} 