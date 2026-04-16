-- Supprime la colonne legacy instructions + RLS strict sur agents (client authentifié).
-- Déjà aligné avec la logique API : user_id propriétaire + slugs plateforme johnny/formatter/vision.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'instructions'
  ) THEN
    UPDATE public.agents
    SET system_instructions = instructions
    WHERE instructions IS NOT NULL AND btrim(instructions) <> ''
      AND (system_instructions IS NULL OR btrim(system_instructions) = '');

    ALTER TABLE public.agents DROP COLUMN instructions;
  END IF;
END $$;

DROP POLICY IF EXISTS "Agents are accessible for development" ON public.agents;
DROP POLICY IF EXISTS "Agents are viewable by authenticated users" ON public.agents;

DROP POLICY IF EXISTS agents_select_own_or_platform ON public.agents;
DROP POLICY IF EXISTS agents_insert_own ON public.agents;
DROP POLICY IF EXISTS agents_update_own ON public.agents;
DROP POLICY IF EXISTS agents_delete_own ON public.agents;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY agents_select_own_or_platform ON public.agents
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      user_id IS NULL
      AND slug IS NOT NULL
      AND slug IN ('johnny', 'formatter', 'vision')
    )
  );

CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY agents_delete_own ON public.agents
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
