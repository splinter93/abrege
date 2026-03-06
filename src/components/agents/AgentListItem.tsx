import React from 'react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { Power, Edit2, Trash2 } from 'lucide-react';

interface AgentListItemProps {
  agent: SpecializedAgentConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const AgentListItem: React.FC<AgentListItemProps> = ({ agent, onEdit, onDelete, onToggle }) => {
  const displayName = agent.display_name || agent.name;
  const roleOrDesc =
    agent.description || agent.system_instructions || agent.category || 'Agent';
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
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 hover:bg-zinc-800/20 transition-colors cursor-pointer"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Left: avatar + name + role */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
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
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-100 truncate">{displayName}</p>
          <p className="text-xs text-zinc-500 truncate">{roleOrDesc}</p>
        </div>
      </div>

      {/* Right: model tag + actions */}
      <div className="flex flex-wrap items-center justify-end sm:justify-between gap-2 sm:gap-4 flex-shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/80 font-mono text-[10px] text-zinc-400 max-w-[140px] truncate">
          {modelLabel}
        </span>
        <div className="flex items-center gap-1">
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
    </div>
  );
};

export default AgentListItem;
