-- MIGRATION: add_rls_policies_for_realtime
-- Description: Ajoute les politiques de sécurité (RLS) nécessaires pour permettre l'écoute en temps réel (SELECT) sur les tables 'classeurs' et 'folders'.
-- Sans ces politiques, Supabase bloque les abonnements realtime par défaut.

-- 1. Activer RLS sur la table 'folders' si ce n'est pas déjà fait
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques sur 'folders' pour éviter les conflits (bonne pratique)
DROP POLICY IF EXISTS "Allow user to select their own folders" ON public.folders;

-- 3. Créer la politique SELECT pour les dossiers
-- Permet à un utilisateur de voir (SELECT) ses propres dossiers, ce qui est requis pour l'abonnement realtime.
CREATE POLICY "Allow user to select their own folders"
ON public.folders
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Activer RLS sur la table 'classeurs' si ce n'est pas déjà fait
ALTER TABLE public.classeurs ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les anciennes politiques sur 'classeurs'
DROP POLICY IF EXISTS "Allow user to select their own classeurs" ON public.classeurs;

-- 6. Créer la politique SELECT pour les classeurs (notebooks)
CREATE POLICY "Allow user to select their own classeurs"
ON public.classeurs
FOR SELECT
USING (auth.uid() = user_id); 