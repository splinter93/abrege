-- ⚡ OPTIMISATION: Fonction RPC pour suppression rapide de dossier
-- Remplace 2 requêtes par 1 seule transaction

CREATE OR REPLACE FUNCTION move_folder_to_trash(
  p_folder_id UUID,
  p_user_id UUID,
  p_trashed_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Mettre le dossier en corbeille
  UPDATE folders 
  SET 
    is_in_trash = true,
    trashed_at = p_trashed_at
  WHERE 
    id = p_folder_id 
    AND user_id = p_user_id;

  -- 2. Mettre toutes les notes du dossier en corbeille (en une seule requête)
  UPDATE articles 
  SET 
    is_in_trash = true,
    trashed_at = p_trashed_at
  WHERE 
    folder_id = p_folder_id 
    AND user_id = p_user_id;

  -- Vérifier que le dossier a été trouvé et mis à jour
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Folder not found or access denied';
  END IF;
END;
$$;
