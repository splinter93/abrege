'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import LogoHeader from '@/components/LogoHeader';
import './verify-email.css';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Email de vérification envoyé ! Vérifiez votre boîte de réception.');
      }
    } catch (err: any) {
      setError('Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToAuth = () => {
    router.push('/auth');
  };

  return (
    <div className="verify-email-page">
      <div className="verify-email-container">
        <div className="verify-email-header">
          <LogoHeader size="large" position="center" />
          <h1 className="verify-email-title">Vérifiez votre email</h1>
          <p className="verify-email-subtitle">
            Nous avons envoyé un lien de vérification à votre adresse email.
            Cliquez sur ce lien pour activer votre compte.
          </p>
        </div>

        <div className="verify-email-content">
          <div className="email-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="verify-email-actions">
            <button
              className="verify-email-back-btn"
              onClick={handleBackToAuth}
            >
              Retour à la connexion
            </button>

            <div className="verify-email-divider">
              <span>ou</span>
            </div>

            <form onSubmit={handleResendEmail} className="resend-form">
              <div className="form-group">
                <label htmlFor="resend-email">Renvoyer l'email de vérification</label>
                <input
                  id="resend-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="verify-email-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="verify-email-success">
                  {message}
                </div>
              )}

              <button
                type="submit"
                className="resend-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  'Renvoyer l\'email'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="verify-email-footer">
          <p>
            Pas reçu l'email ? Vérifiez votre dossier spam ou
            <button
              className="verify-email-help-btn"
              onClick={() => setEmail('')}
            >
              contactez le support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 