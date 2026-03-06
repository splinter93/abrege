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
  const modelDisplay = modelLabel.length > 24 ? `${modelLabel.slice(0, 21)}…` : modelLabel;
  const avatarUrl = agent.profile_picture;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      className="flex flex-row items-center justify-between gap-3 sm:gap-4 p-4 hover:bg-zinc-800/20 transition-colors cursor-pointer min-h-[72px]"
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Left: avatar + name + role (truncate si trop long) */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
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
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="font-semibold text-zinc-100 truncate" title={displayName}>{displayName}</p>
          <p className="text-xs text-zinc-500 truncate" title={roleOrDesc}>{roleOrDesc}</p>
        </div>
      </div>

      {/* Right: model tag (caché mobile) + actions — ne pas passer à la ligne */}
      <div className="flex items-center justify-end sm:justify-between gap-2 sm:gap-4 flex-shrink-0 flex-nowrap">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/80 font-mono text-[10px] text-zinc-400 max-w-[140px] min-w-0 truncate" title={modelLabel}>
          {modelDisplay}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={agent.is_active ? 'Désactiver' : 'Activer'}
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Power className={`w-3.5 h-3.5 ${agent.is_active ? 'text-emerald-500' : ''}`} />
          </button>
          <button
            type="button"
            title="Modifier"
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Supprimer"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentListItem;
