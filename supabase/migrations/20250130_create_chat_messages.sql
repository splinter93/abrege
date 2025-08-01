-- Création de la table chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp);

-- Politiques RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres messages
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent insérer leurs propres messages
CREATE POLICY "Users can insert their own chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres messages
CREATE POLICY "Users can delete their own chat messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent mettre à jour leurs propres messages
CREATE POLICY "Users can update their own chat messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE public.chat_messages IS 'Messages du chat IA Synesia';
COMMENT ON COLUMN public.chat_messages.role IS 'Rôle du message: assistant ou user';
COMMENT ON COLUMN public.chat_messages.content IS 'Contenu du message (texte, markdown, etc.)';
COMMENT ON COLUMN public.chat_messages.timestamp IS 'Timestamp JavaScript du message';
COMMENT ON COLUMN public.chat_messages.user_id IS 'ID de l''utilisateur propriétaire du message';
