'use client';

import React, { useState, useEffect } from 'react';
import ContentCard from '../../components/ContentCard';
import { useLanguageContext } from '../../contexts/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../supabaseClient';
import '../globals.css';

const mockNotes = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    category: 'Résumé',
    title: 'Résumé LLM – Rapport Q2',
    source: 'Rapport Q2',
    duration: '2 min',
    readTime: '1 min',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    category: 'Veille',
    title: 'Veille IA – Juin',
    source: 'Veille mensuelle',
    duration: '3 min',
    readTime: '2 min',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
    category: 'Collab',
    title: 'Note collaborative',
    source: 'Projet interne',
    duration: '5 min',
    readTime: '3 min',
  }
];

export default function HomePage() {
  const { t } = useLanguageContext();
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Récupérer la session Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('No session found:', sessionError);
          setUsername('User.');
          return;
        }

        // Appeler l'API avec le token Bearer
        const response = await fetch('/api/v1/user/current', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Formater le username : première lettre en majuscule + point à la fin
          const formattedUsername = (userData.username || 'User')
            .charAt(0).toUpperCase() + 
            (userData.username || 'User').slice(1) + 
            '.';
          setUsername(formattedUsername);
          console.log('User data received:', userData);
        } else {
          console.error('Error response:', response.status);
          setUsername('User.');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUsername('User.');
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="home-root">
      {/* Nouveau logo Scrivia */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 32 }}>
        <Image src="/logo_scrivia_white.png" alt="Scrivia Logo" width={200} height={54} style={{ marginBottom: 32 }} />
      </div>
      {/* Sidebar glassmorphism */}
      <Sidebar />
      <main className="main-content">
        {/* Headline premium */}
        <div className="home-headline-glass">Welcome Home, {username}</div>
        {/* Barre de saisie */}
        <section className="input-section">
          <input
            className="url-input"
            type="text"
            placeholder={t('home.input.placeholder')}
          />
          <button
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(90deg, #d35400 0%, #ff6a00 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '1.08rem',
              fontFamily: "'Noto Sans', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 2px 8px 0 rgba(255,106,0,0.07)',
              transition: 'background 0.2s, filter 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'linear-gradient(90deg, #ff6a00 0%, #ff8c1a 100%)')}
            onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(90deg, #d35400 0%, #ff6a00 100%)')}
          >
            {t('home.load.button')}
          </button>
        </section>

        {/* Dernières notes */}
        <section className="notes-section">
          <h2 className="section-title">{t('home.recent.notes')}</h2>
          <div className="notes-list">
            {mockNotes.map(note => (
              <ContentCard key={note.id} data={note} />
            ))}
          </div>
        </section>
      </main>

      <style jsx>{`
        .home-root {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }
        .home-root::before {
          content: '';
          position: fixed;
          z-index: 0;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          background:
            linear-gradient(135deg, 
              hsl(220, 8%, 2%) 0%, 
              hsl(220, 12%, 4%) 20%, 
              hsl(220, 15%, 6%) 40%, 
              hsl(220, 18%, 8%) 60%, 
              hsl(220, 20%, 10%) 80%, 
              hsl(220, 25%, 12%) 100%
            );
          backdrop-filter: blur(20px) saturate(120%) brightness(0.85);
          -webkit-backdrop-filter: blur(20px) saturate(120%) brightness(0.85);
        }
        .main-content, .input-section, .notes-section {
          position: relative;
          z-index: 1;
        }
        .main-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 48px 24px 24px 24px;
          width: calc(100% - 280px);
          max-width: 1200px;
          margin: 0 auto;
          margin-left: 280px;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .input-section {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 900px;
          margin-bottom: 48px;
          background: rgba(30, 30, 36, 0.38);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          border: 1.5px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.13);
          padding: 16px 20px;
          /* transition: background 0.2s, box-shadow 0.2s, border-color 0.2s; */ /* Transition désactivée pour interface simple */
          margin-left: auto;
          margin-right: auto;
        }
        .input-section:focus-within {
          background: rgba(30, 30, 36, 0.48);
          border-color: #ff6a00;
          box-shadow: 0 8px 24px 0 rgba(255,106,0,0.10);
        }
        .url-input {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #fff;
          font-size: 1.1rem;
          outline: none;
          /* transition: border-color 0.2s; */ /* Transition désactivée pour interface simple */
          box-shadow: none;
        }
        .url-input:focus {
          border: none;
        }
        .notes-section {
          width: 100%;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        .section-title {
          color: #fff;
          font-size: 1.4rem;
          font-weight: 600;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }
        .notes-list {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          justify-content: center;
        }
        @media (max-width: 900px) {
          .notes-list {
            flex-direction: column;
            gap: 16px;
          }
          .main-content {
            padding: 32px 8px 8px 8px;
          }
        }

        .home-headline-glass {
          color: #fff;
          font-size: 2.1rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          text-align: center;
          margin-bottom: 32px;
          font-family: 'Noto Sans', sans-serif !important;
          background: none;
          border-radius: 0;
          box-shadow: none;
          padding: 0 0 18px 0;
          width: 100%;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        .app-header, .header-content, .logo-link, .logo, .logout-btn {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
