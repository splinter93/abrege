-- Autorise les valeurs DeepSeek V4 / LLM Exec en plus des valeurs Groq existantes.
-- NULL reste autorisé : certains agents/providers n'exposent pas de reasoning configurable.

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS check_reasoning_effort;

ALTER TABLE public.agents
  ADD CONSTRAINT check_reasoning_effort
  CHECK (
    reasoning_effort IS NULL
    OR reasoning_effort IN ('low', 'medium', 'high', 'max', 'disabled', 'none')
  );

COMMENT ON COLUMN public.agents.reasoning_effort IS
  'Niveau de raisonnement LLM (Groq: low|medium|high ; DeepSeek V4/LLM Exec: disabled|high|max ; none accepté comme alias disabled).';
