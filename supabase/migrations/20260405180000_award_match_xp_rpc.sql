-- Server-side XP via PostgREST RPC (same JWT as normal DB calls — avoids Edge Function gateway 401).
-- Edge Function award-xp optional to keep deployed; client prefers RPC.

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

  IF current_setting('app.bypass_progression_lock', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.wins IS DISTINCT FROM OLD.wins
     OR NEW.losses IS DISTINCT FROM OLD.losses
     OR NEW.level IS DISTINCT FROM OLD.level THEN
    RAISE EXCEPTION 'progression_fields_locked'
      USING ERRCODE = '42501',
            HINT = 'XP / wins / losses / level may only be updated with the service role or award_match_xp RPC.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_match_xp(p_mode text, p_won boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  xp_delta int;
  win_delta int := 0;
  loss_delta int := 0;
  cur_xp int;
  cur_wins int;
  cur_losses int;
  new_xp int;
  new_wins int;
  new_losses int;
  new_level int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF p_mode IN ('online', 'treasure-online', 'ai', 'treasure-ai') THEN
    IF p_won THEN
      xp_delta := 50;
      win_delta := 1;
    ELSE
      xp_delta := 10;
      loss_delta := 1;
    END IF;
  ELSIF p_mode IN ('pvp', 'treasure-pvp') THEN
    xp_delta := 20;
  ELSE
    RAISE EXCEPTION 'invalid_mode: %', p_mode USING ERRCODE = '22023';
  END IF;

  SELECT xp, wins, losses INTO cur_xp, cur_wins, cur_losses
  FROM public.profiles
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  new_xp := coalesce(cur_xp, 0) + xp_delta;
  new_wins := coalesce(cur_wins, 0) + win_delta;
  new_losses := coalesce(cur_losses, 0) + loss_delta;
  new_level := floor(sqrt(new_xp::numeric / 100))::int + 1;

  PERFORM set_config('app.bypass_progression_lock', '1', true);

  UPDATE public.profiles
  SET
    xp = new_xp,
    wins = new_wins,
    losses = new_losses,
    level = new_level
  WHERE id = uid;

  PERFORM set_config('app.bypass_progression_lock', '', true);

  RETURN jsonb_build_object(
    'xp', new_xp,
    'wins', new_wins,
    'losses', new_losses,
    'level', new_level
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.bypass_progression_lock', '', true);
    RAISE;
END;
$$;

ALTER FUNCTION public.award_match_xp(text, boolean) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.award_match_xp(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_match_xp(text, boolean) TO authenticated;

COMMENT ON FUNCTION public.award_match_xp(text, boolean) IS
  'Applies match XP / wins / losses for auth.uid(); same rules as award-xp Edge Function.';
