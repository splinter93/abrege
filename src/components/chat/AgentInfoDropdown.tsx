'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Agent } from '@/types/chat';
import { Settings } from 'lucide-react';
import { simpleLogger as logger } from '@/utils/logger';
import './AgentInfoDropdown.css';

interface AgentInfoDropdownProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

interface ToolInfo {
  name: string;
  type: 'openapi' | 'mcp';
}

interface CallableLinkRow {
  synesia_callables?: { name?: string } | null;
}

const AgentInfoDropdown: React.FC<AgentInfoDropdownProps> = ({ agent, isOpen, onClose }) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [callableNames, setCallableNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !agent.id) return;

    let cancelled = false;

    const fetchAgentDetails = async () => {
      setLoading(true);
      try {
        const [toolsRes, callablesRes] = await Promise.allSettled([
          fetch(`/api/agents/${agent.id}/tools`),
          fetch(`/api/ui/agents/${agent.id}/callables`),
        ]);

        if (cancelled) return;

        if (toolsRes.status === 'fulfilled' && toolsRes.value.ok) {
          const data = (await toolsRes.value.json()) as {
            openapi_schemas?: { name: string }[];
            mcp_servers?: { name: string }[];
          };
          const toolsList: ToolInfo[] = [
            ...(data.openapi_schemas || []).map((schema) => ({
              name: schema.name,
              type: 'openapi' as const,
            })),
            ...(data.mcp_servers || []).map((server) => ({
              name: server.name,
              type: 'mcp' as const,
            })),
          ];
          setTools(toolsList);
        } else {
          setTools([]);
        }

        if (callablesRes.status === 'fulfilled' && callablesRes.value.ok) {
          const cdata = (await callablesRes.value.json()) as {
            callables?: CallableLinkRow[];
          };
          const names = (cdata.callables || [])
            .map((link) => link.synesia_callables?.name)
            .filter((n): n is string => Boolean(n && n.trim()));
          setCallableNames(names);
        } else {
          setCallableNames([]);
        }
      } catch (error) {
        logger.error('[AgentInfoDropdown] Erreur chargement détails agent:', error);
        if (!cancelled) {
          setTools([]);
          setCallableNames([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAgentDetails();
    return () => {
      cancelled = true;
    };
  }, [isOpen, agent.id]);

  if (!isOpen) return null;

  return (
    <>
      <div className="agent-dropdown-overlay" onClick={onClose} />

      <div className="agent-dropdown-menu">
        {agent.description && (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Description</h4>
            <p className="agent-dropdown-description">{agent.description}</p>
          </div>
        )}

        <div className="agent-dropdown-section">
          <h4 className="agent-dropdown-section-title">Modèle</h4>
          <p className="agent-dropdown-model">{agent.model}</p>
        </div>

        {loading ? (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Outils disponibles</h4>
            <p className="agent-dropdown-loading">Chargement...</p>
          </div>
        ) : tools.length > 0 ? (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Outils disponibles</h4>
            <div className="agent-dropdown-tools">
              {tools.map((tool, index) => (
                <div
                  key={`${tool.name}-${index}`}
                  className="agent-dropdown-tool-pill"
                  title={tool.type === 'openapi' ? 'Schéma OpenAPI' : 'Serveur MCP'}
                >
                  {tool.name}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && callableNames.length > 0 ? (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Callables</h4>
            <div className="agent-dropdown-tools">
              {callableNames.map((name, index) => (
                <div key={`callable-${name}-${index}`} className="agent-dropdown-tool-pill" title="Callable">
                  {name}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Link
          href={`/private/agents2/${agent.slug || agent.id}`}
          className="agent-dropdown-config-link"
          onClick={onClose}
        >
          <Settings size={14} />
          <span>{'Configurer l\u2019agent'}</span>
        </Link>
      </div>
    </>
  );
};

export default AgentInfoDropdown;
