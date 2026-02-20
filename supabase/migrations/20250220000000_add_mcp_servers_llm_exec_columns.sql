-- Migration : Colonnes MCP pour conformité LLM Exec (Synesia / Liminality)
-- Date : 2025-02-20
-- Réf : docs/LLM EXEC MCP INTEGRATION.md — allowed_tools et require_approval obligatoires côté API

-- server_description : description du serveur pour le modèle (optionnel)
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS server_description TEXT;

-- require_approval : "always" | "never" | "auto" — obligatoire dans le payload /llm-exec/round
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS require_approval TEXT DEFAULT 'never'
  CHECK (require_approval IS NULL OR require_approval IN ('always', 'never', 'auto'));

-- allowed_tools : liste des noms de tools autorisés ; NULL ou [] = tous les tools du serveur
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS allowed_tools TEXT[] DEFAULT NULL;

COMMENT ON COLUMN mcp_servers.server_description IS 'Description du serveur MCP pour le modèle (optionnel)';
COMMENT ON COLUMN mcp_servers.require_approval IS 'Approbation avant exécution : always | never | auto (doc LLM Exec MCP)';
COMMENT ON COLUMN mcp_servers.allowed_tools IS 'Noms des tools MCP autorisés ; NULL ou vide = tous les tools du serveur';
