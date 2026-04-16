-- Contrainte d'unicité partielle sur slug.
-- Les agents classiques (slug IS NULL) ne sont pas concernés.
-- Empêche les doublons + erreur PGRST116 sur .single() en cas de race condition.
CREATE UNIQUE INDEX IF NOT EXISTS agents_slug_unique
  ON public.agents (slug)
  WHERE slug IS NOT NULL;
