'use client';

import React from 'react';
import ContentCard from '../components/ContentCard';
import './globals.css';

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
  return (
    <div className="home-root">
      {/* Sidebar glassmorphism */}
      <div className="sidebar-trigger" />
      <aside className="sidebar-glass">
        <nav className="sidebar-nav-glass">
          <a href="/dossiers" className="sidebar-link-glass">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            <span>Mes Dossiers</span>
          </a>
          <div className="sidebar-separator" />
          <a href="#" className="sidebar-link-glass">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
            <span>Mes Agents</span>
          </a>
          <div className="sidebar-separator" />
          <a href="#" className="sidebar-link-glass">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1-2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </a>
        </nav>
        <div style={{flex: 1}} />
        <div style={{width: '100%', paddingLeft: 12, paddingBottom: 18}}>
          <a href="#" className="sidebar-link-glass">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0 1 13 0"/></svg>
            <span>Mon Compte</span>
          </a>
        </div>
      </aside>
      <main className="main-content">
        {/* Headline premium */}
        <div className="home-headline-glass">Your Place of Infinite Insight</div>
        {/* Barre de saisie */}
        <section className="input-section">
          <input
            className="url-input"
            type="text"
            placeholder="Coller une URL ou glisser un fichier..."
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
            Charger
          </button>
        </section>

        {/* Dernières notes */}
        <section className="notes-section">
          <h2 className="section-title">Dernières notes</h2>
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
            linear-gradient(135deg, #18181c 0%, #23232a 60%, #ff6a00 120%);
          /* Halo orange subtil en bas à droite */
          box-shadow: 0 80vh 120px 80px rgba(255,106,0,0.10) inset;
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
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
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
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
          transition: background 0.2s, box-shadow 0.2s, border-color 0.2s;
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
          transition: border-color 0.2s;
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
        .sidebar-trigger {
          position: fixed;
          top: 115px;
          left: 0;
          width: 100px;
          height: 75vh;
          z-index: 10;
          cursor: pointer;
        }
        .sidebar-glass {
          position: fixed;
          top: 114px;
          left: 0;
          height: 75vh;
          width: 0;
          min-width: 0;
          opacity: 0;
          background: rgba(30, 30, 36, 0.38);
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          border-radius: 0 18px 18px 0;
          border-top: 1.5px solid rgba(255,255,255,0.10);
          border-right: 1.5px solid rgba(255,255,255,0.10);
          border-bottom: 1.5px solid rgba(255,255,255,0.10);
          border-left: none;
          box-shadow: none;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 18px 0;
          z-index: 9;
          transition: width 0.28s cubic-bezier(.4,1.2,.4,1), opacity 0.18s, box-shadow 0.2s;
          overflow: hidden;
          pointer-events: none;
        }
        .sidebar-glass:hover,
        .sidebar-trigger:hover + .sidebar-glass {
          width: 220px;
          min-width: 220px;
          opacity: 1;
          pointer-events: auto;
          box-shadow: none;
        }
        .sidebar-nav-glass {
          display: flex;
          flex-direction: column;
          gap: 32px;
          align-items: flex-start;
          width: 100%;
          padding-left: 12px;
        }
        .sidebar-link-glass {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 14px;
          color: #b0b0b7;
          text-decoration: none;
          font-size: 1.08rem;
          font-weight: 500;
          padding: 10px 0;
          border-radius: 10px;
          transition: background 0.2s, color 0.2s;
          width: 100%;
          justify-content: flex-start;
          text-align: left;
          min-width: 0;
        }
        .sidebar-link-glass:hover {
          background: rgba(255,255,255,0.08);
          color: #ff6a00;
        }
        .sidebar-link-glass span {
          opacity: 0;
          transition: opacity 0.18s, margin 0.18s;
          margin-left: -8px;
          pointer-events: none;
        }
        .sidebar-trigger:hover + .sidebar-glass .sidebar-link-glass span,
        .sidebar-glass:hover .sidebar-link-glass span {
          opacity: 1;
          margin-left: 0;
          pointer-events: auto;
        }
        .sidebar-separator {
          width: 80%;
          height: 1px;
          margin: 8px 0 8px 10%;
          background: linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%);
          border: none;
          border-radius: 1px;
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
