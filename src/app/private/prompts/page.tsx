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
import { Zap, Search, LayoutGrid, List, Plus } from 'lucide-react';
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
  const { prompts, loading, error, createPrompt, updatePrompt, deletePrompt } = useEditorPrompts(user?.id);
  const { agents } = useAgents();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<EditorPrompt | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const effectiveViewMode = isMobile ? 'list' : viewMode;

  const sortedPrompts = useMemo(
    () => [...prompts].sort((a, b) => a.name.localeCompare(b.name)),
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
      <div className="page-content-inner bg-[var(--color-bg-primary)] min-h-screen w-full max-w-none mx-0">
        {/* Header sticky Linear (même style que Agents) */}
        <header className="sticky top-0 z-10 bg-[var(--color-bg-primary)]/80 backdrop-blur-xl border-b border-zinc-800/60">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-zinc-400" />
                  Prompts
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {filteredPrompts.length} {filteredPrompts.length > 1 ? 'prompts' : 'prompt'}
                  {searchQuery.trim() ? '' : ` · ${activeCount} actifs`}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 sm:min-w-[200px] sm:max-w-[260px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Rechercher…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {!isMobile && (
                    <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${effectiveViewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Vue grille"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-colors ${effectiveViewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Vue liste"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors whitespace-nowrap flex-1 sm:flex-none"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau prompt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
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
                className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Créer un prompt
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
            <div className="flex flex-col border border-zinc-800/40 rounded-xl overflow-hidden divide-y divide-zinc-800/40">
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
    </PageWithSidebarLayout>
  );
}
