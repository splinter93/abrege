-- Migration: Ajouter operation_id pour idempotence des messages chat
-- Prévient les doublons en cas de retry/double-clic

-- Ajouter la colonne operation_id
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS operation_id UUID;

-- Index pour lookup rapide (déduplication)
CREATE INDEX IF NOT EXISTS idx_chat_messages_operation_id 
ON chat_messages(operation_id) 
WHERE operation_id IS NOT NULL;

-- Contrainte UNIQUE pour garantir l'idempotence
-- Note: Utilise WHERE pour permettre les NULL (messages legacy)
CREATE UNIQUE INDEX IF NOT EXISTS unique_chat_messages_operation_id 
ON chat_messages(operation_id) 
WHERE operation_id IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN chat_messages.operation_id IS 'UUID unique pour déduplication (idempotence). NULL pour messages legacy.';
