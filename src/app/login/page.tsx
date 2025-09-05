'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger automatiquement vers /auth
    router.replace('/auth');
  }, [router]);

  return (
    <div className="login-redirect">
      <div className="login-redirect-content">
        <h1>Redirection...</h1>
        <p>Vous êtes redirigé vers la page de connexion.</p>
      </div>
    </div>
  );
}
