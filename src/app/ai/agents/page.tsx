/**
 * Page de gestion des agents et templates
 * ⚠️ DEPRECATED: Redirige vers /private/agents
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Rediriger vers la nouvelle page agents
    router.replace('/private/agents');
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
        <p>Redirection vers la nouvelle page agents...</p>
      </div>
    </div>
  );
}
