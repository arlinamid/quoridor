-- Add store/gamepass features to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS collected_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skill_loadout TEXT[] DEFAULT NULL;
