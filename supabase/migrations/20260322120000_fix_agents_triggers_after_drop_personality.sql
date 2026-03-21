-- Corrige : record "new" has no field "personality" lors des UPDATE sur agents
-- après DROP COLUMN personality : une fonction trigger peut encore référencer NEW.personality.

-- 1) Supprimer tout trigger user sur agents dont le corps de fonction mentionne encore "personality"
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'public.agents'::regclass
      AND NOT t.tgisinternal
      AND COALESCE(p.prosrc, '') ILIKE '%personality%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.agents', r.tgname);
  END LOOP;
END $$;

-- 2) Trigger updated_at dédié (ne dépend pas d’autres colonnes)
CREATE OR REPLACE FUNCTION public.trg_agents_bump_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_agents_bump_updated_at();

COMMENT ON FUNCTION public.trg_agents_bump_updated_at() IS 'Sets agents.updated_at on UPDATE; no reference to dropped columns (e.g. personality).';
