-- Realtime sur chat_messages (sync multi-onglet / multi-device, useChatMessagesRealtime)
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

COMMENT ON TABLE public.chat_messages IS
  'Messages du chat — Realtime activé pour sync cross-onglet (voir useChatMessagesRealtime).';
