-- 1) Public-safe view (no fingerprint, egg_wallet, owned_skills, skill_loadout, collected_items)
--    Owned by postgres so underlying RLS does not hide rows from the view.
CREATE OR REPLACE VIEW public.profiles_peer AS
SELECT
  id,
  username,
  xp,
  wins,
  losses,
  level,
  created_at
FROM public.profiles;

ALTER VIEW public.profiles_peer OWNER TO postgres;
GRANT SELECT ON public.profiles_peer TO anon, authenticated;

-- 2) Fingerprint → username for pre-login UX (no direct broad profiles SELECT for anon)
CREATE OR REPLACE FUNCTION public.get_username_for_fingerprint(fp text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username
  FROM public.profiles p
  WHERE p.fingerprint IS NOT NULL
    AND p.fingerprint = fp
  ORDER BY p.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_username_for_fingerprint(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_username_for_fingerprint(text) TO anon, authenticated;

-- 3) Drop world-readable profiles SELECT; keep read for own row only (full row)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

CREATE POLICY profiles_select_own_full ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4) Block clients from forging XP / wins / losses / level; allow service_role (Edge Functions)
CREATE OR REPLACE FUNCTION public.protect_profile_progression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(
    nullif(trim(auth.jwt() ->> 'role'), ''),
    nullif(trim(current_setting('request.jwt.claim.role', true)), '')
  );

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.wins IS DISTINCT FROM OLD.wins
     OR NEW.losses IS DISTINCT FROM OLD.losses
     OR NEW.level IS DISTINCT FROM OLD.level THEN
    RAISE EXCEPTION 'progression_fields_locked'
      USING ERRCODE = '42501',
            HINT = 'XP / wins / losses / level may only be updated with the service role (e.g. award-xp).';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_progression ON public.profiles;
CREATE TRIGGER profiles_protect_progression
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_progression();
