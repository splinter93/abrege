-- Migration: Drop legacy instructions column from agents
-- Date: 2025-11-09

BEGIN;

-- Copy legacy data into system_instructions before dropping the column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'agents'
      AND column_name = 'instructions'
  ) THEN
    UPDATE agents
    SET system_instructions = instructions
    WHERE instructions IS NOT NULL
      AND (system_instructions IS NULL OR system_instructions = '');

    ALTER TABLE agents
      DROP COLUMN instructions;
  END IF;
END $$;

COMMIT;

