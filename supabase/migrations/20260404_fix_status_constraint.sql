-- Fix games_status_check constraint to include 'abandoned' and 'cancelled'
-- Previously only allowed: waiting, playing, finished
-- pg_cron cleanup-stale-games was failing every 2 minutes because of this

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status = ANY (ARRAY[
    'waiting'::text,
    'playing'::text,
    'finished'::text,
    'abandoned'::text,
    'cancelled'::text
  ]));
