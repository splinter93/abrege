"use client";

import { useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserStats } from '@/hooks/useUserStats';
import { useRouter } from 'next/navigation';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';
import { useSecureErrorHandler } from '@/components/SecureErrorHandler';
import { simpleLogger as logger } from '@/utils/logger';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import { MessageSquare, Plus, Upload, Youtube, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import NotesCarouselNotion from '@/components/NotesCarouselNotion';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import RecentFilesList from '@/components/RecentFilesList';
import UnifiedUploadZone from '@/components/UnifiedUploadZone';
import SearchBar, { SearchResult } from '@/components/SearchBar';
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

  const { stats } = useUserStats();

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

  // Callback pour gérer les résultats de recherche
  const handleSearchResult = useCallback((_result: SearchResult) => {
    // Navigation par défaut du composant SearchBar
    // Le composant gère déjà la navigation
  }, []);

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

      const quicknotesClasseur = classeursResult.classeurs.find((c) => c.name === 'Quicknotes');

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
        {/* Titre du dashboard avec statistiques dynamiques */}
        <UnifiedPageTitle
          icon={LayoutDashboard}
          title="Dashboard"
          subtitle={`Welcome Home, ${user.username || user.email?.split('@')[0] || 'User'}.`}
          stats={stats ? [
            { number: stats.total_notes, label: "Notes" },
            { number: stats.total_classeurs, label: "Classeurs" },
            { number: stats.total_folders, label: "Dossiers" }
          ] : []}
        />

        {/* Dashboard principal avec design moderne */}
        <div className="main-dashboard">
          {/* Ligne recherche + actions rapides */}
          <motion.div 
            className="search-actions-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            {/* Barre de recherche */}
            <SearchBar
              placeholder="Rechercher des notes..."
              onSearchResult={handleSearchResult}
              maxResults={10}
              searchTypes={['all']}
            />

            {/* Actions rapides compactes */}
            <div className="quick-actions">
              <motion.button 
                className="quick-action create-note"
                onClick={handleCreateNote}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                title="Créer une note rapide"
              >
                <Plus size={16} />
              </motion.button>

              <motion.button 
                className="quick-action import"
                onClick={handleImport}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                title="Importer"
              >
                <Upload size={16} />
              </motion.button>

              <motion.button 
                className="quick-action youtube"
                onClick={handleYoutubeSummary}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                title="Youtube Summary"
              >
                <Youtube size={16} />
              </motion.button>
              
              <motion.button 
                className="quick-action chat"
                onClick={handleOpenChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                title="Chat"
              >
                <MessageSquare size={16} />
              </motion.button>
            </div>
          </motion.div>

          {/* Section Notes Récentes */}
          <motion.section 
            className="dashboard-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <div className="section-header">
              <div className="section-title-row">
                <h2 className="section-title">Notes Récentes</h2>
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

          {/* Section 2 colonnes : Fichiers Récents + Drop Zone */}
          <motion.section 
            className="dashboard-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <div className="dashboard-two-columns">
              {/* Colonne gauche : Drop Zone */}
              <div className="dashboard-column">
                <div className="dashboard-column-header">
                  <h3 className="dashboard-column-title">Drop Zone</h3>
                </div>
                <div className="dashboard-column-content">
                  <UnifiedUploadZone />
                </div>
              </div>

              {/* Séparateur vertical */}
              <div className="dashboard-vertical-separator"></div>

              {/* Colonne droite : Fichiers Récents */}
              <div className="dashboard-column">
                <div className="dashboard-column-header">
                  <h3 className="dashboard-column-title">Fichiers Récents</h3>
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
                <div className="dashboard-column-content">
                  <RecentFilesList ref={filesScrollRef} limit={10} />
                </div>
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
      </main>
      
      {/* 🔧 Monitoring des performances en temps réel */}
      <PerformanceMonitor visible={false} />
    </div>
  );
}
