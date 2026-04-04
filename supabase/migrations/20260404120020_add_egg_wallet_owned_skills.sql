-- Egg wallet (spendable currency) and owned skills (purchased via eggs)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS egg_wallet  JSONB    DEFAULT '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS owned_skills TEXT[]  DEFAULT '{}'::text[];

-- RPC: purchase a skill with eggs (atomic deduct + grant)
CREATE OR REPLACE FUNCTION purchase_skill_with_eggs(
  p_user_id      UUID,
  p_skill        TEXT,
  p_egg_type     TEXT,
  p_egg_cost     INT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_wallet JSONB;
  current_bal    INT;
BEGIN
  SELECT egg_wallet INTO current_wallet FROM profiles WHERE id = p_user_id FOR UPDATE;

  -- already owned?
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND p_skill = ANY(owned_skills)) THEN
    RETURN 'already_owned';
  END IF;

  current_bal := COALESCE((current_wallet ->> p_egg_type)::int, 0);
  IF current_bal < p_egg_cost THEN
    RETURN 'insufficient';
  END IF;

  UPDATE profiles SET
    egg_wallet   = jsonb_set(egg_wallet, ARRAY[p_egg_type], to_jsonb(current_bal - p_egg_cost)),
    owned_skills = array_append(owned_skills, p_skill)
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;

-- RPC: add eggs to wallet (called when Easter egg collected in game)
CREATE OR REPLACE FUNCTION add_egg_to_wallet(
  p_user_id  UUID,
  p_egg_type TEXT,
  p_amount   INT DEFAULT 1
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles SET
    egg_wallet = jsonb_set(
      COALESCE(egg_wallet, '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb),
      ARRAY[p_egg_type],
      to_jsonb(COALESCE((egg_wallet ->> p_egg_type)::int, 0) + p_amount)
    ),
    collected_items = COALESCE(collected_items, '[]'::jsonb) ||
      jsonb_build_object('type', p_egg_type, 'collectedAt', now()::text)::jsonb
  WHERE id = p_user_id;
$$;
