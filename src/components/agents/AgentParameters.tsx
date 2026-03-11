import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { ModelSelector } from '@/components/ui/ModelSelector';
import type { McpServer, AgentMcpServerWithDetails } from '@/types/mcp';
import type { AgentSchemaLink, OpenApiSchema } from '@/hooks/useOpenApiSchemas';
import type { AgentCallableLink, CallableListItem } from '@/hooks/useCallables';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';

const inputBase =
  'input-block w-full px-3 py-2 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none transition-colors';
const labelBase = 'text-xs font-medium text-zinc-400 block mb-1.5';
const boxBase = 'section-block p-4 rounded-2xl';

/* Custom slider: track + fill + native input (value/onChange preserved).
   Wrapper min-height ensures a proper touch target on mobile so the drawer scroll doesn't steal events. */
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={labelBase} htmlFor={id}>
          {label}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-md">{valueDisplay}</span>
      </div>
      <div
        className="relative min-h-[36px] flex items-center w-full rounded-full group"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="relative h-[6px] w-full rounded-full bg-zinc-800 overflow-hidden pointer-events-none ring-1 ring-inset ring-white/[0.04]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-800 to-amber-700 transition-all duration-150"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full min-h-[36px] appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-300 [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(194,65,12,0.5),0_2px_8px_rgba(0,0,0,0.5)] [&::-webkit-slider-thumb]:hover:shadow-[0_0_0_3px_rgba(194,65,12,0.6),0_2px_10px_rgba(0,0,0,0.6)] [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:active:scale-110 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-zinc-300 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_0_2px_rgba(194,65,12,0.5),0_2px_8px_rgba(0,0,0,0.5)] [&::-moz-range-thumb]:cursor-grab"
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
    <div className="section-block group flex items-center justify-between gap-2 p-2.5 rounded-lg hover:border-[var(--color-border-secondary)] transition-colors">
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

  const openApiRef = useRef<HTMLElement>(null);
  const mcpRef = useRef<HTMLElement>(null);
  const callablesRef = useRef<HTMLElement>(null);

  const closeAllDropdowns = useCallback((e: MouseEvent) => {
    if (showOpenApiDropdown && openApiRef.current && !openApiRef.current.contains(e.target as Node)) {
      setShowOpenApiDropdown(false);
    }
    if (showMcpDropdown && mcpRef.current && !mcpRef.current.contains(e.target as Node)) {
      setShowMcpDropdown(false);
    }
    if (showCallablesDropdown && callablesRef.current && !callablesRef.current.contains(e.target as Node)) {
      setShowCallablesDropdown(false);
    }
  }, [showOpenApiDropdown, showMcpDropdown, showCallablesDropdown]);

  useEffect(() => {
    if (!showOpenApiDropdown && !showMcpDropdown && !showCallablesDropdown) return;
    document.addEventListener('mousedown', closeAllDropdowns);
    return () => document.removeEventListener('mousedown', closeAllDropdowns);
  }, [closeAllDropdowns, showOpenApiDropdown, showMcpDropdown, showCallablesDropdown]);

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
          <div className="flex-1 min-w-0">
            <ModelSelector
              value={editedAgent.model || ''}
              onChange={val => onUpdateField('model', val)}
            />
          </div>
        </div>
      </section>

      {/* Réglages principaux : sliders */}
      <section className={boxBase}>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Réglages principaux</h3>
        <div className="space-y-4">
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
      <section ref={openApiRef} className={boxBase}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">OpenAPI Tools</h3>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setShowOpenApiDropdown(v => !v)}
              className="section-block inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-400 text-xs font-medium hover:bg-[var(--color-bg-content)] hover:text-zinc-200 transition-colors"
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
                  className="section-block w-full text-left px-2.5 py-2 rounded-lg text-zinc-300 text-sm hover:bg-[var(--color-bg-content)] transition-colors"
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
      <section ref={mcpRef} className={boxBase}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">MCP Tools</h3>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setShowMcpDropdown(v => !v)}
              className="section-block inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-400 text-xs font-medium hover:bg-[var(--color-bg-content)] hover:text-zinc-200 transition-colors"
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
                  className="section-block w-full text-left px-2.5 py-2 rounded-lg text-zinc-300 text-sm hover:bg-[var(--color-bg-content)] transition-colors"
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
        <section ref={callablesRef} className={boxBase}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Callables Synesia</h3>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setShowCallablesDropdown(v => !v)}
                className="section-block inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-400 text-xs font-medium hover:bg-[var(--color-bg-content)] hover:text-zinc-200 transition-colors"
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
                    className="section-block w-full text-left px-2.5 py-2 rounded-lg text-zinc-300 text-sm hover:bg-[var(--color-bg-content)] transition-colors"
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
            <p id="agent-version" className="input-block px-3 py-2 rounded-lg text-zinc-500 text-sm font-mono">
              {selectedAgent?.version || '1.0.0'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AgentParameters;
