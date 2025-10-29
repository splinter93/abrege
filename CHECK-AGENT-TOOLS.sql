-- 🔍 DIAGNOSTIC : Vérifier quels schémas OpenAPI sont liés à un agent
-- Usage : Remplacer <agent_id> par l'ID de l'agent à vérifier

-- 1. Lister tous les schémas OpenAPI liés à un agent
SELECT 
  a.id AS agent_id,
  a.name AS agent_name,
  a.slug AS agent_slug,
  os.id AS schema_id,
  os.name AS schema_name,
  os.version AS schema_version,
  os.description AS schema_description
FROM agents a
LEFT JOIN agent_openapi_schemas aos ON aos.agent_id = a.id
LEFT JOIN openapi_schemas os ON os.id = aos.openapi_schema_id
WHERE a.id = '<agent_id>' -- Remplacer par l'ID de l'agent
  AND os.status = 'active';

-- 2. Lister tous les serveurs MCP liés à un agent
SELECT 
  a.id AS agent_id,
  a.name AS agent_name,
  a.slug AS agent_slug,
  ms.id AS mcp_server_id,
  ms.name AS mcp_server_name,
  ms.description AS mcp_server_description,
  ms.url AS mcp_server_url,
  ams.is_active AS is_active
FROM agents a
LEFT JOIN agent_mcp_servers ams ON ams.agent_id = a.id
LEFT JOIN mcp_servers ms ON ms.id = ams.mcp_server_id
WHERE a.id = '<agent_id>' -- Remplacer par l'ID de l'agent
  AND ams.is_active = true;

-- 3. Vue d'ensemble de tous les agents avec leurs tools
SELECT 
  a.id,
  a.name,
  a.slug,
  COUNT(DISTINCT aos.openapi_schema_id) AS nb_openapi_schemas,
  COUNT(DISTINCT ams.mcp_server_id) AS nb_mcp_servers,
  STRING_AGG(DISTINCT os.name, ', ') AS openapi_schemas,
  STRING_AGG(DISTINCT ms.name, ', ') AS mcp_servers
FROM agents a
LEFT JOIN agent_openapi_schemas aos ON aos.agent_id = a.id
LEFT JOIN openapi_schemas os ON os.id = aos.openapi_schema_id AND os.status = 'active'
LEFT JOIN agent_mcp_servers ams ON ams.agent_id = a.id AND ams.is_active = true
LEFT JOIN mcp_servers ms ON ms.id = ams.mcp_server_id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.slug
ORDER BY a.name;

