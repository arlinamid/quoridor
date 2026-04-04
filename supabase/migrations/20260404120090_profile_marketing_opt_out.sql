-- Optional marketing / newsletter opt-out (user-controlled). Not exposed on profiles_peer.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.marketing_opt_out IS
  'When true, user opted out of optional marketing/promotional communications.';
