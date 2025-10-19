/**
 * Page de gestion des prompts éditeur - Version avec layout unifié
 * @module app/ai/prompts/page
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import { useAuth } from '@/hooks/useAuth';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useAgents } from '@/hooks/useAgents';
import PromptCard from '@/components/prompts/PromptCard';
import PromptFormModal from '@/components/prompts/PromptFormModal';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';
import { Zap, Plus } from 'lucide-react';
import '@/styles/main.css';
import '@/styles/account.css';
import '@/app/(public)/dashboard.css';
import './prompts.css';

export default function PromptsPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <PromptsPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function PromptsPageContent() {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading || !user?.id) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <div className="loading-state">
            <p>Chargement...</p>
          </div>
        </main>
      </div>
    );
  }
  
  return <AuthenticatedPromptsContent user={user} />;
}

function AuthenticatedPromptsContent({ user }: { user: { id: string; email?: string; username?: string } }) {
  const { prompts, loading, error, createPrompt, updatePrompt, deletePrompt } = useEditorPrompts(user.id);
  const { agents } = useAgents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<EditorPrompt | null>(null);

  /**
   * Gère la création d'un nouveau prompt
   */
  const handleCreate = () => {
    setEditingPrompt(null);
    setIsModalOpen(true);
  };

  /**
   * Gère l'édition d'un prompt existant
   */
  const handleEdit = (prompt: EditorPrompt) => {
    setEditingPrompt(prompt);
    setIsModalOpen(true);
  };

  /**
   * Gère la sauvegarde (création ou mise à jour)
   */
  const handleSave = async (data: EditorPromptCreateRequest) => {
    try {
      if (editingPrompt) {
        const updated = await updatePrompt(editingPrompt.id, data);
        if (updated) {
          logger.info('[PromptsPage] ✅ Prompt mis à jour');
          setIsModalOpen(false);
          setEditingPrompt(null);
        }
      } else {
        const created = await createPrompt(data);
        if (created) {
          logger.info('[PromptsPage] ✅ Prompt créé');
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      logger.error('[PromptsPage] ❌ Erreur sauvegarde:', err);
    }
  };

  /**
   * Gère la suppression d'un prompt
   */
  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) {
      return;
    }

    const success = await deletePrompt(id, false);
    if (success) {
      logger.info('[PromptsPage] ✅ Prompt supprimé');
    }
  };

  /**
   * Gère le toggle actif/inactif
   */
  const handleToggle = async (prompt: EditorPrompt) => {
    const updated = await updatePrompt(prompt.id, {
      is_active: !prompt.is_active
    });
    
    if (updated) {
      logger.info(`[PromptsPage] ✅ Prompt ${prompt.is_active ? 'désactivé' : 'activé'}`);
    }
  };

  return (
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>

      <main className="page-content-area">
        <UnifiedPageTitle
          icon={<Zap size={24} />}
          title="Prompts de l'éditeur"
          subtitle="Personnalisez les actions IA disponibles dans votre éditeur"
        />

        <div className="account-content">
          {/* Carte 1: Mes Prompts */}
          <motion.section
            className="account-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="account-section-header">
              <div>
                <h2 className="account-section-title">Mes Prompts</h2>
                <p className="account-section-description">
                  {prompts.length} prompt{prompts.length > 1 ? 's' : ''} configuré{prompts.length > 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={handleCreate} className="account-button-primary">
                <Plus size={16} />
                Nouveau prompt
              </button>
            </div>

            {loading ? (
              <div className="account-loading">
                <div className="account-loading-spinner"></div>
                <p>Chargement des prompts...</p>
              </div>
            ) : error ? (
              <div className="account-error">
                <p>❌ Erreur: {error}</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="account-empty">
                <div className="account-empty-icon">
                  <Zap size={48} strokeWidth={1.5} />
                </div>
                <h3 className="account-empty-title">Aucun prompt personnalisé</h3>
                <p className="account-empty-description">
                  Créez votre premier prompt pour enrichir l'éditeur
                </p>
                <button onClick={handleCreate} className="account-button-primary">
                  <Plus size={16} />
                  Créer un prompt
                </button>
              </div>
            ) : (
              <div className="prompts-grid">
                {prompts.map((prompt, index) => (
                  <motion.div
                    key={prompt.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <PromptCard
                      prompt={prompt}
                      agents={agents}
                      onEdit={() => handleEdit(prompt)}
                      onDelete={() => handleDelete(prompt.id)}
                      onToggle={() => handleToggle(prompt)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Carte 2: Guide rapide */}
          <motion.section
            className="account-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="account-section-header">
              <h2 className="account-section-title">Guide rapide</h2>
              <p className="account-section-description">
                Configuration des prompts AskAI
              </p>
            </div>

            <div className="prompts-guide">
              <div className="prompts-guide-item">
                <h3 className="prompts-guide-item-title">🔄 Modes d'insertion</h3>
                <ul className="prompts-guide-list">
                  <li><strong>Remplacer :</strong> Écrase la sélection (correction, reformulation)</li>
                  <li><strong>Ajouter après :</strong> Garde l'original et ajoute après (expliquer, développer)</li>
                  <li><strong>Ajouter avant :</strong> Garde l'original et ajoute avant (intro, contexte)</li>
                </ul>
              </div>

              <div className="prompts-guide-item">
                <h3 className="prompts-guide-item-title">📋 Format strict</h3>
                <p className="prompts-guide-text">
                  Active le mode JSON pour éliminer les phrases parasites du LLM comme 
                  "Voici la correction :" ou "J'ai reformulé le texte...".
                </p>
                <p className="prompts-guide-text">
                  <strong>Recommandé pour :</strong> Corriger, traduire, simplifier, reformuler
                </p>
              </div>

              <div className="prompts-guide-item">
                <h3 className="prompts-guide-item-title">💡 Astuce</h3>
                <p className="prompts-guide-text">
                  Utilisez <code>{'{selection}'}</code> dans le template pour insérer 
                  automatiquement le texte sélectionné dans l'éditeur.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </main>

      {/* Modal de formulaire */}
      <AnimatePresence>
        {isModalOpen && (
          <PromptFormModal
            prompt={editingPrompt}
            agents={agents}
            onSave={handleSave}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingPrompt(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
