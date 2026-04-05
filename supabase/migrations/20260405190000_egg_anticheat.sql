-- ─────────────────────────────────────────────────────────────────────────────
-- Easter egg anti-cheat: replace add_egg_to_wallet with a validated version
--
-- Protections added:
--   1. Caller identity  — auth.uid() must match p_user_id (no impersonation)
--   2. Egg type whitelist — only EGG_BASIC / EGG_GOLD / EGG_RAINBOW accepted
--   3. Rate limiting    — minimum 25 s between any two collections per user
--   4. Daily cap        — maximum 8 collections per UTC calendar day
--   5. Return status    — 'ok' | 'rate_limited' | 'daily_limit' | 'invalid'
--                         so the client can surface the right error
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_egg_to_wallet(
  p_user_id  UUID,
  p_egg_type TEXT,
  p_amount   INT DEFAULT 1
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_count INT;
BEGIN
  -- 1. Caller must be the authenticated user — block impersonation / direct API abuse
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN 'unauthorized';
  END IF;

  -- 2. Reject unknown egg types
  IF p_egg_type NOT IN ('EGG_BASIC', 'EGG_GOLD', 'EGG_RAINBOW') THEN
    RETURN 'invalid';
  END IF;

  -- 3. Rate limit: at most one collection every 25 seconds
  --    (client cooldown is 28 s + 8 s visible — this is a strict server-side floor)
  PERFORM 1
  FROM profiles p,
       jsonb_array_elements(COALESCE(p.collected_items, '[]'::jsonb)) AS item
  WHERE p.id = p_user_id
    AND (item->>'collectedAt')::timestamptz > now() - interval '25 seconds'
  LIMIT 1;

  IF FOUND THEN
    RETURN 'rate_limited';
  END IF;

  -- 4. Daily cap: maximum 8 egg collections per UTC calendar day
  SELECT COUNT(*)
  INTO v_today_count
  FROM profiles p,
       jsonb_array_elements(COALESCE(p.collected_items, '[]'::jsonb)) AS item
  WHERE p.id = p_user_id
    AND (item->>'collectedAt')::timestamptz
          >= date_trunc('day', now() AT TIME ZONE 'UTC');

  IF v_today_count >= 8 THEN
    RETURN 'daily_limit';
  END IF;

  -- 5. Atomic wallet increment + history append
  UPDATE profiles
  SET
    egg_wallet = jsonb_set(
      COALESCE(egg_wallet, '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb),
      ARRAY[p_egg_type],
      to_jsonb(COALESCE((egg_wallet ->> p_egg_type)::int, 0) + p_amount)
    ),
    collected_items = COALESCE(collected_items, '[]'::jsonb) ||
      jsonb_build_array(
        jsonb_build_object('type', p_egg_type, 'collectedAt', now()::text)
      )
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;

-- Re-grant execute to authenticated role (SECURITY DEFINER runs as owner)
REVOKE ALL ON FUNCTION add_egg_to_wallet(UUID, TEXT, INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION add_egg_to_wallet(UUID, TEXT, INT) TO authenticated;
