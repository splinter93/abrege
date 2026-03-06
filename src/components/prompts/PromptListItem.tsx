/**
 * Ligne prompt en vue liste (style Linear, aligné AgentListItem)
 */
import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { getIconComponent } from '@/utils/iconMapper';
import { Power, Edit2, Trash2 } from 'lucide-react';

interface PromptListItemProps {
  prompt: EditorPrompt;
  agents: Agent[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const PromptListItem: React.FC<PromptListItemProps> = ({
  prompt,
  agents,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const Icon = getIconComponent(prompt.icon);
  const agent = agents.find(a => a.id === prompt.agent_id);
  const agentDisplayName = agent?.display_name ?? agent?.name ?? (prompt.agent_id ? 'Agent' : 'Aucun agent');
  const contextLabel =
    prompt.context === 'editor'
      ? 'Éditeur'
      : prompt.context === 'chat'
        ? 'Chat'
        : prompt.context === 'both'
          ? 'Éditeur + Chat'
          : null;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 hover:bg-zinc-800/20 transition-colors cursor-pointer"
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
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-800/60 flex items-center justify-center text-zinc-300">
            <Icon size={20} />
          </div>
          {prompt.is_active && (
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-bg-primary)]"
              title="Actif"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-100 truncate">{prompt.name}</p>
          <p className="text-xs text-zinc-500 truncate">
            {contextLabel && `${contextLabel} · `}
            {agentDisplayName}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end sm:justify-between gap-2 sm:gap-4 flex-shrink-0">
        {contextLabel && (
          <span className="hidden sm:inline-flex px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/80 text-[10px] text-zinc-500">
            {contextLabel}
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={prompt.is_active ? 'Désactiver' : 'Activer'}
            onClick={e => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
          >
            <Power className={`w-4 h-4 ${prompt.is_active ? 'text-emerald-500' : ''}`} />
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

export default PromptListItem;
