-- Migration : Ajout de la colonne updated_at à la table classeurs
-- et trigger de mise à jour automatique

-- UP
ALTER TABLE public.classeurs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Fonction de trigger pour MAJ automatique
CREATE OR REPLACE FUNCTION public.update_updated_at_column_classeurs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur UPDATE
DROP TRIGGER IF EXISTS set_updated_at_on_classeurs ON public.classeurs;
CREATE TRIGGER set_updated_at_on_classeurs
BEFORE UPDATE ON public.classeurs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column_classeurs();

-- DOWN
-- (rollback safe)
-- Supprimer le trigger et la fonction
DROP TRIGGER IF EXISTS set_updated_at_on_classeurs ON public.classeurs;
DROP FUNCTION IF EXISTS public.update_updated_at_column_classeurs();
-- Supprimer la colonne (attention, destructive)
ALTER TABLE public.classeurs DROP COLUMN IF EXISTS updated_at; 