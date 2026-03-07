/**
 * Page de gestion des prompts éditeur (style Linear / Vercel, aligné Agents)
 * @module app/private/prompts/page
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEditorPrompts } from '@/hooks/useEditorPrompts';
import { useAgents } from '@/hooks/useAgents';
import PromptCard from '@/components/prompts/PromptCard';
import PromptListItem from '@/components/prompts/PromptListItem';
import PromptFormModal from '@/components/prompts/PromptFormModal';
import PageWithSidebarLayout from '@/components/PageWithSidebarLayout';
import AuthGuard from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { EditorPrompt, EditorPromptCreateRequest } from '@/types/editorPrompts';
import { simpleLogger as logger } from '@/utils/logger';
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
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
  const { prompts, loading, error, createPrompt, updatePrompt, deletePrompt } = useEditorPrompts(user?.id, { includeInactive: true });
  const { agents } = useAgents();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<EditorPrompt | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const effectiveViewMode = isMobile ? 'list' : viewMode;

  const sortedPrompts = useMemo(
    () =>
      [...prompts].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [prompts]
  );

  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return sortedPrompts;
    const q = searchQuery.trim().toLowerCase();
    return sortedPrompts.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.prompt_template || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [sortedPrompts, searchQuery]);

  const activeCount = useMemo(() => sortedPrompts.filter(p => p.is_active).length, [sortedPrompts]);

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
          setEditingPrompt(updated);
        }
      } else {
        const created = await createPrompt(data);
        if (created) {
          logger.info('[PromptsPage] ✅ Prompt créé');
          setEditingPrompt(created);
        }
      }
    } catch (err) {
      logger.error('[PromptsPage] ❌ Erreur sauvegarde:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prompt ?')) return;
    const success = await deletePrompt(id, false);
    if (success) logger.info('[PromptsPage] ✅ Prompt supprimé');
  };

  const handleToggle = async (prompt: EditorPrompt) => {
    const updated = await updatePrompt(prompt.id, { is_active: !prompt.is_active });
    if (updated) logger.info(`[PromptsPage] ✅ Prompt ${prompt.is_active ? 'désactivé' : 'activé'}`);
  };

  if (authLoading || !user?.id) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement" />
      </PageWithSidebarLayout>
    );
  }

  if (loading) {
    return (
      <PageWithSidebarLayout>
        <SimpleLoadingState message="Chargement des prompts" />
      </PageWithSidebarLayout>
    );
  }

  if (error) {
    return (
      <PageWithSidebarLayout>
        <div className="min-h-[40vh] flex items-center justify-center px-4">
          <p className="text-zinc-400">Erreur: {error}</p>
        </div>
      </PageWithSidebarLayout>
    );
  }

  return (
    <PageWithSidebarLayout>
      {isModalOpen ? (
        /* ── Vue formulaire : plein écran dans le layout ── */
        <PromptFormModal
          prompt={editingPrompt}
          agents={agents}
          onSave={handleSave}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPrompt(null);
          }}
        />
      ) : (
        /* ── Vue liste ── */
        <div className="page-content-inner page-content-inner-prompts bg-[var(--color-bg-primary)] w-full max-w-none mx-0">
          {/* En-tête de contenu — style Linear (titre gradient + sous-titre) */}
          <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-4 pb-6 sm:pb-6">
            <div className="mb-10 mt-5 sm:mt-8 flex w-full items-center justify-between">
              <div className="flex flex-col items-start font-sans">
                <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
                  Prompts
                </h1>
                <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
                  Templates et prompts personnalisés pour l&apos;éditeur.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Prompt</span>
                </button>
              </div>
            </div>

            {/* Ligne 2 : Barre de recherche + toggle vue */}
            <div className="flex items-center gap-3 w-full mb-6 justify-between">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Rechercher…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 rounded-xl pl-9 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-[var(--color-border-block)] transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
                />
              </div>
              {!isMobile && (
                <div
                  className="flex shrink-0 items-center gap-1 rounded-xl p-0.5"
                  style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-lg p-2 transition-all ${effectiveViewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Vue grille"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`rounded-lg p-2 transition-all ${effectiveViewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="Vue liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

          {filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-1">Aucun prompt personnalisé</h3>
              <p className="text-zinc-500 text-sm max-w-sm mb-6">
                Créez votre premier prompt pour enrichir l&apos;éditeur.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200"
              >
                New Prompt
              </button>
            </div>
          ) : effectiveViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPrompts.map(prompt => (
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
          ) : (
            <div className="prompts-list-view flex flex-col rounded-xl">
              {filteredPrompts.map(prompt => (
                <PromptListItem
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
          </div>
        </div>
      )}
    </PageWithSidebarLayout>
  );
}
