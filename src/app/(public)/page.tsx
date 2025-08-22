"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import LogoHeader from '@/components/LogoHeader';
import { Book, FileText, MessageSquare, Plus, Search, Upload, Link as LinkIcon, Sparkles } from 'lucide-react';
import RecentActivityPrivate from '@/components/RecentActivityPrivate';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import './home.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);



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
      console.log('Fichiers déposés:', files);
      // TODO: Traiter les fichiers
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      console.log('URL saisie:', urlInput);
      setUrlInput('');
      // TODO: Traiter l'URL
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlSubmit();
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      // TODO: Implémenter la recherche
      setTimeout(() => setIsSearching(false), 2000);
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
    // Afficher directement la page d'authentification au lieu de rediriger
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Scrivia</h1>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
            A minimalist, LLM-friendly markdown knowledge base
          </p>
          <button 
            onClick={() => window.location.href = '/auth'}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              borderRadius: 8,
              background: '#2994ff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page-wrapper">
      <Sidebar />
      
      <main className="home-content">
        <header className="home-header">
          <div className="home-welcome">
            <h1>
              <Sparkles size={32} style={{ marginRight: 12, display: 'inline', verticalAlign: 'middle' }} />
              Bonjour, {user.email?.split('@')[0] || 'Utilisateur'} !
            </h1>
            <p>Prêt à organiser vos idées ?</p>
          </div>
        </header>

        <div className="main-dashboard">
          <div className="dashboard-grid">
            {/* Colonne Gauche - Actions et Import */}
            <div className="dashboard-left-column">
              <section className="hero-search">
                <form onSubmit={handleSearch} className="search-container">
                  <Search size={22} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Rechercher une note, un classeur..."
                    className="search-field"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      type="submit" 
                      className="search-btn"
                      disabled={isSearching}
                    >
                      {isSearching ? 'Recherche...' : 'Rechercher'}
                    </button>
                  )}
                </form>
              </section>

              <section className="creation-hub">
                <h2>Actions Rapides</h2>
                <div className="creation-actions">
                  <button className="action-btn primary">
                    <Plus size={18} />
                    <span>Nouvelle note</span>
                  </button>
                  <button className="action-btn">
                    <MessageSquare size={18} />
                    <span>Résumé Youtube</span>
                  </button>
                </div>
                
                <div className="import-section">
                  <h3>Importer du contenu</h3>
                  <div className="import-content">
                    <div className="url-input-section">
                      <input 
                        type="text" 
                        placeholder="Coller une URL à archiver..."
                        className="url-field"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <button 
                        className="import-btn" 
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                      >
                        Importer
                      </button>
                    </div>
                    
                    <div className="separator">
                      <span>ou</span>
                    </div>
                    
                    <div 
                      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <input 
                        id="file-input"
                        type="file" 
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            console.log('Fichier sélectionné:', e.target.files[0]);
                          }
                        }}
                      />
                      <div className="drop-content">
                        <Upload size={28} />
                        <p>Glissez-déposez un fichier</p>
                        <span>ou cliquez pour parcourir</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
            
            {/* Colonne Droite - Activité Récente */}
            <div className="dashboard-right-column">
              <section className="home-activity">
                <RecentActivityPrivate limit={10} compact={false} showHeader={false} />
              </section>
            </div>
          </div>
        </div>
      </main>
      
      {/* 🔧 Monitoring des performances en temps réel */}
      <PerformanceMonitor visible={false} />
    </div>
  );
} 