import React from 'react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Power, PowerOff, Edit2, Trash2 } from 'lucide-react';

interface AgentCardProps {
  agent: SpecializedAgentConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onToggle }) => {
  const displayName = agent.display_name || agent.name;
  const description =
    agent.description ||
    agent.system_instructions ||
    'Aucune description fournie pour cet agent.';
  const modelLabel = agent.model || 'Modèle non défini';
  const modelDisplay = modelLabel.length > 24 ? `${modelLabel.slice(0, 21)}…` : modelLabel;
  const avatarUrl = agent.profile_picture;
  const initials = (displayName || '?').slice(0, 2);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      className={`group relative flex flex-col bg-[var(--surface-card)] rounded-xl hover:border-white/[0.2] transition-all duration-300 overflow-hidden shadow-sm h-full cursor-pointer ${!agent.is_active ? 'opacity-60' : ''}`}
      style={{ border: 'var(--border-card)' }}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* 1. HEADER : Avatar + Nom + Actions (Hover) */}
      <div className="flex items-start justify-between p-5 pb-3 bg-[var(--surface-card)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/[0.1] flex items-center justify-center text-sm font-medium text-neutral-300 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--surface-card)] ${agent.is_active ? 'bg-emerald-500' : 'bg-neutral-600'}`}
              title={agent.is_active ? 'Actif' : 'Inactif'}
            />
          </div>
          <h3 className="text-[15px] font-semibold text-neutral-100 tracking-tight leading-tight truncate">
            {displayName}
          </h3>
        </div>

        <button
          type="button"
          title={agent.is_active ? 'Désactiver' : 'Activer'}
          className={`flex items-center justify-center w-7 h-7 rounded-md border transition-all shrink-0 ${
            agent.is_active
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
              : 'bg-neutral-800/60 border-neutral-600/80 text-neutral-500 hover:bg-neutral-700/60 hover:text-neutral-400'
          }`}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {agent.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. BODY : Description */}
      <div className="px-5 pb-4 flex-1 min-h-0 bg-[var(--surface-card)]">
        <p className="text-[13px] text-neutral-400 leading-relaxed line-clamp-2">{description}</p>
      </div>

      {/* 3. FOOTER : Modèle + Actions (Modifier / Supprimer au hover) */}
      <div className="px-5 py-3 border-t flex items-center justify-between mt-auto bg-[var(--color-bg-block)]" style={{ borderTop: 'var(--border-block)' }}>
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/80 font-mono text-[10px] text-zinc-400 max-w-[75%] min-w-0 truncate" title={modelLabel}>
          {modelDisplay}
        </span>
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

export default AgentCard;
