-- Migration: Creation table canva_sessions + colonne is_canva_draft
-- Date: 2025-11-12
-- Description: Architecture propre pour canvases lies aux sessions chat

-- ============================================================================
-- 1. TABLE CANVA_SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS canva_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'saved', 'deleted')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  saved_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Contrainte: une note ne peut etre liee qu'a un seul canva
  CONSTRAINT unique_note_per_session UNIQUE (note_id)
);

-- Index pour performance
CREATE INDEX idx_canva_sessions_chat ON canva_sessions(chat_session_id, status);
CREATE INDEX idx_canva_sessions_user ON canva_sessions(user_id, status);
CREATE INDEX idx_canva_sessions_note ON canva_sessions(note_id);
CREATE INDEX idx_canva_sessions_created ON canva_sessions(created_at DESC);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE canva_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Utilisateurs peuvent voir leurs propres canva sessions
CREATE POLICY "Users can view own canva sessions" ON canva_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent creer leurs propres canva sessions
CREATE POLICY "Users can create own canva sessions" ON canva_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent modifier leurs propres canva sessions
CREATE POLICY "Users can update own canva sessions" ON canva_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Utilisateurs peuvent supprimer leurs propres canva sessions
CREATE POLICY "Users can delete own canva sessions" ON canva_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. COLONNE IS_CANVA_DRAFT DANS ARTICLES
-- ============================================================================

-- Ajouter flag canva draft
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS is_canva_draft BOOLEAN DEFAULT FALSE;

-- Index pour filtrage performant des notes recentes (exclure drafts)
CREATE INDEX IF NOT EXISTS idx_articles_canva_drafts 
ON articles(user_id, is_canva_draft, updated_at DESC) 
WHERE is_canva_draft = FALSE;

-- Commentaire documentation
COMMENT ON COLUMN articles.is_canva_draft IS 'True si note creee via canva (exclue des notes recentes du dashboard)';

-- ============================================================================
-- 4. COMMENTAIRES DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE canva_sessions IS 'Sessions canva liees aux conversations chat - Architecture propre sans pollution notes recentes';
COMMENT ON COLUMN canva_sessions.status IS 'Statut: open (actif), closed (ferme UI), saved (sauvegarde dans classeur), deleted (supprime)';
COMMENT ON COLUMN canva_sessions.chat_session_id IS 'Lien vers conversation chat - CASCADE delete si chat supprime';
COMMENT ON COLUMN canva_sessions.note_id IS 'Note DB reelle - CASCADE delete si canva supprime';

