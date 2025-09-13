"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';
import { useSecureErrorHandler } from '@/components/SecureErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';
import { MessageSquare, Plus, Search, Upload, Sparkles, Zap, Eye, X, Youtube, FileText } from 'lucide-react';
import NotesCarouselNotion from '@/components/NotesCarouselNotion';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import PageTitleSimple from '@/components/PageTitleSimple';
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
      logger.error('[HomePage] Erreur création note:', error);
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
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex-1 flex items-center justify-center"
                disabled={isLoading || !noteTitle.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </span>
                ) : (
                  'Créer la note'
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
  return (
    <ErrorBoundary>
      <AuthGuard>
        <HomePageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function HomePageContent() {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading || !user?.id) {
    return (
      <div className="home-page-wrapper">
        <div className="loading-state">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }
  
  return <AuthenticatedHomeContent user={user} />;
}

function AuthenticatedHomeContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);

  const { handleError } = useSecureErrorHandler({
    context: 'HomePage',
    operation: 'dashboard_actions',
    userId: user.id
  });


  const handleImport = useCallback(() => {
    // Ouvrir le sélecteur de fichiers
    document.getElementById('file-input')?.click();
  }, []);

  const handleYoutubeSummary = useCallback(() => {
    // Rediriger vers la page de résumé YouTube
    router.push('/youtube-summary');
  }, [router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 2000);
    }
  }, [searchQuery]);

  const handleCreateNote = useCallback(async () => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      router.push('/private/dossiers');
    } catch (error) {
      logger.error('[HomePage] Erreur lors de la création de la note:', error);
      handleError(error, 'création note');
      throw error;
    }
  }, [user, router, handleError]);

  const handleOpenChat = useCallback(() => {
    router.push('/chat');
  }, [router]);

  return (
    <div className="page-wrapper">
      <style dangerouslySetInnerHTML={{
        __html: `
          .search-container-glass {
            border-radius: 16px !important;
          }
        `
      }} />
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
        {/* Titre simple unifié */}
        <PageTitleSimple
          title="Dashboard"
          subtitle="Gérez vos notes et classeurs"
          stats={[
            { number: 12, label: "Notes" },
            { number: 3, label: "Classeurs" },
            { number: 8, label: "Récents" }
          ]}
        />

        {/* Dashboard principal avec design moderne */}
        <div className="main-dashboard">
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

          {/* Carrousel de notes récentes - Design Notion */}
          <motion.section 
            className="notes-carousel-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <NotesCarouselNotion 
              limit={6}
              showNavigation={true}
              autoPlay={false}
              title="Notes Récentes"
              showViewAll={true}
            />
          </motion.section>

          {/* Titre Actions Rapides */}
          <div className="section-title">
            <h2>Actions Rapides</h2>
          </div>

          {/* Actions rapides sans bloc */}
          <motion.section 
            className="creation-actions-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          >
            <div className="creation-actions">
              <motion.button 
                className="action-btn-glass create-note"
                onClick={() => setIsCreateNoteModalOpen(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Plus size={20} />
                <span>Créer une note</span>
              </motion.button>

              <motion.button 
                className="action-btn-glass import"
                onClick={handleImport}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Upload size={20} />
                <span>Importer</span>
              </motion.button>

              <motion.button 
                className="action-btn-glass youtube"
                onClick={handleYoutubeSummary}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Youtube size={20} />
                <span>Youtube Summary</span>
              </motion.button>
              
              <motion.button 
                className="action-btn-glass chat"
                onClick={handleOpenChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <MessageSquare size={20} />
                <span>Chat</span>
              </motion.button>
            </div>

            {/* Input file caché pour l'import */}
            <input 
              id="file-input"
              type="file" 
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  logger.dev('[HomePage] Fichier sélectionné:', e.target.files[0]);
                }
              }}
            />
          </motion.section>
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
