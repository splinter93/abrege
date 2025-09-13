"use client";

import { motion } from "framer-motion";
import UnifiedPageLayout from "@/components/UnifiedPageLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function FavoritesPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <UnifiedPageLayout className="page-favorites">
          <motion.div 
            className="page-title-container-glass"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="page-title-content">
              <div className="page-title-left-section">
                <motion.div 
                  className="page-title-icon-container"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <span className="page-title-icon">⭐</span>
                </motion.div>
                <div className="page-title-section">
                  <h1 className="page-title">Mes Favoris</h1>
                  <p className="page-subtitle">Vos notes et dossiers préférés</p>
                </div>
              </div>
              <div className="page-title-stats">
                <div className="page-title-stats-item">
                  <span className="page-title-stats-number">0</span>
                  <span className="page-title-stats-label">favoris</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.section 
            className="content-section-glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <div className="content-main-container-glass">
              <div style={{ 
                padding: '48px 24px', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                background: 'var(--glass-bg-secondary)',
                borderRadius: '16px',
                border: '1px solid var(--glass-border-secondary)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.6 }}>⭐</div>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Aucun favori pour le moment</h2>
                <p>Cette page est en cours de développement. Vous pourrez bientôt marquer vos notes et dossiers préférés.</p>
              </div>
            </div>
          </motion.section>
        </UnifiedPageLayout>
      </AuthGuard>
    </ErrorBoundary>
  );
} 