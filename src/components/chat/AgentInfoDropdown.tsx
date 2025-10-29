'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Agent } from '@/types/chat';
import { Settings } from 'lucide-react';
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

const AgentInfoDropdown: React.FC<AgentInfoDropdownProps> = ({ agent, isOpen, onClose }) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !agent.id) return;

    const fetchAgentTools = async () => {
      setLoading(true);
      try {
        // Récupérer les schémas OpenAPI et serveurs MCP depuis l'API
        const response = await fetch(`/api/agents/${agent.id}/tools`);
        if (response.ok) {
          const data = await response.json();
          const toolsList: ToolInfo[] = [
            ...(data.openapi_schemas || []).map((schema: { name: string }) => ({
              name: schema.name,
              type: 'openapi' as const
            })),
            ...(data.mcp_servers || []).map((server: { name: string }) => ({
              name: server.name,
              type: 'mcp' as const
            }))
          ];
          setTools(toolsList);
        }
      } catch (error) {
        console.error('Erreur chargement tools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentTools();
  }, [isOpen, agent.id]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay transparent pour fermer */}
      <div className="agent-dropdown-overlay" onClick={onClose} />
      
      {/* Menu dropdown */}
      <div className="agent-dropdown-menu">
        {/* Description */}
        {agent.description && (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Description</h4>
            <p className="agent-dropdown-description">{agent.description}</p>
          </div>
        )}

        {/* Modèle */}
        <div className="agent-dropdown-section">
          <h4 className="agent-dropdown-section-title">Modèle</h4>
          <p className="agent-dropdown-model">{agent.model}</p>
        </div>

        {/* Tools */}
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
                  key={index} 
                  className="agent-dropdown-tool-pill"
                  title={tool.type === 'openapi' ? 'Schéma OpenAPI' : 'Serveur MCP'}
                >
                  {tool.name}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Lien configuration */}
        <Link 
          href="/agents" 
          className="agent-dropdown-config-link"
          onClick={onClose}
        >
          <Settings size={14} />
          <span>Configurer l'agent</span>
        </Link>
      </div>
    </>
  );
};

export default AgentInfoDropdown;

