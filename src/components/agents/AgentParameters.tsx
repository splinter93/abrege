import React, { useState } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { GROQ_MODELS_BY_CATEGORY } from '@/constants/groqModels';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import type { AgentSchemaLink, OpenApiSchema } from '@/hooks/useOpenApiSchemas';
import type { AgentCallableLink, CallableListItem } from '@/hooks/useCallables';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

const inputBase =
  'w-full px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-100 text-sm placeholder:text-zinc-500 focus:border-zinc-600 focus:bg-zinc-800/20 focus:outline-none transition-colors';
const labelBase = 'text-xs font-medium text-zinc-400 block mb-1.5';
const boxBase = 'p-6 rounded-2xl border border-zinc-800/40 bg-[var(--color-bg-primary)]';

/* Custom slider: track + fill + native input (value/onChange preserved) */
function CustomSlider({
  id,
  label,
  valueDisplay,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  valueDisplay: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={labelBase} htmlFor={id}>
          {label}
        </label>
        <span className="font-mono text-xs text-zinc-500">{valueDisplay}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-zinc-300 hover:bg-white transition-colors pointer-events-none"
          style={{ width: `${percent}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="relative z-10 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:hover:bg-white [&::-webkit-slider-thumb]:transition-colors [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-300 [&::-moz-range-thumb]:border-0"
        />
      </div>
    </div>
  );
}

/* Tool row: badge line + remove on hover */
function ToolItem({
  children,
  onRemove,
  titleRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  titleRemove: string;
}) {
  return (
    <div className="group flex items-center justify-between gap-2 p-2.5 rounded-lg border border-zinc-800/40 bg-zinc-900/20 hover:border-zinc-700/50 transition-colors">
      <div className="min-w-0 truncate text-sm text-zinc-200">{children}</div>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        title={titleRemove}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface AgentParametersProps {
  selectedAgent: SpecializedAgentConfig | null;
  editedAgent: Partial<SpecializedAgentConfig> | null;
  loadingDetails: boolean;
  openApiSchemas: OpenApiSchema[];
  agentOpenApiSchemas: AgentSchemaLink[];
  openApiLoading: boolean;
  mcpServers: McpServer[];
  agentMcpServers: AgentMcpServerWithDetails[];
  mcpLoading: boolean;
  availableCallables?: CallableListItem[];
  agentCallables?: AgentCallableLink[];
  callablesLoading?: boolean;
  onLinkSchema: (agentId: string, schemaId: string) => Promise<void>;
  onUnlinkSchema: (agentId: string, schemaId: string) => Promise<void>;
  onLinkServer: (agentId: string, serverId: string) => Promise<boolean>;
  onUnlinkServer: (agentId: string, serverId: string) => Promise<boolean>;
  onLinkCallable?: (agentId: string, callableId: string) => Promise<boolean>;
  onUnlinkCallable?: (agentId: string, callableId: string) => Promise<boolean>;
  isSchemaLinked: (schemaId: string) => boolean;
  isServerLinked: (serverId: string) => boolean;
  isCallableLinked?: (callableId: string) => boolean;
  onUpdateField: <K extends keyof SpecializedAgentConfig>(
    field: K,
    value: SpecializedAgentConfig[K]
  ) => void;
}

export function AgentParameters({
  selectedAgent,
  editedAgent,
  loadingDetails,
  openApiSchemas,
  agentOpenApiSchemas,
  openApiLoading,
  mcpServers,
  agentMcpServers,
  mcpLoading,
  availableCallables = [],
  agentCallables = [],
  callablesLoading = false,
  onLinkSchema,
  onUnlinkSchema,
  onLinkServer,
  onUnlinkServer,
  onLinkCallable,
  onUnlinkCallable,
  isSchemaLinked,
  isServerLinked,
  isCallableLinked = () => false,
  onUpdateField,
}: AgentParametersProps) {
  const [showOpenApiDropdown, setShowOpenApiDropdown] = useState(false);
  const [showMcpDropdown, setShowMcpDropdown] = useState(false);
  const [showCallablesDropdown, setShowCallablesDropdown] = useState(false);

  const isCreating = !selectedAgent && editedAgent !== null;

  if (loadingDetails) {
    return (
      <div className="py-8">
        <SimpleLoadingState message="Chargement des réglages" />
      </div>
    );
  }

  if (!editedAgent) {
    return (
      <div className="py-12 text-center">
        <div className="text-4xl">🤖</div>
        <h3 className="mt-4 text-lg font-semibold text-zinc-100">Sélectionnez un agent</h3>
        <p className="mt-1 text-sm text-zinc-500">Choisissez un agent pour accéder aux réglages avancés.</p>
      </div>
    );
  }

  const handleLinkSchema = async (schemaId: string) => {
    if (!selectedAgent) return;
    await onLinkSchema(selectedAgent.id, schemaId);
    setShowOpenApiDropdown(false);
  };

  const handleUnlinkSchema = async (schemaId: string) => {
    if (!selectedAgent) return;
    await onUnlinkSchema(selectedAgent.id, schemaId);
  };

  const handleLinkServer = async (serverId: string) => {
    if (!selectedAgent) return;
    const linked = await onLinkServer(selectedAgent.id, serverId);
    if (linked) setShowMcpDropdown(false);
  };

  const handleUnlinkServer = async (serverId: string) => {
    if (!selectedAgent) return;
    await onUnlinkServer(selectedAgent.id, serverId);
  };

  const handleLinkCallable = async (callableId: string) => {
    if (!onLinkCallable || !selectedAgent) return;
    const linked = await onLinkCallable(selectedAgent.id, callableId);
    if (linked) setShowCallablesDropdown(false);
  };

  const handleUnlinkCallable = async (callableId: string) => {
    if (!onUnlinkCallable || !selectedAgent) return;
    await onUnlinkCallable(selectedAgent.id, callableId);
  };


  return (
    <div className="space-y-8">
      {/* Modèle LLM */}
      <section className={boxBase}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Modèle LLM</h3>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 relative">
            <label className="sr-only" htmlFor="agent-model">
              Modèle LLM
            </label>
            <select
              id="agent-model"
              className={`${inputBase} cursor-pointer pr-10 appearance-none`}
              value={editedAgent.model || ''}
              onChange={e => onUpdateField('model', e.target.value)}
            >
              {!editedAgent.model && <option value="">-- Choisissez un modèle --</option>}
              {Object.entries(GROQ_MODELS_BY_CATEGORY).map(([category, models]) => (
                <optgroup key={category} label={category}>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.recommended ? '⭐' : ''} • {model.speed} TPS
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </section>

      {/* Réglages principaux : sliders */}
      <section className={boxBase}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-6">Réglages principaux</h3>
        <div className="space-y-6">
          <CustomSlider
            id="agent-temperature"
            label="Température"
            valueDisplay={(editedAgent.temperature ?? 0).toFixed(1)}
            min={0}
            max={2}
            step={0.1}
            value={editedAgent.temperature ?? 0}
            onChange={v => onUpdateField('temperature', v)}
          />
          <CustomSlider
            id="agent-top-p"
            label="Top P"
            valueDisplay={(editedAgent.top_p ?? 1).toFixed(2)}
            min={0}
            max={1}
            step={0.05}
            value={editedAgent.top_p ?? 1}
            onChange={v => onUpdateField('top_p', v)}
          />
          <CustomSlider
            id="agent-max-tokens"
            label="Max tokens"
            valueDisplay={String(editedAgent.max_tokens ?? 0)}
            min={1}
            max={128000}
            step={100}
            value={editedAgent.max_tokens ?? 0}
            onChange={v => onUpdateField('max_tokens', Math.round(v))}
          />
        </div>
      </section>

      {/* OpenAPI Tools */}
      <section className={boxBase}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">OpenAPI Tools</h3>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setShowOpenApiDropdown(v => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-xs font-medium hover:bg-zinc-800/30 hover:text-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          )}
        </div>
        {showOpenApiDropdown && openApiSchemas.length > 0 && (
          <div className="mb-4 space-y-1">
            {openApiSchemas
              .filter(schema => !isSchemaLinked(schema.id))
              .map(schema => (
                <button
                  key={schema.id}
                  type="button"
                  className="w-full text-left px-2.5 py-2 rounded-lg border border-zinc-800/40 bg-zinc-900/20 text-zinc-300 text-sm hover:bg-zinc-800/30 transition-colors"
                  onClick={() => handleLinkSchema(schema.id)}
                >
                  {schema.name}
                </button>
              ))}
            {openApiSchemas.filter(schema => !isSchemaLinked(schema.id)).length === 0 && (
              <p className="text-xs text-zinc-500 px-2.5 py-2">Tous les schémas disponibles sont déjà liés</p>
            )}
          </div>
        )}
        {isCreating ? (
          <p className="text-xs text-zinc-500">Les outils OpenAPI peuvent être configurés après la création de l&apos;agent.</p>
        ) : openApiLoading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
            Chargement…
          </div>
        ) : agentOpenApiSchemas.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucun schéma OpenAPI lié.</p>
        ) : (
          <div className="space-y-2">
            {agentOpenApiSchemas.map(schema => (
              <ToolItem
                key={schema.id}
                onRemove={() => handleUnlinkSchema(schema.openapi_schema_id)}
                titleRemove="Retirer ce schéma"
              >
                {schema.openapi_schema?.name ?? schema.openapi_schema_id}
              </ToolItem>
            ))}
          </div>
        )}
      </section>

      {/* MCP Tools */}
      <section className={boxBase}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">MCP Tools</h3>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setShowMcpDropdown(v => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-xs font-medium hover:bg-zinc-800/30 hover:text-zinc-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          )}
        </div>
        {showMcpDropdown && mcpServers.length > 0 && (
          <div className="mb-4 space-y-1">
            {mcpServers
              .filter(server => !isServerLinked(server.id))
              .map(server => (
                <button
                  key={server.id}
                  type="button"
                  className="w-full text-left px-2.5 py-2 rounded-lg border border-zinc-800/40 bg-zinc-900/20 text-zinc-300 text-sm hover:bg-zinc-800/30 transition-colors"
                  onClick={() => handleLinkServer(server.id)}
                >
                  {server.name}
                </button>
              ))}
            {mcpServers.filter(server => !isServerLinked(server.id)).length === 0 && (
              <p className="text-xs text-zinc-500 px-2.5 py-2">Tous les serveurs disponibles sont déjà liés</p>
            )}
          </div>
        )}
        {isCreating ? (
          <p className="text-xs text-zinc-500">Les outils MCP peuvent être configurés après la création de l&apos;agent.</p>
        ) : mcpLoading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
            Chargement…
          </div>
        ) : agentMcpServers.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucun serveur MCP lié.</p>
        ) : (
          <div className="space-y-2">
            {agentMcpServers.map(link => (
              <ToolItem
                key={link.id}
                onRemove={() => handleUnlinkServer(link.mcp_server_id)}
                titleRemove="Retirer ce serveur"
              >
                {link.mcp_server.name}
              </ToolItem>
            ))}
          </div>
        )}
      </section>

      {/* Callables Synesia */}
      {onLinkCallable && onUnlinkCallable && (
        <section className={boxBase}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Callables Synesia</h3>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setShowCallablesDropdown(v => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30 text-zinc-400 text-xs font-medium hover:bg-zinc-800/30 hover:text-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            )}
          </div>
          {showCallablesDropdown && availableCallables.length > 0 && (
            <div className="mb-4 space-y-1">
              {availableCallables
                .filter(callable => !isCallableLinked(callable.id))
                .map(callable => (
                  <button
                    key={callable.id}
                    type="button"
                    className="w-full text-left px-2.5 py-2 rounded-lg border border-zinc-800/40 bg-zinc-900/20 text-zinc-300 text-sm hover:bg-zinc-800/30 transition-colors"
                    onClick={() => handleLinkCallable(callable.id)}
                  >
                    <span>{callable.name}</span>
                    {callable.type && (
                      <span className="ml-2 text-[10px] text-zinc-500 font-mono">{callable.type}</span>
                    )}
                  </button>
                ))}
              {availableCallables.filter(callable => !isCallableLinked(callable.id)).length === 0 && (
                <p className="text-xs text-zinc-500 px-2.5 py-2">Tous les callables disponibles sont déjà liés</p>
              )}
            </div>
          )}
          {isCreating ? (
            <p className="text-xs text-zinc-500">Les callables peuvent être configurés après la création de l&apos;agent.</p>
          ) : callablesLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <span className="inline-block w-4 h-4 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
              Chargement…
            </div>
          ) : agentCallables.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun callable lié.</p>
          ) : (
            <div className="space-y-2">
              {agentCallables.map(link => (
                <ToolItem
                  key={link.id}
                  onRemove={() => handleUnlinkCallable(link.callable_id)}
                  titleRemove="Retirer ce callable"
                >
                  <span>{link.synesia_callable.name}</span>
                  {link.synesia_callable.type && (
                    <span className="ml-2 text-[10px] text-zinc-500 font-mono">{link.synesia_callable.type}</span>
                  )}
                </ToolItem>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Réglages avancés */}
      <section className={boxBase}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Réglages avancés</h3>
        <div className="space-y-4">
          <div>
            <label className={labelBase} htmlFor="agent-priority">
              Priorité
            </label>
            <input
              id="agent-priority"
              type="number"
              className={inputBase}
              value={editedAgent.priority ?? 0}
              onChange={e => onUpdateField('priority', parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <label className={labelBase} htmlFor="agent-version">
              Version
            </label>
            <p id="agent-version" className="px-3 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/60 text-zinc-500 text-sm font-mono">
              {selectedAgent?.version || '1.0.0'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AgentParameters;
