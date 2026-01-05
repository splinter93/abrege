-- Fix Mixed Content Error: Change http://scrivia.app to https://www.scrivia.app
-- This fixes the "Mixed Content" error in voice mode where HTTPS page tries to load HTTP resources

-- Update any OpenAPI schema that has http://scrivia.app or https://scrivia.app as base URL
-- Change to https://www.scrivia.app to match the production domain

UPDATE openapi_schemas
SET 
  content = jsonb_set(
    content,
    '{servers,0,url}',
    '"https://www.scrivia.app/api/v2"'::jsonb
  ),
  updated_at = NOW()
WHERE 
  content->'servers'->0->>'url' LIKE '%://scrivia.app/%'
  AND content->'servers'->0->>'url' NOT LIKE 'https://www.scrivia.app/%'
;

-- Verify the change
SELECT 
  id,
  name,
  content->'servers'->0->>'url' as base_url,
  updated_at
FROM openapi_schemas
WHERE content->'servers'->0->>'url' LIKE '%scrivia.app%'
ORDER BY updated_at DESC;

