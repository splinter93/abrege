import React from 'react';

export default function LogoScrivia() {
  return (
    <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
      <img
        src="/logo%20scrivia.png"
        alt="Scrivia Logo"
        style={{ height: '23px', maxHeight: '28px', width: 'auto', display: 'block' }}
      />
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.18)',
        pointerEvents: 'none',
        borderRadius: 4,
      }} />
    </div>
  );
} 