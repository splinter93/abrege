-- Migration: Correction des politiques RLS pour la sécurité
-- Date: 2025-01-30
-- Description: Remplace les politiques RLS ouvertes par des politiques sécurisées basées sur les permissions

-- 1. Supprimer les anciennes politiques ouvertes
DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to select their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;

-- 2. Créer des politiques sécurisées pour les articles
CREATE POLICY "Users can view articles based on permissions"
ON public.articles
FOR SELECT
USING (
  auth.uid() = user_id OR -- Propriétaire
  visibility = 'public' OR -- Public
  EXISTS ( -- Permissions spécifiques
    SELECT 1 FROM article_permissions 
    WHERE article_id = id AND user_id = auth.uid()
  ) OR EXISTS ( -- Permissions héritées du dossier
    SELECT 1 FROM folder_permissions fp
    JOIN folders f ON f.id = folder_id
    WHERE f.id = folder_id AND fp.user_id = auth.uid()
  ) OR EXISTS ( -- Permissions héritées du classeur
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own articles"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update articles they own or have editor/owner permissions"
ON public.articles
FOR UPDATE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM article_permissions 
    WHERE article_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du dossier (editor/owner)
    SELECT 1 FROM folder_permissions fp
    JOIN folders f ON f.id = folder_id
    WHERE f.id = folder_id AND fp.user_id = auth.uid() AND fp.role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du classeur (editor/owner)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role IN ('editor', 'owner')
  )
)
WITH CHECK (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM article_permissions 
    WHERE article_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du dossier (editor/owner)
    SELECT 1 FROM folder_permissions fp
    JOIN folders f ON f.id = folder_id
    WHERE f.id = folder_id AND fp.user_id = auth.uid() AND fp.role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du classeur (editor/owner)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Users can delete articles they own or have owner permissions"
ON public.articles
FOR DELETE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (owner uniquement)
    SELECT 1 FROM article_permissions 
    WHERE article_id = id AND user_id = auth.uid() AND role = 'owner'
  ) OR EXISTS ( -- Permissions héritées du dossier (owner uniquement)
    SELECT 1 FROM folder_permissions fp
    JOIN folders f ON f.id = folder_id
    WHERE f.id = folder_id AND fp.user_id = auth.uid() AND fp.role = 'owner'
  ) OR EXISTS ( -- Permissions héritées du classeur (owner uniquement)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role = 'owner'
  )
);

-- 3. Politiques pour les dossiers
DROP POLICY IF EXISTS "Allow user to select their own folders" ON public.folders;

CREATE POLICY "Users can view folders based on permissions"
ON public.folders
FOR SELECT
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques
    SELECT 1 FROM folder_permissions 
    WHERE folder_id = id AND user_id = auth.uid()
  ) OR EXISTS ( -- Permissions héritées du classeur
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own folders"
ON public.folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update folders they own or have editor/owner permissions"
ON public.folders
FOR UPDATE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM folder_permissions 
    WHERE folder_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du classeur (editor/owner)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role IN ('editor', 'owner')
  )
)
WITH CHECK (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM folder_permissions 
    WHERE folder_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  ) OR EXISTS ( -- Permissions héritées du classeur (editor/owner)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role IN ('editor', 'owner')
  )
);

CREATE POLICY "Users can delete folders they own or have owner permissions"
ON public.folders
FOR DELETE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (owner uniquement)
    SELECT 1 FROM folder_permissions 
    WHERE folder_id = id AND user_id = auth.uid() AND role = 'owner'
  ) OR EXISTS ( -- Permissions héritées du classeur (owner uniquement)
    SELECT 1 FROM classeur_permissions cp
    WHERE cp.classeur_id = classeur_id AND cp.user_id = auth.uid() AND cp.role = 'owner'
  )
);

-- 4. Politiques pour les classeurs
DROP POLICY IF EXISTS "Allow user to select their own classeurs" ON public.classeurs;

CREATE POLICY "Users can view classeurs based on permissions"
ON public.classeurs
FOR SELECT
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques
    SELECT 1 FROM classeur_permissions 
    WHERE classeur_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own classeurs"
ON public.classeurs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update classeurs they own or have editor/owner permissions"
ON public.classeurs
FOR UPDATE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM classeur_permissions 
    WHERE classeur_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  )
)
WITH CHECK (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (editor/owner)
    SELECT 1 FROM classeur_permissions 
    WHERE classeur_id = id AND user_id = auth.uid() AND role IN ('editor', 'owner')
  )
);

CREATE POLICY "Users can delete classeurs they own or have owner permissions"
ON public.classeurs
FOR DELETE
USING (
  auth.uid() = user_id OR -- Propriétaire
  EXISTS ( -- Permissions spécifiques (owner uniquement)
    SELECT 1 FROM classeur_permissions 
    WHERE classeur_id = id AND user_id = auth.uid() AND role = 'owner'
  )
); 