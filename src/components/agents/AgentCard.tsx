import React from 'react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Power, Edit2, Trash2 } from 'lucide-react';

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
  const avatarUrl = agent.profile_picture;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      className={`group flex flex-col p-5 rounded-2xl border border-solid bg-[var(--color-bg-block)] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer ${!agent.is_active ? 'opacity-60' : ''}`}
      style={{ borderColor: 'var(--color-border-block)', borderWidth: 'var(--border-block-width)' }}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Top: avatar + actions (actions visible on group-hover) */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-800/60"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-800/60 flex items-center justify-center text-zinc-300 text-sm font-semibold uppercase">
              {(displayName || '?').slice(0, 2)}
            </div>
          )}
          {agent.is_active && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-bg-primary)]"
              title="Actif"
            />
          )}
        </div>

        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title={agent.is_active ? 'Désactiver' : 'Activer'}
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Power className={`w-4 h-4 ${agent.is_active ? 'text-emerald-500' : ''}`} />
          </button>
          <button
            type="button"
            title="Modifier"
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Supprimer"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main: title + description */}
      <div className="flex flex-col gap-1.5 min-h-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-100 truncate">{displayName}</h3>
        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{description}</p>
      </div>

      {/* Footer: model tag (code style) */}
      <div className="mt-4 pt-4 border-t border-zinc-800/40">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/80 font-mono text-[10px] text-zinc-400 max-w-full truncate">
          {modelLabel}
        </span>
      </div>
    </div>
  );
};

export default AgentCard;
