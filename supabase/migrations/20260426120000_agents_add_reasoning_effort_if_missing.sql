-- Colonne manquante sur certains déploiements : le GET /api/v2/agents/[id] expose désormais reasoning_effort.
-- Stocke le niveau de reasoning (Groq gpt-oss, DeepSeek V4 / LLM Exec via Liminality, etc.)

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS reasoning_effort TEXT;

COMMENT ON COLUMN public.agents.reasoning_effort IS
  'Niveau de raisonnement LLM (ex. low|medium|high|max|disabled selon le provider)';
