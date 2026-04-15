-- Permet la suppression d'un compte auth.users (Dashboard / API) sans erreur
-- "Database error deleting user" : classeurs.user_id référençait auth.users sans ON DELETE.
ALTER TABLE public.classeurs
  DROP CONSTRAINT IF EXISTS classeurs_user_id_fkey;

ALTER TABLE public.classeurs
  ADD CONSTRAINT classeurs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
