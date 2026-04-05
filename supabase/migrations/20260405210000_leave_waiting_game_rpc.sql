-- Joiner leaves a waiting lobby: clear their player slot (host must still use cancel / cancelGame).

CREATE OR REPLACE FUNCTION public.leave_waiting_game(p_game_id uuid)
RETURNS SETOF games
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  g games%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO g FROM games WHERE id = p_game_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF g.status IS DISTINCT FROM 'waiting' THEN
    RAISE EXCEPTION 'game_not_waiting' USING ERRCODE = 'P0001';
  END IF;

  IF uid = g.player1_id THEN
    RAISE EXCEPTION 'host_use_cancel' USING ERRCODE = 'P0001';
  END IF;

  IF uid IS NOT DISTINCT FROM g.player2_id THEN
    UPDATE games SET player2_id = NULL WHERE id = p_game_id;
  ELSIF uid IS NOT DISTINCT FROM g.player3_id THEN
    UPDATE games SET player3_id = NULL WHERE id = p_game_id;
  ELSIF uid IS NOT DISTINCT FROM g.player4_id THEN
    UPDATE games SET player4_id = NULL WHERE id = p_game_id;
  ELSE
    RAISE EXCEPTION 'not_in_game' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT * FROM games WHERE id = p_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_waiting_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_waiting_game(uuid) TO authenticated;
