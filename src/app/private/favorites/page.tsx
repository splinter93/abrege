"use client";

import { motion } from "framer-motion";
import UnifiedPageLayout from "@/components/UnifiedPageLayout";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { Star } from "lucide-react";

export default function FavoritesPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <UnifiedPageLayout className="page-favorites">
          {/* Titre de la page avec design uniforme */}
          <UnifiedPageTitle
            icon={Star}
            title="Mes Favoris"
            subtitle="Vos notes et dossiers préférés"
          />

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