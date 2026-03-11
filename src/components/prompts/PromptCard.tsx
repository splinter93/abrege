/**
 * Carte prompt éditeur (structure 3 zones : Header, Body, Footer — aligné AgentCard)
 */
import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { getIconComponent } from '@/utils/iconMapper';
import { Power, PowerOff, Edit2, Trash2 } from 'lucide-react';

interface PromptCardProps {
  prompt: EditorPrompt;
  agents: Agent[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  agents: _agents,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const Icon = getIconComponent(prompt.icon);
  const templatePreview = (() => {
    const normalized = (prompt.prompt_template || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return 'Template vide.';
    return normalized.length > 160 ? `${normalized.slice(0, 160).trim()}...` : normalized;
  })();

  return (
    <div
      className={`group relative flex flex-col bg-[var(--surface-card)] rounded-xl hover:border-white/[0.2] transition-all duration-300 overflow-hidden shadow-sm h-full cursor-pointer ${!prompt.is_active ? 'opacity-60' : ''}`}
      style={{ border: 'var(--border-card)' }}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
    >
      {/* 1. HEADER : Icon + Nom + Actions (Hover) */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/[0.1] flex items-center justify-center text-neutral-300 overflow-hidden">
              <Icon className="w-5 h-5" />
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface-card)] ${prompt.is_active ? 'bg-emerald-500' : 'bg-neutral-600'}`}
              title={prompt.is_active ? 'Actif' : 'Inactif'}
            />
          </div>
          <h3 className="text-[15px] font-semibold text-neutral-100 tracking-tight leading-tight truncate">
            {prompt.name}
          </h3>
        </div>

        <button
          type="button"
          title={prompt.is_active ? 'Désactiver' : 'Activer'}
          className={`flex items-center justify-center w-7 h-7 rounded-md border transition-all shrink-0 ${
            prompt.is_active
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
              : 'bg-neutral-800/60 border-neutral-600/80 text-neutral-500 hover:bg-neutral-700/60 hover:text-neutral-400'
          }`}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {prompt.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. BODY : Aperçu du template */}
      <div className="px-5 pb-4 flex-1 min-h-0">
        <p className="text-[13px] text-neutral-400 leading-relaxed line-clamp-2">
          {templatePreview}
        </p>
      </div>

      {/* 3. FOOTER : Contexte à gauche + Actions (Modifier / Supprimer au hover) */}
      <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between mt-auto">
        {(() => {
          const ctx = prompt.context ?? 'editor';
          const config = {
            editor: { label: 'Éditeur', color: 'text-emerald-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/50' },
            chat:   { label: 'Chat',    color: 'text-blue-400',    bg: 'bg-zinc-800/40', border: 'border-zinc-700/50' },
            both:   { label: 'Chat · Éditeur', color: 'text-violet-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/50' },
          }[ctx] ?? { label: 'Éditeur', color: 'text-emerald-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/50' };
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${config.color} ${config.bg} ${config.border}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0" />
              {config.label}
            </span>
          );
        })()}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            title="Modifier"
            className="w-7 h-7 flex items-center justify-center rounded-md border text-neutral-500 hover:text-neutral-200 transition-all"
            style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Supprimer"
            className="w-7 h-7 flex items-center justify-center rounded-md border text-neutral-500 hover:text-rose-400 transition-all"
            style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptCard;
