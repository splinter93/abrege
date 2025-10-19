/**
 * Page de gestion des prompts éditeur
 * @module app/ai/prompts/page
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useAgents } from '@/hooks/useAgents';
import PromptCard from '@/components/prompts/PromptCard';
import PromptFormModal from '@/components/prompts/PromptFormModal';
import UnifiedSidebar from '@/components/UnifiedSidebar';
import UnifiedPageTitle from '@/components/UnifiedPageTitle';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';
import { Zap } from 'lucide-react';
import '@/styles/main.css';
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
  const { prompts, loading, error, createPrompt, updatePrompt, deletePrompt, reorderPrompts } = useEditorPrompts(user?.id);
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
        // Mise à jour
        const updated = await updatePrompt(editingPrompt.id, data);
        if (updated) {
          logger.info('[PromptsPage] ✅ Prompt mis à jour');
          setIsModalOpen(false);
          setEditingPrompt(null);
        }
      } else {
        // Création
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

  if (loading) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <div className="prompts-loading">
            <div className="prompts-loading-spinner"></div>
            <p>Chargement des prompts...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <aside className="page-sidebar-fixed">
          <UnifiedSidebar />
        </aside>
        <main className="page-content-area">
          <div className="prompts-error">
            <p>❌ Erreur: {error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <aside className="page-sidebar-fixed">
        <UnifiedSidebar />
      </aside>
      
      <main className="page-content-area">
        <div className="prompts-container">
          {/* Titre unifié avec icône */}
          <UnifiedPageTitle
            icon={Zap}
            title="Prompts de l'éditeur"
            subtitle="Personnalisez les actions IA disponibles dans votre éditeur"
            action={
              <button onClick={handleCreate} className="prompts-create-btn">
                + Nouveau prompt
              </button>
            }
          />

          {/* Contenu */}
          {prompts.length === 0 ? (
            <div className="prompts-empty">
              <div className="prompts-empty-icon">✨</div>
              <h3>Aucun prompt personnalisé</h3>
              <p>Créez votre premier prompt pour enrichir l'éditeur</p>
              <button onClick={handleCreate} className="prompts-empty-cta">
                Créer un prompt
              </button>
            </div>
          ) : (
            <div className="prompts-grid">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  agents={agents}
                  onEdit={() => handleEdit(prompt)}
                  onDelete={() => handleDelete(prompt.id)}
                  onToggle={() => handleToggle(prompt)}
                />
              ))}
            </div>
          )}

          {/* Modal de création/édition */}
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
        </div>
      </main>
    </div>
  );
}


