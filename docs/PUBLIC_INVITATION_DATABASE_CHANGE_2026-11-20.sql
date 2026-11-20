-- MAGIC CREATIONS: public invitation resolver
-- Applied to Supabase project yidsydqmiodolhgftypv on 2026-11-20.
-- Additive change only. The private workspace_data column remains inaccessible to anon.

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS public_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.invitations.public_data IS
  'Allowlisted public-facing invitation snapshot. Never store workspace_data or guest/private records here.';

GRANT SELECT (slug, published, public_data)
  ON TABLE public.invitations TO anon;

CREATE OR REPLACE FUNCTION public.mc_resolve_public_invitation(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT i.public_data
  FROM public.invitations AS i
  WHERE i.slug = lower(trim(p_slug))
    AND i.published IS TRUE
    AND i.public_data IS NOT NULL
    AND jsonb_typeof(i.public_data) = 'object'
    AND i.public_data <> '{}'::jsonb
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.mc_resolve_public_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mc_resolve_public_invitation(text) TO anon, authenticated;
