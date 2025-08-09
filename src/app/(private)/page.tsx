'use client';

import React, { useState, useEffect } from 'react';
import ContentCard from '../../components/ContentCard';
import { useLanguageContext } from '../../contexts/LanguageContext';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../supabaseClient';
import { logger } from '../../utils/logger';
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
    data: { 
      id: '1', 
      title: 'Résumé LLM – Rapport Q2',
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
      category: 'Résumé',
      source: 'Rapport Q2',
      duration: '2 min',
      readTime: '1 min'
    }
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    category: 'Veille',
    title: 'Veille IA – Juin',
    source: 'Veille mensuelle',
    duration: '3 min',
    readTime: '2 min',
    data: { 
      id: '2', 
      title: 'Veille IA – Juin',
      imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
      category: 'Veille',
      source: 'Veille mensuelle',
      duration: '3 min',
      readTime: '2 min'
    }
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
    category: 'Collab',
    title: 'Note collaborative',
    source: 'Projet interne',
    duration: '5 min',
    readTime: '3 min',
    data: { 
      id: '3', 
      title: 'Note collaborative',
      imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80',
      category: 'Collab',
      source: 'Projet interne',
      duration: '5 min',
      readTime: '3 min'
    }
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
          logger.error('No session found:', { error: sessionError });
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
          logger.debug('User data received:', { userData });
        } else {
          logger.error('Error response:', { status: response.status });
          setUsername('User.');
        }
      } catch (error) {
        logger.error('Error fetching user:', { error });
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
          <div className="input-container">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder={t('home.input.placeholder')}
                className="home-input"
                aria-label="Saisir votre message"
              />
              <button className="send-button" aria-label="Envoyer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Section des notes récentes */}
        <section className="recent-notes-section">
          <h2 className="section-title">Notes récentes</h2>
          <div className="notes-grid">
            {mockNotes.map((note) => (
              <ContentCard
                key={note.id}
                imageUrl={note.imageUrl}
                category={note.category}
                title={note.title}
                source={note.source}
                duration={note.duration}
                readTime={note.readTime}
                data={note.data}
              />
            ))}
          </div>
        </section>

        {/* Section des fonctionnalités */}
        <section className="features-section">
          <h2 className="section-title">Fonctionnalités</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Prise de notes</h3>
              <p>Créez et organisez vos notes facilement</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>IA intégrée</h3>
              <p>Assistance intelligente pour vos projets</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Collaboration</h3>
              <p>Partagez et collaborez en temps réel</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 