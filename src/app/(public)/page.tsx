"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import LogoHeader from '@/components/LogoHeader';
import { Book, FileText, MessageSquare, Plus, Search, Upload, Link as LinkIcon, Sparkles, FolderOpen, Clock, TrendingUp, Zap, Eye, X } from 'lucide-react';
import RecentActivityPrivate from '@/components/RecentActivityPrivate';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { motion } from 'framer-motion';
import './home.css';
import Link from 'next/link';

// Composant modal pour créer une nouvelle note
const CreateNoteModal = ({ isOpen, onClose, onCreateNote }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onCreateNote: (title: string) => void; 
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      await onCreateNote(noteTitle.trim());
      setNoteTitle('');
      onClose();
    } catch (error) {
      console.error('Erreur création note:', error);
      setError('Une erreur est survenue lors de la création de la note. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setNoteTitle('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-white rounded-lg w-full max-w-md mx-auto shadow-xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {/* Header du modal */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Créer une nouvelle note</h3>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Contenu du modal */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la note
              </label>
              <input
                id="note-title"
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Ex: Ma première note..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!noteTitle.trim() || isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium min-h-[44px]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </span>
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);

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

  const handleCreateNote = async (title: string) => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // Rediriger vers la page des dossiers pour créer la note
      // L'utilisateur pourra créer la note dans le contexte approprié
      router.push('/private/dossiers');
    } catch (error) {
      console.error('Erreur lors de la création de la note:', error);
      throw error; // Remonter l'erreur pour l'afficher dans le modal
    }
  };

  const handleOpenChat = () => {
    router.push('/chat');
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
        {/* Header avec glassmorphism uniforme */}
        <motion.header 
          className="page-title-container-glass"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="page-title-content">
            <div className="welcome-section">
              <motion.div 
                className="page-title-icon-container"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles className="page-title-icon" />
              </motion.div>
              <div className="page-title-section">
                <h1 className="page-title">Bonjour, {user.email?.split('@')[0] || 'Utilisateur'} !</h1>
                <p className="page-subtitle">Prêt à organiser vos idées ?</p>
              </div>
            </div>
            
            <div className="page-title-stats">
              <div className="page-title-stats-item">
                <div className="page-title-stats-number">12</div>
                <div className="page-title-stats-label">Classeurs</div>
              </div>
              <div className="page-title-stats-item">
                <div className="page-title-stats-number">48</div>
                <div className="page-title-stats-label">Notes</div>
              </div>
              <div className="page-title-stats-item">
                <div className="page-title-stats-number">3</div>
                <div className="page-title-stats-label">Récents</div>
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
                    onClick={() => setIsCreateNoteModalOpen(true)}
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
                    onClick={handleOpenChat}
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

      {/* Modal de création de note */}
      <CreateNoteModal
        isOpen={isCreateNoteModalOpen}
        onClose={() => setIsCreateNoteModalOpen(false)}
        onCreateNote={handleCreateNote}
      />
    </div>
  );
} 