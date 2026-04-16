-- Permet à l'owner d'un partage de modifier permission_level (read ↔ write)
-- sans avoir à supprimer et recréer le partage.
CREATE POLICY classeur_shares_update_owner ON public.classeur_shares
  FOR UPDATE
  USING (auth.uid() = shared_by)
  WITH CHECK (auth.uid() = shared_by);
