"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import LogoHeader from '@/components/LogoHeader';
import { Book, FileText, MessageSquare, Plus } from 'lucide-react';
import RecentActivityPrivate from '@/components/RecentActivityPrivate';
import './home.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // TODO: Traiter les fichiers déposés
      console.log('Fichiers déposés:', files);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // TODO: Traiter l'URL saisie
      console.log('URL saisie:', urlInput);
      setUrlInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <main style={{
        padding: '48px 24px',
        maxWidth: 880,
        margin: '0 auto',
        color: 'var(--text-1, #eaeaec)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: 32 }}>
          <LogoHeader size="xl" position="center" />
        </div>
        <h1 style={{ fontSize: 36, lineHeight: 1.2, margin: '0 0 24px 0' }}>
          Scrivia
        </h1>
        <p style={{ opacity: 0.8, marginBottom: 32, fontSize: 18 }}>
          A minimalist, LLM-friendly markdown knowledge base. Organize, write, and publish with clean URLs and a focused UI.
        </p>
        
        <div style={{ marginBottom: 32 }}>
          <button 
            onClick={() => window.location.href = '/auth/signin'}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              background: 'var(--accent-primary, #2994ff)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Se connecter
          </button>
        </div>
        
        <div style={{ 
          marginTop: 48, 
          paddingTop: 24, 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          opacity: 0.7
        }}>
          <p style={{ fontSize: 14 }}>
            Connectez-vous pour accéder à votre espace personnel et voir votre activité récente.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="home-page-wrapper">
      <Sidebar />
      
      <main className="home-content">
        <header className="home-header">
          <div className="home-welcome">
            <h1>Bonjour, {user.email?.split('@')[0] || 'Utilisateur'} !</h1>
            <p>Bienvenue dans votre espace personnel Scrivia.</p>
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="dashboard-main">
            <section className="quick-actions">
              <h2>Actions rapides</h2>
              <div className="quick-actions-grid">
                <button className="action-btn primary">
                  <Plus size={18} />
                  <span>Nouveau classeur</span>
                </button>
                <button className="action-btn">
                  <FileText size={18} />
                  <span>Nouvelle note</span>
                </button>
                <button 
                  className="action-btn"
                  onClick={() => window.location.href = '/chat'}
                >
                  <MessageSquare size={18} />
                  <span>Ouvrir le chat</span>
                </button>
              </div>
            </section>

            <section className="content-import">
              <h2>Importer du contenu</h2>
              <div className="import-container">
                <div className="url-input-section">
                  <input 
                    type="text" 
                    placeholder="Coller une URL ou saisir du texte..."
                    className="url-field"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button className="import-btn" onClick={handleUrlSubmit}>
                    Importer
                  </button>
                </div>
                <div 
                  className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="drop-content">
                    <FileText size={24} />
                    <p>Glissez-déposez un fichier ici</p>
                    <span>ou cliquez pour parcourir</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
          
          <div className="dashboard-sidebar">
            <section className="home-activity">
              <h2>Activité récente</h2>
              <RecentActivityPrivate 
                limit={8} 
                compact={false}
                showHeader={false}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 