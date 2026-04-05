-- Pawn cosmetics: owned list + equipped id (visible to peers for board rendering)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owned_skins      TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS equipped_skin_id TEXT;

-- Peer view: expose equipped skin only (not owned_skins / wallet)
CREATE OR REPLACE VIEW public.profiles_peer AS
SELECT
  id,
  username,
  xp,
  wins,
  losses,
  level,
  created_at,
  equipped_skin_id
FROM public.profiles;

ALTER VIEW public.profiles_peer OWNER TO postgres;
GRANT SELECT ON public.profiles_peer TO anon, authenticated;

-- Purchase: server-validated egg type + cost per skin id
CREATE OR REPLACE FUNCTION public.purchase_pawn_skin_with_eggs(
  p_user_id   UUID,
  p_skin_id   TEXT,
  p_egg_type  TEXT,
  p_egg_cost  INT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_wallet JSONB;
  current_bal    INT;
  expect_type    TEXT;
  expect_cost    INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  IF p_skin_id = 'bunny_egg' THEN
    expect_type := 'EGG_GOLD';    expect_cost := 2;
  ELSIF p_skin_id = 'bunny_idle' THEN
    expect_type := 'EGG_BASIC';   expect_cost := 1;
  ELSE
    RETURN 'invalid';
  END IF;

  IF p_egg_type IS DISTINCT FROM expect_type OR p_egg_cost IS DISTINCT FROM expect_cost THEN
    RETURN 'invalid';
  END IF;

  IF p_egg_type NOT IN ('EGG_BASIC', 'EGG_GOLD', 'EGG_RAINBOW') THEN
    RETURN 'invalid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND p_skin_id = ANY(COALESCE(owned_skins, '{}'::text[]))
  ) THEN
    RETURN 'already_owned';
  END IF;

  SELECT egg_wallet INTO current_wallet FROM profiles WHERE id = p_user_id FOR UPDATE;
  current_bal := COALESCE((current_wallet ->> p_egg_type)::int, 0);
  IF current_bal < p_egg_cost THEN
    RETURN 'insufficient';
  END IF;

  UPDATE profiles SET
    egg_wallet   = jsonb_set(egg_wallet, ARRAY[p_egg_type], to_jsonb(current_bal - p_egg_cost)),
    owned_skins  = array_append(COALESCE(owned_skins, '{}'::text[]), p_skin_id)
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_pawn_skin_with_eggs(UUID, TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_pawn_skin_with_eggs(UUID, TEXT, TEXT, INT) TO authenticated;

-- Equip: must own skin or set to NULL (classic bábu)
CREATE OR REPLACE FUNCTION public.set_equipped_pawn_skin(
  p_user_id  UUID,
  p_skin_id  TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  IF p_skin_id IS NULL OR trim(p_skin_id) = '' THEN
    UPDATE profiles SET equipped_skin_id = NULL WHERE id = p_user_id;
    RETURN 'ok';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND p_skin_id = ANY(COALESCE(owned_skins, '{}'::text[]))
  ) THEN
    RETURN 'not_owned';
  END IF;

  UPDATE profiles SET equipped_skin_id = p_skin_id WHERE id = p_user_id;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.set_equipped_pawn_skin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_equipped_pawn_skin(UUID, TEXT) TO authenticated;
