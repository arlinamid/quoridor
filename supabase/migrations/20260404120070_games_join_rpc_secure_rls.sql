-- SECURITY: The previous UPDATE policy included "OR player2_id IS NULL", which allowed
-- any authenticated user to UPDATE (and thus grief / cancel) every waiting lobby.
-- Joins now go through SECURITY DEFINER RPC that only assigns auth.uid() to a free slot.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS player3_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS player4_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 2;

CREATE OR REPLACE FUNCTION public.join_online_game(p_game_id uuid, p_slot integer)
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
    RAISE EXCEPTION 'cannot_join_own_game' USING ERRCODE = 'P0001';
  END IF;

  IF uid IS NOT DISTINCT FROM g.player2_id
     OR uid IS NOT DISTINCT FROM g.player3_id
     OR uid IS NOT DISTINCT FROM g.player4_id THEN
    RETURN QUERY SELECT * FROM games WHERE id = p_game_id;
    RETURN;
  END IF;

  IF p_slot = 1 THEN
    IF g.player2_id IS NOT NULL THEN
      RAISE EXCEPTION 'slot_taken' USING ERRCODE = 'P0001';
    END IF;
    UPDATE games SET player2_id = uid WHERE id = p_game_id;
  ELSIF p_slot = 2 THEN
    IF g.player3_id IS NOT NULL THEN
      RAISE EXCEPTION 'slot_taken' USING ERRCODE = 'P0001';
    END IF;
    UPDATE games SET player3_id = uid WHERE id = p_game_id;
  ELSIF p_slot = 3 THEN
    IF g.player4_id IS NOT NULL THEN
      RAISE EXCEPTION 'slot_taken' USING ERRCODE = 'P0001';
    END IF;
    UPDATE games SET player4_id = uid WHERE id = p_game_id;
  ELSE
    RAISE EXCEPTION 'invalid_slot' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT * FROM games WHERE id = p_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_online_game(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_online_game(uuid, integer) TO authenticated;

DROP POLICY IF EXISTS games_update_player ON games;
DROP POLICY IF EXISTS "Players can update games" ON games;

CREATE POLICY games_update_player ON games FOR UPDATE USING (
  auth.uid() = player1_id OR
  auth.uid() = player2_id OR
  auth.uid() = player3_id OR
  auth.uid() = player4_id
);
