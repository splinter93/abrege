-- 🔧 SCRIPT DE CORRECTION MANUELLE DES POLITIQUES RLS
-- À exécuter dans Supabase SQL Editor
-- Ce script corrige le problème "Note non trouvée" sur les pages publiques

-- ============================================================================
-- ÉTAPE 1: SUPPRIMER TOUTES LES ANCIENNES POLITIQUES RLS PROBLÉMATIQUES
-- ============================================================================

-- Supprimer toutes les politiques existantes sur la table articles
DROP POLICY IF EXISTS "Users can view articles based on permissions" ON public.articles;
DROP POLICY IF EXISTS "Users can view articles based on new sharing system" ON public.articles;
DROP POLICY IF EXISTS "Users can view their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to select articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to insert their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to update their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow user to delete their own articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to insert articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to update articles" ON public.articles;
DROP POLICY IF EXISTS "Allow all users to delete articles" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_select" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_insert" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_update" ON public.articles;
DROP POLICY IF EXISTS "API_V2_articles_delete" ON public.articles;

-- ============================================================================
-- ÉTAPE 2: CRÉER DE NOUVELLES POLITIQUES RLS FONCTIONNELLES
-- ============================================================================

-- Politique SELECT : permettre la lecture des notes publiques ET des notes privées de l'utilisateur
CREATE POLICY "Public access to shared articles and private access to own articles"
ON public.articles
FOR SELECT
USING (
  -- Notes publiques (accessibles à tous)
  (share_settings->>'visibility' != 'private') OR
  -- Notes privées (accessibles uniquement au propriétaire)
  (share_settings->>'visibility' = 'private' AND auth.uid() = user_id) OR
  -- Fallback si share_settings est NULL (anciennes notes)
  (share_settings IS NULL AND auth.uid() = user_id)
);

-- Politique INSERT : permettre à l'utilisateur de créer ses propres notes
CREATE POLICY "Users can create their own articles"
ON public.articles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : permettre à l'utilisateur de modifier ses propres notes
CREATE POLICY "Users can update their own articles"
ON public.articles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE : permettre à l'utilisateur de supprimer ses propres notes
CREATE POLICY "Users can delete their own articles"
ON public.articles
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- ÉTAPE 3: S'ASSURER QUE RLS EST ACTIVÉ
-- ============================================================================

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 4: VÉRIFIER QUE LES POLITIQUES SONT CRÉÉES
-- ============================================================================

-- Lister toutes les politiques sur la table articles
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'articles' 
ORDER BY policyname;

-- ============================================================================
-- ÉTAPE 5: TESTER L'ACCÈS PUBLIC
-- ============================================================================

-- Cette requête devrait fonctionner même sans authentification
-- et retourner le bon nombre d'articles
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN share_settings->>'visibility' != 'private' THEN 1 END) as public_articles,
  COUNT(CASE WHEN share_settings->>'visibility' = 'private' THEN 1 END) as private_articles,
  COUNT(CASE WHEN share_settings IS NULL THEN 1 END) as articles_without_sharing
FROM public.articles;

-- ============================================================================
-- ÉTAPE 6: TESTER L'ACCÈS AUX NOTES PUBLIQUES
-- ============================================================================

-- Tester l'accès aux notes partagées (devrait retourner des résultats)
SELECT 
  id,
  source_title,
  slug,
  user_id,
  share_settings->>'visibility' as visibility
FROM public.articles
WHERE share_settings->>'visibility' != 'private'
LIMIT 5;

-- ============================================================================
-- ÉTAPE 7: VÉRIFIER LA SÉCURITÉ DES NOTES PRIVÉES
-- ============================================================================

-- Cette requête devrait retourner 0 si l'utilisateur n'est pas connecté
-- ou seulement ses propres notes s'il est connecté
SELECT 
  COUNT(*) as accessible_private_notes
FROM public.articles
WHERE share_settings->>'visibility' = 'private';

-- ============================================================================
-- RÉSUMÉ DE LA CORRECTION
-- ============================================================================

/*
✅ POLITIQUES RLS CORRIGÉES :

1. SELECT : Accès public aux notes partagées + privé aux notes personnelles
2. INSERT : Création de notes par le propriétaire uniquement
3. UPDATE : Modification de notes par le propriétaire uniquement
4. DELETE : Suppression de notes par le propriétaire uniquement

🔐 SÉCURITÉ MAINTENUE :
- Notes privées : Accessibles uniquement au propriétaire
- Notes partagées : Accessibles publiquement selon share_settings
- Fallback : Anciennes notes sans share_settings restent privées

🌐 ACCÈS PUBLIC RESTAURÉ :
- Pages publiques : Maintenant accessibles
- API publique : Fonctionnelle
- Système de partage : Opérationnel
*/ 