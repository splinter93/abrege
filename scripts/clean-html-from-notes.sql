-- Migration : Nettoyer le HTML brut des notes existantes
-- 
-- Ce script échappe automatiquement tout le HTML brut dans markdown_content
-- pour éviter les bugs d'éditeur et les risques de sécurité

-- ⚠️ BACKUP AVANT D'EXÉCUTER !
-- CREATE TABLE articles_backup AS SELECT * FROM articles;

-- Fonction pour échapper le HTML
-- Note: Cette fonction doit être exécutée dans un contexte qui supporte les regex
-- ou bien exécutée via un script Node.js

-- Pour l'instant, identifier les notes avec du HTML brut :
SELECT 
  id,
  source_title,
  LENGTH(markdown_content) as content_length,
  CASE 
    WHEN markdown_content ~ '<[a-z]' THEN 'HTML_DETECTED'
    ELSE 'CLEAN'
  END as status,
  LEFT(markdown_content, 100) as preview
FROM articles
WHERE markdown_content ~ '<[a-z]'
ORDER BY updated_at DESC;

-- Pour nettoyer manuellement, il faudra un script Node.js
-- car PostgreSQL ne peut pas faire des remplacements complexes facilement

