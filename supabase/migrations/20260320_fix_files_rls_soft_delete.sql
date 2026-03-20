-- Migration: Fix RLS UPDATE policy for files soft-delete
-- Date: 2026-03-20
-- Problem: The UPDATE policy uses USING (deleted_at IS NULL) without an explicit WITH CHECK.
-- PostgreSQL defaults WITH CHECK to the same predicate as USING, so setting
-- deleted_at = now() fails the WITH CHECK because the new row has deleted_at IS NOT NULL.

-- Fix: Keep USING restrictive (only non-deleted files can be targeted),
-- but relax WITH CHECK to only require ownership (allows soft-deleting the file).

DROP POLICY IF EXISTS "Users can update own files" ON files;

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);
