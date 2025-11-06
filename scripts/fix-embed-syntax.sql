-- Script SQL pour convertir les embeds HTML échappés en syntaxe {{embed:...}}
-- À exécuter dans Supabase SQL Editor

-- 1. Identifier les notes avec des embeds HTML échappés
SELECT 
  id,
  source_title,
  substring(markdown_content from 1 for 200) as preview
FROM articles
WHERE markdown_content LIKE '%&lt;div%data-type=%note-embed%&gt;%'
AND trashed_at IS NULL;

-- 2. Convertir les embeds HTML échappés en syntaxe {{embed:...}}
-- ATTENTION: Tester d'abord sur une seule note !

-- Format: &lt;div data-note-ref="xyz" data-depth="0" data-type="note-embed"&gt;&lt;/div&gt;
-- → {{embed:xyz}}

UPDATE articles
SET 
  markdown_content = regexp_replace(
    markdown_content,
    '&lt;div data-note-ref="([^"]+)"[^&]*data-type="note-embed"[^&]*&gt;\s*&lt;/div&gt;',
    '{{embed:\1}}',
    'g'
  ),
  updated_at = NOW()
WHERE 
  markdown_content LIKE '%&lt;div%data-type=%note-embed%&gt;%'
  AND trashed_at IS NULL;

-- 3. Vérifier le résultat
SELECT 
  id,
  source_title,
  substring(markdown_content from 1 for 200) as preview
FROM articles
WHERE markdown_content LIKE '%{{embed:%'
AND trashed_at IS NULL;

