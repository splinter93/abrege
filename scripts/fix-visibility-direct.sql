-- Script SQL direct pour corriger la visibilité des notes
-- Ce script contourne les restrictions RLS en utilisant une connexion directe

-- 1. Mettre à jour les notes avec ispublished = true vers visibility = 'public'
UPDATE articles 
SET 
  visibility = 'public',
  updated_at = NOW()
WHERE ispublished = true;

-- 2. Mettre à jour les notes avec ispublished = false vers visibility = 'private'
UPDATE articles 
SET 
  visibility = 'private',
  updated_at = NOW()
WHERE ispublished = false;

-- 3. Mettre à jour les notes sans ispublished vers visibility = 'private'
UPDATE articles 
SET 
  visibility = 'private',
  updated_at = NOW()
WHERE ispublished IS NULL;

-- 4. Vérification des résultats
SELECT 
  id,
  source_title,
  ispublished,
  visibility,
  public_url,
  updated_at
FROM articles 
WHERE ispublished IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 5. Statistiques finales
SELECT 
  COUNT(*) as total_notes,
  COUNT(CASE WHEN ispublished = true THEN 1 END) as ispublished_true,
  COUNT(CASE WHEN ispublished = false THEN 1 END) as ispublished_false,
  COUNT(CASE WHEN ispublished IS NULL THEN 1 END) as ispublished_null,
  COUNT(CASE WHEN visibility = 'public' THEN 1 END) as visibility_public,
  COUNT(CASE WHEN visibility = 'private' THEN 1 END) as visibility_private,
  COUNT(CASE WHEN visibility IS NULL THEN 1 END) as visibility_null
FROM articles; 