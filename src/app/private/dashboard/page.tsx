"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSecureErrorHandler } from "@/components/SecureErrorHandler";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { BarChart3 } from "lucide-react";
import "@/styles/main.css";

interface DashboardStats {
  totalClasseurs: number;
  totalNotes: number;
  totalFiles: number;
  recentActivity: number;
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
          <DashboardPageContent />
              </main>
    </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function DashboardPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading || !user?.id) {
    return (
      <div className="loading-state">
        <p>Chargement...</p>
      </div>
    );
  }
  
  return <AuthenticatedDashboardContent user={user} />;
}

function AuthenticatedDashboardContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const [stats, setStats] = useState<DashboardStats>({
    totalClasseurs: 0,
    totalNotes: 0,
    totalFiles: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  const { handleError } = useSecureErrorHandler({
    context: 'DashboardPage',
    operation: 'chargement_dashboard',
    userId: user.id
  });

  const loadDashboardStats = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Simuler le chargement des statistiques
      // Dans une vraie implémentation, on ferait des appels API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalClasseurs: 5,
        totalNotes: 127,
        totalFiles: 23,
        recentActivity: 8
      });
    } catch (error) {
      handleError(error, 'chargement statistiques dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id, handleError]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardStats();
    }
  }, [user?.id, loadDashboardStats]);

  if (loading) {
    return (
      <div className="dashboard-loading-state">
        <div className="dashboard-loading-spinner"></div>
        <p className="dashboard-loading-text">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <>
      {/* Titre de la page avec design unifié et bloc icône */}
      <UnifiedPageTitle
        icon={BarChart3}
        title="Tableau de bord"
        subtitle="Vue d'ensemble de vos activités et contenus"
      />

      {/* Statistiques rapides en bloc glassmorphism */}
      <motion.div 
        className="dashboard-stats-overview"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
      >
        <div className="dashboard-stats-overview-grid">
          <div className="dashboard-stat-overview-item">
            <span className="dashboard-stat-overview-number">{stats.totalClasseurs}</span>
            <span className="dashboard-stat-overview-label">classeur{stats.totalClasseurs > 1 ? 's' : ''}</span>
          </div>
          <div className="dashboard-stat-overview-item">
            <span className="dashboard-stat-overview-number">{stats.totalNotes}</span>
            <span className="dashboard-stat-overview-label">note{stats.totalNotes > 1 ? 's' : ''}</span>
          </div>
          <div className="dashboard-stat-overview-item">
            <span className="dashboard-stat-overview-number">{stats.totalFiles}</span>
            <span className="dashboard-stat-overview-label">fichier{stats.totalFiles > 1 ? 's' : ''}</span>
          </div>
        </div>
      </motion.div>

      {/* Section des statistiques rapides */}
      <motion.section 
        className="content-section-glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
      >
        <div className="content-main-container-glass">
          <h2 className="dashboard-section-title">
            <span className="dashboard-section-icon">📊</span>
            Statistiques rapides
          </h2>
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card" data-type="classeurs">
              <div className="dashboard-stat-icon">📚</div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Classeurs</h3>
                <p className="dashboard-stat-number">{stats.totalClasseurs}</p>
                <p className="dashboard-stat-description">Organiseurs de connaissances</p>
              </div>
            </div>
            <div className="dashboard-stat-card" data-type="notes">
              <div className="dashboard-stat-icon">📝</div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Notes</h3>
                <p className="dashboard-stat-number">{stats.totalNotes}</p>
                <p className="dashboard-stat-description">Articles et documents</p>
              </div>
            </div>
            <div className="dashboard-stat-card" data-type="files">
              <div className="dashboard-stat-icon">📁</div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Fichiers</h3>
                <p className="dashboard-stat-number">{stats.totalFiles}</p>
                <p className="dashboard-stat-description">Documents uploadés</p>
              </div>
            </div>
            <div className="dashboard-stat-card" data-type="activity">
              <div className="dashboard-stat-icon">⚡</div>
              <div className="dashboard-stat-content">
                <h3 className="dashboard-stat-title">Activité récente</h3>
                <p className="dashboard-stat-number">{stats.recentActivity}</p>
                <p className="dashboard-stat-description">Actions aujourd'hui</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Section des actions rapides */}
      <motion.section 
        className="content-section-glass"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
      >
        <div className="content-main-container-glass">
          <h2 className="dashboard-section-title">
            <span className="dashboard-section-icon">🚀</span>
            Actions rapides
          </h2>
          <div className="dashboard-actions-grid">
            <motion.a 
              href="/private/dossiers" 
              className="dashboard-action-card"
              data-type="dossiers"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="dashboard-action-icon">📚</div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Mes Classeurs</h3>
                <p className="dashboard-action-description">Organisez vos connaissances</p>
              </div>
            </motion.a>
            <motion.a 
              href="/private/files" 
              className="dashboard-action-card"
              data-type="files"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="dashboard-action-icon">📁</div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Mes Fichiers</h3>
                <p className="dashboard-action-description">Gérez vos documents</p>
              </div>
            </motion.a>
            <motion.a 
              href="/private/shared" 
              className="dashboard-action-card"
              data-type="shared"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="dashboard-action-icon">🔗</div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Notes Partagées</h3>
                <p className="dashboard-action-description">Collaboration et partage</p>
              </div>
            </motion.a>
            <motion.a 
              href="/private/settings" 
              className="dashboard-action-card"
              data-type="settings"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="dashboard-action-icon">⚙️</div>
              <div className="dashboard-action-content">
                <h3 className="dashboard-action-title">Paramètres</h3>
                <p className="dashboard-action-description">Configurez votre compte</p>
              </div>
            </motion.a>
          </div>
        </div>
      </motion.section>
    </>
  );
}
