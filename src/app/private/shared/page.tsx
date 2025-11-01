"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import UnifiedSidebar from "@/components/UnifiedSidebar";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import UnifiedPageTitle from "@/components/UnifiedPageTitle";
import { Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/account.css";
import { SimpleLoadingState } from "@/components/DossierLoadingStates";

interface SharedNote {
  id: string;
  title: string;
  author: string;
  authorUsername: string;
  sharedAt: string;
  viewCount: number;
  isPublic: boolean;
  tags: string[];
  summary: string;
  thumbnail?: string;
}

export default function SharedNotesPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
          <SharedNotesContent />
              </main>
    </div>
      </AuthGuard>
    </ErrorBoundary>
  );
}

function SharedNotesContent() {
  const { user } = useAuth();
  const [receivedNotes, setReceivedNotes] = useState<SharedNote[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Données simulées - à remplacer par de vraies données
  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => {
      setReceivedNotes([
        {
          id: "1",
          title: "Guide complet React 18",
          author: "Marie Dubois",
          authorUsername: "@marie.dev",
          sharedAt: "2024-01-15",
          viewCount: 42,
          isPublic: true,
          tags: ["React", "JavaScript", "Frontend"],
          summary: "Un guide complet sur les nouvelles fonctionnalités de React 18..."
        },
        {
          id: "2", 
          title: "Architecture Microservices",
          author: "Jean Martin",
          authorUsername: "@jean.architect",
          sharedAt: "2024-01-12",
          viewCount: 28,
          isPublic: false,
          tags: ["Architecture", "Microservices", "Backend"],
          summary: "Les meilleures pratiques pour concevoir des architectures microservices..."
        }
      ]);

      setSharedNotes([
        {
          id: "3",
          title: "Mon guide TypeScript",
          author: user?.username || "Moi",
          authorUsername: `@${user?.username || "moi"}`,
          sharedAt: "2024-01-10",
          viewCount: 156,
          isPublic: true,
          tags: ["TypeScript", "JavaScript", "Guide"],
          summary: "Tout ce que vous devez savoir sur TypeScript pour devenir un expert..."
        }
      ]);

      setLoading(false);
    }, 1000);
  }, [user]);

  const totalReceived = receivedNotes.length;
  const totalShared = sharedNotes.length;

  return (
    <>
      {/* Titre de la page avec design uniforme */}
      <UnifiedPageTitle
        icon={Share2}
        title="Notes Partagées"
        subtitle="Découvrez et partagez des connaissances"
      />

      {/* Contenu principal avec blocs glassmorphism espacés */}
      <div className="account-main-container">
        
        {/* Section Notes Reçues */}
        <motion.div 
          className="account-glass-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="account-block-header">
            <div className="account-block-icon">📥</div>
            <div>
              <h2 className="account-block-title">Notes Reçues</h2>
              <p className="account-block-subtitle">Notes partagées avec vous par d'autres utilisateurs</p>
            </div>
          </div>
          <div className="account-block-content">
            {loading ? (
              <SimpleLoadingState message="Chargement" />
            ) : receivedNotes.length === 0 ? (
              <div className="account-empty-state">
                <span className="account-empty-icon">📥</span>
                <h3>Aucune note reçue</h3>
                <p>Les notes que d'autres utilisateurs partagent avec vous apparaîtront ici</p>
              </div>
            ) : (
              <div className="shared-notes-grid">
                {receivedNotes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    className="shared-note-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="shared-note-header">
                      <h3 className="shared-note-title">{note.title}</h3>
                      <div className="shared-note-badges">
                        {note.isPublic ? (
                          <span className="shared-note-badge public">🌐 Public</span>
                        ) : (
                          <span className="shared-note-badge private">🔒 Privé</span>
                        )}
                      </div>
                    </div>
                    <div className="shared-note-author">
                      <span className="shared-note-author-name">Par {note.author}</span>
                      <span className="shared-note-author-username">{note.authorUsername}</span>
                    </div>
                    <p className="shared-note-summary">{note.summary}</p>
                    <div className="shared-note-tags">
                      {note.tags.map((tag) => (
                        <span key={tag} className="shared-note-tag">#{tag}</span>
                      ))}
                    </div>
                    <div className="shared-note-meta">
                      <span className="shared-note-date">Partagé le {new Date(note.sharedAt).toLocaleDateString()}</span>
                      <span className="shared-note-views">{note.viewCount} vues</span>
                    </div>
                    <div className="shared-note-actions">
                      <button className="account-button-primary">
                        👁️ Lire
                      </button>
                      <button className="account-button-secondary">
                        📋 Copier le lien
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Section Notes Partagées */}
        <motion.div 
          className="account-glass-block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="account-block-header">
            <div className="account-block-icon">📤</div>
            <div>
              <h2 className="account-block-title">Mes Notes Partagées</h2>
              <p className="account-block-subtitle">Notes que vous avez partagées avec d'autres</p>
            </div>
            <button className="account-create-button">
              ➕ Partager une note
            </button>
          </div>
          <div className="account-block-content">
            {loading ? (
              <SimpleLoadingState message="Chargement" />
            ) : sharedNotes.length === 0 ? (
              <div className="account-empty-state">
                <span className="account-empty-icon">📤</span>
                <h3>Aucune note partagée</h3>
                <p>Commencez à partager vos notes pour les voir apparaître ici</p>
              </div>
            ) : (
              <div className="shared-notes-grid">
                {sharedNotes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    className="shared-note-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="shared-note-header">
                      <h3 className="shared-note-title">{note.title}</h3>
                      <div className="shared-note-badges">
                        {note.isPublic ? (
                          <span className="shared-note-badge public">🌐 Public</span>
                        ) : (
                          <span className="shared-note-badge private">🔒 Privé</span>
                        )}
                      </div>
                    </div>
                    <div className="shared-note-author">
                      <span className="shared-note-author-name">Par {note.author}</span>
                      <span className="shared-note-author-username">{note.authorUsername}</span>
                    </div>
                    <p className="shared-note-summary">{note.summary}</p>
                    <div className="shared-note-tags">
                      {note.tags.map((tag) => (
                        <span key={tag} className="shared-note-tag">#{tag}</span>
                      ))}
                    </div>
                    <div className="shared-note-meta">
                      <span className="shared-note-date">Partagé le {new Date(note.sharedAt).toLocaleDateString()}</span>
                      <span className="shared-note-views">{note.viewCount} vues</span>
                    </div>
                    <div className="shared-note-actions">
                      <button className="account-button-primary">
                        👁️ Lire
                      </button>
                      <button className="account-button-secondary">
                        ⚙️ Gérer
                      </button>
                      <button className="account-button-danger">
                        🗑️ Supprimer
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Section Statistiques */}
        <motion.div 
          className="account-glass-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="account-block-header">
            <div className="account-block-icon">📊</div>
            <div>
              <h2 className="account-block-title">Statistiques</h2>
              <p className="account-block-subtitle">Vue d'ensemble de vos partages</p>
            </div>
          </div>
          <div className="account-block-content">
            <div className="shared-stats-grid">
              <div className="shared-stat-item">
                <div className="shared-stat-number">{totalReceived}</div>
                <div className="shared-stat-label">Notes reçues</div>
              </div>
              <div className="shared-stat-item">
                <div className="shared-stat-number">{totalShared}</div>
                <div className="shared-stat-label">Notes partagées</div>
              </div>
              <div className="shared-stat-item">
                <div className="shared-stat-number">
                  {sharedNotes.reduce((acc, note) => acc + note.viewCount, 0)}
                </div>
                <div className="shared-stat-label">Vues totales</div>
              </div>
              <div className="shared-stat-item">
                <div className="shared-stat-number">
                  {receivedNotes.filter(note => note.isPublic).length}
                </div>
                <div className="shared-stat-label">Notes publiques</div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </>
  );
} 