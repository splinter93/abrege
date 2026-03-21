-- Retrait de agents.personality (comportement unifié dans system_instructions).
-- Recréation de la vue agents_active_summary sans has_personality ni dépendance sur personality.

DROP VIEW IF EXISTS public.agents_active_summary;

ALTER TABLE public.agents DROP COLUMN IF EXISTS personality;

CREATE VIEW public.agents_active_summary AS
 SELECT id,
    name,
    provider,
    model,
    model_variant,
    temperature,
    top_p,
    max_tokens,
    max_completion_tokens,
    stream,
    reasoning_effort,
    is_default,
    priority,
    version,
    created_at,
    updated_at,
    array_length(expertise, 1) AS expertise_count,
    jsonb_array_length(capabilities) AS capabilities_count,
    array_length(api_v2_capabilities, 1) AS api_v2_capabilities_count,
    CASE
        WHEN system_instructions IS NOT NULL AND system_instructions <> ''::text THEN true
        ELSE false
    END AS has_custom_instructions,
    CASE
        WHEN context_template IS NOT NULL AND context_template <> ''::text THEN true
        ELSE false
    END AS has_context_template,
    CASE
        WHEN expertise IS NOT NULL AND array_length(expertise, 1) > 0 THEN true
        ELSE false
    END AS has_expertise,
    CASE
        WHEN capabilities IS NOT NULL AND jsonb_array_length(capabilities) > 0 THEN true
        ELSE false
    END AS has_capabilities,
    CASE
        WHEN api_v2_capabilities IS NOT NULL AND array_length(api_v2_capabilities, 1) > 0 THEN true
        ELSE false
    END AS has_api_v2_capabilities
   FROM agents
  WHERE is_active = true
  ORDER BY priority DESC, created_at DESC;

COMMENT ON VIEW public.agents_active_summary IS 'Résumé des agents actifs (sans colonne personality — unifié dans system_instructions)';
