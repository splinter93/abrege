"use client";

import { useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageWithSidebarLayout from '@/components/PageWithSidebarLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';
import { useSecureErrorHandler } from '@/components/SecureErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';
import type { Classeur } from '@/services/llm/types/apiV2Types';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import { MessageSquare, Plus, Upload, Youtube, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { Feather } from 'react-feather';
import React, { Suspense } from 'react';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import SearchBar, { SearchResult } from '@/components/SearchBar';

// ✅ OPTIMISATION : Lazy load composants lourds (conforme GUIDE-EXCELLENCE-CODE.md)
const NotesCarouselNotion = React.lazy(() => import('@/components/NotesCarouselNotion'));
const RecentFilesList = React.lazy(() => import('@/components/RecentFilesList'));
const UnifiedUploadZone = React.lazy(() => import('@/components/UnifiedUploadZone'));
import { motion } from 'framer-motion';
import './home.css';
import './dashboard.css';

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
    return <SimpleLoadingState message="Chargement" />;
  }
  
  return <AuthenticatedHomeContent user={user} />;
}

function AuthenticatedHomeContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const router = useRouter();
  const notesScrollRef = useRef<HTMLDivElement>(null);
  const filesScrollRef = useRef<HTMLDivElement>(null);

  const displayName = user.username || user.email?.split('@')[0] || 'User';

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

  // Callback pour gérer les résultats de recherche - Navigation vers la note/dossier/classeur
  const handleSearchResult = useCallback((result: SearchResult) => {
    if (result.type === 'note') {
      // Navigation vers la note par slug ou id
      router.push(`/private/note/${result.slug || result.id}`);
    } else if (result.type === 'folder') {
      // Navigation vers le dossier (rediriger vers la page dossiers avec le dossier ouvert)
      router.push(`/private/dossiers`);
      // Le dossier sera ouvert automatiquement par le store Zustand
    } else if (result.type === 'classeur') {
      // Navigation vers le classeur
      router.push(`/private/dossiers`);
      // Le classeur sera activé automatiquement par le store Zustand
    }
  }, [router]);

  const handleCreateNote = useCallback(async () => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // 🚀 Création ultra-rapide : pas de modale, pas de prompt
      logger.info('[HomePage] 🚀 Création rapide de note');
      
      // Import dynamique des services
      const { V2UnifiedApi } = await import('@/services/V2UnifiedApi');
      const v2Api = V2UnifiedApi.getInstance();
      
      // 1. Récupérer les classeurs avec authentification automatique
      const classeursResult = await v2Api.getClasseurs();
      
      if (!classeursResult.success || !classeursResult.classeurs) {
        throw new Error('Erreur lors de la récupération des classeurs');
      }

      const quicknotesClasseur = classeursResult.classeurs.find((c: Classeur) => c.name === 'Quicknotes');

      if (!quicknotesClasseur) {
        throw new Error('Classeur Quicknotes non trouvé. Veuillez créer un classeur d\'abord.');
      }

      // 2. Nom simple et incrémental avec timestamp
      const noteNumber = Date.now().toString().slice(-4); // 4 derniers chiffres du timestamp
      const defaultName = `Nouvelle note ${noteNumber}`;

      // 3. Créer la note directement avec V2UnifiedApi
      const createResult = await v2Api.createNote({
        source_title: defaultName,
        notebook_id: quicknotesClasseur.id,
        markdown_content: '', // Vide pour commencer à écrire immédiatement
        folder_id: null,
      });

      if (!createResult.success || !createResult.note) {
        throw new Error(createResult.error || 'Erreur lors de la création de la note');
      }

      // 4. Rediriger IMMÉDIATEMENT vers l'éditeur
      logger.info('[HomePage] ✅ Note créée, redirection vers éditeur');
      router.push(`/private/note/${createResult.note.id}`);

    } catch (error) {
      logger.error('[HomePage] Erreur lors de la création de la note:', error);
      handleError(error, 'création note');
      throw error;
    }
  }, [user, router, handleError]);

  const handleOpenChat = useCallback(() => {
    router.push('/chat');
  }, [router]);

  const handleNotesPrevious = useCallback(() => {
    if (notesScrollRef.current) {
      notesScrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  }, []);

  const handleNotesNext = useCallback(() => {
    if (notesScrollRef.current) {
      notesScrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  }, []);

  const handleFilesPrevious = useCallback(() => {
    if (filesScrollRef.current) {
      filesScrollRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  }, []);

  const handleFilesNext = useCallback(() => {
    if (filesScrollRef.current) {
      filesScrollRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  }, []);


  return (
    <PageWithSidebarLayout>
      <style dangerouslySetInnerHTML={{
        __html: `
          .search-container-glass {
            border-radius: 16px !important;
          }
        `
      }} />
      {/* Logo */}
      <div className="dashboard-logo-container">
          <Feather 
            size={81}
            className="dashboard-logo"
            color="var(--chat-text-primary, #e8eaed)"
          />
        </div>

        {/* Titre du dashboard avec statistiques dynamiques */}
        <UnifiedPageTitle
          icon={LayoutDashboard}
          title={`Welcome Home, ${displayName}.`}
          subtitle="Let's craft amazing work today."
          className="dashboard-title-centered"
          showIcon={false}
        />

        {/* Dashboard principal avec design centré */}
        <div className="main-dashboard">
          <div className="dashboard-center-stack">
            {/* Section Notes Récentes - en premier */}
            <motion.section 
              className="dashboard-section centered notes-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              <div className="section-header">
                <div className="section-title-row with-navigation">
                  <h4 className="section-title">Notes Récentes</h4>
                  <div className="section-header-right">
                    <SearchBar
                      placeholder="Rechercher des notes..."
                      onSearchResult={handleSearchResult}
                      maxResults={10}
                      searchTypes={['all']}
                      className="dashboard-search-bar notes-section-search"
                    />
                    <div className="section-navigation">
                      <button 
                        className="nav-btn prev-btn"
                        onClick={handleNotesPrevious}
                        aria-label="Notes précédentes"
                        title="Faire défiler vers la gauche"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        className="nav-btn next-btn"
                        onClick={handleNotesNext}
                        aria-label="Notes suivantes"
                        title="Faire défiler vers la droite"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="section-content">
                <NotesCarouselNotion 
                  ref={notesScrollRef}
                  limit={10}
                  showNavigation={false}
                  autoPlay={false}
                  title=""
                  showViewAll={false}
                />
              </div>
            </motion.section>

            {/* Espace rapide : recherche + actions */}
            <motion.section 
              className="dashboard-section centered quick-workspace-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            >
              <div className="section-header">
                <div className="section-title-row">
                  <h4 className="section-title">Actions Rapides</h4>
                </div>
              </div>
              <div className="quick-workspace">
                <div className="quick-actions-grid">
                  <motion.button 
                    className="quick-action-card create-note"
                    onClick={handleCreateNote}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    title="Créer une note rapide"
                  >
                    <Plus size={20} />
                    <span className="quick-action-label">Nouvelle note</span>
                  </motion.button>
                  <motion.button 
                    className="quick-action-card import"
                    onClick={handleImport}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    title="Importer"
                  >
                    <Upload size={20} />
                    <span className="quick-action-label">Importer</span>
                  </motion.button>
                  <motion.button 
                    className="quick-action-card youtube"
                    onClick={handleYoutubeSummary}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    title="Youtube Summary"
                  >
                    <Youtube size={20} />
                    <span className="quick-action-label">Résumé YouTube</span>
                  </motion.button>
                  <motion.button 
                    className="quick-action-card chat"
                    onClick={handleOpenChat}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    title="Chat"
                  >
                    <MessageSquare size={20} />
                    <span className="quick-action-label">Ouvrir le chat</span>
                  </motion.button>
                </div>
              </div>
            </motion.section>

            {/* Section Fichiers récents */}
          <motion.section 
              className="dashboard-section centered recent-files-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
          >
              <div className="section-header">
                <div className="section-title-row with-navigation">
                  <h4 className="section-title">Fichiers Récents</h4>
                  <div className="section-navigation">
                    <button 
                      className="nav-btn prev-btn"
                      onClick={handleFilesPrevious}
                      aria-label="Fichiers précédents"
                      title="Faire défiler vers la gauche"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      className="nav-btn next-btn"
                      onClick={handleFilesNext}
                      aria-label="Fichiers suivants"
                      title="Faire défiler vers la droite"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="section-content recent-files-centered">
                <Suspense fallback={<SimpleLoadingState message="Chargement des fichiers..." />}>
                  <RecentFilesList ref={filesScrollRef} limit={10} />
                </Suspense>
              </div>
            </motion.section>

            {/* Section Drop Zone */}
            <motion.section 
              className="dashboard-section centered drop-zone-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            >
              <div className="section-header">
                <div className="section-title-row">
                  <h4 className="section-title">Drop Zone</h4>
                </div>
              </div>
              <div className="section-content drop-zone-centered">
                <div className="drop-zone-card">
                  <Suspense fallback={<SimpleLoadingState message="Chargement de la zone d'upload..." />}>
                    <UnifiedUploadZone />
                  </Suspense>
                </div>
              </div>
          </motion.section>

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
          </div>
        </div>

      {/* 🔧 Monitoring des performances en temps réel */}
      <PerformanceMonitor visible={false} />
    </PageWithSidebarLayout>
  );
}
