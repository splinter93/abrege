/**
 * Page de gestion des prompts éditeur
 * ⚠️ DEPRECATED: Redirige vers /private/prompts
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PromptsPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/private/prompts');
  }, [router]);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '3px solid var(--accent-primary)', 
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <p>Redirection vers la nouvelle page prompts...</p>
      </div>
    </div>
  );
}


