-- Fix games UPDATE RLS policy to include player3_id and player4_id
-- Previously only player1_id and player2_id could update game state,
-- so P3/P4 were silently blocked from making moves in 3-4 player games.

DROP POLICY IF EXISTS games_update_player ON games;
DROP POLICY IF EXISTS "Players can update games" ON games;

CREATE POLICY games_update_player ON games FOR UPDATE USING (
  auth.uid() = player1_id OR
  auth.uid() = player2_id OR
  auth.uid() = player3_id OR
  auth.uid() = player4_id OR
  player2_id IS NULL
);
