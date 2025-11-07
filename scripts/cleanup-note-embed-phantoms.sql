-- Supprime les balises <note-embed> sans data-note-ref (phantom embeds)
-- Remplace par un paragraphe vide pour préserver la structure des documents

BEGIN;

UPDATE articles
SET html_content = regexp_replace(
  html_content,
  '<note-embed(?![^>]*data-note-ref)[^>]*></note-embed>',
  '<p></p>',
  'gi'
)
WHERE html_content ~ '<note-embed(?![^>]*data-note-ref)[^>]*></note-embed>';

COMMIT;

