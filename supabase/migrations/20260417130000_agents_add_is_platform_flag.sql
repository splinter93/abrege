-- Ajoute is_platform : agents catalogue visibles par tous les comptes, protégés des mutations UI.
-- user_id = NULL + is_platform = true => agent plateforme (service role / migration uniquement).

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agents_is_platform ON public.agents (is_platform)
  WHERE is_platform = true;

COMMENT ON COLUMN public.agents.is_platform IS
  'true = agent catalogue plateforme (user_id NULL, visible par tous les comptes authentifiés, modifiable uniquement via service role / migration).';

-- Remplacer les politiques slug-based par la logique is_platform
DROP POLICY IF EXISTS agents_select_own_or_platform ON public.agents;
DROP POLICY IF EXISTS agents_insert_own ON public.agents;
DROP POLICY IF EXISTS agents_update_own ON public.agents;
DROP POLICY IF EXISTS agents_delete_own ON public.agents;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- SELECT : propres agents + tous les agents plateforme
CREATE POLICY agents_select_own_or_platform ON public.agents
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_platform = true
  );

-- INSERT : uniquement ses propres agents, jamais is_platform
CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND is_platform = false
  );

-- UPDATE : uniquement ses propres agents, jamais les agents plateforme
CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_platform = false)
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_platform = false);

-- DELETE : uniquement ses propres agents, jamais les agents plateforme
CREATE POLICY agents_delete_own ON public.agents
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_platform = false);

-- Rétrocompat : tous les agents sans propriétaire déjà actifs => plateforme
UPDATE public.agents
  SET is_platform = true
  WHERE user_id IS NULL
    AND is_active = true;
