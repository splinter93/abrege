/**
 * Carte prompt éditeur (style Linear / Vercel, aligné AgentCard)
 */
import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { getIconComponent } from '@/utils/iconMapper';
import { Power, Edit2, Trash2 } from 'lucide-react';

interface PromptCardProps {
  prompt: EditorPrompt;
  agents: Agent[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  agents,
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
      className={`group flex flex-col p-5 rounded-2xl transition-all duration-300 cursor-pointer hover:bg-[var(--color-bg-hover)] ${!prompt.is_active ? 'opacity-60' : ''}`}
      style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
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
      <div className="flex items-start justify-between gap-3 mb-4">
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

        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
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

      <div className="flex flex-col gap-1.5 min-h-0 flex-1">
        <h3 className="text-base font-semibold text-zinc-100 truncate">{prompt.name}</h3>
        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{templatePreview}</p>
      </div>
    </div>
  );
};

export default PromptCard;
