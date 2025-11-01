/**
 * Page de gestion des prompts éditeur
 * @module app/private/prompts/page
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
import '@/app/ai/prompts/prompts.css';

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
  const { prompts, loading, error, createPrompt, updatePrompt, deletePrompt } = useEditorPrompts(user?.id);
  const { agents } = useAgents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<EditorPrompt | null>(null);

  const handleCreate = () => {
    setEditingPrompt(null);
    setIsModalOpen(true);
  };

  const handleEdit = (prompt: EditorPrompt) => {
    setEditingPrompt(prompt);
    setIsModalOpen(true);
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) {
      return;
    }

    const success = await deletePrompt(id, false);
    if (success) {
      logger.info('[PromptsPage] ✅ Prompt supprimé');
    }
  };

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
          <SimpleLoadingState message="Chargement" />
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
        {/* Titre avec icône */}
        <UnifiedPageTitle
          icon={Zap}
          title="Prompts"
          subtitle="Personnalisez les actions IA de votre éditeur"
          action={
            <button onClick={handleCreate} className="prompts-create-btn">
              + Nouveau prompt
            </button>
          }
        />

        {/* Liste des prompts */}
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

        {/* Modal */}
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
      </main>
    </div>
  );
}

