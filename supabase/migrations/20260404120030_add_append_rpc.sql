-- RPC function to atomically append a collected item to profiles.collected_items
CREATE OR REPLACE FUNCTION append_collected_item(user_id UUID, item JSONB)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET collected_items = COALESCE(collected_items, '[]'::jsonb) || item::jsonb
  WHERE id = user_id;
$$;
