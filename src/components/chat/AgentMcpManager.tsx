/**
 * Composant pour gérer les serveurs MCP d'un agent
 * UI simple pour lier/délier des serveurs MCP Factoria
 */

'use client';

import React, { useState, useEffect } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import '@/components/chat/AgentMcpManager.css';

interface McpServer {
  id: string;
  name: string;
  description: string | null;
  deployment_url: string;
  status: string;
  tools_count: number;
}

interface AgentMcpLink {
  id: string;
  mcp_server_id: string;
  is_active: boolean;
  priority: number;
  mcp_servers: McpServer;
}

interface AgentMcpManagerProps {
  agentId: string;
  agentSlug: string;
  agentName: string;
  onClose: () => void;
}

const AgentMcpManager: React.FC<AgentMcpManagerProps> = ({ agentId, agentSlug, agentName, onClose }) => {
  const [availableMcp, setAvailableMcp] = useState<McpServer[]>([]);
  const [linkedMcp, setLinkedMcp] = useState<AgentMcpLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les serveurs MCP disponibles et liés
  useEffect(() => {
    loadMcpData();
  }, [agentId]);

  const loadMcpData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Charger les serveurs MCP Factoria disponibles
      const availableRes = await fetch('/api/mcp/list');
      if (!availableRes.ok) throw new Error('Erreur chargement serveurs MCP');
      const availableData = await availableRes.json();
      setAvailableMcp(availableData.servers || []);

      // 2. Charger les serveurs MCP liés à cet agent
      const linkedRes = await fetch(`/api/agents/${agentId}/mcp`);
      if (!linkedRes.ok) throw new Error('Erreur chargement liaisons MCP');
      const linkedData = await linkedRes.json();
      setLinkedMcp(linkedData.links || []);

      logger.dev('[AgentMcpManager] Données chargées:', {
        available: availableData.servers?.length,
        linked: linkedData.links?.length
      });
    } catch (err) {
      logger.error('[AgentMcpManager] Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (mcpServerId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcp_server_id: mcpServerId })
      });

      if (!res.ok) throw new Error('Erreur lors de la liaison');

      logger.dev('[AgentMcpManager] Serveur MCP lié:', mcpServerId);
      await loadMcpData(); // Recharger
    } catch (err) {
      logger.error('[AgentMcpManager] Erreur liaison:', err);
      setError(err instanceof Error ? err.message : 'Erreur liaison');
    }
  };

  const handleUnlink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/mcp/${linkId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Erreur lors de la suppression');

      logger.dev('[AgentMcpManager] Liaison supprimée:', linkId);
      await loadMcpData(); // Recharger
    } catch (err) {
      logger.error('[AgentMcpManager] Erreur suppression:', err);
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    }
  };

  const isLinked = (mcpServerId: string): boolean => {
    return linkedMcp.some(link => link.mcp_server_id === mcpServerId);
  };

  if (loading) {
    return (
      <div className="agent-mcp-manager">
        <div className="mcp-header">
          <h3>🏭 Serveurs MCP - {agentName}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <div className="mcp-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="agent-mcp-manager">
      {/* Header */}
      <div className="mcp-header">
        <h3>🏭 Serveurs MCP - {agentName}</h3>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      {/* Error */}
      {error && (
        <div className="mcp-error">
          ⚠️ {error}
        </div>
      )}

      {/* Serveurs liés */}
      <div className="mcp-section">
        <h4 className="section-title">
          ✅ Serveurs MCP actifs ({linkedMcp.length})
        </h4>
        
        {linkedMcp.length === 0 ? (
          <p className="empty-state">Aucun serveur MCP lié</p>
        ) : (
          <div className="mcp-list">
            {linkedMcp.map(link => (
              <div key={link.id} className="mcp-item linked">
                <div className="mcp-item-info">
                  <div className="mcp-item-name">
                    {link.mcp_servers.name}
                  </div>
                  <div className="mcp-item-meta">
                    {link.mcp_servers.tools_count || 0} tools • Priority: {link.priority}
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink(link.id)}
                  className="mcp-button unlink"
                  title="Délier ce serveur"
                >
                  Délier
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Serveurs disponibles */}
      <div className="mcp-section">
        <h4 className="section-title">
          📋 Serveurs MCP Factoria disponibles ({availableMcp.length})
        </h4>
        
        {availableMcp.length === 0 ? (
          <p className="empty-state">Aucun serveur MCP disponible dans Factoria</p>
        ) : (
          <div className="mcp-list">
            {availableMcp.map(server => {
              const linked = isLinked(server.id);
              return (
                <div key={server.id} className={`mcp-item ${linked ? 'disabled' : ''}`}>
                  <div className="mcp-item-info">
                    <div className="mcp-item-name">
                      {server.name}
                      {linked && <span className="linked-badge">✓ Lié</span>}
                    </div>
                    <div className="mcp-item-description">
                      {server.description || 'Pas de description'}
                    </div>
                    <div className="mcp-item-meta">
                      {server.tools_count || 0} tools • {server.status}
                    </div>
                  </div>
                  {!linked && (
                    <button
                      onClick={() => handleLink(server.id)}
                      className="mcp-button link"
                      title="Lier ce serveur à l'agent"
                    >
                      Lier
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mcp-info">
        <p>💡 <strong>Mode hybride</strong> : L'agent garde toujours accès aux tools OpenAPI Scrivia</p>
        <p>🔧 Les serveurs MCP sont des ajouts, pas des remplacements</p>
      </div>
    </div>
  );
};

export default AgentMcpManager;

