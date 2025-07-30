-- Migration : Ajout de la colonne position à la table classeurs
-- pour permettre le reorder des classeurs

-- UP
ALTER TABLE public.classeurs
  ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Mettre à jour les positions existantes basées sur created_at
UPDATE public.classeurs 
SET position = subquery.row_number
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 as row_number
  FROM public.classeurs
) subquery
WHERE public.classeurs.id = subquery.id;

-- Créer un index pour optimiser les requêtes par position
CREATE INDEX IF NOT EXISTS idx_classeurs_position ON public.classeurs(position);

-- DOWN
-- Supprimer l'index
DROP INDEX IF EXISTS idx_classeurs_position;
-- Supprimer la colonne (attention, destructive)
ALTER TABLE public.classeurs DROP COLUMN IF EXISTS position; 