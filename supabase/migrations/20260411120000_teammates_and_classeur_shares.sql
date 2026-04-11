-- Teammates & partage de classeurs (API v2)
-- Une ligne d'invitation : invitant = user_id, invité = teammate_id.

CREATE TABLE IF NOT EXISTS public.teammates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teammate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teammates_no_self CHECK (user_id <> teammate_id),
  CONSTRAINT teammates_pair_unique UNIQUE (user_id, teammate_id)
);

CREATE INDEX IF NOT EXISTS idx_teammates_user_id ON public.teammates(user_id);
CREATE INDEX IF NOT EXISTS idx_teammates_teammate_id ON public.teammates(teammate_id);
CREATE INDEX IF NOT EXISTS idx_teammates_status ON public.teammates(status);

CREATE TABLE IF NOT EXISTS public.classeur_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classeur_id UUID NOT NULL REFERENCES public.classeurs(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT classeur_shares_no_self CHECK (shared_by <> shared_with),
  CONSTRAINT classeur_shares_unique_recipient UNIQUE (classeur_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_classeur_shares_classeur_id ON public.classeur_shares(classeur_id);
CREATE INDEX IF NOT EXISTS idx_classeur_shares_shared_with ON public.classeur_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_classeur_shares_shared_by ON public.classeur_shares(shared_by);

ALTER TABLE public.teammates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classeur_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY teammates_select_own ON public.teammates
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = teammate_id);

CREATE POLICY teammates_insert_inviter ON public.teammates
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() = requested_by
    AND auth.uid() <> teammate_id
  );

CREATE POLICY teammates_update_participant ON public.teammates
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = teammate_id);

CREATE POLICY teammates_delete_participant ON public.teammates
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = teammate_id);

CREATE POLICY classeur_shares_select_participant ON public.classeur_shares
  FOR SELECT USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY classeur_shares_insert_owner ON public.classeur_shares
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

CREATE POLICY classeur_shares_delete_participant ON public.classeur_shares
  FOR DELETE USING (auth.uid() = shared_by OR auth.uid() = shared_with);

COMMENT ON TABLE public.teammates IS 'Relations coéquipiers / invitations (API v2)';
COMMENT ON TABLE public.classeur_shares IS 'Partages de classeurs lecture/écriture (API v2)';
