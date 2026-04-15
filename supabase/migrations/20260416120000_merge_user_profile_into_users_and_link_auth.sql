-- Fusion public.user_profile → public.users, suppression de user_profile,
-- FK users.id → auth.users (CASCADE), backfill, trigger sur nouveaux comptes Auth.
--
-- Inventaire (pré-merge) : RLS sur user_profile (3 policies), trigger
-- user_profile_updated_at → update_user_profile_updated_at(), aucune vue/FK
-- référençant user_profile.
--
-- Bloc merge/drop idempotent : si user_profile a déjà été supprimée (ex. appliqué
-- ailleurs), on saute les étapes 1–3 pour permettre un `db push` / reset local.

DO $merge_block$
BEGIN
  IF to_regclass('public.user_profile') IS NULL THEN
    RAISE NOTICE 'merge_user_profile: table public.user_profile absente — skip merge/drop';
    RETURN;
  END IF;

  INSERT INTO public.users (id, username, profile_picture, created_at)
  SELECT
    up.id,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.users u2
        WHERE u2.username = up.username
          AND u2.id <> up.id
      )
      THEN up.username || '_' || substr(replace(up.id::text, '-', ''), 1, 8)
      ELSE up.username
    END,
    up.picture,
    up.created_at
  FROM public.user_profile up
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = up.id);

  UPDATE public.users u
  SET
    profile_picture = COALESCE(u.profile_picture, up.picture),
    username = CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.users u2
        WHERE u2.username = up.username
          AND u2.id <> u.id
      )
      THEN CASE
        WHEN u.username IS NULL OR btrim(u.username) = ''
        THEN up.username || '_' || substr(replace(u.id::text, '-', ''), 1, 8)
        ELSE u.username
      END
      WHEN u.username IS NULL OR btrim(u.username) = ''
      THEN up.username
      ELSE u.username
    END
  FROM public.user_profile up
  WHERE u.id = up.id;

  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profile;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profile;

  ALTER TABLE public.user_profile DISABLE ROW LEVEL SECURITY;

  DROP TRIGGER IF EXISTS user_profile_updated_at ON public.user_profile;

  DROP TABLE public.user_profile CASCADE;

  DROP FUNCTION IF EXISTS public.update_user_profile_updated_at();
END
$merge_block$;

-- Si user_profile a déjà été supprimée manuellement, la fonction trigger peut rester orpheline
DROP FUNCTION IF EXISTS public.update_user_profile_updated_at();

-- =============================================================================
-- 4) Lier public.users à auth.users (suppression Auth → suppression profil)
-- =============================================================================
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- =============================================================================
-- 5) Backfill : tout compte Auth sans ligne users
-- =============================================================================
INSERT INTO public.users (id, email, created_at)
SELECT
  a.id,
  COALESCE(a.email, ''),
  COALESCE(a.created_at, now())
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id);

-- =============================================================================
-- 6) Nouveaux comptes Auth → ligne public.users (SECURITY DEFINER + search_path)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ensure_public_user_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.created_at, now()))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS ensure_public_user_row_trigger ON auth.users;

CREATE TRIGGER ensure_public_user_row_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_public_user_row();

COMMENT ON FUNCTION public.ensure_public_user_row() IS
  'Crée une ligne public.users pour chaque nouveau auth.users (alignement post-fusion user_profile).';
