"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import LogoHeader from '@/components/LogoHeader';
import { Book, FileText, MessageSquare, Plus, Search, Upload, Link as LinkIcon, Sparkles, FolderOpen, Clock, TrendingUp, Zap, Eye } from 'lucide-react';
import RecentActivityPrivate from '@/components/RecentActivityPrivate';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { motion } from 'framer-motion';
import './home.css';
import Link from 'next/link';

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
        {/* Header avec glassmorphism moderne */}
        <motion.header 
          className="home-header-glass"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="header-content">
            <div className="welcome-section">
              <motion.div 
                className="welcome-icon"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles size={32} />
              </motion.div>
              <div className="welcome-text">
                <h1>Bonjour, {user.email?.split('@')[0] || 'Utilisateur'} !</h1>
                <p>Prêt à organiser vos idées ?</p>
              </div>
            </div>
            
            <div className="quick-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <FolderOpen size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">12</div>
                  <div className="stat-label">Classeurs</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <FileText size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">48</div>
                  <div className="stat-label">Notes</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <Clock size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-number">3</div>
                  <div className="stat-label">Récents</div>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Dashboard principal avec design moderne */}
        <div className="main-dashboard">
          <div className="dashboard-grid">
            {/* Colonne Gauche - Actions et Import */}
            <div className="dashboard-left-column">
              {/* Barre de recherche héro */}
              <motion.section 
                className="hero-search-glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              >
                <form onSubmit={handleSearch} className="search-container-glass">
                  <Search size={22} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Rechercher une note, un classeur..."
                    className="search-field-glass"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      type="submit" 
                      className="search-btn-glass"
                      disabled={isSearching}
                    >
                      {isSearching ? 'Recherche...' : 'Rechercher'}
                    </button>
                  )}
                </form>
              </motion.section>

              {/* Hub de création avec design moderne */}
              <motion.section 
                className="creation-hub-glass"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              >
                <div className="hub-header">
                  <h2>Actions Rapides</h2>
                  <p>Créez et importez du contenu en quelques clics</p>
                </div>
                
                <div className="creation-actions">
                  <motion.button 
                    className="action-btn-glass primary"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Plus size={18} />
                    <span>Nouvelle note</span>
                  </motion.button>
                  <motion.button 
                    className="action-btn-glass secondary"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <MessageSquare size={18} />
                    <span>Résumé Youtube</span>
                  </motion.button>
                  <motion.button 
                    className="action-btn-glass accent"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Zap size={18} />
                    <span>IA Assistant</span>
                  </motion.button>
                </div>
                
                <div className="import-section-glass">
                  <h3>Importer du contenu</h3>
                  <div className="import-content">
                    <div className="url-input-section">
                      <input 
                        type="text" 
                        placeholder="Coller une URL à archiver..."
                        className="url-field-glass"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <button 
                        className="import-btn-glass" 
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                      >
                        Importer
                      </button>
                    </div>
                    
                    <div className="separator">
                      <span>ou</span>
                    </div>
                    
                    <motion.div 
                      className={`drop-zone-glass ${isDragOver ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input')?.click()}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300 }}
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
                    </motion.div>
                  </div>
                </div>
              </motion.section>
            </div>
            
            {/* Colonne Droite - Activité Récente */}
            <div className="dashboard-right-column">
              <motion.section 
                className="home-activity-glass"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
              >
                <div className="activity-header">
                  <h3>Activité Récente</h3>
                  <div className="header-actions">
                    <Link href="/private/notes" className="view-all-link">
                      <Eye size={14} />
                      <span>Voir tout</span>
                    </Link>
                  </div>
                </div>
                <RecentActivityPrivate limit={8} compact={true} showHeader={false} />
              </motion.section>
            </div>
          </div>
        </div>
      </main>
      
      {/* 🔧 Monitoring des performances en temps réel */}
      <PerformanceMonitor visible={false} />
    </div>
  );
} 