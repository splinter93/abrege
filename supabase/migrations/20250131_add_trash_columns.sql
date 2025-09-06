-- Migration: Ajout des colonnes de corbeille pour le système de suppression
-- Date: 2025-01-31
-- Description: Ajoute les colonnes is_in_trash et trashed_at aux tables articles, folders, classeurs

-- ========================================
-- 1. AJOUT DES COLONNES DE CORBEILLE
-- ========================================

-- Table articles
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS is_in_trash BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;

-- Table folders
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS is_in_trash BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;

-- Table classeurs
ALTER TABLE public.classeurs 
ADD COLUMN IF NOT EXISTS is_in_trash BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;

-- ========================================
-- 2. INDEXES POUR PERFORMANCE
-- ========================================

-- Index pour les requêtes de corbeille
CREATE INDEX IF NOT EXISTS idx_articles_trash_status 
ON public.articles (user_id, is_in_trash, trashed_at) 
WHERE is_in_trash = true;

CREATE INDEX IF NOT EXISTS idx_folders_trash_status 
ON public.folders (user_id, is_in_trash, trashed_at) 
WHERE is_in_trash = true;

CREATE INDEX IF NOT EXISTS idx_classeurs_trash_status 
ON public.classeurs (user_id, is_in_trash, trashed_at) 
WHERE is_in_trash = true;

-- ========================================
-- 3. CONTRAINTES DE SÉCURITÉ
-- ========================================

-- Contrainte pour s'assurer que trashed_at est défini quand is_in_trash est true
DO $$ 
BEGIN
    -- Articles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_trash_consistency') THEN
        ALTER TABLE public.articles 
        ADD CONSTRAINT articles_trash_consistency 
        CHECK ((is_in_trash = false) OR (is_in_trash = true AND trashed_at IS NOT NULL));
    END IF;
    
    -- Folders
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folders_trash_consistency') THEN
        ALTER TABLE public.folders 
        ADD CONSTRAINT folders_trash_consistency 
        CHECK ((is_in_trash = false) OR (is_in_trash = true AND trashed_at IS NOT NULL));
    END IF;
    
    -- Classeurs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classeurs_trash_consistency') THEN
        ALTER TABLE public.classeurs 
        ADD CONSTRAINT classeurs_trash_consistency 
        CHECK ((is_in_trash = false) OR (is_in_trash = true AND trashed_at IS NOT NULL));
    END IF;
END $$;

-- ========================================
-- 4. COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.articles.is_in_trash IS 'Indique si l''article est en corbeille';
COMMENT ON COLUMN public.articles.trashed_at IS 'Date et heure de mise en corbeille';

COMMENT ON COLUMN public.folders.is_in_trash IS 'Indique si le dossier est en corbeille';
COMMENT ON COLUMN public.folders.trashed_at IS 'Date et heure de mise en corbeille';

COMMENT ON COLUMN public.classeurs.is_in_trash IS 'Indique si le classeur est en corbeille';
COMMENT ON COLUMN public.classeurs.trashed_at IS 'Date et heure de mise en corbeille';
